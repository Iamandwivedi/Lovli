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
    feeling: Optional[str] = None,
    intent: Optional[str] = None,
    outcome: Optional[str] = None,
    goal: Optional[str] = None,
    style_context: Optional[str] = None,
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
    # PR-M5 (additive): learned texting-style block from the memory orchestra.
    # Absent → prompt byte-identical.
    if style_context:
        parts.append(style_context)
    # PR-V2-3 (additive): emotional/intent context. When absent, the prompt is
    # byte-identical to the pre-V2-3 build.
    if feeling:
        parts.append(f"How the user is feeling right now: {feeling}.")
    if intent:
        parts.append(f"What the user wants to do with this reply: {intent}.")
    if outcome:
        parts.append(f"How the user wants this reply to land: {outcome}.")
    if goal:
        parts.append(f"The user's bigger dating goal: {goal}.")

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
    feeling: Optional[str] = None,
    intent: Optional[str] = None,
    outcome: Optional[str] = None,
    goal: Optional[str] = None,
    style_context: Optional[str] = None,
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
    # PR-M5 (additive): learned texting-style block from the memory orchestra.
    if style_context:
        parts.append(style_context)
    # PR-V2-3 (additive): emotional/intent context — folded into the read so the
    # insight speaks to what the user is actually going through.
    if feeling:
        parts.append(f"How the user is feeling right now: {feeling}.")
    if intent:
        parts.append(f"What the user wants to do with this reply: {intent}.")
    if outcome:
        parts.append(f"How the user wants this reply to land: {outcome}.")
    if goal:
        parts.append(f"The user's bigger dating goal: {goal}.")

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
        '  "tone_notes": "1 short sentence on why these work",\n'
        '  "wingman_advice": "one honest first-person line — what you would do next if you were the user\'s wingman (no scores, no percentages)"\n'
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

    # PR-V2-3: wingman_advice is soft-optional — coerce junk to absent so the
    # server falls back to tone_notes instead of failing the generation.
    wingman = payload.get("wingman_advice")
    if not isinstance(wingman, str) or not wingman.strip():
        payload.pop("wingman_advice", None)


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
    # PR-V2-3 (additive): emotional/intent context — all optional; absent keeps
    # prompts byte-identical to the pre-V2-3 build.
    feeling: Optional[str] = None
    intent: Optional[str] = None
    outcome: Optional[str] = None
    goal: Optional[str] = None
    # PR-M5 (additive): learned texting-style prompt block. None → prompts
    # byte-identical to pre-memory-engine builds.
    style_context: Optional[str] = None


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
        feeling=req.feeling,
        intent=req.intent,
        outcome=req.outcome,
        goal=req.goal,
        style_context=req.style_context,
    )
    if retry:
        if req.rich:
            user_prompt = (
                "Your previous response was not valid JSON for rich mode. "
                "Output ONLY a JSON object with the EXACT shape: "
                '{"read":{"situation":"s","temperature":"interested|neutral|cold",'
                '"signals":["s"],"outcome":["s"]},'
                '"replies":[{"text":"s","label":"Safe"},{"text":"s","label":"Flirty"},'
                '{"text":"s","label":"Bold"}],"tone_notes":"s","wingman_advice":"s"}. '
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
        feeling=req.feeling,
        intent=req.intent,
        outcome=req.outcome,
        goal=req.goal,
        style_context=req.style_context,
    )
    if retry:
        if req.rich:
            user_prompt = (
                "Your previous response was not valid JSON for rich mode. "
                "Output ONLY a JSON object with the EXACT shape: "
                '{"read":{"situation":"s","temperature":"interested|neutral|cold",'
                '"signals":["s"],"outcome":["s"]},'
                '"replies":[{"text":"s","label":"Safe"},{"text":"s","label":"Flirty"},'
                '{"text":"s","label":"Bold"}],"tone_notes":"s","wingman_advice":"s"}. '
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

# ---- Ask Lovli (PR-V2-4) ----------------------------------------------------
# Free-form coach chat. Plain-text responses (no JSON schema), same provider
# routing as generate_replies (direct Anthropic primary, Emergent fallback).

ASK_LOVLI_SYSTEM_PROMPT = """You are Lovli — a warm, witty wingman and relationship coach for Indian daters. You always speak in the first person ("I'd say...", "If I were your wingman...").

Voice:
- Short, conversational answers — usually 2 to 6 sentences. Talk like a sharp friend, never like a therapist or a listicle.
- Hinglish-aware: mirror the user's language. If they write in Hinglish or Hindi+English, respond the same way. Otherwise natural Indian English.
- Em-dashes, warmth, a little wit. Never clinical, never robotic, never "As an AI".

Coaching:
- Give honest, practical advice about texting, dating apps, situationships, fights, and relationships.
- When it would genuinely help, ask exactly ONE good follow-up question at the end. Not every time.
- If they ask for a message to send, give them one ready-to-send line (quoted), not three options.

HONESTY RULE (hard): qualitative reads only. NEVER give numeric confidence, percentages, scores out of 10, or invented facts about the other person. If you can't know something, say so plainly.

If a PERSON CONTEXT block is provided, weave those details in naturally (names, dates, preferences) — never recite the list back."""


def _build_ask_prompt(
    message: str,
    history: list[dict],
    memory_context: "Optional[str]",
    style_context: "Optional[str]" = None,
) -> str:
    parts: list[str] = []
    if memory_context:
        parts.append(f"PERSON CONTEXT (about who we're discussing): {memory_context}")
    # PR-M5 (additive): learned texting-style block — shapes suggested lines.
    if style_context:
        parts.append(style_context)
    if history:
        lines = []
        for turn in history:
            who = "Me" if turn.get("role") == "user" else "You (Lovli)"
            text = str(turn.get("text", "")).strip()
            if text:
                lines.append(f"{who}: {text}")
        if lines:
            parts.append("Conversation so far:\n" + "\n".join(lines))
    parts.append(f"My new message: {message}")
    parts.append("Reply as Lovli — plain text only, no JSON, no markdown headings.")
    return "\n\n".join(parts)


async def _ask_anthropic(prompt: str) -> str:
    from anthropic import AsyncAnthropic  # local import to keep import-time light

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise LovliLlmError("ANTHROPIC_API_KEY not configured")
    model = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")
    client = AsyncAnthropic(api_key=api_key)
    try:
        msg = await client.messages.create(
            model=model,
            max_tokens=512,
            system=ASK_LOVLI_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": [{"type": "text", "text": prompt}]}],
        )
    except Exception as e:
        raise LovliLlmError(f"anthropic call failed: {e}") from e
    raw = "".join(
        block.text for block in msg.content if getattr(block, "type", None) == "text"
    ).strip()
    if not raw:
        raise LovliLlmError("anthropic returned empty reply")
    return raw


async def _ask_emergent(prompt: str, session_id: str) -> str:
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # local import
    except ImportError as e:
        raise LovliLlmError(
            "Emergent LLM fallback not available in this deployment "
            "(emergentintegrations package not installed)."
        ) from e

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise LovliLlmError("EMERGENT_LLM_KEY not configured")

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=ASK_LOVLI_SYSTEM_PROMPT,
    ).with_model("anthropic", os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5-20250929"))
    try:
        raw = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        raise LovliLlmError(f"emergent call failed: {e}") from e
    raw = (raw or "").strip()
    if not raw:
        raise LovliLlmError("emergent returned empty reply")
    return raw


async def ask_lovli(
    message: str,
    history: list[dict],
    memory_context: "Optional[str]" = None,
    session_id: str = "ask-lovli",
    style_context: "Optional[str]" = None,
) -> str:
    """One coach-chat turn. Returns Lovli's plain-text reply.

    Provider routing mirrors generate_replies: direct Anthropic when
    ANTHROPIC_API_KEY is set, Emergent otherwise; transient Anthropic errors
    fall back to Emergent when both keys exist.
    """
    explicit = (os.environ.get("LLM_PROVIDER") or "auto").lower().strip()
    has_anthropic_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_emergent_key = bool(os.environ.get("EMERGENT_LLM_KEY"))

    if explicit == "auto":
        primary = "anthropic" if has_anthropic_key else "emergent"
        fallback = "emergent" if primary == "anthropic" and has_emergent_key else None
    else:
        primary = explicit
        fallback = None

    prompt = _build_ask_prompt(message, history, memory_context, style_context)

    async def _attempt(provider: str) -> str:
        if provider == "anthropic":
            return await _ask_anthropic(prompt)
        if provider == "emergent":
            return await _ask_emergent(prompt, session_id)
        raise LovliLlmError(f"unknown provider {provider!r}")

    try:
        return await _attempt(primary)
    except LovliLlmError as primary_err:
        if fallback is None:
            raise
        msg = str(primary_err).lower()
        transient_markers = (
            "overload", "529", "rate limit", "ratelimit", "rate_limit",
            "503", "502", "504", "timeout", "timed out", "connection",
        )
        if not any(m in msg for m in transient_markers):
            raise
        return await _attempt(fallback)

# ---- Decode (PR-V2-5) -------------------------------------------------------
# "The decode": qualitative situation read. 3-value scale ONLY, no numbers.

VIBE_LABELS = ("Not into it", "Mixed signals", "Leaning interested")

DECODE_SYSTEM_PROMPT = """You are Lovli — a warm, brutally honest wingman who decodes chats for Indian daters. First person always.

You read a conversation (screenshot or pasted text) and call it straight — warm but never sugar-coated, never clinical.

HONESTY RULE (hard): qualitative reads ONLY. NEVER numbers, percentages, scores, or invented facts. The ONLY allowed overall verdict values are exactly: "Not into it", "Mixed signals", "Leaning interested".

Output ONLY a JSON object — no prose, no code fences — with this exact shape:
{
  "vibe_label": "Not into it" | "Mixed signals" | "Leaning interested",
  "vibe_headline": "short serif-worthy one-liner verdict, e.g. \\"Leaning interested.\\"",
  "positive_signs": ["2-4 short qualitative observations grounded in the actual chat"],
  "watch_outs": ["1-3 short honest cautions grounded in the actual chat"],
  "whats_really_going_on": "one warm, honest paragraph (2-3 sentences)",
  "next_move": {
    "wingman": "first-person advice, e.g. \\"If I were you, I'd...\\" (1-2 sentences)",
    "likely_outcome": "one qualitative sentence on how that move likely lands"
  }
}
Language: mirror the chat's language (Hinglish stays Hinglish). Quote tiny fragments of their actual messages inside observations when it helps."""


@dataclass
class DecodeRequest:
    manual_text: Optional[str] = None
    image_base64: Optional[str] = None
    image_mime: str = "image/png"
    feeling: Optional[str] = None
    memory_context: Optional[str] = None
    language: str = "Hinglish"
    session_id: str = "decode"
    # PR-M5 (additive): learned texting-style prompt block.
    style_context: Optional[str] = None


def _clamp_vibe_label(value: object) -> str:
    v = str(value or "").strip().lower()
    if "interested" in v or "leaning" in v:
        return "Leaning interested"
    if "not into" in v or v.startswith("no"):
        return "Not into it"
    return "Mixed signals"


def _str_list(value: object, cap: int) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(s).strip() for s in value if str(s).strip()][:cap]


