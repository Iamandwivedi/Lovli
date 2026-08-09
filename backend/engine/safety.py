"""Safety constraints for personalized generation (guide §10.3, §12).

Lovli helps the user communicate better. It never optimizes for pressure,
manipulation, or response probability — the outcome target is that the user
feels the message is natural and authentic.
"""
from __future__ import annotations

from engine.memory_context import MemoryContext

SAFETY_BASELINE: tuple[str, ...] = (
    "respect consent and boundaries",
    "never pressure or guilt the other person",
    "never create deception or invent facts the user did not provide",
    "no jealousy tactics, no manipulation",
    "no sexual escalation without clear adult context from the user",
)


def build_safety_constraints(ctx: MemoryContext) -> list[str]:
    """Baseline rules + the user's own boundaries. Boundaries are included at
    every personalization level, including cold start — an explicit 'never say
    X' outranks everything the engine ever infers."""
    constraints = list(SAFETY_BASELINE)
    for boundary in ctx.boundaries:
        constraints.append(f"user boundary: {boundary}")
    return constraints
