"""Pure, deterministic, replayable reducers: conversation_events -> derived memory.

The load-bearing invariant: every derived document is 100% reconstructable from
the event log. There is no incremental code path — "incremental" updates are a
debounced full replay (see engine/memory.py), so replay and live updates can
never diverge.

No I/O in this module. Events in, documents out.
"""
from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Optional

from engine.text_features import (
    diff_text,
    extract_text_features,
    normalize_phrase,
)

CURRENT_MEMORY_SCHEMA_VERSION = 1

# Stable namespace so atom ids survive rebuilds (needed for "remove this
# learned preference" — the id must mean the same atom after every replay).
_ATOM_NS = uuid.UUID("6c5a3c2e-9b1f-4a56-8f24-3f1b2f9a7d10")

# Guide §8.11 — how much one observation of each kind is worth.
SOURCE_WEIGHTS = {
    "boundary_added": 1.0,
    "phrase_disliked": 1.0,
    "reply_copied": 0.9,
    "reply_edited": 0.85,
    "reply_rated_up": 0.8,
    "feedback_chip": 0.7,
    "tone_selected": 0.55,
    "onboarding_pref": 0.4,
    "reply_rejected": -0.7,
    "reply_rated_down": -0.7,
}

# Guide §8.11 — half-life days per memory domain (None = never decays).
HALF_LIVES: dict[str, Optional[float]] = {
    "phrase": 180.0,
    "boundary": None,
    "tone": 60.0,
    "style": 90.0,
    "emoji": 90.0,
    "stage": 45.0,
    "outcome": 45.0,
}

# Events that count toward the personalization gates (guide §8.12). Server
# bookkeeping events (reply_requested/reply_generated) don't teach us anything
# about the user's style, so they don't move the gates.
_SIGNAL_TYPES = frozenset(
    {
        "reply_copied",
        "reply_edited",
        "reply_rejected",
        "reply_rated",
        "tone_selected",
        "phrase_disliked",
        "boundary_added",
        "feedback_chip",
        "onboarding_pref",
    }
)

_SHORT_CHARS = 90
_LONG_CHARS = 180


@dataclass
class AtomState:
    value: dict = field(default_factory=dict)
    support_count: int = 0
    total_weight: float = 0.0
    evidence_event_ids: list[str] = field(default_factory=list)
    last_observed_at: str = ""
    explicit: bool = False   # explicit user statement (boundary / phrase dislike)
    tombstoned: bool = False  # user removed this preference — never resurrect


@dataclass
class MemoryState:
    atoms: dict[tuple[str, str], AtomState] = field(default_factory=dict)
    signal_count: int = 0
    last_reset_ts: Optional[str] = None
    # (generation_id, index) pairs already counted as copies. New clients post
    # reply_copied directly AND /feedback dual-writes one — same copy, counted
    # once. Sorted replay makes the winner deterministic.
    seen_copy_keys: set = field(default_factory=set)


def initial_state() -> MemoryState:
    return MemoryState()


def _bump(
    state: MemoryState,
    domain: str,
    key: str,
    *,
    weight: float,
    event: dict,
    value: Optional[dict] = None,
    explicit: bool = False,
) -> None:
    atom = state.atoms.get((domain, key))
    if atom is None:
        atom = AtomState()
        state.atoms[(domain, key)] = atom
    if atom.tombstoned:
        return
    atom.support_count += 1
    atom.total_weight += weight
    if value:
        atom.value.update(value)
    if explicit:
        atom.explicit = True
    eid = event.get("id")
    if eid and eid not in atom.evidence_event_ids:
        atom.evidence_event_ids.append(eid)
        del atom.evidence_event_ids[:-20]  # cap evidence at the last 20 events
    ts = str(event.get("ts") or "")
    if ts > atom.last_observed_at:
        atom.last_observed_at = ts


def _learn_style_from_text(state: MemoryState, text: str, weight: float, event: dict) -> None:
    """A text the user accepted (copied/sent) or produced (edited) is a style sample."""
    f = extract_text_features(text)
    if f.char_len == 0:
        return
    if f.char_len <= _SHORT_CHARS:
        _bump(state, "style", "message_length.short", weight=weight, event=event)
    elif f.char_len >= _LONG_CHARS:
        _bump(state, "style", "message_length.long", weight=weight, event=event)
    if f.emoji_count == 0:
        _bump(state, "emoji", "emoji_usage.none", weight=weight, event=event)
    elif f.emoji_count == 1:
        _bump(state, "emoji", "emoji_usage.light", weight=weight, event=event)
    else:
        _bump(state, "emoji", "emoji_usage.heavy", weight=weight, event=event)
    if f.lowercase_start:
        _bump(state, "style", "capitalization.casual", weight=weight, event=event)
    if f.exclamation_count == 0 and f.comma_count <= 1:
        _bump(state, "style", "punctuation.light", weight=weight, event=event)


