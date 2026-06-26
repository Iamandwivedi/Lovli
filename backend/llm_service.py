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


_LANGUAGE_RULES = {
    "English": (
        "Write the replies in NATURAL ENGLISH only. "
        "Do NOT use any Hindi or romanized Hindi words like 'yaar', 'haan', "
        "'matlab', 'chai', 'kya', 'tu', 'tum', 'na', 'bro' (Hindi-flavored), "
        "'thik', 'theek', 'arre', 'bas', 'bhai', 'bhaiya', 'didi'. "
        "Keep it casual, modern, and natural \u2014 like a fluent English-speaking "
        "Indian Gen-Z / millennial would text on Instagram or Hinge. "
        "Contractions are fine ('I'd', 'gonna', 'lol'). No formal/business tone."
    ),
    "Hinglish": (
        "Write the replies in NATURAL INDIAN HINGLISH \u2014 the way real Indian "
        "Gen-Z / millennials actually text, NOT a robotic English\u2192Hindi "
        "translation. Mix English and romanized Hindi naturally in the same "
        "sentence. Use words like 'yaar', 'matlab', 'na', 'kya', 'arre', "
        "'bro', 'haina', 'wahi', 'sahi', 'chal', 'bas', 'thoda', 'aaj', "
        "'kal' WHERE THEY FIT (don't force them). The vibe should feel "
        "organic, lowercase, and chatty \u2014 like an Instagram DM, not a "
        "textbook. Do NOT use Devanagari script. Roman script only."
    ),
    "Hindi + English mixed": (
        "Write the replies with HINDI AS THE PRIMARY LANGUAGE, with English "
        "words sprinkled naturally where Indian texters would actually use "
        "them (e.g. 'plan', 'meet', 'message', 'reply', 'cute', 'busy'). "
        "Use romanized Hindi (Roman script, not Devanagari) because that's "
        "how chats actually look on WhatsApp / Instagram in India. The "
        "Hindi should feel real and warm \u2014 not formal Hindi like a news "
        "anchor. Casual, conversational, lowercase. Examples of natural "
        "phrasing: 'haan yaar bilkul', 'sahi hai', 'tu bata kya plan hai', "
        "'mujhe bhi same lag raha hai'."
    ),
}


_PLATFORM_RULES = {
    "instagram": (
        "Instagram DM. Tone: casual, social, friendly, low-effort polish. "
        "Lowercase-friendly. Emojis are fine but use sparingly (0-1 per reply). "
        "Sound like a normal Instagram DM, not a marketing message. "
        "It's okay to riff on something visual (their story / post) if the "
        "chat hints at it. Avoid being too formal or too forward."
    ),
    "dating_platform": (
        "Dating app (Hinge / Bumble / Tinder / Aisle / etc). Tone: a little "
        "sharper, confident, and match-app appropriate. Show personality "
        "WITHOUT oversharing or getting too personal too early. Banter and "
        "playful curiosity work well. Do NOT ask deep personal questions, "
        "do NOT propose meeting in the first message unless the chat is "
        "clearly already there, and never use cheesy pickup lines. Keep it "
        "interesting enough that the other person actually wants to reply."
    ),
    "whatsapp": (
        "WhatsApp. Tone: personal, warm, natural, conversational. The user "
        "and the other person already have each other's numbers, so it's "
        "okay to be more direct, more familiar, and reference shared "
        "context. Replies can be a bit longer and more genuine here than "
        "on a dating app. Still respectful, never pushy."
    ),
}


def _language_directive(language: str) -> str:
    rule = _LANGUAGE_RULES.get(language)
    if rule:
        return f"LANGUAGE (strict): {language}.\n{rule}"
    return f"LANGUAGE (strict): {language}. Write naturally in this language only."


_LEGACY_PLATFORM_MAP = {
    # Backwards-compat for users whose preferred_platform is the old label.
    "Instagram": "instagram",
    "WhatsApp": "whatsapp",
    "Hinge": "dating_platform",
    "Bumble": "dating_platform",
    "Tinder": "dating_platform",
    "Aisle": "dating_platform",
    "Other": "dating_platform",
}


def _normalize_platform(platform: str) -> str:
    """Map any legacy value to the canonical (instagram | dating_platform | whatsapp)."""
    if not platform:
        return "dating_platform"
    p = platform.strip()
    if p in _PLATFORM_RULES:
        return p
    if p in _LEGACY_PLATFORM_MAP:
        return _LEGACY_PLATFORM_MAP[p]
    return p.lower().replace(" ", "_")


_PLATFORM_DISPLAY = {
    "instagram": "Instagram",
    "dating_platform": "Dating platform (Hinge / Bumble / Tinder / Aisle / etc.)",
    "whatsapp": "WhatsApp",
}


