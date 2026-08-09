"""PR-M3 pytest suite — pure reducer determinism + learning behavior.

No TestClient, no db: events in, state/documents out.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from engine import memory_reducers as mr
from engine.text_features import diff_text, extract_text_features

NOW = datetime(2026, 8, 9, 12, 0, 0, tzinfo=timezone.utc)


def _ev(i: int, etype: str, payload: dict, ts: str | None = None) -> dict:
    return {
        "id": f"evt-{i:04d}",
        "user_id": "u1",
        "type": etype,
        "ts": ts or f"2026-08-01T10:{i:02d}:00+00:00",
        "payload": payload,
    }


def _edit(i: int, generated: str, edited: str) -> dict:
    return _ev(i, "reply_edited", {"generated_text": generated, "edited_text": edited})


# ---- text features -----------------------------------------------------------

class TestTextFeatures:
    def test_basic_features(self):
        f = extract_text_features("Haha maybe, but only if you promise it will be fun 😉")
        assert f.emoji_count == 1
        assert f.word_count > 5
        assert not f.lowercase_start

    def test_diff_shorten_and_lowercase(self):
        d = diff_text(
            "That sounds amazing! I would love to hear more about it.",
            "that sounds good, tell me more",
        )
        assert d.length_ratio < 0.8
        assert d.casing_lowered
        assert d.punctuation_reduced
        assert d.formality_reduced

    def test_diff_emoji_removed(self):
        d = diff_text("see you there 😉😍", "see you there")
        assert d.emoji_delta == -2

    def test_diff_phrase_removal_detected(self):
        d = diff_text("hey there stranger, how was your weekend", "hey, how was your weekend")
        assert any("hey there" in p for p in d.removed_phrases)


# ---- determinism -------------------------------------------------------------

def _sample_events() -> list[dict]:
    events = []
    for i in range(6):
        events.append(
            _ev(i, "reply_copied", {"generation_id": f"g{i}", "index": 0,
                                    "text": "sounds good, batao kab", "label": "Safe"})
        )
    events.append(_edit(10, "Hey there! I would love to hear more about it.",
                        "hey, tell me more"))
    events.append(_ev(11, "tone_selected", {"tone": "Funny"}))
    events.append(_ev(12, "boundary_added", {"text": "never use pet names"}))
    return events


class TestDeterminism:
    def test_replay_is_deterministic(self):
        events = _sample_events()
        docs_a = mr.state_to_documents(mr.reduce_all(events), "u1", NOW)
        docs_b = mr.state_to_documents(mr.reduce_all(events), "u1", NOW)
        assert docs_a == docs_b

    def test_shuffled_input_same_output(self):
        events = _sample_events()
        shuffled = list(events)
        random.Random(42).shuffle(shuffled)
        docs_a = mr.state_to_documents(mr.reduce_all(events), "u1", NOW)
        docs_b = mr.state_to_documents(mr.reduce_all(shuffled), "u1", NOW)
        assert docs_a == docs_b

    def test_atom_ids_stable_across_rebuilds(self):
        events = _sample_events()
        a = {d["key"]: d["id"] for d in mr.state_to_documents(mr.reduce_all(events), "u1", NOW)["memory_atoms"]}
        b = {d["key"]: d["id"] for d in mr.state_to_documents(mr.reduce_all(events), "u1", NOW)["memory_atoms"]}
        assert a == b

    def test_unknown_event_types_ignored(self):
        state = mr.reduce_all([_ev(0, "future_event_type", {"x": 1})])
        assert state.atoms == {}
        assert state.signal_count == 0


# ---- edit-diff learning (guide §8.7) -----------------------------------------

class TestEditLearning:
    def test_shortening_teaches_short_preference(self):
        state = mr.reduce_all(
            [_edit(i, "That sounds amazing! I would love to hear more about it and everything.",
                   "sounds good, tell me more") for i in range(5)]
        )
        atom = state.atoms[("style", "message_length.short")]
        assert atom.support_count >= 5

    def test_emoji_removal_teaches_reduce(self):
        state = mr.reduce_all([_edit(1, "see you there 😉", "see you there")])
        assert ("emoji", "emoji_usage.reduce") in state.atoms

    def test_repeated_phrase_removal_creates_blacklist(self):
        events = [
            _edit(i, "hey there stranger, what are you doing this weekend",
                  "hey, what are you doing this weekend")
            for i in range(3)
        ]
        docs = mr.state_to_documents(mr.reduce_all(events), "u1", NOW)
        phrases = [b["phrase"] for b in docs["phrase_rules"]["blacklist"]]
        assert any("hey there" in p for p in phrases)

    def test_single_phrase_removal_not_blacklisted(self):
        events = [_edit(1, "hey there stranger, hello", "hey, hello")]
        docs = mr.state_to_documents(mr.reduce_all(events), "u1", NOW)
        assert docs["phrase_rules"]["blacklist"] == []

    def test_explicit_phrase_dislike_applies_immediately(self):
        events = [_ev(1, "phrase_disliked", {"phrase": "beautiful stranger"})]
        docs = mr.state_to_documents(mr.reduce_all(events), "u1", NOW)
        assert [b["phrase"] for b in docs["phrase_rules"]["blacklist"]] == ["beautiful stranger"]


# ---- confidence --------------------------------------------------------------

class TestConfidence:
    def test_support_factor_caps_at_one(self):
        low = mr.confidence(0.9, 1, NOW.isoformat(), NOW, None)
        high = mr.confidence(0.9, 10, NOW.isoformat(), NOW, None)
        assert low == 0.9 * (1 / 5)
        assert high == 0.9

    def test_half_life_decay(self):
        old_ts = (NOW - timedelta(days=60)).isoformat()
        decayed = mr.confidence(0.9, 10, old_ts, NOW, 60.0)
        assert abs(decayed - 0.45) < 0.01

    def test_boundary_never_decays(self):
        old_ts = (NOW - timedelta(days=365)).isoformat()
        assert mr.confidence(1.0, 1, old_ts, NOW, None, explicit=True) == 1.0

    def test_negative_source_weight_gives_polarity_not_confidence_zero(self):
        events = [_ev(i, "reply_rejected", {"label": "Bold"}) for i in range(5)]
        docs = mr.state_to_documents(mr.reduce_all(events), "u1", NOW)
        assert "bold" in docs["tone_profile"]["avoid_tones"]


# ---- controls ----------------------------------------------------------------

class TestControls:
    def test_tombstone_survives_replay(self):
        events = _sample_events()
        events.append(_ev(90, "preference_removed",
                          {"domain": "style", "key": "message_length.short"}))
        # More evidence for short AFTER removal must not resurrect it.
        events.append(_edit(91, "long generated reply that got much much shorter here ok",
                            "short now"))
        docs = mr.state_to_documents(mr.reduce_all(events), "u1", NOW)
        keys = [a["key"] for a in docs["memory_atoms"]]
        assert "message_length.short" not in keys

    def test_memory_reset_zeroes_state(self):
        events = _sample_events()
        events.append(_ev(95, "memory_reset", {}))
        state = mr.reduce_all(events)
        assert state.atoms == {}
        assert state.signal_count == 0
        assert state.last_reset_ts

    def test_events_after_reset_learn_again(self):
        events = _sample_events()
        events.append(_ev(95, "memory_reset", {}))
        events.append(_ev(96, "tone_selected", {"tone": "Funny"}))
        state = mr.reduce_all(events)
        assert ("tone", "any.funny") in state.atoms
        assert state.signal_count == 1


# ---- copy dedupe -------------------------------------------------------------

class TestCopyDedupe:
    def test_duplicate_copy_events_counted_once(self):
        # Mobile trackEvent + /feedback dual-write for the same copy.
        e1 = _ev(1, "reply_copied", {"generation_id": "g1", "index": 0,
                                     "text": "sounds good", "label": "Safe"})
        e2 = _ev(2, "reply_copied", {"generation_id": "g1", "index": 0,
                                     "text": "sounds good"})
        state = mr.reduce_all([e1, e2])
        assert state.signal_count == 1
        assert state.atoms[("style", "message_length.short")].support_count == 1

    def test_distinct_copies_both_count(self):
        e1 = _ev(1, "reply_copied", {"generation_id": "g1", "index": 0, "text": "a b c"})
        e2 = _ev(2, "reply_copied", {"generation_id": "g2", "index": 0, "text": "a b c"})
        assert mr.reduce_all([e1, e2]).signal_count == 2


# ---- feedback chips + onboarding --------------------------------------------

class TestChipsAndOnboarding:
    def test_too_formal_chip(self):
        state = mr.reduce_all([_ev(1, "feedback_chip", {"chip": "Too formal"})])
        assert ("style", "formality.casual") in state.atoms

    def test_too_much_chip_maps_to_two_atoms(self):
        state = mr.reduce_all([_ev(1, "feedback_chip", {"chip": "Too much"})])
        assert ("style", "intensity.reduce") in state.atoms
        assert ("style", "message_length.short") in state.atoms

    def test_onboarding_seeds_weak_atoms(self):
        state = mr.reduce_all(
            [
                _ev(1, "onboarding_pref",
                    {"question": "texting_style", "answer": "short and casual"}),
                _ev(2, "onboarding_pref",
                    {"question": "avoid", "answers": ["too many emojis", "sounding needy"]}),
            ]
        )
        assert ("style", "message_length.short") in state.atoms
        assert ("emoji", "emoji_usage.none") in state.atoms
        assert ("style", "avoid_needy") in state.atoms
        assert state.atoms[("style", "message_length.short")].total_weight == 0.4


# ---- boundary priority -------------------------------------------------------

class TestBoundaryPriority:
    def test_boundary_atom_full_confidence_on_one_event(self):
        docs = mr.state_to_documents(
            mr.reduce_all([_ev(1, "boundary_added", {"text": "never use sexual language"})]),
            "u1",
            NOW,
        )
        boundary = [a for a in docs["memory_atoms"] if a["domain"] == "boundary"]
        assert len(boundary) == 1
        assert boundary[0]["confidence"] == 1.0
        assert boundary[0]["value"]["text"] == "never use sexual language"
