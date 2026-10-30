"""
PR-NOTED pytest suite — "Noted:" fact proposals on /generate-replies.

Covers:
  - llm_service.sanitize_suggested_facts: strings only, trim, max 2, kind
    fallback, case-insensitive de-dupe, non-list → [].
  - llm_service.build_user_prompt_v2(suggest_facts=...): default keeps the
    rich prompt byte-identical; True adds the suggested_facts contract.
  - llm_service.validate_payload_v2: suggested_facts is soft-optional (junk
    never fails the generation).
  - server /generate-replies: suggested_facts present (possibly []) only when
    rich=true AND the memory card resolved; facts already on the card are
    dropped case-insensitively; malformed model output is ignored; rich=false
    and card-less rich responses are unchanged (no key at all).

Mocks auth + DB + LLM so the suite runs without a real Anthropic / Emergent key.
"""
from __future__ import annotations

import copy
import types

import pytest
from fastapi.testclient import TestClient

import server as srv
import llm_service as lm
from models import GenerateRepliesResponse, SuggestedFact


# ---- sanitize_suggested_facts ----------------------------------------------

class TestSanitizeSuggestedFacts:
    def test_non_list_is_empty(self):
        assert lm.sanitize_suggested_facts(None) == []
        assert lm.sanitize_suggested_facts("likes chai") == []
        assert lm.sanitize_suggested_facts({"text": "likes chai"}) == []
        assert lm.sanitize_suggested_facts(42) == []

    def test_trims_and_drops_empty_or_non_string(self):
        out = lm.sanitize_suggested_facts(
            [
                {"text": "  likes chai dates  ", "kind": "like"},
                {"text": "   ", "kind": "like"},
                {"text": 123, "kind": "like"},
                {"kind": "like"},
                42,
                None,
                ["not", "a", "fact"],
            ]
        )
        assert out == [{"text": "likes chai dates", "kind": "like"}]

    def test_bare_strings_become_like_facts(self):
        out = lm.sanitize_suggested_facts(["lives in Koramangala"])
        assert out == [{"text": "lives in Koramangala", "kind": "like"}]

    def test_caps_at_two_by_default(self):
        raw = [{"text": "a", "kind": "like"}, {"text": "b", "kind": "avoid"}, {"text": "c", "kind": "date"}]
        out = lm.sanitize_suggested_facts(raw)
        assert len(out) == lm.SUGGESTED_FACTS_MAX == 2
        assert [f["text"] for f in out] == ["a", "b"]
        # max_items=None → uncapped (endpoint caps after de-dupe)
        assert [f["text"] for f in lm.sanitize_suggested_facts(raw, max_items=None)] == ["a", "b", "c"]

    def test_kind_lowercased_and_falls_back_to_like(self):
        out = lm.sanitize_suggested_facts(
            [{"text": "hates loud bars", "kind": "AVOID"}, {"text": "trek on Sunday", "kind": "plan"}]
        )
        assert out == [
            {"text": "hates loud bars", "kind": "avoid"},
            {"text": "trek on Sunday", "kind": "like"},
        ]

    def test_dedupes_case_insensitively(self):
        out = lm.sanitize_suggested_facts(
            [{"text": "Likes Chai", "kind": "like"}, {"text": "likes chai", "kind": "like"}, {"text": "x", "kind": "like"}]
        )
        assert [f["text"] for f in out] == ["Likes Chai", "x"]

    def test_overlong_text_dropped(self):
        out = lm.sanitize_suggested_facts([{"text": "x" * 500, "kind": "like"}])
        assert out == []

    def test_output_fits_suggested_fact_model(self):
        for f in lm.sanitize_suggested_facts([{"text": "a", "kind": "date"}, "b"]):
            SuggestedFact(**f)  # no raise


# ---- build_user_prompt_v2(suggest_facts) -----------------------------------

_PROMPT_KW = dict(
    platform="instagram",
    vibe="Playful",
    language="Hinglish",
    manual_text="her: koramangala mein hi rehti hoon, chai date chalega?",
    user_note=None,
    has_image=False,
    memory_context="Nickname: K.",
)


