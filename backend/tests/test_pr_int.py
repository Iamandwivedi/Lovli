"""
PR-INT pytest suite — Reply Intelligence (rich mode) coverage.

Covers:
  - llm_service: LovliRequest.rich, build_user_prompt_v2, validate_payload_v2,
    RICH_LABELS_ALLOWED, RICH_TEMPERATURE_ALLOWED.
  - server: /generate-replies legacy 6-key shape vs rich 8-key shape, label/read
    flattening, response_model_exclude_none.
  - models: ReplyRead temperature Literal, GenerateRepliesResponse optional fields.

Mocks auth + DB + LLM so the suite runs without a real Anthropic / Emergent key.
"""
from __future__ import annotations

import types

import pytest
from fastapi.testclient import TestClient

import server as srv
import llm_service as lm
from models import GenerateRepliesResponse, ReplyRead


# ---- llm_service module surface ---------------------------------------------

class TestLlmServiceSurface:
    def test_rich_labels_allowed_exact_set(self):
        assert lm.RICH_LABELS_ALLOWED == (
            "Safe", "Flirty", "Bold", "Funny", "Sincere", "Confident",
        )

    def test_rich_temperature_allowed_exact_set(self):
        assert lm.RICH_TEMPERATURE_ALLOWED == ("interested", "neutral", "cold")

    def test_lovli_request_has_rich_default_false(self):
        req = lm.LovliRequest(platform="instagram", vibe="Playful", language="Hinglish")
        assert hasattr(req, "rich")
        assert req.rich is False

    def test_build_user_prompt_v2_exists_and_emits_rich_instruction(self):
        prompt = lm.build_user_prompt_v2(
            platform="instagram",
            vibe="Playful",
            language="Hinglish",
            manual_text="her: 'kya kar raha hai'",
            user_note=None,
            has_image=False,
        )
        assert "RICH MODE" in prompt
        assert "temperature" in prompt
        # Allowed labels surfaced in the prompt
        for lbl in lm.RICH_LABELS_ALLOWED:
            assert lbl in prompt


# ---- validate_payload_v2 ----------------------------------------------------

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


class TestValidatePayloadV2:
    def test_accepts_canonical_payload(self):
        lm.validate_payload_v2(_good_rich())  # no raise

    def test_canonicalizes_label_case(self):
        p = _good_rich()
        p["replies"][0]["label"] = "safe"  # lowercase
        p["replies"][1]["label"] = "FLIRTY"  # uppercase
        lm.validate_payload_v2(p)
        assert p["replies"][0]["label"] == "Safe"
        assert p["replies"][1]["label"] == "Flirty"

    def test_canonicalizes_temperature_lowercase(self):
        p = _good_rich()
        p["read"]["temperature"] = "Interested"
        lm.validate_payload_v2(p)
        assert p["read"]["temperature"] == "interested"

    def test_rejects_bad_temperature(self):
        p = _good_rich()
        p["read"]["temperature"] = "bizarre"
        with pytest.raises(lm.LovliValidationError):
            lm.validate_payload_v2(p)

    def test_rejects_empty_situation(self):
        p = _good_rich()
        p["read"]["situation"] = "   "
        with pytest.raises(lm.LovliValidationError):
            lm.validate_payload_v2(p)

    def test_rejects_disallowed_label(self):
        p = _good_rich()
        p["replies"][2]["label"] = "Manipulative"
        with pytest.raises(lm.LovliValidationError):
            lm.validate_payload_v2(p)

    def test_rejects_wrong_replies_count(self):
        p = _good_rich()
        p["replies"] = p["replies"][:2]
        with pytest.raises(lm.LovliValidationError):
            lm.validate_payload_v2(p)

    def test_rejects_empty_reply_text(self):
        p = _good_rich()
        p["replies"][0]["text"] = ""
        with pytest.raises(lm.LovliValidationError):
            lm.validate_payload_v2(p)

    def test_rejects_signals_too_many(self):
        p = _good_rich()
        p["read"]["signals"] = ["a", "b", "c", "d"]
        with pytest.raises(lm.LovliValidationError):
            lm.validate_payload_v2(p)

    def test_rejects_signals_non_string(self):
        p = _good_rich()
        p["read"]["signals"] = [123]
        with pytest.raises(lm.LovliValidationError):
            lm.validate_payload_v2(p)

    def test_rejects_outcome_empty_list(self):
        p = _good_rich()
        p["read"]["outcome"] = []
        with pytest.raises(lm.LovliValidationError):
            lm.validate_payload_v2(p)


# ---- models -----------------------------------------------------------------

class TestModels:
    def test_reply_read_temperature_literal_enforced(self):
        ReplyRead(situation="ok", temperature="interested", signals=["a"], outcome=["b"])
        with pytest.raises(Exception):
            ReplyRead(situation="ok", temperature="warm", signals=["a"], outcome=["b"])  # type: ignore[arg-type]

    def test_generate_replies_response_has_optional_rich_fields(self):
        # Legacy shape — no rich fields
        r = GenerateRepliesResponse(
            generation_id="g1",
            replies=["a", "b", "c"],
            tone_notes="t",
            daily_generation_count=1,
            daily_limit=8,
            plan="free",
        )
        assert r.reply_labels is None
        assert r.read is None