def validate_decode_payload(p: dict) -> dict:
    """Coerce/clamp the decode payload. Raises LovliValidationError when the
    essentials are missing so the caller retries once with a stricter prompt."""
    if not isinstance(p, dict):
        raise LovliValidationError("decode payload is not an object")
    headline = str(p.get("vibe_headline") or "").strip()
    going_on = str(p.get("whats_really_going_on") or "").strip()
    if not headline or not going_on:
        raise LovliValidationError("decode payload missing headline / whats_really_going_on")
    nm = p.get("next_move") if isinstance(p.get("next_move"), dict) else {}
    wingman = str(nm.get("wingman") or "").strip()
    likely = str(nm.get("likely_outcome") or "").strip()
    if not wingman:
        raise LovliValidationError("decode payload missing next_move.wingman")
    return {
        "vibe_label": _clamp_vibe_label(p.get("vibe_label")),
        "vibe_headline": headline,
        "positive_signs": _str_list(p.get("positive_signs"), 4),
        "watch_outs": _str_list(p.get("watch_outs"), 3),
        "whats_really_going_on": going_on,
        "next_move": {"wingman": wingman, "likely_outcome": likely},
    }


def _build_decode_prompt(req: DecodeRequest, retry: bool) -> str:
    parts: list[str] = []
    if retry:
        parts.append(
            "Your previous response was not valid JSON. Output ONLY the JSON "
            "object in the exact shape from the system prompt. No prose."
        )
    if req.memory_context:
        parts.append(f"PERSON CONTEXT: {req.memory_context}")
    # PR-M5 (additive): learned texting-style block.
    if req.style_context:
        parts.append(req.style_context)
    if req.feeling:
        parts.append(f"How the user is feeling right now: {req.feeling}.")
    parts.append(f"User's reply language preference: {req.language}.")
    if req.image_base64:
        parts.append("The chat is in the attached screenshot — read every message carefully.")
    if req.manual_text and req.manual_text.strip():
        parts.append(f"The chat (pasted):\n{req.manual_text.strip()}")
    parts.append("Decode this situation now. JSON only.")
    return "\n\n".join(parts)