def _platform_directive(platform_value: str) -> str:
    rule = _PLATFORM_RULES.get(platform_value)
    display = _PLATFORM_DISPLAY.get(platform_value, platform_value)
    if rule:
        return f"PLATFORM: {display}.\n{rule}"
    return f"PLATFORM: {display}."


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
    platform_value = _normalize_platform(platform)
    parts = [
        "Generate exactly 3 reply options for this chat conversation.",
        _platform_directive(platform_value),
        f"Selected vibe: {vibe}",
        # High-level language directive up-front so Claude internalizes it early.
        _language_directive(language),
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
        "General rules: each reply must be 1-3 sentences max, sound like a "
        "real Indian Gen-Z / millennial would text, match the selected vibe, "
        "and never use cringe pickup lines or manipulation. Replies must be "
        "directly sendable but editable, lowercase-friendly, and free of "
        "corporate language."
    )
    parts.append(
        f"FINAL REMINDER \u2014 LANGUAGE = {language}, "
        f"PLATFORM = {_PLATFORM_DISPLAY.get(platform_value, platform_value)}. "
        "All 3 replies MUST follow the language and platform rules above. "
        "Do not silently switch to a different language even if the chat is "
        "in a different language; the user explicitly chose this output "
        "language."
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


# ----- Rich mode (PR-INT) ---------------------------------------------------

# Truthful-only labels the model may pick from. Order communicates progression
# of register (Safe → Bold). The model selects exactly 3 that fit; we accept
# any 3 from this allow-list (case-insensitive match, canonicalized below).
RICH_LABELS_ALLOWED = (
    "Safe",
    "Flirty",
    "Bold",
    "Funny",
    "Sincere",
    "Confident",
)
_RICH_LABEL_LC = {lbl.lower(): lbl for lbl in RICH_LABELS_ALLOWED}
RICH_TEMPERATURE_ALLOWED = ("interested", "neutral", "cold")


def build_user_prompt_v2(
    *,
    platform: str,
    vibe: str,
    language: str,
    manual_text: Optional[str],
    user_note: Optional[str],
    has_image: bool,
    memory_context: Optional[str] = None,
) -> str:
    """Rich-mode prompt: situation read + 3 register-differentiated labeled replies.

    Same language/platform/vibe scaffolding as build_user_prompt — the rich
    instruction is appended on top so Claude keeps every other rule.
    """
    platform_value = _normalize_platform(platform)
    parts = [
        "Generate exactly 3 reply options for this chat conversation in RICH MODE.",
        _platform_directive(platform_value),
        f"Selected vibe: {vibe}",
        _language_directive(language),
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
        "RICH MODE INSTRUCTION:\n"
        "First read the situation honestly. Then write exactly 3 reply options "
        "that differ in register (e.g. Safe \u2192 Flirty \u2192 Bold) within the "
        "user's selected vibe and language, each labeled truthfully. Base every "
        "observation only on the actual chat \u2014 NEVER invent facts, times, or "
        "numbers. Do not fabricate confidence scores, replied-after-Xh signals, "
        "or anything that isn't visible in the chat itself.\n\n"
        "Allowed labels (pick exactly 3 that fit the 3 replies): "
        f"{', '.join(RICH_LABELS_ALLOWED)}.\n"
        "Allowed temperature values: interested | neutral | cold.\n\n"
        "Output ONLY this JSON (no markdown, no prose, no code fences):\n"
        "{\n"
        '  "read": {\n'
        '    "situation": "one honest line on what\'s going on",\n'
        '    "temperature": "interested | neutral | cold",\n'
        '    "signals": ["1-3 short genuine tells from the chat"],\n'
        '    "outcome": ["1-3 \'these replies will likely ...\' bullets"]\n'
        "  },\n"
        '  "replies": [\n'
        '    {"text": "...", "label": "Safe"},\n'
        '    {"text": "...", "label": "Flirty"},\n'
        '    {"text": "...", "label": "Bold"}\n'
        "  ],\n"
        '  "tone_notes": "1 short sentence on why these work"\n'
        "}"
    )
    parts.append(
        "General rules: each reply text must be 1-3 sentences max, sound like a "
        "real Indian Gen-Z / millennial would text, match the selected vibe, and "
        "never use cringe pickup lines or manipulation. Replies must be directly "
        "sendable but editable, lowercase-friendly, and free of corporate "
        "language. signals/outcome bullets must be SHORT (max ~12 words each)."
    )
    parts.append(
        f"FINAL REMINDER \u2014 LANGUAGE = {language}, "
        f"PLATFORM = {_PLATFORM_DISPLAY.get(platform_value, platform_value)}. "
        "All 3 replies MUST follow the language and platform rules above."
    )
    return "\n\n".join(parts)


def validate_payload_v2(payload: dict) -> None:
    """Strict shape check for rich-mode response. Raises LovliValidationError."""
    if not isinstance(payload, dict):
        raise LovliValidationError("payload not a dict")

    # --- read block ---
    read = payload.get("read")
    if not isinstance(read, dict):
        raise LovliValidationError("read must be an object")
    situation = read.get("situation")
    if not isinstance(situation, str) or not situation.strip():
        raise LovliValidationError("read.situation empty/non-string")
    temperature = read.get("temperature")
    if not isinstance(temperature, str) or temperature.strip().lower() not in RICH_TEMPERATURE_ALLOWED:
        raise LovliValidationError(
            f"read.temperature must be one of {RICH_TEMPERATURE_ALLOWED}"
        )
    # Canonicalize to lowercase for the API contract.
    read["temperature"] = temperature.strip().lower()

    def _check_str_list(field_name: str, value, max_items: int = 3) -> None:
        if not isinstance(value, list) or not (1 <= len(value) <= max_items):
            raise LovliValidationError(f"read.{field_name} must be a list of 1-{max_items}")
        for i, item in enumerate(value):
            if not isinstance(item, str) or not item.strip():
                raise LovliValidationError(f"read.{field_name}[{i}] empty/non-string")

    _check_str_list("signals", read.get("signals"))
    _check_str_list("outcome", read.get("outcome"))

    # --- replies block (list of {text,label}) ---
    replies = payload.get("replies")
    if not isinstance(replies, list) or len(replies) != 3:
        raise LovliValidationError("replies must be list of 3")
    for i, r in enumerate(replies):
        if not isinstance(r, dict):
            raise LovliValidationError(f"reply[{i}] must be an object")
        text = r.get("text")
        if not isinstance(text, str) or not text.strip():
            raise LovliValidationError(f"reply[{i}].text empty/non-string")
        label = r.get("label")
        if not isinstance(label, str) or not label.strip():
            raise LovliValidationError(f"reply[{i}].label empty/non-string")
        canonical = _RICH_LABEL_LC.get(label.strip().lower())
        if canonical is None:
            raise LovliValidationError(
                f"reply[{i}].label '{label}' not in allowed set {RICH_LABELS_ALLOWED}"
            )
        r["label"] = canonical  # canonicalize case

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
    # PR-INT: when True, request the rich situation-read + labeled replies schema.
    # Default False keeps the legacy behavior byte-identical.
    rich: bool = False


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

    prompt_builder = build_user_prompt_v2 if req.rich else build_user_prompt
    user_prompt = prompt_builder(
        platform=req.platform,
        vibe=req.vibe,
        language=req.language,
        manual_text=req.manual_text,
        user_note=req.user_note,
        has_image=bool(req.image_base64),
        memory_context=req.memory_context,
    )
    if retry:
        if req.rich:
            user_prompt = (
                "Your previous response was not valid JSON for rich mode. "
                "Output ONLY a JSON object with the EXACT shape: "
                '{"read":{"situation":"s","temperature":"interested|neutral|cold",'
                '"signals":["s"],"outcome":["s"]},'
                '"replies":[{"text":"s","label":"Safe"},{"text":"s","label":"Flirty"},'
                '{"text":"s","label":"Bold"}],"tone_notes":"s"}. '
                "No prose. No code fences.\n\n" + user_prompt
            )
        else:
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
            max_tokens=1536 if req.rich else 1024,
            system=LOVLI_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content_blocks}],
        )
    except Exception as e:  # network / 4xx / 5xx
        raise LovliLlmError(f"anthropic call failed: {e}") from e

    raw = "".join(
        block.text for block in msg.content if getattr(block, "type", None) == "text"
    ).strip()
    return _parse_with_validation(raw, rich=req.rich)


