"""
test_core.py — Lovli Phase 1 POC
Validates the core flow: (image OR text chat) → Claude (vision) via Emergent LLM key
                       → strict JSON {"replies":[3], "tone_notes": "..."}

Run:  python /app/test_core.py
Pass condition: BOTH the image path and text-only path return valid JSON
                with exactly 3 non-empty reply strings + a tone_notes string.
"""
import asyncio
import base64
import json
import os
import re
import sys
import textwrap
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont

# Load backend env (where EMERGENT_LLM_KEY lives)
ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / "backend" / ".env")

from emergentintegrations.llm.chat import (  # noqa: E402
    ImageContent,
    LlmChat,
    UserMessage,
)


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
    "no markdown fences, no commentary."
)


def build_user_prompt(
    *,
    platform: str,
    vibe: str,
    language: str,
    manual_text: str | None,
    user_note: str | None,
    has_image: bool,
    memory_context: str | None = None,
) -> str:
    parts = [
        "Generate exactly 3 reply options for this chat conversation.",
        f"Platform: {platform}",
        f"Selected vibe: {vibe}",
        f"Language preference: {language}",
    ]
    if has_image:
        parts.append(
            "Chat context: extract from the attached screenshot. The most "
            "recent message is from the OTHER person and the user wants to "
            "reply to it. If multiple messages are visible, focus on the "
            "latest message that the user needs to respond to."
        )
    if manual_text:
        parts.append(f"Chat text provided by user:\n\"\"\"\n{manual_text}\n\"\"\"")
    if user_note:
        parts.append(f"User note / extra context: {user_note}")
    if memory_context:
        parts.append(f"Memory context about this person: {memory_context}")

    parts.append(
        "Output JSON schema (and ONLY this JSON, nothing else):\n"
        '{\n'
        '  "replies": ["reply 1", "reply 2", "reply 3"],\n'
        '  "tone_notes": "1 short sentence on why these work"\n'
        '}'
    )
    parts.append(
        "Rules: each reply must be 1-3 sentences max, sound like a real "
        "Indian Gen-Z/millennial would text, match the selected vibe, "
        "respect Hinglish if the language preference asks for it, and "
        "never use cringe pickup lines."
    )
    return "\n\n".join(parts)


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    # remove ``` ... ``` if model wraps response
    fence = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)
    text = fence.sub("", text)
    return text.strip()