async def _decode_anthropic(req: DecodeRequest, retry: bool) -> dict:
    from anthropic import AsyncAnthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise LovliLlmError("ANTHROPIC_API_KEY not configured")
    model = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")

    content_blocks: list[dict] = []
    if req.image_base64:
        content_blocks.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": req.image_mime or "image/png",
                "data": req.image_base64,
            },
        })
    content_blocks.append({"type": "text", "text": _build_decode_prompt(req, retry)})

    client = AsyncAnthropic(api_key=api_key)
    try:
        msg = await client.messages.create(
            model=model,
            max_tokens=1024,
            system=DECODE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content_blocks}],
        )
    except Exception as e:
        raise LovliLlmError(f"anthropic call failed: {e}") from e
    raw = "".join(
        b.text for b in msg.content if getattr(b, "type", None) == "text"
    ).strip()
    return validate_decode_payload(parse_lovli_json(raw))


async def _decode_emergent(req: DecodeRequest, retry: bool) -> dict:
    try:
        from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage
    except ImportError as e:
        raise LovliLlmError(
            "Emergent LLM fallback not available in this deployment "
            "(emergentintegrations package not installed)."
        ) from e

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise LovliLlmError("EMERGENT_LLM_KEY not configured")

    chat = LlmChat(
        api_key=api_key,
        session_id=req.session_id + ("-retry" if retry else ""),
        system_message=DECODE_SYSTEM_PROMPT,
    ).with_model("anthropic", os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5-20250929"))

    file_contents = None
    if req.image_base64:
        file_contents = [ImageContent(image_base64=req.image_base64)]
    try:
        raw = await chat.send_message(
            UserMessage(text=_build_decode_prompt(req, retry), file_contents=file_contents)
        )
    except Exception as e:
        raise LovliLlmError(f"emergent call failed: {e}") from e
    return validate_decode_payload(parse_lovli_json(str(raw)))


async def decode_situation(req: DecodeRequest) -> dict:
    """Decode a chat qualitatively. Same routing/retry pattern as generate_replies."""
    explicit = (os.environ.get("LLM_PROVIDER") or "auto").lower().strip()
    has_anthropic_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_emergent_key = bool(os.environ.get("EMERGENT_LLM_KEY"))

    if explicit == "auto":
        primary = "anthropic" if has_anthropic_key else "emergent"
        fallback = "emergent" if primary == "anthropic" and has_emergent_key else None
    else:
        primary = explicit
        fallback = None

    async def _try(provider: str, retry: bool) -> dict:
        if provider == "anthropic":
            return await _decode_anthropic(req, retry)
        if provider == "emergent":
            return await _decode_emergent(req, retry)
        raise LovliLlmError(f"unknown provider {provider!r}")

    async def _attempt(provider: str) -> dict:
        try:
            return await _try(provider, retry=False)
        except (LovliValidationError, json.JSONDecodeError):
            return await _try(provider, retry=True)

    try:
        return await _attempt(primary)
    except LovliLlmError as primary_err:
        if fallback is None:
            raise
        msg = str(primary_err).lower()
        transient_markers = (
            "overload", "529", "rate limit", "ratelimit", "rate_limit",
            "503", "502", "504", "timeout", "timed out", "connection",
        )
        if not any(m in msg for m in transient_markers):
            raise
        return await _attempt(fallback)


# ---- Feature engine (PR4) ---------------------------------------------------
# ONE additive route powers the More-grid tools: a feature_id selects a prompt
# suffix + the shared {verdict, points[], actions[], replies[]} output schema.
# Contract: /app/docs/FEATURE_API_AND_PROMPTS.md

RED_FLAG_VERDICTS = (
    "All clear — no red flags.",
    "Mild — but fixable.",
    "Pattern worth taking seriously.",
    "This is serious — please don't brush it off.",
)

POINT_TONES = ("positive", "warning", "neutral")

# Features allowed to return replies[] (locked policy): glow_up always;
# settle_the_fight + what_should_i_do conditionally. Everything else is
# forced to [] server-side — breakup_clarity NEVER (closure, not re-engagement).
REPLY_CAPABLE_FEATURES = {"glow_up_reply", "settle_the_fight", "what_should_i_do"}

FEATURE_SYSTEM_PROMPT = """You are Lovli — a warm, witty wingman and relationship coach for Indian daters. First person always ("If I were you...", "Honestly? I'd..."). Hinglish-native, honest, never preachy, never clinical, never therapist-speak. You understand Instagram/WhatsApp/Hinge/Bumble/Tinder chat culture, situationships, and Indian family/social context.

Be real, not corporate. Never manipulate, pressure, use pickup-artist tactics, or encourage creepy/abusive behavior. If something is genuinely concerning (abuse, coercion, control), say so honestly and kindly.

HONESTY RULE (hard): qualitative reads ONLY. NEVER numeric confidence, percentages, scores out of 10, counts or ratings of red flags, or invented facts about anyone. If you can't know something, say so plainly.

Output ONLY a JSON object — no prose, no code fences — with this exact shape:
{
  "verdict": "one short line — the bottom line",
  "points": [{"text": "short scannable observation, under ~140 chars", "tone": "positive" | "warning" | "neutral"}],
  "actions": ["1-3 concrete next moves the user can actually do"],
  "replies": ["0-3 ready-to-send messages. [] when a message isn't the right move"]
}
points: 1-5 items. tone: "positive" for good signs, "warning" for cautions, "neutral" for context.
Language: mirror the user's language preference (Hinglish stays Hinglish). Quote tiny fragments of the actual messages inside observations when it helps."""

FEATURE_SUFFIXES: dict[str, str] = {
    "red_flag_check": (
        "TASK: Judge whether what the other person did is a red flag, normal, or "
        "somewhere in between. Be honest — don't catastrophize normal behavior, don't "
        "excuse genuinely bad behavior. `verdict` MUST be EXACTLY one of these four "
        "phrases and nothing else: \"All clear — no red flags.\" / \"Mild — but "
        "fixable.\" / \"Pattern worth taking seriously.\" / \"This is serious — please "
        "don't brush it off.\" Use the last one for control, coercion, threats, "
        "isolation, or abuse patterns — and when you do, `actions` must gently point "
        "the user toward trusted people or professional support first, never just "
        "texting tactics. `points` = 2-4 reasons grounded in what actually happened. "
        "`replies` = []."
    ),
    "what_should_i_do": (
        "TASK: Recommend the best move for the user's stated goal (use the \"Your "
        "goal\" input, or their memory-card goal if present). Be decisive and "
        "practical — one main recommendation, not a menu. `verdict` = the single best "
        "move in one line. `points` = 2-4 reasons / things to weigh. `actions` = 1-3 "
        "concrete steps in order. `replies` = one ready-to-send text ONLY if the best "
        "move is sending something, else []."
    ),
    "settle_the_fight": (
        "TASK: Explain why the fight really happened (the needs under the words) and "
        "how to de-escalate and repair without losing self-respect. Be fair to both "
        "sides; do not just take the user's side. `verdict` = the root of the conflict "
        "in one line. `points` = 2-4 on what each side is feeling / what triggered it. "
        "`actions` = concrete steps to cool it down and fix it. `replies` = 1-2 "
        "de-escalating messages ONLY if a message is the right move, else []."
    ),
    "the_other_side": (
        "TASK: Lay out the situation honestly from the OTHER person's point of view so "
        "the user understands them. Steelman their side fairly — don't strawman it, "
        "and never present mind-reading as fact (say \"likely\" / \"probably\"). "
        "`verdict` = their likely core feeling or need in one line. `points` = 2-4 "
        "reasons they may be acting this way. `actions` = how the user can respond "
        "with that understanding. `replies` = []."
    ),
    "fair_verdict": (
        "TASK: Act as a neutral, unbiased judge of who is more in the right, given "
        "both sides (the user's account plus \"The other person's side\" input if "
        "provided). Do NOT default to the user — call it honestly even if they're "
        "wrong. `verdict` = the ruling in one qualitative line (e.g. \"Both dropped "
        "the ball — you first.\"). Never percentages or splits. `points` = 2-4 on what "
        "each side got right/wrong. `actions` = how to resolve it fairly. `replies` = []."
    ),
    "breakup_clarity": (
        "TASK: Help the user think through whether to stay or go. Do NOT push either "
        "way and NEVER command a breakup — surface the real considerations so THEY "
        "decide. Be extra warm; this is emotionally heavy. `verdict` = an honest "
        "framing of where things stand (a pattern you see, not a directive). `points` "
        "= 2-5 things genuinely worth weighing — signs to stay AND signs to go, with "
        "honest tones. `actions` = clarifying questions to ask themselves or gentle "
        "steps toward clarity. `replies` MUST be [] — this feature is about closure "
        "and clarity, never about crafting messages to re-engage."
    ),
    "glow_up_reply": (
        "TASK: Take the user's draft reply and make it smoother — same intent, same "
        "voice, better delivery, no cringe. Keep their language mix (Hinglish stays "
        "Hinglish). PRIMARY output is `replies` = 2-3 improved versions of their "
        "draft. `verdict` = one line on what was off with the original / what you "
        "improved. `points` = 1-3 quick why-this-lands-better notes. `actions` = []."
    ),
}

FEATURE_IDS = tuple(FEATURE_SUFFIXES.keys())

# Per-feature label for the optional secondary text input.
_SECONDARY_LABELS = {
    "fair_verdict": "The other person's side (their account, as the user tells it)",
    "what_should_i_do": "The user's goal",
}


@dataclass
class FeatureRequest:
    feature_id: str
    manual_text: Optional[str] = None
    text_secondary: Optional[str] = None
    draft_text: Optional[str] = None
    image_base64: Optional[str] = None
    image_mime: str = "image/png"
    feeling: Optional[str] = None
    memory_context: Optional[str] = None
    language: str = "Hinglish"
    session_id: str = "feature"
    # PR-M5 (additive): learned texting-style prompt block.
    style_context: Optional[str] = None


def _clamp_red_flag_verdict(value: object) -> str:
    """Map free-ish model output onto the 4 allowed severity phrases.
    Unrecognized output defaults to the 'pattern' tier — never downplay."""
    v = str(value or "").strip().lower()
    if "brush" in v or v.startswith("this is serious"):
        return RED_FLAG_VERDICTS[3]
    if "pattern" in v or "big" in v:
        return RED_FLAG_VERDICTS[2]
    if "mild" in v or "fixable" in v:
        return RED_FLAG_VERDICTS[1]
    if "all clear" in v or "no red" in v or "normal" in v:
        return RED_FLAG_VERDICTS[0]
    return RED_FLAG_VERDICTS[2]


def validate_feature_payload(p: dict, feature_id: str) -> dict:
    """Coerce/clamp the feature payload. Raises LovliValidationError when the
    essentials are missing so the caller retries once with a stricter prompt."""
    if not isinstance(p, dict):
        raise LovliValidationError("feature payload is not an object")
    verdict = str(p.get("verdict") or "").strip()
    if not verdict:
        raise LovliValidationError("feature payload missing verdict")
    if feature_id == "red_flag_check":
        verdict = _clamp_red_flag_verdict(verdict)

    raw_points = p.get("points")
    points: list[dict] = []
    if isinstance(raw_points, list):
        for item in raw_points[:5]:
            if isinstance(item, dict):
                text = str(item.get("text") or "").strip()
                tone = str(item.get("tone") or "neutral").strip().lower()
            else:
                text = str(item or "").strip()
                tone = "neutral"
            if text:
                points.append({"text": text, "tone": tone if tone in POINT_TONES else "neutral"})
    if not points:
        raise LovliValidationError("feature payload has no usable points")

    actions = _str_list(p.get("actions"), 3)
    replies = _str_list(p.get("replies"), 3)
    if feature_id not in REPLY_CAPABLE_FEATURES:
        replies = []
    return {"verdict": verdict, "points": points, "actions": actions, "replies": replies}


def _build_feature_prompt(req: FeatureRequest, retry: bool) -> str:
    parts: list[str] = []
    if retry:
        parts.append(
            "Your previous response was not valid JSON. Output ONLY the JSON "
            "object in the exact shape from the system prompt. No prose."
        )
    parts.append(FEATURE_SUFFIXES[req.feature_id])
    if req.memory_context:
        parts.append(f"PERSON CONTEXT (about who we're discussing): {req.memory_context}")
    # PR-M5 (additive): learned texting-style block.
    if req.style_context:
        parts.append(req.style_context)
    if req.feeling:
        parts.append(f"How the user is feeling right now: {req.feeling}.")
    parts.append(f"User's reply language preference: {req.language}.")
    if req.text_secondary and req.text_secondary.strip():
        label = _SECONDARY_LABELS.get(req.feature_id, "Additional context from the user")
        parts.append(f"{label}:\n{req.text_secondary.strip()}")
    if req.draft_text and req.draft_text.strip():
        parts.append(f"The user's draft reply (to glow up):\n{req.draft_text.strip()}")
    if req.image_base64:
        parts.append("The chat is in the attached screenshot — read every message carefully.")
    if req.manual_text and req.manual_text.strip():
        label = "Chat context (pasted)" if req.feature_id == "glow_up_reply" else "The situation / chat (pasted)"
        parts.append(f"{label}:\n{req.manual_text.strip()}")
    parts.append("Work it through now. JSON only.")
    return "\n\n".join(parts)


async def _feature_anthropic(req: FeatureRequest, retry: bool) -> dict:
    from anthropic import AsyncAnthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise LovliLlmError("ANTHROPIC_API_KEY not configured")
    model = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5-20250929")

    content_blocks: list[dict] = []
    if req.image_base64:
        content_blocks.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": req.image_mime or "image/png",
                "data": req.image_base64,
            },
        })
    content_blocks.append({"type": "text", "text": _build_feature_prompt(req, retry)})

    client = AsyncAnthropic(api_key=api_key)
    try:
        msg = await client.messages.create(
            model=model,
            max_tokens=1024,
            system=FEATURE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content_blocks}],
        )
    except Exception as e:
        raise LovliLlmError(f"anthropic call failed: {e}") from e
    raw = "".join(
        b.text for b in msg.content if getattr(b, "type", None) == "text"
    ).strip()
    return validate_feature_payload(parse_lovli_json(raw), req.feature_id)


