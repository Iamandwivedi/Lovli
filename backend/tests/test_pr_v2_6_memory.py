"""PR-V2-6 backend compat: MemoryCard optional new fields + PATCH partial.

Uses the seeded tester@lovli.app account. Public preview URL is read from env.

Covers:
  1. Legacy POST with ONLY nickname still succeeds (old shape unchanged).
  2. PATCH partial (city only) updates just that field.
  3. Ananya's seed data still contains stage/timeline/facts as expected.
  4. Timeline PATCH append round-trips (used to validate add-a-moment flow).
"""
from __future__ import annotations

import os
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://reply-on-the-go.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def token() -> str:
    r = requests.post(f"{BASE_URL}/api/auth/test-login", json={}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def ananya(headers: dict) -> dict:
    r = requests.get(f"{BASE_URL}/api/memory-cards", headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    cards = r.json()
    for c in cards:
        if c.get("nickname") == "Ananya":
            return c
    pytest.skip("Ananya seed card not present")


# ---- Ananya seed integrity ---------------------------------------------------

class TestAnanyaSeed:
    def test_stage_fields_present(self, ananya):
        assert ananya["stage"] == "Talking"
        assert ananya["stage_duration"] == "3 weeks"
        assert ananya["platform"] == "Hinge"
        assert ananya["city"] == "Mumbai"

    def test_timeline_has_upcoming_entry(self, ananya):
        titles = [t["title"] for t in ananya["timeline"]]
        assert "Her birthday" in titles
        upcoming = [t for t in ananya["timeline"] if t.get("upcoming")]
        assert len(upcoming) >= 1
        assert upcoming[0]["title"] == "Her birthday"

    def test_facts_include_avoid_and_date(self, ananya):
        kinds = {f["kind"] for f in ananya["facts"]}
        assert "avoid" in kinds
        assert "date" in kinds
        avoid_texts = [f["text"] for f in ananya["facts"] if f["kind"] == "avoid"]
        assert "one-word texts" in avoid_texts


# ---- Legacy POST (only nickname) --------------------------------------------

class TestLegacyPost:
    """Old shape: POST with only 'nickname' must still work."""

    _created_id: str | None = None

    def test_legacy_post_only_nickname(self, headers):
        payload = {"nickname": "TEST_legacy_compat"}
        r = requests.post(f"{BASE_URL}/api/memory-cards", headers=headers, json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert body["nickname"] == "TEST_legacy_compat"
        # New fields default to None/empty (optional).
        assert body.get("stage") is None
        assert body.get("timeline") in (None, [])
        assert body.get("facts") in (None, [])
        assert "id" in body
        TestLegacyPost._created_id = body["id"]

    def test_get_shows_new_card(self, headers):
        assert TestLegacyPost._created_id, "prior test must have created a card"
        r = requests.get(f"{BASE_URL}/api/memory-cards", headers=headers, timeout=15)
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert TestLegacyPost._created_id in ids

    def test_cleanup_delete(self, headers):
        assert TestLegacyPost._created_id
        r = requests.delete(
            f"{BASE_URL}/api/memory-cards/{TestLegacyPost._created_id}", headers=headers, timeout=15
        )
        assert r.status_code in (200, 204), r.text


# ---- PATCH partial (city only) ----------------------------------------------

class TestPatchPartial:
    """PATCH with only {city} must update just that field (Ananya restored to Mumbai)."""

    def test_patch_city_only(self, headers, ananya):
        r = requests.patch(
            f"{BASE_URL}/api/memory-cards/{ananya['id']}",
            headers=headers,
            json={"city": "Delhi"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["city"] == "Delhi"
        # Other new fields must be preserved
        assert body["stage"] == "Talking"
        assert body["platform"] == "Hinge"
        assert body["stage_duration"] == "3 weeks"
        assert len(body["timeline"]) == len(ananya["timeline"])
        assert len(body["facts"]) == len(ananya["facts"])

    def test_patch_city_back_to_mumbai(self, headers, ananya):
        r = requests.patch(
            f"{BASE_URL}/api/memory-cards/{ananya['id']}",
            headers=headers,
            json={"city": "Mumbai"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["city"] == "Mumbai"


# ---- Timeline append round-trip ---------------------------------------------

class TestTimelineAppend:
    _marker_title = f"TEST_moment_{int(time.time())}"

    def test_append_timeline_entry(self, headers, ananya):
        current = ananya["timeline"] or []
        new_entry = {
            "title": self._marker_title,
            "date_label": "July 30",
            "detail": "backend compat check",
            "upcoming": False,
        }
        r = requests.patch(
            f"{BASE_URL}/api/memory-cards/{ananya['id']}",
            headers=headers,
            json={"timeline": current + [new_entry]},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        titles = [t["title"] for t in r.json()["timeline"]]
        assert self._marker_title in titles

    def test_verify_via_get(self, headers, ananya):
        r = requests.get(f"{BASE_URL}/api/memory-cards", headers=headers, timeout=15)
        assert r.status_code == 200
        card = next(c for c in r.json() if c["id"] == ananya["id"])
        titles = [t["title"] for t in card["timeline"]]
        assert self._marker_title in titles

    def test_cleanup_remove_marker(self, headers, ananya):
        r = requests.get(f"{BASE_URL}/api/memory-cards", headers=headers, timeout=15)
        card = next(c for c in r.json() if c["id"] == ananya["id"])
        pruned = [t for t in card["timeline"] if t["title"] != self._marker_title]
        r2 = requests.patch(
            f"{BASE_URL}/api/memory-cards/{ananya['id']}",
            headers=headers,
            json={"timeline": pruned},
            timeout=15,
        )
        assert r2.status_code == 200
        assert self._marker_title not in [t["title"] for t in r2.json()["timeline"]]
