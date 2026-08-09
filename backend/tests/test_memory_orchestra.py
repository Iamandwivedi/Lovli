"""PR-M5 pytest suite — flag-gated personalization + reranking.

Covers: flag off → byte-identical responses; cold start → no style block; warm
memory → style block in the LLM request, reranked replies with labels in
lockstep, memory_used present; pure rerank behavior; honest signals only.
"""
from __future__ import annotations

import asyncio
import copy

import pytest
from fastapi.testclient import TestClient

import server as srv
import llm_service as lm
from engine import memory as mem
from engine.memory import record_conversation_event, rebuild_user_memory
from engine.memory_context import clear_memory_context_cache
from engine.reply_orchestrator import GenerationPlan, build_memory_used
from engine.reply_scoring import rerank_replies, score_reply
from tests._memstub import MemDb

FAKE_USER_ID = "pytest-user-orch"
FAKE_USER = {
    "id": FAKE_USER_ID,
    "plan": "free",
    "daily_generation_count": 0,
    "daily_limit": 10,
    "last_generation_reset_date": None,
    "timezone": "Asia/Kolkata",
}

RICH_FIXTURE = {
    "read": {
        "situation": "interested signals",
        "temperature": "interested",
        "signals": ["asked follow-up"],
        "outcome": ["will keep flirt going"],
    },
    "replies": [
        {
            "text": "Hey there! That sounds absolutely amazing, I would love to "
            "hear every single detail about it whenever you have time! 😍😍",
            "label": "Sincere",
        },
        {"text": "haha sounds good, batao kab", "label": "Safe"},
        {"text": "bold move. I like it 😏", "label": "Bold"},
    ],
    "tone_notes": "playful match",
    "wingman_advice": "I'd lead with the short one",
}


