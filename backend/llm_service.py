"""
backend/llm_service.py

Clean Lovli LLM service. Single source of truth for chat-completion calls.

Provider routing (controlled by LLM_PROVIDER env, default "auto"):
  - "auto"      : use direct Anthropic if ANTHROPIC_API_KEY is set, else Emergent
  - "anthropic" : force direct Anthropic SDK (requires ANTHROPIC_API_KEY)
  - "emergent"  : force Emergent universal key (requires EMERGENT_LLM_KEY)

Both paths support image-vision (base64) + text. Both return strict JSON:
    {"replies": [str, str, str], "tone_notes": str}

The service NEVER exposes the API key. It is read from process env only.
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Optional

# ----- Lovli prompt templates -----------------------------------------------

LOVLI_SYSTEM_PROMPT = (
    "You are Lovli, an AI dating coach for Indian chats. "
    "You help users write natural, respectful, context-aware replies for "
    "dating or social conversations. You understand Hinglish, Indian "
    "culture, Instagram/Hinge/Bumble/Tinder/WhatsApp chat style, and modern "
    "texting tone. Your goal is to help the user communicate better while "
    "still sounding like themselves. Do not manipulate, pressure, or "
    "encourage creepy behavior. Keep replies natural, confident, and "
    "respectful. Never use pickup-artist tactics. Replies should be short "
    "to medium length, directly usable but editable, and free of cringe. "
    "Always respond ONLY with valid JSON in the exact schema requested — "
    "no markdown fences, no commentary, no leading/trailing prose."
)


def build_user_prompt(
    *,
    platform: str,
    vibe: str,
    language: str,
    manual_text: Optional[str],
    user_note: Optional[str],
    has_image: bool,
    memory_context: Optional[str] = None,
) -> str:
    parts = [
        "Generate exactly 3 reply options for this chat conversation.",
        f"Platform: {platform}",
        f"Selected vibe: {vibe}",
        f"Language preference: {language}",
    ]
    if has_image:
        parts.append(
            "Chat context: extract the conversation from the attached "
            "screenshot. The most recent message is from the OTHER person "
            "and the user wants to reply to it. If multiple messages are "
            "visible, focus on the latest message that the user needs to "
            "respond to."
        )
    if manual_text:
        parts.append(f'Chat text provided by user:\n"""\n{manual_text}\n"""')
    if user_note:
        parts.append(f"User note / extra context: {user_note}")
    if memory_context:
        parts.append(f"Memory context about this person: {memory_context}")

    parts.append(
        "Output JSON schema (and ONLY this JSON, nothing else):\n"
        "{\n"
        '  "replies": ["reply 1", "reply 2", "reply 3"],\n'
        '  "tone_notes": "1 short sentence on why these work"\n'
        "}"
    )
    parts.append(
        "Rules: each reply must be 1-3 sentences max, sound like a real "
        "Indian Gen-Z / millennial would text, match the selected vibe, "
        "respect Hinglish if the language preference asks for it, and "
        "never use cringe pickup lines."
    )
    return "\n\n".join(parts)


# ----- JSON helpers ---------------------------------------------------------

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def _strip_code_fences(text: str) -> str:
    return _FENCE_RE.sub("", text.strip()).strip()


def parse_lovli_json(raw: str) -> dict:
    cleaned = _strip_code_fences(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


class LovliValidationError(ValueError):
    pass


def validate_payload(payload: dict) -> None:
    if not isinstance(payload, dict):
        raise LovliValidationError("payload not a dict")
    replies = payload.get("replies")
    if not isinstance(replies, list) or len(replies) != 3:
        raise LovliValidationError("replies must be list of 3")
    for i, r in enumerate(replies):
        if not isinstance(r, str) or not r.strip():
            raise LovliValidationError(f"reply[{i}] empty/non-string")
    tone = payload.get("tone_notes")
    if not isinstance(tone, str) or not tone.strip():
        raise LovliValidationError("tone_notes empty/non-string")


# ----- Provider abstraction -------------------------------------------------

@dataclass
class LovliRequest:
    platform: str
    vibe: str
    language: str
    manual_text: Optional[str] = None
    user_note: Optional[str] = None
    image_base64: Optional[str] = None
    image_mime: str = "image/png"
    memory_context: Optional[str] = None
    session_id: str = "lovli-session"


class LovliLlmError(RuntimeError):
    """Raised when generation fails after retries (caller should map to 503)."""


def _resolve_provider() -> str:
    explicit = (os.environ.get("LLM_PROVIDER") or "auto").lower().strip()
    if explicit == "auto":
        return "anthropic" if os.environ.get("ANTHROPIC_API_KEY") else "emergent"
    return explicit


# ---- Direct Anthropic provider --------------------------------------------

async def _generate_anthropic(req: LovliRequest, retry: bool = False) -> dict:
    """Use the official Anthropic SDK with Claude Vision."""
    from anthropic import AsyncAnthropic  # local import to keep import-time light

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise LovliLlmError("ANTHROPIC_API_KEY not configured")

    model = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")

    user_prompt = build_user_prompt(
        platform=req.platform,
        vibe=req.vibe,
        language=req.language,
        manual_text=req.manual_text,
        user_note=req.user_note,
        has_image=bool(req.image_base64),
        memory_context=req.memory_context,
    )
    if retry:
        user_prompt = (
            "Your previous response was not valid JSON. "
            'Output ONLY a JSON object: {"replies":["s","s","s"],'
            '"tone_notes":"s"}. No prose. No code fences.\n\n' + user_prompt
        )

    content_blocks: list[dict] = []
    if req.image_base64:
        # Anthropic vision expects {type:image, source:{type:base64,media_type,data}}
        content_blocks.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": req.image_mime or "image/png",
                    "data": req.image_base64,
                },
            }
        )
    content_blocks.append({"type": "text", "text": user_prompt})

    client = AsyncAnthropic(api_key=api_key)
    try:
        msg = await client.messages.create(
            model=model,
            max_tokens=1024,
            system=LOVLI_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content_blocks}],
        )
    except Exception as e:  # network / 4xx / 5xx
        raise LovliLlmError(f"anthropic call failed: {e}") from e

    raw = "".join(
        block.text for block in msg.content if getattr(block, "type", None) == "text"
    ).strip()
    return _parse_with_validation(raw)


# ---- Emergent provider (fallback) -----------------------------------------

async def _generate_emergent(req: LovliRequest, retry: bool = False) -> dict:
    from emergentintegrations.llm.chat import (  # local import
        ImageContent,
        LlmChat,
        UserMessage,
    )

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise LovliLlmError("EMERGENT_LLM_KEY not configured")

    user_prompt = build_user_prompt(
        platform=req.platform,
        vibe=req.vibe,
        language=req.language,
        manual_text=req.manual_text,
        user_note=req.user_note,
        has_image=bool(req.image_base64),
        memory_context=req.memory_context,
    )
    if retry:
        user_prompt = (
            "Your previous response was not valid JSON. "
            'Output ONLY a JSON object: {"replies":["s","s","s"],'
            '"tone_notes":"s"}. No prose. No code fences.\n\n' + user_prompt
        )

    chat = LlmChat(
        api_key=api_key,
        session_id=req.session_id + ("-retry" if retry else ""),
        system_message=LOVLI_SYSTEM_PROMPT,
    ).with_model("anthropic", os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5-20250929"))

    file_contents = None
    if req.image_base64:
        file_contents = [ImageContent(image_base64=req.image_base64)]

    msg = UserMessage(text=user_prompt, file_contents=file_contents)
    try:
        raw = await chat.send_message(msg)
    except Exception as e:
        raise LovliLlmError(f"emergent call failed: {e}") from e

    return _parse_with_validation(raw)


def _parse_with_validation(raw: str) -> dict:
    payload = parse_lovli_json(raw)
    validate_payload(payload)
    return payload


# ----- Public API -----------------------------------------------------------

async def generate_replies(req: LovliRequest) -> dict:
    """Generate 3 Lovli replies. Auto-retries once on JSON parse/validation failure.

    Provider routing:
      - LLM_PROVIDER=auto      : prefer direct Anthropic if ANTHROPIC_API_KEY is set;
                                 if Anthropic returns a transient error (overload /
                                 5xx / rate-limit), automatically fall back to Emergent.
      - LLM_PROVIDER=anthropic : force direct Anthropic.
      - LLM_PROVIDER=emergent  : force Emergent.

    Raises LovliLlmError on hard failure (caller should return 503).
    """
    explicit = (os.environ.get("LLM_PROVIDER") or "auto").lower().strip()
    has_anthropic_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_emergent_key = bool(os.environ.get("EMERGENT_LLM_KEY"))

    if explicit == "auto":
        primary = "anthropic" if has_anthropic_key else "emergent"
        # Only fall back if we actually have a different second provider available
        fallback = (
            "emergent"
            if primary == "anthropic" and has_emergent_key
            else None
        )
    else:
        primary = explicit
        fallback = None

    async def _try(provider: str, retry: bool) -> dict:
        if provider == "anthropic":
            return await _generate_anthropic(req, retry=retry)
        if provider == "emergent":
            return await _generate_emergent(req, retry=retry)
        raise LovliLlmError(f"unknown provider {provider!r}")

    async def _attempt(provider: str) -> dict:
        try:
            return await _try(provider, retry=False)
        except (LovliValidationError, json.JSONDecodeError):
            # bad JSON / schema — one stricter retry on same provider
            return await _try(provider, retry=True)

    try:
        return await _attempt(primary)
    except LovliLlmError as primary_err:
        if fallback is None:
            raise
        # Only fall back on errors that look transient (overload / 5xx / rate-limit)
        msg = str(primary_err).lower()
        transient_markers = (
            "overload",
            "529",
            "rate limit",
            "ratelimit",
            "rate_limit",
            "503",
            "502",
            "504",
            "timeout",
            "timed out",
            "connection",
        )
        if not any(m in msg for m in transient_markers):
            raise
        try:
            return await _attempt(fallback)
        except LovliLlmError as fb_err:
            raise LovliLlmError(
                f"primary({primary}) failed: {primary_err}; "
                f"fallback({fallback}) failed: {fb_err}"
            ) from fb_err
