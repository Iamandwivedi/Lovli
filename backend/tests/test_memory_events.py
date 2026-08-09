"""PR-M1 pytest suite — event foundation.

Covers POST /api/events (auth-scoped, client-type allowlist, payload cap),
server-side event capture around /generate-replies, the /feedback dual-write,
and the never-break-generation failure policy. Fully offline: stub db, stub
auth, stub LLM (same pattern as test_pr_int.py).
"""
from __future__ import annotations

import copy
import types

import pytest
from fastapi.testclient import TestClient

import server as srv
import llm_service as lm
from engine import memory as mem
from engine.memory_context import clear_memory_context_cache

FAKE_USER_ID = "pytest-user-events"
FAKE_USER = {
    "id": FAKE_USER_ID,
    "plan": "free",
    "daily_generation_count": 0,
    "daily_limit": 10,
    "last_generation_reset_date": None,
    "timezone": "Asia/Kolkata",
}

LEGACY_FIXTURE = {"replies": ["r1", "r2", "r3"], "tone_notes": "playful match"}


class _RecordingCol:
    """Stub collection that records inserts and answers basic queries."""

    def __init__(self):
        self.docs: list[dict] = []
        self.fail_insert = False

    async def insert_one(self, doc, *a, **k):
        if self.fail_insert:
            raise RuntimeError("simulated mongo outage")
        self.docs.append(copy.deepcopy(doc))
        return types.SimpleNamespace(inserted_id="x")

    async def update_one(self, *a, **k):
        return types.SimpleNamespace(matched_count=1, modified_count=1)

    async def find_one(self, query, *a, **k):
        for d in self.docs:
            if all(d.get(key) == val for key, val in query.items()):
                return copy.deepcopy(d)
        return None

    async def count_documents(self, *a, **k):
        return len(self.docs)

    async def delete_many(self, *a, **k):
        n = len(self.docs)
        self.docs = []
        return types.SimpleNamespace(deleted_count=n)


class _StubDb:
    def __init__(self):
        self.users = _RecordingCol()
        self.generations = _RecordingCol()
        self.memory_cards = _RecordingCol()
        self.conversation_events = _RecordingCol()
        self.memory_atoms = _RecordingCol()
        self.texting_profiles = _RecordingCol()
        self.tone_profiles = _RecordingCol()
        self.phrase_rules = _RecordingCol()


async def _fake_get_user(_uid):
    return dict(FAKE_USER)


async def _fake_maybe_reset_daily(user, _local):
    return user


@pytest.fixture()
def stub_db(monkeypatch):
    db = _StubDb()
    monkeypatch.setattr(srv, "db", db)
    monkeypatch.setattr(srv, "_get_user", _fake_get_user)
    monkeypatch.setattr(srv, "_maybe_reset_daily", _fake_maybe_reset_daily)
    # schedule_rebuild spawns background tasks — keep the suite synchronous.
    monkeypatch.setattr(mem, "schedule_rebuild", lambda *a, **k: None)
    clear_memory_context_cache()
    return db


@pytest.fixture()
def client(stub_db, monkeypatch):
    srv.app.dependency_overrides[srv.get_current_user_id] = lambda: FAKE_USER_ID

    async def fake_generate(req: lm.LovliRequest) -> dict:
        return copy.deepcopy(LEGACY_FIXTURE)

    monkeypatch.setattr(srv, "generate_replies", fake_generate)
    yield TestClient(srv.app)
    srv.app.dependency_overrides.pop(srv.get_current_user_id, None)


def _auth():
    return {"Authorization": "Bearer test-token"}