def _run(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


async def _fake_get_user(_uid):
    return dict(FAKE_USER)


async def _fake_maybe_reset_daily(user, _local):
    return user


@pytest.fixture()
def db(monkeypatch):
    stub = MemDb()
    monkeypatch.setattr(srv, "db", stub)
    monkeypatch.setattr(srv, "_get_user", _fake_get_user)
    monkeypatch.setattr(srv, "_maybe_reset_daily", _fake_maybe_reset_daily)
    monkeypatch.setattr(mem, "schedule_rebuild", lambda *a, **k: None)
    clear_memory_context_cache()
    return stub


@pytest.fixture()
def captured(monkeypatch):
    """Capture the LovliRequest the endpoint builds."""
    box: dict = {}

    async def fake_generate(req: lm.LovliRequest) -> dict:
        box["req"] = req
        return copy.deepcopy(RICH_FIXTURE)

    monkeypatch.setattr(srv, "generate_replies", fake_generate)
    return box


@pytest.fixture()
def client(db, captured):
    srv.app.dependency_overrides[srv.get_current_user_id] = lambda: FAKE_USER_ID
    yield TestClient(srv.app)
    srv.app.dependency_overrides.pop(srv.get_current_user_id, None)


def _post(client, **extra):
    data = {
        "platform": "instagram",
        "vibe": "Playful",
        "language": "Hinglish",
        "manual_text": "her: kya plan hai?",
        "rich": "true",
    }
    data.update(extra)
    return client.post(
        "/api/generate-replies", data=data, headers={"Authorization": "Bearer t"}
    )


async def _warm_memory(db, n=25):
    """Seed a user who consistently copies short, emoji-free, casual replies."""
    for i in range(n):
        await record_conversation_event(
            db,
            user_id=FAKE_USER_ID,
            type="reply_copied",
            payload={"generation_id": f"g{i}", "index": 1,
                     "text": "haha sounds good, batao kab", "label": "Safe"},
        )
    await record_conversation_event(
        db,
        user_id=FAKE_USER_ID,
        type="phrase_disliked",
        payload={"phrase": "hey there"},
    )
    await rebuild_user_memory(db, FAKE_USER_ID)
    clear_memory_context_cache()


class TestFlagOff:
    def test_no_flag_response_byte_identical(self, client, db, monkeypatch):
        monkeypatch.delenv("MEMORY_ENGINE_ENABLED", raising=False)
        _run(_warm_memory(db))
        r = _post(client)
        assert r.status_code == 200, r.text
        b = r.json()
        assert set(b.keys()) == {
            "generation_id", "replies", "tone_notes", "daily_generation_count",
            "daily_limit", "plan", "reply_labels", "read", "insight",
        }
        assert "memory_used" not in b
        # LLM order preserved — no rerank with the flag off.
        assert b["reply_labels"] == ["Sincere", "Safe", "Bold"]

    def test_flag_off_no_style_context(self, client, db, captured, monkeypatch):
        monkeypatch.delenv("MEMORY_ENGINE_ENABLED", raising=False)
        _run(_warm_memory(db))
        _post(client)
        assert captured["req"].style_context is None


class TestFlagOnColdStart:
    def test_cold_start_no_style_block_no_memory_used(self, client, captured, monkeypatch):
        monkeypatch.setenv("MEMORY_ENGINE_ENABLED", "true")
        r = _post(client)
        assert r.status_code == 200
        assert captured["req"].style_context is None
        assert "memory_used" not in r.json()


class TestFlagOnWarm:
    def test_style_block_in_llm_request(self, client, db, captured, monkeypatch):
        monkeypatch.setenv("MEMORY_ENGINE_ENABLED", "true")
        _run(_warm_memory(db))
        _post(client)
        block = captured["req"].style_context
        assert block and "TEXTING STYLE" in block
        assert "hey there" in block  # blacklisted phrase surfaced to the model

    def test_rerank_short_reply_first_labels_lockstep(self, client, db, monkeypatch):
        monkeypatch.setenv("MEMORY_ENGINE_ENABLED", "true")
        _run(_warm_memory(db))
        b = _post(client).json()
        # The long, emoji-heavy, "Hey there!" variant must not lead.
        assert b["replies"][0] == "haha sounds good, batao kab"
        assert b["reply_labels"][0] == "Safe"
        # Same (reply, label) pairs, only reordered.
        assert sorted(zip(b["replies"], b["reply_labels"])) == sorted(
            zip(
                [r["text"] for r in RICH_FIXTURE["replies"]],
                [r["label"] for r in RICH_FIXTURE["replies"]],
            )
        )

    def test_memory_used_present_and_honest(self, client, db, monkeypatch):
        monkeypatch.setenv("MEMORY_ENGINE_ENABLED", "true")
        _run(_warm_memory(db))
        b = _post(client).json()
        mu = b["memory_used"]
        assert mu["is_personalized"] is True
        assert mu["signals"]
        # Honesty rule: no fabricated counts/percentages in signals.
        assert all(not any(ch.isdigit() for ch in s) for s in mu["signals"])

    def test_generation_doc_gets_scores_and_snapshot(self, client, db, monkeypatch):
        monkeypatch.setenv("MEMORY_ENGINE_ENABLED", "true")
        _run(_warm_memory(db))
        _post(client)
        gen = db.generations.docs[-1]
        assert gen["reply_scores"] is not None and len(gen["reply_scores"]) == 3
        assert gen["memory_snapshot"]["level"] in ("weak", "confident", "full")


class TestPureRerank:
    def _plan(self, **kw):
        defaults = dict(
            level="confident",
            style_constraints={"message_length": "short", "emoji_usage": "none"},
            phrase_avoid=["hey there"],
        )
        defaults.update(kw)
        return GenerationPlan(**defaults)

    def test_blacklist_penalty_flips_order(self):
        plan = self._plan(style_constraints={})
        replies = ["hey there, coffee sometime?", "coffee sometime?"]
        out, labels, scores = rerank_replies(replies, ["Safe", "Bold"], plan)
        assert out[0] == "coffee sometime?"
        assert labels == ["Bold", "Safe"]
        assert scores[0] > scores[1]

    def test_ties_keep_llm_order(self):
        plan = GenerationPlan(level="weak")
        replies = ["first", "second", "third"]
        out, labels, _ = rerank_replies(replies, ["Safe", "Flirty", "Bold"], plan)
        assert out == replies
        assert labels == ["Safe", "Flirty", "Bold"]

    def test_never_rewrites_text(self):
        plan = self._plan()
        replies = ["hey there!! 😍😍 long one", "short"]
        out, _, _ = rerank_replies(replies, None, plan)
        assert sorted(out) == sorted(replies)

    def test_short_preference_scores_short_higher(self):
        plan = self._plan()
        long_reply = "x" * 200
        assert score_reply("short one", "Safe", plan) > score_reply(long_reply, "Safe", plan)

    def test_avoid_tone_penalized(self):
        plan = self._plan(avoid_tones=["bold"])
        assert score_reply("same text", "Safe", plan) > score_reply("same text", "Bold", plan)


class TestMemoryUsedHonesty:
    def test_empty_plan_returns_none(self):
        assert build_memory_used(GenerationPlan(level="none")) is None

    def test_boundaries_alone_count_as_personalized(self):
        plan = GenerationPlan(level="none", boundaries=["never use pet names"])
        mu = build_memory_used(plan)
        assert mu is not None and mu["is_personalized"] is True
