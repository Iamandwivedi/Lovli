"""Pure text feature extraction + edit diffing for the memory engine.

No LLM, no I/O — deterministic functions over strings so reducer replay is
byte-stable. Used by the edit-diff/style reducers and by reply scoring.
"""
from __future__ import annotations

import difflib
import re
from dataclasses import dataclass
from typing import Tuple

# Covers the common emoji blocks + variation selector. Not exhaustive on
# purpose — deterministic and dependency-free beats perfect.
_EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001F5FF"
    "\U0001F600-\U0001F64F"
    "\U0001F680-\U0001F6FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA70-\U0001FAFF"
    "☀-➿"
    "❤"
    "️"
    "]"
)

_LAUGH_RE = re.compile(r"\b(?:ha(?:ha)+|he(?:he)+|lo+l|lmao+|rofl)\b", re.IGNORECASE)

# Phrases that read formal/intense in a casual dating chat.
_FORMAL_MARKERS = (
    "i would love to",
    "i would like to",
    "i was wondering if",
    "would you be interested",
    "it would be wonderful",
    "certainly",
    "regarding",
    "furthermore",
    "apologies",
    "i apologize",
    "please let me know",
    "looking forward to",
    "that sounds amazing",
    "absolutely delighted",
)

_CONTRACTION_RE = re.compile(
    r"\b(?:i'm|i'd|i'll|i've|don't|can't|won't|it's|that's|you're|we're|let's|"
    r"gonna|wanna|gotta|kinda|sorta)\b",
    re.IGNORECASE,
)

_WORD_RE = re.compile(r"[a-zA-Z0-9']+")

# Words too generic to blacklist on their own inside removed spans.
_STOPWORDS = frozenset(
    "a an the and or but so to of in on at for with is are was be it this that "
    "i you me my your we they he she".split()
)


@dataclass(frozen=True)
class TextFeatures:
    char_len: int
    word_count: int
    emoji_count: int
    exclamation_count: int
    question_count: int
    ends_with_question: bool
    lowercase_start: bool
    uppercase_ratio: float
    comma_count: int
    has_ellipsis: bool
    formal_markers: int
    filler_laughs: int
    contractions: int


def extract_text_features(text: str) -> TextFeatures:
    text = text or ""
    stripped = text.strip()
    letters = [c for c in stripped if c.isalpha()]
    upper = sum(1 for c in letters if c.isupper())
    lowered = stripped.lower()
    return TextFeatures(
        char_len=len(stripped),
        word_count=len(_WORD_RE.findall(stripped)),
        emoji_count=len(_EMOJI_RE.findall(stripped)),
        exclamation_count=stripped.count("!"),
        question_count=stripped.count("?"),
        ends_with_question=stripped.endswith("?"),
        lowercase_start=bool(stripped) and stripped[0].isalpha() and stripped[0].islower(),
        uppercase_ratio=(upper / len(letters)) if letters else 0.0,
        comma_count=stripped.count(","),
        has_ellipsis="..." in stripped or "…" in stripped,
        formal_markers=sum(1 for m in _FORMAL_MARKERS if m in lowered),
        filler_laughs=len(_LAUGH_RE.findall(stripped)),
        contractions=len(_CONTRACTION_RE.findall(stripped)),
    )


def _tokens(text: str) -> list[str]:
    return [t.lower() for t in _WORD_RE.findall(text or "")]


def _span_ok(tokens: list[str]) -> bool:
    """A removed/added span is meaningful if it's 2-6 words and not all stopwords."""
    if not (2 <= len(tokens) <= 6):
        return False
    return any(t not in _STOPWORDS for t in tokens)


@dataclass(frozen=True)
class FeatureDiff:
    length_ratio: float          # edited chars / generated chars (1.0 when equal)
    emoji_delta: int             # edited emoji - generated emoji
    casing_lowered: bool
    punctuation_reduced: bool
    formality_reduced: bool
    removed_phrases: Tuple[str, ...]
    added_phrases: Tuple[str, ...]
    replacements: Tuple[Tuple[str, str], ...]  # (from_phrase, to_phrase)


def diff_text(generated: str, edited: str) -> FeatureDiff:
    before = extract_text_features(generated)
    after = extract_text_features(edited)

    gen_tokens = _tokens(generated)
    edit_tokens = _tokens(edited)
    removed: list[str] = []
    added: list[str] = []
    replacements: list[tuple[str, str]] = []
    matcher = difflib.SequenceMatcher(a=gen_tokens, b=edit_tokens, autojunk=False)
    for op, i1, i2, j1, j2 in matcher.get_opcodes():
        if op == "delete":
            # Extend one anchor token left so "Hey there" -> "hey" learns the
            # phrase "hey there", not just the orphaned "there".
            start = max(0, i1 - 1)
            span = gen_tokens[start:i2]
            if _span_ok(span):
                removed.append(" ".join(span))
        elif op == "insert" and _span_ok(edit_tokens[j1:j2]):
            added.append(" ".join(edit_tokens[j1:j2]))
        elif op == "replace":
            frm = gen_tokens[i1:i2]
            to = edit_tokens[j1:j2]
            if _span_ok(frm):
                removed.append(" ".join(frm))
                if 1 <= len(to) <= 6:
                    replacements.append((" ".join(frm), " ".join(to)))
            if _span_ok(to):
                added.append(" ".join(to))

    # Exclamations carry the enthusiasm signal; commas only break ties.
    punct_before = before.exclamation_count * 2 + before.comma_count
    punct_after = after.exclamation_count * 2 + after.comma_count
    formality_reduced = (
        after.formal_markers < before.formal_markers
        or (after.contractions > before.contractions and after.char_len <= before.char_len)
    )
    return FeatureDiff(
        length_ratio=(after.char_len / before.char_len) if before.char_len else 1.0,
        emoji_delta=after.emoji_count - before.emoji_count,
        casing_lowered=(not before.lowercase_start) and after.lowercase_start,
        punctuation_reduced=punct_after < punct_before,
        formality_reduced=formality_reduced,
        removed_phrases=tuple(removed),
        added_phrases=tuple(added),
        replacements=tuple(replacements),
    )


def normalize_phrase(phrase: str) -> str:
    """Stable key for a phrase atom: lowercase words joined by underscores."""
    return "_".join(_tokens(phrase))[:80]