class TestPromptContract:
    def test_default_prompt_byte_identical(self):
        assert lm.build_user_prompt_v2(**_PROMPT_KW) == lm.build_user_prompt_v2(
            **_PROMPT_KW, suggest_facts=False
        )
        assert "suggested_facts" not in lm.build_user_prompt_v2(**_PROMPT_KW)

    def test_suggest_facts_adds_contract(self):
        prompt = lm.build_user_prompt_v2(**_PROMPT_KW, suggest_facts=True)
        assert '"suggested_facts"' in prompt
        assert "like | avoid | date" in prompt
        # grounding + empty-list instruction
        assert "never infer" in prompt
        assert "empty list []" in prompt
        assert "RICH MODE" in prompt  # rest of the rich prompt intact

    def test_lovli_request_defaults_suggest_facts_false(self):
        req = lm.LovliRequest(platform="instagram", vibe="Playful", language="Hinglish")
        assert req.suggest_facts is False


# ---- validate_payload_v2 soft-optional --------------------------------------

def _good_rich():
    return {
        "read": {
            "situation": "She is interested.",
            "temperature": "interested",
            "signals": ["asked a follow-up"],
            "outcome": ["these replies will likely keep flirt going"],
        },
        "replies": [
            {"text": "haha", "label": "Safe"},
            {"text": "okay you got me", "label": "Flirty"},
            {"text": "say less", "label": "Bold"},
        ],
        "tone_notes": "Playful match.",
    }


class TestValidatePayloadV2SuggestedFacts:
    def test_absent_stays_absent(self):
        p = _good_rich()
        lm.validate_payload_v2(p)
        assert "suggested_facts" not in p

    def test_junk_is_dropped_not_fatal(self):
        for junk in ("nope", 7, {"text": "x"}, [1, 2], [{"kind": "like"}]):
            p = _good_rich()
            p["suggested_facts"] = junk
            lm.validate_payload_v2(p)  # no raise
            assert "suggested_facts" not in p

    def test_good_list_is_cleaned_in_place(self):
        p = _good_rich()
        p["suggested_facts"] = [
            {"text": " lives in Koramangala ", "kind": "Like"},
            "likes chai dates",
            {"text": "third", "kind": "date"},
        ]
        lm.validate_payload_v2(p)
        assert p["suggested_facts"] == [
            {"text": "lives in Koramangala", "kind": "like"},
            {"text": "likes chai dates", "kind": "like"},
        ]


# ---- models -----------------------------------------------------------------

class TestModels:
    def test_response_defaults_suggested_facts_none(self):
        r = GenerateRepliesResponse(
            generation_id="g1", replies=["a", "b", "c"], tone_notes="t",
            daily_generation_count=1, daily_limit=8, plan="free",
        )
        assert r.suggested_facts is None

    def test_suggested_fact_kind_literal(self):
        SuggestedFact(text="x", kind="avoid")
        with pytest.raises(Exception):
            SuggestedFact(text="x", kind="plan")  # type: ignore[arg-type]


# ---- /generate-replies endpoint ---------------------------------------------

FAKE_USER_ID = "pytest-noted-user"
FAKE_USER = {
    "id": FAKE_USER_ID,
    "plan": "free",
    "daily_generation_count": 0,
    "daily_limit": 8,
    "last_generation_reset_date": None,
    "timezone": "Asia/Kolkata",
}

CARD_ID = "card-k"
CARD = {
    "id": CARD_ID,
    "user_id": FAKE_USER_ID,
    "nickname": "K",
    "facts": [
        {"text": "Lives in Koramangala", "kind": "like"},
        {"text": "hates loud bars", "kind": "avoid"},
    ],
}

LEGACY_FIXTURE = {"replies": ["r1", "r2", "r3"], "tone_notes": "playful match"}

RICH_BASE = {
    "read": {
        "situation": "interested signals",
        "temperature": "interested",
        "signals": ["asked follow-up"],
        "outcome": ["will keep flirt going"],
    },
    "replies": [
        {"text": "r1", "label": "Safe"},
        {"text": "r2", "label": "Flirty"},
        {"text": "r3", "label": "Bold"},
    ],
    "tone_notes": "playful match",
    "wingman_advice": "I'd lead with the flirty one",
}