def _tone_key(payload: dict, tone: str) -> str:
    stage = str(payload.get("stage") or "any").strip().lower().replace(" ", "_")
    return f"{stage}.{tone.strip().lower().replace(' ', '_')}"


def _apply_reply_copied(state: MemoryState, event: dict) -> bool:
    payload = event.get("payload") or {}
    dedupe_key = (payload.get("generation_id"), payload.get("index"))
    if dedupe_key != (None, None):
        if dedupe_key in state.seen_copy_keys:
            return False
        state.seen_copy_keys.add(dedupe_key)
    w = SOURCE_WEIGHTS["reply_copied"]
    text = str(payload.get("text") or "")
    if text:
        _learn_style_from_text(state, text, w, event)
    label = str(payload.get("label") or "").strip()
    if label:
        _bump(state, "tone", _tone_key(payload, label), weight=w, event=event)
    return True


def _apply_reply_edited(state: MemoryState, event: dict) -> None:
    payload = event.get("payload") or {}
    generated = str(payload.get("generated_text") or "")
    edited = str(payload.get("edited_text") or "")
    if not generated or not edited or generated == edited:
        return
    w = SOURCE_WEIGHTS["reply_edited"]
    d = diff_text(generated, edited)

    if d.length_ratio <= 0.8:
        _bump(state, "style", "message_length.short", weight=w, event=event)
    elif d.length_ratio >= 1.25:
        _bump(state, "style", "message_length.long", weight=w, event=event)
    if d.emoji_delta < 0:
        _bump(state, "emoji", "emoji_usage.reduce", weight=w, event=event)
    elif d.emoji_delta > 0:
        _bump(state, "emoji", "emoji_usage.light", weight=w, event=event)
    if d.casing_lowered:
        _bump(state, "style", "capitalization.casual", weight=w, event=event)
    if d.punctuation_reduced:
        _bump(state, "style", "punctuation.light", weight=w, event=event)
    if d.formality_reduced:
        _bump(state, "style", "formality.casual", weight=w, event=event)

    for phrase in d.removed_phrases:
        key = normalize_phrase(phrase)
        if key:
            _bump(
                state,
                "phrase",
                f"blacklist.{key}",
                weight=w * 0.6,  # one removal is a hint, not a verdict (guide §8.8)
                event=event,
                value={"phrase": phrase},
            )
    for frm, to in d.replacements:
        key = normalize_phrase(frm)
        if key:
            _bump(
                state,
                "phrase",
                f"replace.{key}",
                weight=w * 0.6,
                event=event,
                value={"from": frm, "to": to},
            )
    # The edited text is the user's own voice — the strongest style sample.
    _learn_style_from_text(state, edited, w, event)


def _apply_reply_rejected(state: MemoryState, event: dict) -> None:
    payload = event.get("payload") or {}
    w = SOURCE_WEIGHTS["reply_rejected"]
    label = str(payload.get("label") or "").strip()
    if label:
        _bump(state, "tone", _tone_key(payload, label), weight=w, event=event)


def _apply_reply_rated(state: MemoryState, event: dict) -> None:
    payload = event.get("payload") or {}
    rating = str(payload.get("rating") or "").strip().lower()
    if rating in ("up", "thumbs_up", "positive"):
        w = SOURCE_WEIGHTS["reply_rated_up"]
    elif rating in ("down", "thumbs_down", "negative"):
        w = SOURCE_WEIGHTS["reply_rated_down"]
    else:
        return
    label = str(payload.get("label") or "").strip()
    if label:
        _bump(state, "tone", _tone_key(payload, label), weight=w, event=event)
    text = str(payload.get("text") or "")
    if text and w > 0:
        _learn_style_from_text(state, text, w, event)


def _apply_tone_selected(state: MemoryState, event: dict) -> None:
    payload = event.get("payload") or {}
    tone = str(payload.get("tone") or "").strip()
    if tone:
        _bump(
            state,
            "tone",
            _tone_key(payload, tone),
            weight=SOURCE_WEIGHTS["tone_selected"],
            event=event,
        )


