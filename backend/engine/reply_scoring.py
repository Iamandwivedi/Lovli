"""Pure reranking of the LLM's reply variants against the user's learned style
(guide §10.4). Reorders only — never rewrites text. replies[0] stays the
default the UI shows first, so the best-scoring variant leads.
"""
from __future__ import annotations

from engine.reply_orchestrator import GenerationPlan
from engine.text_features import extract_text_features

_SHORT_TARGET = 110  # chars — "short" replies should land under this
_VIBE_LABEL_AFFINITY = {
    # requested vibe -> labels that express it (RICH_LABELS_ALLOWED values)
    "Playful": ("Funny", "Flirty", "Safe"),
    "Flirty": ("Flirty", "Bold", "Funny"),
    "Sincere": ("Sincere", "Safe", "Confident"),
    "Respectful": ("Safe", "Sincere", "Confident"),
    "Confident": ("Confident", "Bold", "Flirty"),
}


def score_reply(
    text: str,
    label: str,
    plan: GenerationPlan,
    requested_vibe: str | None = None,
) -> float:
    f = extract_text_features(text)
    lowered = (text or "").lower()
    score = 0.0
    sc = plan.style_constraints

    if sc.get("message_length") == "short":
        score += 1.0 if f.char_len <= _SHORT_TARGET else -0.5
    elif sc.get("message_length") == "long":
        score += 0.5 if f.char_len > _SHORT_TARGET else -0.25

    emoji_pref = sc.get("emoji_usage")
    if emoji_pref == "none":
        score += 0.5 if f.emoji_count == 0 else -0.75 * f.emoji_count
    elif emoji_pref == "light":
        score += 0.5 if f.emoji_count <= 1 else -0.5 * (f.emoji_count - 1)
    if sc.get("capitalization") == "casual_lowercase_allowed" and f.lowercase_start:
        score += 0.25
    if sc.get("punctuation") == "light" and f.exclamation_count == 0:
        score += 0.25

    for phrase in plan.phrase_avoid:
        if phrase and phrase.lower() in lowered:
            score -= 2.0  # blacklisted phrase — hard demotion
    for rule in plan.phrase_prefer:
        frm = str(rule.get("from") or "").lower()
        if frm and frm in lowered:
            score -= 0.5

    if label and label.lower() in {t.lower() for t in plan.avoid_tones}:
        score -= 1.5
    if requested_vibe and label:
        affinity = _VIBE_LABEL_AFFINITY.get(requested_vibe, ())
        if label in affinity:
            score += 0.5 - 0.1 * affinity.index(label)
    return score


def rerank_replies(
    replies: list[str],
    labels: list[str] | None,
    plan: GenerationPlan,
    requested_vibe: str | None = None,
) -> tuple[list[str], list[str] | None, list[float]]:
    """Stable-sort variants by score, best first. Labels move in lockstep with
    their reply text. Ties keep the LLM's original order."""
    safe_labels = list(labels) if labels is not None else [""] * len(replies)
    scored = [
        (score_reply(text, safe_labels[i] if i < len(safe_labels) else "", plan, requested_vibe), i)
        for i, text in enumerate(replies)
    ]
    order = sorted(range(len(replies)), key=lambda i: (-scored[i][0], i))
    new_replies = [replies[i] for i in order]
    new_labels = [safe_labels[i] for i in order] if labels is not None else None
    new_scores = [round(scored[i][0], 3) for i in order]
    return new_replies, new_labels, new_scores