def parse_lovli_json(raw: str) -> dict:
    """Robust JSON parsing: strip fences, find first {...} block if needed."""
    cleaned = _strip_code_fences(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # try to extract first JSON object substring
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def validate_payload(payload: dict) -> None:
    assert isinstance(payload, dict), "payload must be dict"
    replies = payload.get("replies")
    assert isinstance(replies, list) and len(replies) == 3, (
        f"replies must be list of 3, got {type(replies)} len={len(replies) if isinstance(replies, list) else 'N/A'}"
    )
    for i, r in enumerate(replies):
        assert isinstance(r, str) and r.strip(), f"reply[{i}] must be non-empty string"
    tone = payload.get("tone_notes")
    assert isinstance(tone, str) and tone.strip(), "tone_notes must be non-empty string"


async def call_lovli(
    *,
    session_id: str,
    platform: str,
    vibe: str,
    language: str,
    manual_text: str | None = None,
    user_note: str | None = None,
    image_b64: str | None = None,
    memory_context: str | None = None,
) -> dict:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    assert api_key, "EMERGENT_LLM_KEY missing in /app/backend/.env"

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=LOVLI_SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    file_contents = None
    if image_b64:
        file_contents = [ImageContent(image_base64=image_b64)]

    msg = UserMessage(
        text=build_user_prompt(
            platform=platform,
            vibe=vibe,
            language=language,
            manual_text=manual_text,
            user_note=user_note,
            has_image=bool(image_b64),
            memory_context=memory_context,
        ),
        file_contents=file_contents,
    )

    raw = await chat.send_message(msg)
    print(f"\n--- raw response ({session_id}) ---\n{raw}\n--- end raw ---")

    try:
        payload = parse_lovli_json(raw)
        validate_payload(payload)
        return payload
    except Exception as e:
        # one retry with stricter instruction
        print(f"[retry] first attempt failed: {e!r}")
        retry_chat = LlmChat(
            api_key=api_key,
            session_id=f"{session_id}-retry",
            system_message=LOVLI_SYSTEM_PROMPT,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        retry_msg = UserMessage(
            text=(
                "Your previous response was not valid JSON. "
                "Output ONLY the JSON object, no prose, no code fences. "
                "Schema: "
                '{"replies":["s","s","s"],"tone_notes":"s"} . '
                "Re-generate for the same scenario:\n\n"
                + build_user_prompt(
                    platform=platform,
                    vibe=vibe,
                    language=language,
                    manual_text=manual_text,
                    user_note=user_note,
                    has_image=bool(image_b64),
                    memory_context=memory_context,
                )
            ),
            file_contents=file_contents,
        )
        raw2 = await retry_chat.send_message(retry_msg)
        print(f"\n--- raw response (retry) ---\n{raw2}\n--- end raw ---")
        payload = parse_lovli_json(raw2)
        validate_payload(payload)
        return payload


# -----------------------
# Sample chat screenshot
# -----------------------
def make_sample_chat_screenshot() -> bytes:
    """Render a realistic-looking Instagram-style chat as a PNG and return bytes.

    Two messages from 'Aanya' on the left, one from the user on the right,
    final unread message from Aanya. The user wants to reply to her last line.
    """
    W, H = 720, 1080
    img = Image.new("RGB", (W, H), (10, 10, 16))
    draw = ImageDraw.Draw(img)

    # Try a nicer font; fall back to default
    try:
        font_name = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28
        )
        font_msg = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26
        )
        font_small = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20
        )
    except OSError:
        font_name = ImageFont.load_default()
        font_msg = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Header
    draw.rectangle([(0, 0), (W, 90)], fill=(20, 20, 30))
    draw.ellipse([(20, 20), (70, 70)], fill=(120, 80, 200))
    draw.text((90, 30), "Aanya", fill=(240, 240, 250), font=font_name)
    draw.text((90, 60), "Active now", fill=(120, 200, 140), font=font_small)

    # Bubbles
    def bubble(x, y, text, side="left"):
        wrapped = textwrap.fill(text, width=28)
        # measure
        bbox = draw.multiline_textbbox((0, 0), wrapped, font=font_msg, spacing=6)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        pad = 18
        if side == "left":
            box = [x, y, x + tw + 2 * pad, y + th + 2 * pad]
            color = (40, 42, 55)
            text_color = (235, 235, 245)
        else:
            box = [W - 30 - tw - 2 * pad, y, W - 30, y + th + 2 * pad]
            color = (90, 70, 200)
            text_color = (255, 255, 255)
        draw.rounded_rectangle(box, radius=24, fill=color)
        draw.multiline_text(
            (box[0] + pad, box[1] + pad),
            wrapped,
            fill=text_color,
            font=font_msg,
            spacing=6,
        )
        return box[3]  # return y end

    y = 130
    y = bubble(30, y, "Heyy! finally got time to reply :)", "left") + 14
    y = bubble(30, y, "your bio said you love indie cafes haha same", "left") + 14
    y = bubble(30, y, "i live in indiranagar btw, you?", "right") + 14
    y = bubble(30, y, "koramangala! you free this saturday for chai?", "left") + 14
    y = bubble(
        30,
        y,
        "okay also tell me — playlist person ya audiobook person??",
        "left",
    ) + 14

    # Time stamp footer
    draw.text((30, H - 60), "12:48 PM", fill=(140, 140, 160), font=font_small)

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# -----------------------
# Test cases
# -----------------------
async def test_image_path() -> bool:
    print("\n========== TEST 1: IMAGE (chat screenshot via Claude Vision) ==========")
    img_bytes = make_sample_chat_screenshot()
    out_path = ROOT / "sample_chat.png"
    out_path.write_bytes(img_bytes)
    print(f"[ok] wrote sample chat screenshot to {out_path} ({len(img_bytes)} bytes)")

    b64 = base64.b64encode(img_bytes).decode("utf-8")
    payload = await call_lovli(
        session_id="poc-image-1",
        platform="Instagram",
        vibe="Playful",
        language="Hinglish",
        manual_text=None,
        user_note="I genuinely like indie cafes. Want to keep it light and curious.",
        image_b64=b64,
    )
    print("\n[PASS] Image path → JSON OK")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return True


async def test_text_path() -> bool:
    print("\n========== TEST 2: TEXT-ONLY (manual chat paste) ==========")
    chat_text = (
        "Her: heyy so finally we matched on Hinge lol\n"
        "Her: your prompt about samosa ranking is sending me\n"
        "Her: defend your top 3 right now"
    )
    payload = await call_lovli(
        session_id="poc-text-1",
        platform="Hinge",
        vibe="Confident",
        language="Hinglish",
        manual_text=chat_text,
        user_note="Want to keep it fun, not nervous.",
    )
    print("\n[PASS] Text path → JSON OK")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return True


async def test_text_with_memory() -> bool:
    print("\n========== TEST 3: TEXT + MEMORY CONTEXT ==========")
    payload = await call_lovli(
        session_id="poc-mem-1",
        platform="WhatsApp",
        vibe="Sincere",
        language="English",
        manual_text="Her: my interview got pushed to friday now :(",
        user_note="Be supportive, no flirting here.",
        memory_context=(
            "Nickname: Coffee Girl. Stage: talking. "
            "Likes: chai, indie music, quiet cafes. "
            "Avoid: too much flirting, pressure to meet. "
            "Important: she has a job interview on friday."
        ),
    )
    print("\n[PASS] Text+Memory path → JSON OK")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return True


async def main() -> int:
    results = {}
    try:
        results["image"] = await test_image_path()
    except Exception as e:
        results["image"] = False
        print(f"[FAIL] image path: {e!r}")

    try:
        results["text"] = await test_text_path()
    except Exception as e:
        results["text"] = False
        print(f"[FAIL] text path: {e!r}")

    try:
        results["text_with_memory"] = await test_text_with_memory()
    except Exception as e:
        results["text_with_memory"] = False
        print(f"[FAIL] text+memory path: {e!r}")

    print("\n========== POC SUMMARY ==========")
    for k, v in results.items():
        print(f"  {k}: {'PASS' if v else 'FAIL'}")
    all_pass = all(results.values())
    print(f"\nOverall: {'ALL PASS ✅' if all_pass else 'FAILURES ❌'}")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
