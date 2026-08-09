"""
PR-INT smoke test (run-once script). Verifies the /generate-replies endpoint
returns:
  - byte-identical-to-legacy shape when rich=false (omitted form field) is sent
  - extended shape with reply_labels + read when rich=true is sent

Strategy:
  1. Spin a FastAPI TestClient.
  2. Override auth + LLM dependencies so the test does not depend on a real
     Anthropic / Emergent key and does not touch the DB writes' authentication.
  3. Two POSTs (multipart): rich omitted, then rich=true.
  4. Assert exact response keys.

Run:  cd /app/backend && python _smoke_pr_int.py
"""
from __future__ import annotations

import asyncio
import json
import sys
import types

import server as srv  # imports the FastAPI app
import llm_service as lm
from fastapi.testclient import TestClient


# ---- Stub user + db state so the endpoint doesn't require a real user / Mongo ----

FAKE_USER_ID = "smoke-user-1"
FAKE_USER = {
    "id": FAKE_USER_ID,
    "plan": "free",
    "daily_generation_count": 0,
    "daily_limit": 8,
    "last_generation_reset_date": None,
    "timezone": "Asia/Kolkata",
}


async def fake_get_user(user_id: str):
    return FAKE_USER


async def fake_maybe_reset_daily(user, local_date):
    return user


async def fake_users_update_one(filt, update):  # no-op
    return types.SimpleNamespace(matched_count=1, modified_count=1)


async def fake_generations_insert_one(doc):
    return types.SimpleNamespace(inserted_id="x")


async def fake_memory_cards_find_one(filt, proj=None):
    return None


# Replace the whole `db` object with a stub — Motor's __getattr__ would
# bypass per-collection method patches otherwise.
class _StubCol:
    update_one = staticmethod(fake_users_update_one)
    insert_one = staticmethod(fake_generations_insert_one)
    find_one = staticmethod(fake_memory_cards_find_one)


class _StubDb:
    users = _StubCol()
    generations = _StubCol()
    memory_cards = _StubCol()


srv.db = _StubDb()  # type: ignore[attr-defined]


srv._get_user = fake_get_user  # type: ignore[attr-defined]
srv._maybe_reset_daily = fake_maybe_reset_daily  # type: ignore[attr-defined]


# Override auth dependency: pretend any caller is FAKE_USER_ID.
srv.app.dependency_overrides[srv.get_current_user_id] = lambda: FAKE_USER_ID


# ---- LLM stubs ----------------------------------------------------------------

LEGACY_FIXTURE = {
    "replies": [
        "haha that's actually so me",
        "okay you've got my full attention now",
        "i'd ask more but i don't want to scare you off lol",
    ],
    "tone_notes": "Playful + a little curious — matches your selected vibe.",
}

RICH_FIXTURE = {
    "read": {
        "situation": "She's testing the waters with a light tease and waiting for you to match the energy.",
        "temperature": "interested",
        "signals": [
            "Used a playful tease, not a flat reply",
            "Asked a follow-up question",
        ],
        "outcome": [
            "These replies will likely keep the flirt going without rushing it",
            "She'll probably double-text within an hour",
        ],
    },
    "replies": [
        {"text": "haha that's actually so me", "label": "Safe"},
        {"text": "okay you've got my full attention now", "label": "Flirty"},
        {"text": "say less — when are we doing this", "label": "Bold"},
    ],
    "tone_notes": "Playful + a little curious — matches your selected vibe.",
}


async def fake_generate_replies(req: lm.LovliRequest) -> dict:
    if req.rich:
        # validator would normally canonicalize labels — do that here too
        lm.validate_payload_v2(RICH_FIXTURE)
        return RICH_FIXTURE
    lm.validate_payload(LEGACY_FIXTURE)
    return LEGACY_FIXTURE


srv.generate_replies = fake_generate_replies  # type: ignore[attr-defined]


# ---- Run both smoke tests -----------------------------------------------------

client = TestClient(srv.app)

print("=" * 70)
print("PR-INT smoke test — /api/generate-replies")
print("=" * 70)