# Mutable knobs the tests flip per call.
_state: dict = {"suggested": None, "last_req": None}


class _StubCol:
    @staticmethod
    async def update_one(*a, **k):
        return types.SimpleNamespace(matched_count=1, modified_count=1)

    @staticmethod
    async def insert_one(*a, **k):
        return types.SimpleNamespace(inserted_id="x")

    @staticmethod
    async def find_one(*a, **k):
        return None


class _MemoryCardsCol(_StubCol):
    @staticmethod
    async def find_one(query, *a, **k):
        if query.get("id") == CARD_ID and query.get("user_id") == FAKE_USER_ID:
            return copy.deepcopy(CARD)
        return None


class _StubDb:
    users = _StubCol()
    generations = _StubCol()
    memory_cards = _MemoryCardsCol()
    conversation_events = _StubCol()


async def _fake_get_user(_uid):
    return dict(FAKE_USER)


async def _fake_maybe_reset_daily(user, _local):
    return user


@pytest.fixture(scope="module")
def client():
    srv.db = _StubDb()  # type: ignore[attr-defined]
    srv._get_user = _fake_get_user  # type: ignore[attr-defined]
    srv._maybe_reset_daily = _fake_maybe_reset_daily  # type: ignore[attr-defined]
    srv.app.dependency_overrides[srv.get_current_user_id] = lambda: FAKE_USER_ID

    async def fake_generate(req: lm.LovliRequest) -> dict:
        _state["last_req"] = req
        if not req.rich:
            return copy.deepcopy(LEGACY_FIXTURE)
        out = copy.deepcopy(RICH_BASE)
        if _state["suggested"] is not None:
            # Raw model output, deliberately NOT passed through validate_payload_v2
            # so the endpoint's own defensive validation is what's under test.
            out["suggested_facts"] = copy.deepcopy(_state["suggested"])
        return out

    srv.generate_replies = fake_generate  # type: ignore[attr-defined]
    return TestClient(srv.app)


@pytest.fixture(autouse=True)
def _reset_state():
    _state["suggested"] = None
    _state["last_req"] = None
    yield


def _post(client, rich=None, suggested=None, **extra):
    _state["suggested"] = suggested
    data = {
        "platform": "instagram",
        "vibe": "Playful",
        "language": "Hinglish",
        "manual_text": "her: koramangala mein hi rehti hoon, chai date chalega?",
    }
    if rich is not None:
        data["rich"] = rich
    data.update(extra)
    r = client.post(
        "/api/generate-replies",
        data=data,
        headers={"Authorization": "Bearer test-token"},
    )
    assert r.status_code == 200, r.text
    return r.json()


LEGACY_KEYS = {
    "generation_id", "replies", "tone_notes",
    "daily_generation_count", "daily_limit", "plan",
}
RICH_KEYS = LEGACY_KEYS | {"reply_labels", "read", "insight"}


