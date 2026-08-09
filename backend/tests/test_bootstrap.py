"""Cloud-backed user state: preferences, Ask Lovli thread, /api/bootstrap.

The point of these endpoints is that signing in on a new device restores the
same app, so the tests assert on persistence and on strict per-user separation.
"""
from __future__ import annotations

import asyncio
import json

import pytest
from fastapi.testclient import TestClient

import server as srv
from tests._memstub import MemDb

USER_A = "user-a"
USER_B = "user-b"

USER_A_DOC = {
    "id": USER_A,
    "name": "Aman",
    "email": "a@lovli.in",
    "plan": "free",
    "daily_generation_count": 3,
    "last_generation_reset_date": None,
    "timezone": "Asia/Kolkata",
    "language_preference": "Hinglish",
    "preferred_platform": "instagram",
    "onboarding_complete": True,
    "created_at": "2026-01-01T00:00:00+00:00",
}


def _run(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


async def _fake_get_user(_uid):
    return dict(USER_A_DOC)


async def _fake_maybe_reset_daily(user, _local):
    return user


@pytest.fixture()
def db(monkeypatch):
    stub = MemDb()
    monkeypatch.setattr(srv, "db", stub)
    monkeypatch.setattr(srv, "_get_user", _fake_get_user)
    monkeypatch.setattr(srv, "_maybe_reset_daily", _fake_maybe_reset_daily)
    _run(stub.users.insert_one(dict(USER_A_DOC)))
    return stub


@pytest.fixture()
def client(db):
    srv.app.dependency_overrides[srv.get_current_user_id] = lambda: USER_A
    yield TestClient(srv.app)
    srv.app.dependency_overrides.pop(srv.get_current_user_id, None)


def _auth():
    return {"Authorization": "Bearer test-token"}


def _as_text(payload) -> str:
    """Whole response as one string — for 'this must appear nowhere' assertions."""
    return json.dumps(payload)


class TestPreferences:
    def test_created_lazily_on_first_read(self, client, db):
        r = client.get("/api/preferences", headers=_auth())
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user_id"] == USER_A
        assert body["default_vibe"] == "Playful"
        # Seeded from the account record, not invented.
        assert body["language_preference"] == "Hinglish"
        assert _run(db.user_preferences.count_documents({"user_id": USER_A})) == 1

    def test_read_is_idempotent(self, client, db):
        client.get("/api/preferences", headers=_auth())
        client.get("/api/preferences", headers=_auth())
        assert _run(db.user_preferences.count_documents({"user_id": USER_A})) == 1

    def test_patch_persists_and_survives_reread(self, client):
        r = client.patch(
            "/api/preferences",
            json={"goal": "Find a relationship", "default_vibe": "Flirty",
                  "dating": "Women", "app_lock": True},
            headers=_auth(),
        )
        assert r.status_code == 200, r.text
        again = client.get("/api/preferences", headers=_auth()).json()
        assert again["goal"] == "Find a relationship"
        assert again["default_vibe"] == "Flirty"
        assert again["dating"] == "Women"
        assert again["app_lock"] is True

    def test_patch_only_writes_supplied_fields(self, client):
        client.patch("/api/preferences", json={"goal": "Fix things"}, headers=_auth())
        client.patch("/api/preferences", json={"dating": "Everyone"}, headers=_auth())
        body = client.get("/api/preferences", headers=_auth()).json()
        assert body["goal"] == "Fix things"      # not clobbered by the second patch
        assert body["dating"] == "Everyone"

    def test_empty_patch_rejected(self, client):
        assert client.patch("/api/preferences", json={}, headers=_auth()).status_code == 400

    def test_mirrored_fields_sync_to_user_record(self, client, db):
        client.patch(
            "/api/preferences", json={"language_preference": "English"}, headers=_auth()
        )
        user = _run(db.users.find_one({"id": USER_A}))
        assert user["language_preference"] == "English"

    def test_false_booleans_are_writable(self, client):
        """notif_reminders defaults True — turning it off must actually stick."""
        client.patch("/api/preferences", json={"notif_reminders": False}, headers=_auth())
        assert client.get("/api/preferences", headers=_auth()).json()["notif_reminders"] is False


class TestSignupSeedsPreferences:
    """A real signup on a device produced a user with no preferences row: the
    client only fetched /bootstrap on login, and the server created preferences
    lazily. Anything that account changed in its first session was therefore not
    cloud-backed. The server now seeds the row at account creation."""

    def test_new_account_gets_preferences_immediately(self, client, db):
        r = client.post(
            "/api/auth/signup",
            json={"name": "Fresh", "email": "fresh@lovli.in", "password": "Sup3rSecret!"},
        )
        assert r.status_code == 200, r.text
        new_id = r.json()["user"]["id"]
        prefs = _run(db.user_preferences.find_one({"user_id": new_id}))
        assert prefs is not None, "signup must create a preferences row"
        assert prefs["default_vibe"] == "Playful"

    def test_preferences_row_is_owned_by_the_new_user_only(self, client, db):
        r = client.post(
            "/api/auth/signup",
            json={"name": "Fresh2", "email": "fresh2@lovli.in", "password": "Sup3rSecret!"},
        )
        new_id = r.json()["user"]["id"]
        rows = _run(db.user_preferences.find({"user_id": new_id}).to_list(None))
        assert len(rows) == 1
        assert rows[0]["user_id"] == new_id


class TestAskThread:
    def test_empty_by_default(self, client):
        assert client.get("/api/ask-thread", headers=_auth()).json()["turns"] == []

    def test_put_then_get_round_trips(self, client):
        turns = [{"role": "user", "text": "hi"}, {"role": "lovli", "text": "hey you"}]
        r = client.put("/api/ask-thread", json={"turns": turns}, headers=_auth())
        assert r.status_code == 200 and r.json()["turns"] == 2
        assert client.get("/api/ask-thread", headers=_auth()).json()["turns"] == turns

    def test_replace_does_not_append(self, client):
        client.put("/api/ask-thread", json={"turns": [{"role": "user", "text": "one"}]},
                   headers=_auth())
        client.put("/api/ask-thread", json={"turns": [{"role": "user", "text": "two"}]},
                   headers=_auth())
        turns = client.get("/api/ask-thread", headers=_auth()).json()["turns"]
        assert len(turns) == 1 and turns[0]["text"] == "two"

    def test_long_thread_is_capped(self, client):
        turns = [{"role": "user", "text": f"m{i}"} for i in range(500)]
        client.put("/api/ask-thread", json={"turns": turns}, headers=_auth())
        stored = client.get("/api/ask-thread", headers=_auth()).json()["turns"]
        assert len(stored) == srv.MAX_ASK_THREAD_TURNS
        assert stored[-1]["text"] == "m499"  # keeps the most recent

    def test_delete_clears(self, client):
        client.put("/api/ask-thread", json={"turns": [{"role": "user", "text": "x"}]},
                   headers=_auth())
        client.delete("/api/ask-thread", headers=_auth())
        assert client.get("/api/ask-thread", headers=_auth()).json()["turns"] == []


class TestBootstrap:
    def test_returns_everything_in_one_call(self, client, db):
        _run(db.memory_cards.insert_one(
            {"id": "c1", "user_id": USER_A, "nickname": "Ananya",
             "created_at": "2026-02-01T00:00:00+00:00"}))
        _run(db.generations.insert_one(
            {"id": "g1", "user_id": USER_A, "feature_id": "decode",
             "result": {"vibe_headline": "She's warm"},
             "created_at": "2026-02-02T00:00:00+00:00"}))
        client.put("/api/ask-thread", json={"turns": [{"role": "user", "text": "hi"}]},
                   headers=_auth())

        r = client.get("/api/bootstrap", headers=_auth())
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["user"]["id"] == USER_A
        assert b["preferences"]["user_id"] == USER_A
        assert b["usage"]["daily_generation_count"] == 3
        assert [c["nickname"] for c in b["memory_cards"]] == ["Ananya"]
        assert b["recent_results"][0]["verdict"] == "She's warm"
        assert b["ask_thread"][0]["text"] == "hi"
        assert b["server"]["schema_version"] >= 1

    def test_cold_account_still_succeeds(self, client):
        b = client.get("/api/bootstrap", headers=_auth()).json()
        assert b["memory_cards"] == []
        assert b["recent_results"] == []
        assert b["ask_thread"] == []

    def test_never_leaks_another_users_data(self, client, db):
        _run(db.memory_cards.insert_one(
            {"id": "c-b", "user_id": USER_B, "nickname": "NotYours",
             "created_at": "2026-02-01T00:00:00+00:00"}))
        _run(db.generations.insert_one(
            {"id": "g-b", "user_id": USER_B, "feature_id": "decode",
             "result": {"vibe_headline": "secret"},
             "created_at": "2026-02-02T00:00:00+00:00"}))
        _run(db.ask_threads.insert_one(
            {"user_id": USER_B, "turns": [{"role": "user", "text": "private"}]}))

        b = client.get("/api/bootstrap", headers=_auth()).json()
        assert b["memory_cards"] == []
        assert b["recent_results"] == []
        assert b["ask_thread"] == []
        assert "secret" not in _as_text(b)
        assert "private" not in _as_text(b)

    def test_memory_cards_capped(self, client, db):
        for i in range(250):
            _run(db.memory_cards.insert_one(
                {"id": f"c{i}", "user_id": USER_A, "nickname": f"P{i}",
                 "created_at": f"2026-02-{(i % 28) + 1:02d}T00:00:00+00:00"}))
        assert len(client.get("/api/bootstrap", headers=_auth()).json()["memory_cards"]) == 200

    def test_recent_results_capped_at_five(self, client, db):
        for i in range(12):
            _run(db.generations.insert_one(
                {"id": f"g{i}", "user_id": USER_A, "feature_id": "decode",
                 "result": {"vibe_headline": f"v{i}"},
                 "created_at": f"2026-03-{i + 1:02d}T00:00:00+00:00"}))
        assert len(client.get("/api/bootstrap", headers=_auth()).json()["recent_results"]) == 5
