"""PR-M4 pytest suite — memory context, summary/controls API, user isolation.

Offline: MemDb stub, stub auth, no LLM calls needed.
"""
from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

import server as srv
from engine import memory as mem
from engine.memory import delete_user_memory, rebuild_user_memory, record_conversation_event
from engine.memory_context import (
    clear_memory_context_cache,
    get_memory_context,
)
from engine.reply_orchestrator import build_generation_plan, plan_to_prompt_block
from tests._memstub import MemDb

USER_A = "user-a"
USER_B = "user-b"


def _run(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


@pytest.fixture()
def db(monkeypatch):
    stub = MemDb()
    monkeypatch.setattr(srv, "db", stub)
    monkeypatch.setattr(mem, "schedule_rebuild", lambda *a, **k: None)
    clear_memory_context_cache()
    return stub


@pytest.fixture()
def client(db):
    srv.app.dependency_overrides[srv.get_current_user_id] = lambda: USER_A
    yield TestClient(srv.app)
    srv.app.dependency_overrides.pop(srv.get_current_user_id, None)


def _auth():
    return {"Authorization": "Bearer test-token"}


async def _seed_copies(db, user_id: str, n: int, text="sounds good, batao kab"):
    for i in range(n):
        await record_conversation_event(
            db,
            user_id=user_id,
            type="reply_copied",
            payload={"generation_id": f"g-{user_id}-{i}", "index": 0,
                     "text": text, "label": "Safe"},
        )
    await rebuild_user_memory(db, user_id)


class TestGates:
    def test_cold_start_level_none(self, db):
        async def run():
            ctx = await get_memory_context(db, USER_A)
            assert ctx.is_cold_start and ctx.level == "none"

        _run(run())

    @pytest.mark.parametrize(
        "n,expected", [(3, "none"), (5, "weak"), (20, "confident"), (50, "full")]
    )
    def test_signal_gates(self, db, n, expected):
        async def run():
            await _seed_copies(db, USER_A, n)
            clear_memory_context_cache()
            ctx = await get_memory_context(db, USER_A)
            assert ctx.level == expected

        _run(run())

    def test_prompt_text_none_at_level_none(self, db):
        async def run():
            await _seed_copies(db, USER_A, 2)
            clear_memory_context_cache()
            ctx = await get_memory_context(db, USER_A)
            plan = build_generation_plan(ctx, vibe="Playful")
            assert plan_to_prompt_block(plan) is None

        _run(run())

    def test_weak_level_only_length_and_emoji(self, db):
        async def run():
            await _seed_copies(db, USER_A, 8)
            clear_memory_context_cache()
            ctx = await get_memory_context(db, USER_A)
            plan = build_generation_plan(ctx, vibe="Playful")
            assert set(plan.style_constraints) <= {"message_length", "emoji_usage"}
            assert plan.phrase_avoid == []

        _run(run())

    def test_cold_start_uses_onboarding_style(self, db):
        async def run():
            await db.users.insert_one({"id": USER_A, "preferred_style": "short and casual"})
            ctx = await get_memory_context(db, USER_A)
            plan = build_generation_plan(ctx, vibe="Playful")
            block = plan_to_prompt_block(plan)
            assert block and "short and casual" in block

        _run(run())


class TestCache:
    def test_cache_hit_and_invalidation_on_event(self, db):
        async def run():
            ctx1 = await get_memory_context(db, USER_A)
            assert ctx1.signal_count == 0
            await _seed_copies(db, USER_A, 6)
            # record_conversation_event invalidated the cache — fresh read now.
            ctx2 = await get_memory_context(db, USER_A)
            assert ctx2.signal_count == 6

        _run(run())


class TestSummaryEndpoint:
    def test_cold_start_shape(self, client):
        r = client.get("/api/memory/summary", headers=_auth())
        assert r.status_code == 200
        b = r.json()
        assert b["is_cold_start"] is True
        assert b["event_count"] == 0
        assert b["paused"] is False
        assert b["texting_style"] == []
        assert b["learned"] == []

    def test_summary_after_learning(self, client, db):
        _run(_seed_copies(db, USER_A, 25))
        r = client.get("/api/memory/summary", headers=_auth())
        b = r.json()
        assert b["is_cold_start"] is False
        assert b["event_count"] == 25
        assert any("short" in s.lower() for s in b["texting_style"])
        assert b["learned"] and all(
            {"id", "domain", "key", "label", "confidence", "support_count"} <= set(i)
            for i in b["learned"]
        )
        # Evidence ids never leave the server.
        assert all("evidence_event_ids" not in i for i in b["learned"])


class TestDeleteMemory:
    def test_delete_wipes_only_caller(self, client, db):
        _run(_seed_copies(db, USER_A, 10))
        _run(_seed_copies(db, USER_B, 10))
        r = client.delete("/api/memory", headers=_auth())
        assert r.status_code == 200
        assert r.json()["ok"] is True

        async def check():
            a_events = await db.conversation_events.count_documents({"user_id": USER_A})
            b_events = await db.conversation_events.count_documents({"user_id": USER_B})
            # Only the fresh memory_reset marker remains for A.
            assert a_events == 1
            assert b_events == 10
            a_atoms = await db.memory_atoms.count_documents({"user_id": USER_A})
            b_atoms = await db.memory_atoms.count_documents({"user_id": USER_B})
            assert a_atoms == 0
            assert b_atoms > 0

        _run(check())

    def test_summary_cold_after_delete(self, client, db):
        _run(_seed_copies(db, USER_A, 10))
        client.delete("/api/memory", headers=_auth())
        # delete_user_memory schedules no rebuild in tests; profile doc is gone.
        b = client.get("/api/memory/summary", headers=_auth()).json()
        assert b["event_count"] == 0
        assert b["learned"] == []


class TestRemovePreference:
    def test_remove_tombstones_and_survives_rebuild(self, client, db):
        _run(_seed_copies(db, USER_A, 10))

        async def get_short_atom():
            return await db.memory_atoms.find_one(
                {"user_id": USER_A, "key": "message_length.short"}
            )

        atom = _run(get_short_atom())
        assert atom is not None
        r = client.delete(f"/api/memory/preferences/{atom['id']}", headers=_auth())
        assert r.status_code == 200
        assert _run(get_short_atom()) is None
        # Explicit rebuild — the tombstone event must keep it gone.
        _run(rebuild_user_memory(srv.db, USER_A))
        assert _run(get_short_atom()) is None

    def test_remove_unknown_atom_404(self, client):
        r = client.delete("/api/memory/preferences/nope", headers=_auth())
        assert r.status_code == 404

    def test_cannot_remove_other_users_atom(self, client, db):
        _run(_seed_copies(db, USER_B, 10))

        async def get_b_atom():
            return await db.memory_atoms.find_one(
                {"user_id": USER_B, "key": "message_length.short"}
            )

        atom = _run(get_b_atom())
        r = client.delete(f"/api/memory/preferences/{atom['id']}", headers=_auth())
        assert r.status_code == 404  # A cannot see B's atom
        assert _run(get_b_atom()) is not None


class TestPause:
    def test_pause_blocks_capture(self, client, db):
        _run(db.users.insert_one({"id": USER_A, "memory_paused": False}))
        r = client.post("/api/memory/pause", json={"paused": True}, headers=_auth())
        assert r.status_code == 200

        async def try_event():
            await record_conversation_event(
                srv.db, user_id=USER_A, type="reply_copied", payload={}
            )
            return await db.conversation_events.count_documents({"user_id": USER_A})

        assert _run(try_event()) == 0

    def test_unpause_restores_capture(self, client, db):
        _run(db.users.insert_one({"id": USER_A, "memory_paused": True}))
        client.post("/api/memory/pause", json={"paused": False}, headers=_auth())

        async def try_event():
            await record_conversation_event(
                srv.db, user_id=USER_A, type="reply_copied", payload={}
            )
            return await db.conversation_events.count_documents({"user_id": USER_A})

        assert _run(try_event()) == 1


class TestIsolation:
    def test_rebuild_a_never_touches_b(self, db):
        async def run():
            await _seed_copies(db, USER_A, 6)
            await _seed_copies(db, USER_B, 6)
            b_before = await db.memory_atoms.find(
                {"user_id": USER_B}
            ).to_list(None)
            await delete_user_memory(db, USER_A)
            b_after = await db.memory_atoms.find({"user_id": USER_B}).to_list(None)
            assert b_before == b_after

        _run(run())