class TestGenerateRepliesSuggestedFacts:
    # ---- present only when rich AND card ----------------------------------
    def test_rich_with_card_returns_new_facts(self, client):
        b = _post(
            client, rich="true", memory_card_id=CARD_ID,
            suggested=[
                {"text": "likes chai dates", "kind": "like"},
                {"text": "free on Sunday evening", "kind": "date"},
            ],
        )
        assert set(b.keys()) == RICH_KEYS | {"suggested_facts"}
        assert b["suggested_facts"] == [
            {"text": "likes chai dates", "kind": "like"},
            {"text": "free on Sunday evening", "kind": "date"},
        ]
        assert _state["last_req"].suggest_facts is True

    def test_rich_with_card_and_nothing_proposed_is_empty_list(self, client):
        b = _post(client, rich="true", memory_card_id=CARD_ID, suggested=[])
        assert b["suggested_facts"] == []
        b = _post(client, rich="true", memory_card_id=CARD_ID, suggested=None)
        assert b["suggested_facts"] == []

    # ---- de-dupe against the card ------------------------------------------
    def test_facts_already_on_card_dropped_case_insensitive(self, client):
        b = _post(
            client, rich="true", memory_card_id=CARD_ID,
            suggested=[
                {"text": "lives in koramangala", "kind": "like"},   # on card (case differs)
                {"text": "  Hates   loud bars ", "kind": "avoid"},  # on card (whitespace)
                {"text": "likes chai dates", "kind": "like"},       # new
            ],
        )
        assert b["suggested_facts"] == [{"text": "likes chai dates", "kind": "like"}]

    def test_all_facts_already_on_card_gives_empty_list(self, client):
        b = _post(
            client, rich="true", memory_card_id=CARD_ID,
            suggested=[{"text": "Lives in Koramangala", "kind": "like"}],
        )
        assert b["suggested_facts"] == []

    def test_dedupe_runs_before_cap(self, client):
        # 3 proposed, first already on the card → it is dropped and the two
        # genuinely new ones survive (cap of 2 applies AFTER de-dupe).
        b = _post(
            client, rich="true", memory_card_id=CARD_ID,
            suggested=[
                {"text": "lives in Koramangala", "kind": "like"},
                {"text": "likes chai dates", "kind": "like"},
                {"text": "third one", "kind": "like"},
            ],
        )
        assert b["suggested_facts"] == [
            {"text": "likes chai dates", "kind": "like"},
            {"text": "third one", "kind": "like"},
        ]

    def test_cap_still_two_after_dedupe(self, client):
        b = _post(
            client, rich="true", memory_card_id=CARD_ID,
            suggested=[
                {"text": "lives in Koramangala", "kind": "like"},
                {"text": "a", "kind": "like"},
                {"text": "b", "kind": "like"},
                {"text": "c", "kind": "like"},
            ],
        )
        assert [f["text"] for f in b["suggested_facts"]] == ["a", "b"]

    # ---- absent for rich=false ---------------------------------------------
    def test_rich_false_with_card_omits_key(self, client):
        for rich in (None, "false"):
            b = _post(
                client, rich=rich, memory_card_id=CARD_ID,
                suggested=[{"text": "likes chai dates", "kind": "like"}],
            )
            assert set(b.keys()) == LEGACY_KEYS
            assert "suggested_facts" not in b
            assert _state["last_req"].suggest_facts is False

    # ---- absent for rich=true without a card --------------------------------
    def test_rich_without_card_omits_key(self, client):
        b = _post(client, rich="true", suggested=[{"text": "likes chai dates", "kind": "like"}])
        assert set(b.keys()) == RICH_KEYS
        assert _state["last_req"].suggest_facts is False

    def test_rich_with_unknown_card_omits_key(self, client):
        b = _post(
            client, rich="true", memory_card_id="no-such-card",
            suggested=[{"text": "likes chai dates", "kind": "like"}],
        )
        assert set(b.keys()) == RICH_KEYS
        assert _state["last_req"].suggest_facts is False

    # ---- malformed model output ignored -------------------------------------
    @pytest.mark.parametrize(
        "junk",
        [
            "likes chai dates",          # not a list
            {"text": "likes chai"},      # object instead of list
            42,
            [1, 2, 3],
            [{"kind": "like"}],          # no text
            [{"text": 99, "kind": "like"}],
            [{"text": "   ", "kind": "like"}],
            [[["nested"]]],
        ],
    )
    def test_malformed_output_ignored(self, client, junk):
        b = _post(client, rich="true", memory_card_id=CARD_ID, suggested=junk)
        assert b["suggested_facts"] == []
        # rest of the rich contract untouched
        assert b["replies"] == ["r1", "r2", "r3"]
        assert b["reply_labels"] == ["Safe", "Flirty", "Bold"]

    def test_partially_malformed_keeps_only_valid(self, client):
        b = _post(
            client, rich="true", memory_card_id=CARD_ID,
            suggested=[
                None,
                {"text": "  free on Sunday evening ", "kind": "DATE"},
                {"text": "", "kind": "like"},
                {"text": "wants to try the new ramen place", "kind": "wish"},
            ],
        )
        assert b["suggested_facts"] == [
            {"text": "free on Sunday evening", "kind": "date"},
            {"text": "wants to try the new ramen place", "kind": "like"},
        ]