class TestEventsEndpoint:
    def test_happy_path_records_event(self, client, stub_db):
        r = client.post(
            "/api/events",
            json={"type": "reply_copied", "payload": {"generation_id": "g1", "index": 0}},
            headers=_auth(),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "recorded" and body["id"]
        assert len(stub_db.conversation_events.docs) == 1
        ev = stub_db.conversation_events.docs[0]
        assert ev["user_id"] == FAKE_USER_ID
        assert ev["type"] == "reply_copied"
        assert ev["source"] == "mobile"

    def test_user_id_comes_from_token_not_body(self, client, stub_db):
        client.post(
            "/api/events",
            json={
                "type": "tone_selected",
                "payload": {"tone": "Funny", "user_id": "attacker"},
            },
            headers=_auth(),
        )
        ev = stub_db.conversation_events.docs[0]
        assert ev["user_id"] == FAKE_USER_ID  # top-level scoping wins

    def test_server_only_type_rejected(self, client, stub_db):
        r = client.post(
            "/api/events",
            json={"type": "reply_generated", "payload": {}},
            headers=_auth(),
        )
        assert r.status_code == 400
        assert stub_db.conversation_events.docs == []

    def test_unknown_type_rejected(self, client):
        r = client.post(
            "/api/events", json={"type": "hack_the_planet", "payload": {}}, headers=_auth()
        )
        assert r.status_code == 400

    def test_oversized_payload_rejected(self, client):
        r = client.post(
            "/api/events",
            json={"type": "reply_edited", "payload": {"blob": "x" * 9000}},
            headers=_auth(),
        )
        assert r.status_code == 422

    def test_conversation_id_passthrough(self, client, stub_db):
        client.post(
            "/api/events",
            json={"type": "reply_copied", "payload": {}, "conversation_id": "card-9"},
            headers=_auth(),
        )
        assert stub_db.conversation_events.docs[0]["conversation_id"] == "card-9"


class TestGenerateRepliesCapture:
    def test_response_shape_unchanged_and_events_recorded(self, client, stub_db):
        r = client.post(
            "/api/generate-replies",
            data={
                "platform": "instagram",
                "vibe": "Playful",
                "language": "Hinglish",
                "manual_text": "her: kya plan hai?",
            },
            headers=_auth(),
        )
        assert r.status_code == 200, r.text
        # Byte-compat: exact legacy key set, nothing extra with the flag off.
        assert set(r.json().keys()) == {
            "generation_id", "replies", "tone_notes",
            "daily_generation_count", "daily_limit", "plan",
        }
        types_seen = [e["type"] for e in stub_db.conversation_events.docs]
        assert types_seen == ["reply_requested", "reply_generated"]
        requested = stub_db.conversation_events.docs[0]
        assert requested["payload"]["surface"] == "reply"
        # Memory minimization: never the chat text itself.
        assert "manual_text" not in requested["payload"]
        assert requested["payload"]["text_chars"] > 0
        generated = stub_db.conversation_events.docs[1]
        assert len(generated["payload"]["variant_features"]) == 3
        assert all(
            set(v) == {"chars", "emoji_count"}
            for v in generated["payload"]["variant_features"]
        )

    def test_event_write_failure_never_breaks_generation(self, client, stub_db):
        stub_db.conversation_events.fail_insert = True
        r = client.post(
            "/api/generate-replies",
            data={
                "platform": "instagram",
                "vibe": "Playful",
                "language": "Hinglish",
                "manual_text": "hi",
            },
            headers=_auth(),
        )
        assert r.status_code == 200, r.text
        assert r.json()["replies"] == ["r1", "r2", "r3"]


class TestFeedbackDualWrite:
    def test_copy_feedback_writes_reply_copied_event(self, client, stub_db):
        stub_db.generations.docs.append(
            {
                "id": "gen-77",
                "user_id": FAKE_USER_ID,
                "generated_replies": ["a", "b", "c"],
                "memory_card_id": "card-1",
                "stage": None,
            }
        )
        r = client.post(
            "/api/feedback",
            json={"generation_id": "gen-77", "copied_reply_index": 1},
            headers=_auth(),
        )
        assert r.status_code == 200
        events = [e for e in stub_db.conversation_events.docs if e["type"] == "reply_copied"]
        assert len(events) == 1
        assert events[0]["payload"]["text"] == "b"
        assert events[0]["payload"]["index"] == 1
        assert events[0]["conversation_id"] == "card-1"
        assert events[0]["source"] == "feedback"

    def test_feedback_only_no_copy_event(self, client, stub_db):
        stub_db.generations.docs.append(
            {"id": "gen-88", "user_id": FAKE_USER_ID, "generated_replies": ["a"]}
        )
        client.post(
            "/api/feedback",
            json={"generation_id": "gen-88", "feedback": "nice"},
            headers=_auth(),
        )
        assert all(e["type"] != "reply_copied" for e in stub_db.conversation_events.docs)


class TestPausedMemory:
    def test_paused_user_events_skipped(self, client, stub_db):
        stub_db.users.docs.append({"id": FAKE_USER_ID, "memory_paused": True})
        r = client.post(
            "/api/events",
            json={"type": "reply_copied", "payload": {}},
            headers=_auth(),
        )
        assert r.status_code == 200  # silent no-op, client never retries
        assert stub_db.conversation_events.docs == []
