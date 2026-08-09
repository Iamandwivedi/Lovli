"""get_memory_context — the one read contract between derived memory and
generation (guide §9), plus its in-process cache.

Cache note: a plain dict is correct here because Railway runs uvicorn with a
single worker (backend/Procfile). If --workers > 1 ever ships, invalidation
becomes best-effort and the TTL bounds staleness at 10 minutes — acceptable, or
swap this for a Mongo-backed cache then.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Literal, Optional

# Guide §8.12 — minimum support gates.
LEVEL_NONE_MAX = 4          # 0-4 signals: no personalization
LEVEL_WEAK_MAX = 19         # 5-19: length/emoji only
LEVEL_CONFIDENT_MAX = 49    # 20-49: confident tone/phrase prefs; 50+: full

_CACHE_TTL_SECONDS = 600.0
_CACHE: dict[str, tuple["MemoryContext", float]] = {}

Level = Literal["none", "weak", "confident", "full"]


@dataclass
class MemoryContext:
    user_id: str
    is_cold_start: bool = True
    level: Level = "none"
    signal_count: int = 0
    texting_profile: dict = field(default_factory=dict)   # style_summary + do/dont
    tone_preferences: dict = field(default_factory=dict)  # tones by stage
    avoid_tones: list[str] = field(default_factory=list)
    phrase_avoid: list[str] = field(default_factory=list)
    phrase_prefer: list[dict] = field(default_factory=list)  # {from, to}
    boundaries: list[str] = field(default_factory=list)
    onboarding_style: Optional[str] = None  # users.preferred_style cold-start seed
    evidence: list[dict] = field(default_factory=list)


def invalidate_memory_context(user_id: str) -> None:
    _CACHE.pop(user_id, None)


def clear_memory_context_cache() -> None:
    _CACHE.clear()


def _level_for(signal_count: int) -> Level:
    if signal_count <= LEVEL_NONE_MAX:
        return "none"
    if signal_count <= LEVEL_WEAK_MAX:
        return "weak"
    if signal_count <= LEVEL_CONFIDENT_MAX:
        return "confident"
    return "full"


async def get_memory_context(
    db,
    user_id: str,
    *,
    desired_tone: Optional[str] = None,
    stage: Optional[str] = None,
    surface: str = "reply",
) -> MemoryContext:
    cached = _CACHE.get(user_id)
    if cached is not None and cached[1] > time.monotonic():
        return cached[0]

    texting = await db.texting_profiles.find_one({"user_id": user_id}, {"_id": 0})
    tones = await db.tone_profiles.find_one({"user_id": user_id}, {"_id": 0})
    phrases = await db.phrase_rules.find_one({"user_id": user_id}, {"_id": 0})
    boundary_atoms = await db.memory_atoms.find(
        {"user_id": user_id, "domain": "boundary"}, {"_id": 0}
    ).to_list(length=50)

    signal_count = int((texting or {}).get("signal_count") or 0)
    level = _level_for(signal_count)

    onboarding_style: Optional[str] = None
    if level == "none":
        # Cold start (guide §14): fall back to the onboarding preference that is
        # stored on the user but never read by generation today.
        user = await db.users.find_one(
            {"id": user_id}, {"_id": 0, "preferred_style": 1}
        )
        onboarding_style = (user or {}).get("preferred_style") or None

    ctx = MemoryContext(
        user_id=user_id,
        is_cold_start=signal_count == 0,
        level=level,
        signal_count=signal_count,
        texting_profile={
            "style_summary": (texting or {}).get("style_summary") or {},
            "do": (texting or {}).get("do") or [],
            "dont": (texting or {}).get("dont") or [],
            "confidence": (texting or {}).get("confidence") or 0.0,
        },
        tone_preferences=(tones or {}).get("tones") or {},
        avoid_tones=(tones or {}).get("avoid_tones") or [],
        phrase_avoid=[
            b["phrase"] for b in (phrases or {}).get("blacklist") or [] if b.get("phrase")
        ][:12],
        phrase_prefer=[
            {"from": r.get("from", ""), "to": r.get("to", "")}
            for r in (phrases or {}).get("preferred_replacements") or []
            if r.get("to")
        ][:8],
        boundaries=[
            a["value"]["text"]
            for a in boundary_atoms
            if isinstance(a.get("value"), dict) and a["value"].get("text")
        ],
        onboarding_style=onboarding_style,
    )
    _CACHE[user_id] = (ctx, time.monotonic() + _CACHE_TTL_SECONDS)
    return ctx