async def _feature_emergent(req: FeatureRequest, retry: bool) -> dict:
    try:
        from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage
    except ImportError as e:
        raise LovliLlmError(
            "Emergent LLM fallback not available in this deployment "
            "(emergentintegrations package not installed)."
        ) from e

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise LovliLlmError("EMERGENT_LLM_KEY not configured")

    chat = LlmChat(
        api_key=api_key,
        session_id=req.session_id + ("-retry" if retry else ""),
        system_message=FEATURE_SYSTEM_PROMPT,
    ).with_model("anthropic", os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5-20250929"))

    file_contents = None
    if req.image_base64:
        file_contents = [ImageContent(image_base64=req.image_base64)]
    try:
        raw = await chat.send_message(
            UserMessage(text=_build_feature_prompt(req, retry), file_contents=file_contents)
        )
    except Exception as e:
        raise LovliLlmError(f"emergent call failed: {e}") from e
    return validate_feature_payload(parse_lovli_json(str(raw)), req.feature_id)


async def generate_feature(req: FeatureRequest) -> dict:
    """Run one More-grid feature. Same routing/retry pattern as generate_replies."""
    explicit = (os.environ.get("LLM_PROVIDER") or "auto").lower().strip()
    has_anthropic_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    has_emergent_key = bool(os.environ.get("EMERGENT_LLM_KEY"))

    if explicit == "auto":
        primary = "anthropic" if has_anthropic_key else "emergent"
        fallback = "emergent" if primary == "anthropic" and has_emergent_key else None
    else:
        primary = explicit
        fallback = None

    async def _try(provider: str, retry: bool) -> dict:
        if provider == "anthropic":
            return await _feature_anthropic(req, retry)
        if provider == "emergent":
            return await _feature_emergent(req, retry)
        raise LovliLlmError(f"unknown provider {provider!r}")

    async def _attempt(provider: str) -> dict:
        try:
            return await _try(provider, retry=False)
        except (LovliValidationError, json.JSONDecodeError):
            return await _try(provider, retry=True)

    try:
        return await _attempt(primary)
    except LovliLlmError as primary_err:
        if fallback is None:
            raise
        msg = str(primary_err).lower()
        transient_markers = (
            "overload", "529", "rate limit", "ratelimit", "rate_limit",
            "503", "502", "504", "timeout", "timed out", "connection",
        )
        if not any(m in msg for m in transient_markers):
            raise
        return await _attempt(fallback)