def post(rich_value=None):
    fields = {
        "platform": "instagram",
        "vibe": "Playful",
        "language": "Hinglish",
        "manual_text": "her: 'tu bata kya plan hai weekend pe?'",
    }
    if rich_value is not None:
        fields["rich"] = rich_value
    return client.post(
        "/api/generate-replies",
        data=fields,
        headers={"Authorization": "Bearer smoke-token"},
    )


# 1) Legacy shape — rich field omitted entirely.
print("\n[1] rich=<omitted>  (legacy default)")
r1 = post()
print(f"  HTTP {r1.status_code}")
if r1.status_code != 200:
    print("  body:", r1.text)
    sys.exit(1)
b1 = r1.json()
print(f"  keys: {sorted(b1.keys())}")
expected_legacy_keys = {
    "generation_id",
    "replies",
    "tone_notes",
    "daily_generation_count",
    "daily_limit",
    "plan",
}
assert set(b1.keys()) == expected_legacy_keys, (
    f"LEGACY DRIFT! Got {sorted(b1.keys())}, expected {sorted(expected_legacy_keys)}"
)
assert isinstance(b1["replies"], list) and len(b1["replies"]) == 3
assert all(isinstance(r, str) for r in b1["replies"])
print("  ✓ legacy response is byte-shape-identical to today (no reply_labels, no read keys)")
print(f"  replies[0]: {b1['replies'][0]!r}")
print(f"  tone_notes: {b1['tone_notes']!r}")

# 2) Rich shape — rich=true.
print("\n[2] rich=true       (PR-INT extended)")
r2 = post("true")
print(f"  HTTP {r2.status_code}")
if r2.status_code != 200:
    print("  body:", r2.text)
    sys.exit(1)
b2 = r2.json()
print(f"  keys: {sorted(b2.keys())}")
expected_rich_keys = expected_legacy_keys | {"reply_labels", "read"}
assert set(b2.keys()) == expected_rich_keys, (
    f"RICH SHAPE WRONG! Got {sorted(b2.keys())}, expected {sorted(expected_rich_keys)}"
)
assert isinstance(b2["replies"], list) and len(b2["replies"]) == 3
assert all(isinstance(r, str) for r in b2["replies"]), (
    "replies must be List[str] in the API contract"
)
assert isinstance(b2["reply_labels"], list) and len(b2["reply_labels"]) == 3
assert b2["reply_labels"] == ["Safe", "Flirty", "Bold"], b2["reply_labels"]
read = b2["read"]
assert isinstance(read, dict)
assert set(read.keys()) == {"situation", "temperature", "signals", "outcome"}, read.keys()
assert read["temperature"] in ("interested", "neutral", "cold")
assert isinstance(read["signals"], list) and 1 <= len(read["signals"]) <= 3
assert isinstance(read["outcome"], list) and 1 <= len(read["outcome"]) <= 3
print("  ✓ rich response has reply_labels + read with the exact contract shape")
print(f"  reply_labels: {b2['reply_labels']}")
print(f"  read.temperature: {read['temperature']!r}")
print(f"  read.signals[0]: {read['signals'][0]!r}")
print(f"  read.outcome[0]: {read['outcome'][0]!r}")

# 3) Bonus: invalid rich payload from LLM → caller sees 503 (transient mapping).
print("\n[3] sanity: validator rejects a malformed rich payload")
bad = {
    "read": {
        "situation": "ok",
        "temperature": "bizarre",  # not allowed
        "signals": ["a"],
        "outcome": ["b"],
    },
    "replies": [
        {"text": "a", "label": "Safe"},
        {"text": "b", "label": "Flirty"},
        {"text": "c", "label": "Bold"},
    ],
    "tone_notes": "ok",
}
try:
    lm.validate_payload_v2(bad)
    print("  ✗ validator failed to catch bad temperature")
    sys.exit(1)
except lm.LovliValidationError as e:
    print(f"  ✓ validator caught bad temperature: {e}")

print("\n" + "=" * 70)
print("ALL PR-INT SMOKE TESTS PASSED")
print("=" * 70)