def _apply_phrase_disliked(state: MemoryState, event: dict) -> None:
    payload = event.get("payload") or {}
    phrase = str(payload.get("phrase") or "").strip()
    key = normalize_phrase(phrase)
    if key:
        _bump(
            state,
            "phrase",
            f"blacklist.{key}",
            weight=SOURCE_WEIGHTS["phrase_disliked"],
            event=event,
            value={"phrase": phrase},
            explicit=True,
        )


def _apply_boundary_added(state: MemoryState, event: dict) -> None:
    payload = event.get("payload") or {}
    text = str(payload.get("text") or "").strip()
    key = normalize_phrase(text)
    if key:
        _bump(
            state,
            "boundary",
            key,
            weight=SOURCE_WEIGHTS["boundary_added"],
            event=event,
            value={"text": text},
            explicit=True,
        )


# Guide §11.5 — feedback-label → memory mapping.
_CHIP_ATOMS: dict[str, tuple[tuple[str, str], ...]] = {
    "not_my_style": (("style", "voice.adjust"),),
    "too_much": (("style", "intensity.reduce"), ("style", "message_length.short")),
    "too_formal": (("style", "formality.casual"),),
    "cringe": (("style", "avoid_cringe"),),
    "too_cringe": (("style", "avoid_cringe"),),
    "too_needy": (("style", "avoid_needy"),),
    "too_boring": (("style", "more_playful"),),
}


def _apply_feedback_chip(state: MemoryState, event: dict) -> None:
    payload = event.get("payload") or {}
    chip = str(payload.get("chip") or "").strip().lower().replace(" ", "_")
    w = SOURCE_WEIGHTS["feedback_chip"]
    for domain, key in _CHIP_ATOMS.get(chip, ()):
        _bump(state, domain, key, weight=w, event=event)
    label = str(payload.get("label") or "").strip()
    if label:  # the chip is also a soft rejection of that variant's tone
        _bump(state, "tone", _tone_key(payload, label), weight=-0.5, event=event)


# Guide §14 — onboarding answers → weak seed atoms (weight 0.4).
_ONBOARDING_STYLE_ATOMS: dict[str, tuple[tuple[str, str], ...]] = {
    "short_and_casual": (("style", "message_length.short"), ("style", "formality.casual")),
    "playful": (("tone", "any.playful"),),
    "direct": (("style", "directness.high"),),
    "thoughtful": (("style", "message_length.long"),),
}
_ONBOARDING_AVOID_ATOMS: dict[str, tuple[tuple[str, str], ...]] = {
    "cringe_lines": (("style", "avoid_cringe"),),
    "too_much_romance": (("style", "romance.light"),),
    "too_many_emojis": (("emoji", "emoji_usage.none"),),
    "sounding_needy": (("style", "avoid_needy"),),
}


def _apply_onboarding_pref(state: MemoryState, event: dict) -> None:
    payload = event.get("payload") or {}
    question = str(payload.get("question") or "").strip().lower()
    answers = payload.get("answers")
    if not isinstance(answers, list):
        answers = [payload.get("answer")]
    w = SOURCE_WEIGHTS["onboarding_pref"]
    table = _ONBOARDING_STYLE_ATOMS if question == "texting_style" else (
        _ONBOARDING_AVOID_ATOMS if question == "avoid" else {}
    )
    for ans in answers:
        key = str(ans or "").strip().lower().replace(" ", "_")
        for domain, atom_key in table.get(key, ()):
            _bump(state, domain, atom_key, weight=w, event=event)


def _apply_preference_removed(state: MemoryState, event: dict) -> None:
    payload = event.get("payload") or {}
    domain = str(payload.get("domain") or "").strip()
    key = str(payload.get("key") or "").strip()
    if not domain or not key:
        return
    atom = state.atoms.get((domain, key))
    if atom is None:
        atom = AtomState()
        state.atoms[(domain, key)] = atom
    atom.tombstoned = True


_HANDLERS = {
    "reply_copied": _apply_reply_copied,
    "reply_edited": _apply_reply_edited,
    "reply_rejected": _apply_reply_rejected,
    "reply_rated": _apply_reply_rated,
    "tone_selected": _apply_tone_selected,
    "phrase_disliked": _apply_phrase_disliked,
    "boundary_added": _apply_boundary_added,
    "feedback_chip": _apply_feedback_chip,
    "onboarding_pref": _apply_onboarding_pref,
    "preference_removed": _apply_preference_removed,
}


