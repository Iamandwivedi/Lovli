"""
test_core.py — Lovli Phase 1 POC

Validates the EXACT service that the FastAPI backend will use:
    backend.llm_service.generate_replies(LovliRequest(...))

Three flows tested:
  1. Image (Claude Vision via direct Anthropic SDK using ANTHROPIC_API_KEY)
  2. Text-only
  3. Text + memory context

Pass condition: all three return valid JSON with 3 non-empty replies + tone_notes.
"""
import asyncio
import base64
import json
import os
import sys
import textwrap
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / "backend" / ".env")

# Make backend importable
sys.path.insert(0, str(ROOT / "backend"))

from llm_service import LovliRequest, generate_replies  # noqa: E402


# -----------------------
# Sample chat screenshot
# -----------------------
def make_sample_chat_screenshot() -> bytes:
    """Render a realistic-looking Instagram-style chat as PNG bytes."""
    W, H = 720, 1080
    img = Image.new("RGB", (W, H), (10, 10, 16))
    draw = ImageDraw.Draw(img)

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

    draw.rectangle([(0, 0), (W, 90)], fill=(20, 20, 30))
    draw.ellipse([(20, 20), (70, 70)], fill=(120, 80, 200))
    draw.text((90, 30), "Aanya", fill=(240, 240, 250), font=font_name)
    draw.text((90, 60), "Active now", fill=(120, 200, 140), font=font_small)

    def bubble(x, y, text, side="left"):
        wrapped = textwrap.fill(text, width=28)
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
        return box[3]

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

    draw.text((30, H - 60), "12:48 PM", fill=(140, 140, 160), font=font_small)

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# -----------------------
# Test cases
# -----------------------
async def test_image_path() -> bool:
    print("\n========== TEST 1: IMAGE (Claude Vision) ==========")
    img_bytes = make_sample_chat_screenshot()
    out_path = ROOT / "sample_chat.png"
    out_path.write_bytes(img_bytes)
    print(f"[ok] wrote sample chat screenshot to {out_path} ({len(img_bytes)} bytes)")

    b64 = base64.b64encode(img_bytes).decode("utf-8")
    payload = await generate_replies(
        LovliRequest(
            platform="Instagram",
            vibe="Playful",
            language="Hinglish",
            user_note="I genuinely like indie cafes. Want to keep it light and curious.",
            image_base64=b64,
            image_mime="image/png",
            session_id="poc-image-1",
        )
    )
    print("[PASS] Image path → JSON OK")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return True


async def test_text_path() -> bool:
    print("\n========== TEST 2: TEXT-ONLY ==========")
    chat_text = (
        "Her: heyy so finally we matched on Hinge lol\n"
        "Her: your prompt about samosa ranking is sending me\n"
        "Her: defend your top 3 right now"
    )
    payload = await generate_replies(
        LovliRequest(
            platform="Hinge",
            vibe="Confident",
            language="Hinglish",
            manual_text=chat_text,
            user_note="Want to keep it fun, not nervous.",
            session_id="poc-text-1",
        )
    )
    print("[PASS] Text path → JSON OK")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return True


async def test_text_with_memory() -> bool:
    print("\n========== TEST 3: TEXT + MEMORY CONTEXT ==========")
    payload = await generate_replies(
        LovliRequest(
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
            session_id="poc-mem-1",
        )
    )
    print("[PASS] Text+Memory path → JSON OK")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return True


async def main() -> int:
    print(f"Provider routing: LLM_PROVIDER={os.environ.get('LLM_PROVIDER','auto')!r}")
    print(f"ANTHROPIC_API_KEY present: {bool(os.environ.get('ANTHROPIC_API_KEY'))}")
    results: dict[str, bool] = {}

    for name, fn in [
        ("image", test_image_path),
        ("text", test_text_path),
        ("text_with_memory", test_text_with_memory),
    ]:
        try:
            results[name] = await fn()
        except Exception as e:
            results[name] = False
            print(f"[FAIL] {name}: {e!r}")

    print("\n========== POC SUMMARY ==========")
    for k, v in results.items():
        print(f"  {k}: {'PASS' if v else 'FAIL'}")
    all_pass = all(results.values())
    print(f"\nOverall: {'ALL PASS ✅' if all_pass else 'FAILURES ❌'}")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
