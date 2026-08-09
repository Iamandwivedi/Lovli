"""Memory Orchestra: turn a MemoryContext into a generation plan, a prompt
block, and the additive memory_used response field (guide §10).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from engine.memory_context import MemoryContext
from engine.safety import build_safety_constraints


@dataclass
class GenerationPlan:
    level: str
    style_constraints: dict = field(default_factory=dict)
    phrase_avoid: list[str] = field(default_factory=list)
    phrase_prefer: list[dict] = field(default_factory=list)
    avoid_tones: list[str] = field(default_factory=list)
    boundaries: list[str] = field(default_factory=list)
    safety: list[str] = field(default_factory=list)
    do: list[str] = field(default_factory=list)
    dont: list[str] = field(default_factory=list)
    signals: list[str] = field(default_factory=list)  # honest, human-readable


_STYLE_SIGNALS = {
    ("message_length", "short"): "short replies",
    ("message_length", "long"): "fuller replies",
    ("formality", "casual"): "casual wording",
    ("emoji_usage", "none"): "no emojis",
    ("emoji_usage", "light"): "light emoji",
    ("emoji_usage", "heavy"): "emoji-friendly",
    ("capitalization", "casual_lowercase_allowed"): "lowercase-friendly",
    ("punctuation", "light"): "light punctuation",
    ("directness", "high"): "direct tone",
}


def build_generation_plan(
    ctx: MemoryContext,
    *,
    vibe: Optional[str] = None,
    surface: str = "reply",
    stage: Optional[str] = None,
) -> GenerationPlan:
    plan = GenerationPlan(level=ctx.level)
    plan.safety = build_safety_constraints(ctx)
    plan.boundaries = list(ctx.boundaries)

    summary = ctx.texting_profile.get("style_summary") or {}
    if ctx.level == "none":
        # Cold start: only an explicit onboarding self-description may steer.
        if ctx.onboarding_style:
            plan.style_constraints = {"self_described_style": ctx.onboarding_style}
            plan.signals.append(f"your onboarding style ({ctx.onboarding_style})")
        return plan

    if ctx.level == "weak":
        # Guide §8.12: small adjustments only — length + emoji.
        allowed = {k: v for k, v in summary.items() if k in ("message_length", "emoji_usage")}
        plan.style_constraints = allowed
    else:
        plan.style_constraints = dict(summary)
        plan.phrase_avoid = list(ctx.phrase_avoid)
        plan.phrase_prefer = list(ctx.phrase_prefer)
        plan.avoid_tones = list(ctx.avoid_tones)
        plan.do = list(ctx.texting_profile.get("do") or [])
        plan.dont = list(ctx.texting_profile.get("dont") or [])

    for (aspect, value), label in _STYLE_SIGNALS.items():
        if plan.style_constraints.get(aspect) == value:
            plan.signals.append(label)
    if plan.phrase_avoid:
        plan.signals.append("phrases you avoid")
    if plan.avoid_tones:
        plan.signals.append("tones you skip")
    return plan


def plan_is_personalized(plan: GenerationPlan) -> bool:
    return bool(plan.style_constraints or plan.phrase_avoid or plan.avoid_tones or plan.boundaries)


def plan_to_prompt_block(plan: GenerationPlan) -> Optional[str]:
    """Render the plan as one prompt part (server appends it to the existing
    parts list). Distinct wording from the person memory_context block. Returns
    None when there is nothing real to say — cold start stays byte-identical."""
    lines: list[str] = []
    sc = plan.style_constraints
    if sc.get("self_described_style"):
        lines.append(
            f"The user describes their own texting style as: {sc['self_described_style']}."
        )
    style_bits: list[str] = []
    if sc.get("message_length") == "short":
        style_bits.append("keeps replies short")
    elif sc.get("message_length") == "long":
        style_bits.append("writes fuller replies")
    if sc.get("formality") == "casual":
        style_bits.append("texts casually, not formally")
    if sc.get("emoji_usage") == "none":
        style_bits.append("uses no emojis")
    elif sc.get("emoji_usage") == "light":
        style_bits.append("uses at most one emoji")
    elif sc.get("emoji_usage") == "heavy":
        style_bits.append("is comfortable with emojis")
    if sc.get("capitalization") == "casual_lowercase_allowed":
        style_bits.append("often starts messages lowercase")
    if sc.get("punctuation") == "light":
        style_bits.append("uses light punctuation")
    if sc.get("directness") == "high":
        style_bits.append("is direct")
    if style_bits:
        lines.append("Their actual texting style: " + "; ".join(style_bits) + ".")
    if plan.do:
        lines.append("Do: " + "; ".join(plan.do) + ".")
    if plan.dont:
        lines.append("Don't: " + "; ".join(plan.dont) + ".")
    if plan.phrase_avoid:
        lines.append(
            "Never use these phrases (the user always removes them): "
            + "; ".join(f'"{p}"' for p in plan.phrase_avoid)
            + "."
        )
    if plan.phrase_prefer:
        lines.append(
            "Preferred wording: "
            + "; ".join(f'"{r["from"]}" -> "{r["to"]}"' for r in plan.phrase_prefer)
            + "."
        )
    if plan.avoid_tones:
        lines.append("Avoid these tones for this user: " + ", ".join(plan.avoid_tones) + ".")
    if plan.boundaries:
        lines.append(
            "HARD user boundaries (these outrank the requested vibe): "
            + "; ".join(plan.boundaries)
            + "."
        )

    if not lines:
        return None
    return (
        "USER'S OWN TEXTING STYLE (learned from how they actually text — match "
        "this voice, never mention that you know it):\n" + "\n".join(f"- {l}" for l in lines)
    )


def build_memory_used(plan: GenerationPlan, *, reranked: bool = False) -> Optional[dict]:
    """The additive response field. Signals are only ever derived from real
    atoms — never fabricated counts (guide §11.6). None when nothing was used
    so response_model_exclude_none keeps old shapes byte-identical."""
    if not plan_is_personalized(plan):
        return None
    return {"is_personalized": True, "signals": plan.signals[:6]}