def apply_event(state: MemoryState, event: dict) -> MemoryState:
    etype = str(event.get("type") or "")
    if etype == "memory_reset":
        fresh = initial_state()
        fresh.last_reset_ts = str(event.get("ts") or "")
        # Tombstones do NOT survive a full reset — the user asked to start over.
        return fresh
    handler = _HANDLERS.get(etype)
    counted = True
    if handler is not None:
        # _apply_reply_copied returns False for a deduped duplicate copy.
        counted = handler(state, event) is not False
    if counted and etype in _SIGNAL_TYPES:
        state.signal_count += 1
    # Unknown/bookkeeping types are ignored on purpose (forward compatibility).
    return state


def reduce_all(events: Iterable[dict]) -> MemoryState:
    """Replay events in a canonical order. Sorting by (ts, id) makes the result
    independent of fetch order — the determinism the invariant depends on."""
    ordered = sorted(events, key=lambda e: (str(e.get("ts") or ""), str(e.get("id") or "")))
    state = initial_state()
    for event in ordered:
        state = apply_event(state, event)
    return state


# ---- confidence --------------------------------------------------------------

def confidence(
    source_weight: float,
    support_count: int,
    last_observed_at: str,
    now: datetime,
    half_life_days: Optional[float],
    *,
    explicit: bool = False,
) -> float:
    """Guide §8.11: source_weight * support_factor * recency_factor.

    Explicit user statements (boundaries, phrase dislikes) reach full support
    immediately; inferred preferences need ~5 observations.
    """
    if support_count <= 0:
        return 0.0
    divisor = 1.0 if explicit else 5.0
    support_factor = min(1.0, support_count / divisor)
    recency_factor = 1.0
    if half_life_days:
        try:
            last = datetime.fromisoformat(last_observed_at)
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            days = max(0.0, (now - last).total_seconds() / 86400.0)
            recency_factor = math.pow(0.5, days / half_life_days)
        except ValueError:
            recency_factor = 1.0
    return max(0.0, min(1.0, abs(source_weight) * support_factor * recency_factor))


def atom_id(user_id: str, domain: str, key: str) -> str:
    """Deterministic atom id — stable across rebuilds for the same belief."""
    return str(uuid.uuid5(_ATOM_NS, f"{user_id}:{domain}:{key}"))


# ---- state -> derived documents ----------------------------------------------

def _pick(scores: dict[str, float], threshold: float = 0.3) -> Optional[str]:
    if not scores:
        return None
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] >= threshold else None