# ---- Emergent provider (fallback) -----------------------------------------

async def _generate_emergent(req: LovliRequest, retry: bool = False) -> dict:
    # Optional dependency — only required if EMERGENT_LLM_KEY is configured AND
    # the primary Anthropic path fails. On Railway (and any portable deploy)
    # the package is not installed; we surface a clean error in that case
    # rather than crashing on ImportError.
    try:
        from emergentintegrations.llm.chat import (  # local import
            ImageContent,
            LlmChat,
            UserMessage,
        )
    except ImportError as e:
        raise LovliLlmError(
            "Emergent LLM fallback not available in this deployment "
            "(emergentintegrations package not installed)."
        ) from e

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise LovliLlmError("EMERGENT_LLM_KEY not configured")

    prompt_builder = build_user_prompt_v2 if req.rich else build_user_prompt
    user_prompt = prompt_builder(
        platform=req.platform,
        vibe=req.vibe,
        language=req.language,
        manual_text=req.manual_text,
        user_note=req.user_note,
        has_image=bool(req.image_base64),
        memory_context=req.memory_context,
    )
    if retry:
        if req.rich:
            user_prompt = (
                "Your previous response was not valid JSON for rich mode. "
                "Output ONLY a JSON object with the EXACT shape: "
                '{"read":{"situation":"s","temperature":"interested|neutral|cold",'
                '"signals":["s"],"outcome":["s"]},'
                '"replies":[{"text":"s","label":"Safe"},{"text":"s","label":"Flirty"},'
                '{"text":"s","label":"Bold"}],"tone_notes":"s"}. '
                "No prose. No code fences.\n\n" + user_prompt
            )
        else:
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

    return _parse_with_validation(raw, rich=req.rich)


def _parse_with_validation(raw: str, *, rich: bool = False) -> dict:
    payload = parse_lovli_json(raw)
    if rich:
        validate_payload_v2(payload)
    else:
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