# ---- /generate-replies endpoint shape ---------------------------------------

FAKE_USER_ID = "pytest-user-1"
FAKE_USER = {
    "id": FAKE_USER_ID,
    "plan": "free",
    "daily_generation_count": 0,
    "daily_limit": 8,
    "last_generation_reset_date": None,
    "timezone": "Asia/Kolkata",
}

LEGACY_FIXTURE = {
    "replies": ["r1", "r2", "r3"],
    "tone_notes": "playful match",
}

RICH_FIXTURE = {
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
    # PR-V2-3: wingman_advice powers the insight object
    "wingman_advice": "I'd lead with the flirty one and ask about her weekend",
}


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


class _StubDb:
    users = _StubCol()
    generations = _StubCol()
    memory_cards = _StubCol()


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

    import copy

    async def fake_generate(req: lm.LovliRequest) -> dict:
        # Deep-copy because server.py mutates result["replies"] in place when rich=true.
        if req.rich:
            return copy.deepcopy(RICH_FIXTURE)
        return copy.deepcopy(LEGACY_FIXTURE)

    srv.generate_replies = fake_generate  # type: ignore[attr-defined]
    return TestClient(srv.app)


def _post(client, rich=None, **extra):
    data = {
        "platform": "instagram",
        "vibe": "Playful",
        "language": "Hinglish",
        "manual_text": "her: kya plan hai?",
    }
    if rich is not None:
        data["rich"] = rich
    data.update(extra)
    return client.post(
        "/api/generate-replies",
        data=data,
        headers={"Authorization": "Bearer test-token"},
    )


class TestGenerateRepliesEndpoint:
    def test_legacy_shape_omits_rich_keys(self, client):
        r = _post(client)
        assert r.status_code == 200, r.text
        b = r.json()
        assert set(b.keys()) == {
            "generation_id", "replies", "tone_notes",
            "daily_generation_count", "daily_limit", "plan",
        }
        assert b["replies"] == ["r1", "r2", "r3"]
        # CRITICAL: response_model_exclude_none must drop these
        assert "reply_labels" not in b
        assert "read" not in b

    def test_legacy_shape_with_rich_false_explicit(self, client):
        r = _post(client, rich="false")
        assert r.status_code == 200
        b = r.json()
        assert "reply_labels" not in b
        assert "read" not in b

    def test_rich_shape_has_8_keys(self, client):
        r = _post(client, rich="true")
        assert r.status_code == 200, r.text
        b = r.json()
        # PR-V2-3 adds `insight` on top of the PR-INT 8-key shape → 9 keys total
        assert set(b.keys()) == {
            "generation_id", "replies", "tone_notes",
            "daily_generation_count", "daily_limit", "plan",
            "reply_labels", "read", "insight",
        }

    # ---- PR-V2-3 insight object -------------------------------------------
    def test_pr_v2_3_insight_present_on_rich(self, client):
        b = _post(client, rich="true").json()
        assert "insight" in b and isinstance(b["insight"], dict)
        ins = b["insight"]
        assert set(ins.keys()) == {"temperature", "noticing", "whats_going_on", "wingman_advice"}
        assert ins["temperature"] in ("warm", "mixed", "cold")
        # interested → warm mapping
        assert ins["temperature"] == "warm"
        assert 1 <= len(ins["noticing"]) <= 3
        assert all(isinstance(x, str) for x in ins["noticing"])
        assert ins["whats_going_on"].strip()
        assert ins["wingman_advice"].strip()

    def test_pr_v2_3_new_form_params_accepted(self, client):
        # feeling / intent / outcome / goal must be silently folded into the
        # prompt; presence must NOT break the response shape.
        r = _post(
            client, rich="true",
            feeling="Excited", intent="Restart the conversation",
            outcome="Warm and inviting", goal="Talking to date",
        )
        assert r.status_code == 200
        b = r.json()
        assert "insight" in b

    def test_pr_v2_3_legacy_call_omits_insight(self, client):
        # No rich, no new params → response must NOT contain insight
        b = _post(client).json()
        assert "insight" not in b

    def test_rich_replies_flattened_to_strings(self, client):
        b = _post(client, rich="true").json()
        assert isinstance(b["replies"], list) and len(b["replies"]) == 3
        assert all(isinstance(x, str) for x in b["replies"])
        assert b["replies"] == ["r1", "r2", "r3"]

    def test_rich_reply_labels_extracted(self, client):
        b = _post(client, rich="true").json()
        assert b["reply_labels"] == ["Safe", "Flirty", "Bold"]

    def test_rich_read_contract(self, client):
        b = _post(client, rich="true").json()
        read = b["read"]
        assert set(read.keys()) == {"situation", "temperature", "signals", "outcome"}
        assert read["temperature"] in ("interested", "neutral", "cold")
        assert 1 <= len(read["signals"]) <= 3
        assert 1 <= len(read["outcome"]) <= 3

    def test_invalid_platform_rejected(self, client):
        r = _post(client, platform="myspace")
        assert r.status_code == 400

    def test_missing_input_rejected(self, client):
        r = client.post(
            "/api/generate-replies",
            data={"platform": "instagram", "vibe": "Playful", "language": "Hinglish"},
            headers={"Authorization": "Bearer test-token"},
        )
        assert r.status_code == 400