def state_to_documents(state: MemoryState, user_id: str, now: datetime) -> dict:
    """Project MemoryState into the four derived document sets (guide §7.3-7.6)."""
    now_iso = now.isoformat()
    atoms_docs: list[dict] = []
    conf_by_key: dict[tuple[str, str], float] = {}
    polarity_by_key: dict[tuple[str, str], int] = {}

    for (domain, key), atom in sorted(state.atoms.items()):
        if atom.tombstoned or atom.support_count == 0:
            continue
        avg_weight = atom.total_weight / atom.support_count
        conf = confidence(
            avg_weight,
            atom.support_count,
            atom.last_observed_at,
            now,
            HALF_LIVES.get(domain, 90.0),
            explicit=atom.explicit,
        )
        if conf <= 0.0:
            continue
        polarity = 1 if avg_weight >= 0 else -1
        conf_by_key[(domain, key)] = conf
        polarity_by_key[(domain, key)] = polarity
        atoms_docs.append(
            {
                "id": atom_id(user_id, domain, key),
                "user_id": user_id,
                "domain": domain,
                "key": key,
                "value": dict(atom.value),
                "polarity": polarity,
                "confidence": round(conf, 4),
                "support_count": atom.support_count,
                "evidence_event_ids": list(atom.evidence_event_ids),
                "last_observed_at": atom.last_observed_at,
                "memory_schema_version": CURRENT_MEMORY_SCHEMA_VERSION,
                "updated_at": now_iso,
            }
        )

    def pos_conf(domain: str, key: str) -> float:
        return (
            conf_by_key.get((domain, key), 0.0)
            if polarity_by_key.get((domain, key), 1) > 0
            else 0.0
        )

    # -- texting profile --------------------------------------------------
    length = _pick(
        {
            "short": pos_conf("style", "message_length.short"),
            "long": pos_conf("style", "message_length.long"),
        }
    )
    emoji_usage = _pick(
        {
            "none": pos_conf("emoji", "emoji_usage.none"),
            "light": pos_conf("emoji", "emoji_usage.light"),
            "heavy": pos_conf("emoji", "emoji_usage.heavy"),
            "reduce": pos_conf("emoji", "emoji_usage.reduce"),
        }
    )
    if emoji_usage == "reduce":
        emoji_usage = "none"
    style_summary: dict = {}
    if length:
        style_summary["message_length"] = length
    if pos_conf("style", "formality.casual") >= 0.3:
        style_summary["formality"] = "casual"
    if emoji_usage:
        style_summary["emoji_usage"] = emoji_usage
    if pos_conf("style", "capitalization.casual") >= 0.3:
        style_summary["capitalization"] = "casual_lowercase_allowed"
    if pos_conf("style", "punctuation.light") >= 0.3:
        style_summary["punctuation"] = "light"
    if pos_conf("style", "directness.high") >= 0.3:
        style_summary["directness"] = "high"

    dont: list[str] = []
    if pos_conf("style", "avoid_cringe") >= 0.25:
        dont.append("use pickup lines or over-the-top compliments")
    if pos_conf("style", "avoid_needy") >= 0.25:
        dont.append("sound needy or over-apologetic")
    if pos_conf("style", "intensity.reduce") >= 0.25:
        dont.append("over-explain or overdo it")
    if pos_conf("style", "romance.light") >= 0.25:
        dont.append("use heavy romantic wording")
    do: list[str] = []
    if length == "short":
        do.append("keep replies concise")
    if style_summary.get("formality") == "casual":
        do.append("keep the wording casual")
    if pos_conf("style", "more_playful") >= 0.25:
        do.append("add a little playfulness")

    used_confs = [c for c in conf_by_key.values() if c > 0]
    texting_profile = {
        "user_id": user_id,
        "style_summary": style_summary,
        "do": do,
        "dont": dont,
        "confidence": round(sum(used_confs) / len(used_confs), 4) if used_confs else 0.0,
        "support_count": sum(a.support_count for a in state.atoms.values() if not a.tombstoned),
        "signal_count": state.signal_count,
        "memory_schema_version": CURRENT_MEMORY_SCHEMA_VERSION,
        "updated_at": now_iso,
    }

    # -- tone profile ------------------------------------------------------
    tones: dict[str, dict] = {}
    avoid_tones: list[str] = []
    for (domain, key), conf in sorted(conf_by_key.items()):
        if domain != "tone":
            continue
        stage, _, tone = key.partition(".")
        if not tone:
            continue
        if polarity_by_key[(domain, key)] > 0:
            tones.setdefault(stage, {})[tone] = {
                "weight": round(conf, 4),
                "support": state.atoms[(domain, key)].support_count,
            }
        elif conf >= 0.25 and tone not in avoid_tones:
            avoid_tones.append(tone)
    tone_profile = {
        "user_id": user_id,
        "tones": tones,
        "avoid_tones": avoid_tones,
        "memory_schema_version": CURRENT_MEMORY_SCHEMA_VERSION,
        "updated_at": now_iso,
    }

    # -- phrase rules ------------------------------------------------------
    blacklist: list[dict] = []
    replacements: list[dict] = []
    for (domain, key), conf in sorted(conf_by_key.items()):
        if domain != "phrase" or polarity_by_key[(domain, key)] < 0:
            continue
        atom = state.atoms[(domain, key)]
        # Inferred phrase rules need repetition; explicit dislikes apply at once.
        if not atom.explicit and atom.support_count < 2:
            continue
        if conf < 0.25:
            continue
        if key.startswith("blacklist."):
            blacklist.append(
                {
                    "phrase": atom.value.get("phrase", key.removeprefix("blacklist.")),
                    "confidence": round(conf, 4),
                    "support_count": atom.support_count,
                    "evidence_event_ids": list(atom.evidence_event_ids),
                }
            )
        elif key.startswith("replace.") and atom.value.get("to"):
            replacements.append(
                {
                    "from": atom.value.get("from", ""),
                    "to": atom.value.get("to", ""),
                    "confidence": round(conf, 4),
                    "support_count": atom.support_count,
                }
            )
    phrase_rules = {
        "user_id": user_id,
        "blacklist": blacklist,
        "preferred_replacements": replacements,
        "memory_schema_version": CURRENT_MEMORY_SCHEMA_VERSION,
        "updated_at": now_iso,
    }

    return {
        "memory_atoms": atoms_docs,
        "texting_profile": texting_profile,
        "tone_profile": tone_profile,
        "phrase_rules": phrase_rules,
    }
