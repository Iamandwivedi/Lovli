"""
Lovli backend — FastAPI app.

Auth scheme: JWT bearer (Authorization header). Email+password AND Google OAuth
flows both converge into the same JWT.

Key endpoints (all prefixed with /api):
- POST   /auth/signup
- POST   /auth/login
- POST   /auth/test-login         (only when ALLOW_TEST_LOGIN=true)
- POST   /auth/google/session     (Emergent managed Google OAuth exchange)
- GET    /auth/me
- PATCH  /auth/onboarding
- PATCH  /settings
- GET    /usage
- POST   /generate-replies        (multipart: image optional + text fields)
- POST   /feedback
- GET/POST/PATCH/DELETE /memory-cards
- POST   /waitlist
"""
from __future__ import annotations

import base64
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

from auth import (
    create_jwt,
    decode_jwt,
    get_current_user_id,
    hash_password,
    verify_password,
)
from llm_service import (  # noqa: E402
    LovliLlmError,
    LovliRequest,
    _normalize_platform as _normalize_platform_value,
    ask_lovli,
    generate_replies,
)
from models import (
    PLATFORMS,
    VIBES,
    AskLovliRequest,
    AskLovliResponse,
    AuthResponse,
    FeedbackRequest,
    GenerateRepliesResponse,
    Generation,
    GoogleCodeRequest,
    GoogleSessionRequest,  # noqa: F401  (kept for import compatibility)
    LoginRequest,
    MemoryCard,
    MemoryCardCreate,
    MemoryCardUpdate,
    OnboardingRequest,
    PublicUser,
    SettingsUpdateRequest,
    SignupRequest,
    UsageResponse,
    User,
    WaitlistEntry,
    WaitlistRequest,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger("lovli")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)

# ---- Mongo ------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "lovli_db")]

# ---- App / router -----------------------------------------------------------
app = FastAPI(title="Lovli API", version="1.0")
api = APIRouter(prefix="/api")

DAILY_LIMIT_FREE = 8
DAILY_LIMIT_PRO = 10_000
ALLOWED_IMAGE_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 6 * 1024 * 1024  # 6MB


# ---- helpers ----------------------------------------------------------------
def _serialize(doc: Optional[dict]) -> Optional[dict]:
    """Recursively make Mongo documents JSON-safe (datetime -> isoformat)."""
    if doc is None:
        return None
    out: dict = {}
    for k, v in doc.items():
        if k == "_id":
            continue
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, dict):
            out[k] = _serialize(v)
        elif isinstance(v, list):
            out[k] = [
                _serialize(i)
                if isinstance(i, dict)
                else (i.isoformat() if isinstance(i, datetime) else i)
                for i in v
            ]
        else:
            out[k] = v
    return out


def _public_user(u: dict) -> PublicUser:
    return PublicUser(**_serialize(u))


async def _get_user(user_id: str) -> dict:
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _daily_limit(plan: str) -> int:
    return DAILY_LIMIT_PRO if plan == "pro" else DAILY_LIMIT_FREE


_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _normalize_local_date(client_local_date: Optional[str]) -> str:
    if client_local_date and _DATE_RE.match(client_local_date):
        return client_local_date
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _maybe_reset_daily(user: dict, local_date: str) -> dict:
    if user.get("last_generation_reset_date") != local_date:
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "daily_generation_count": 0,
                    "last_generation_reset_date": local_date,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        user["daily_generation_count"] = 0
        user["last_generation_reset_date"] = local_date
    return user


async def _create_user_doc(
    *,
    name: str,
    email: str,
    hashed_password: Optional[str] = None,
    google_picture: Optional[str] = None,
    google_sub: Optional[str] = None,
    auth_provider: str = "password",
    set_last_login: bool = True,
) -> dict:
    u = User(
        name=name,
        email=email,
        hashed_password=hashed_password,
        google_picture=google_picture,
        google_sub=google_sub,
        auth_provider=auth_provider,  # type: ignore[arg-type]
    )
    doc = u.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    if set_last_login:
        doc["last_login_at"] = doc["created_at"]
    await db.users.insert_one(doc)
    return doc


async def _touch_last_login(user_id: str) -> None:
    """Stamp last_login_at on every successful authentication."""
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"last_login_at": now, "updated_at": now}},
    )


# ---- Health -----------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "lovli", "status": "ok"}


# =============================================================================
# Auth
# =============================================================================
@api.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    existing = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    doc = await _create_user_doc(
        name=req.name.strip(),
        email=req.email.lower(),
        hashed_password=hash_password(req.password),
        auth_provider="password",
    )
    # last_login_at is already set inside _create_user_doc on first creation.
    token = create_jwt(doc["id"], doc["email"])
    return AuthResponse(access_token=token, user=_public_user(doc))


@api.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not user.get("hashed_password"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    await _touch_last_login(user["id"])
    user["last_login_at"] = datetime.now(timezone.utc).isoformat()
    token = create_jwt(user["id"], user["email"])
    return AuthResponse(access_token=token, user=_public_user(user))


@api.post("/auth/test-login", response_model=AuthResponse)
async def test_login():
    """Bypass for automation. Disabled unless ALLOW_TEST_LOGIN=true.

    REMOVE BEFORE PRODUCTION LAUNCH.
    """
    if os.environ.get("ALLOW_TEST_LOGIN", "").lower() != "true":
        raise HTTPException(status_code=404, detail="Not Found")
    email = os.environ.get("TEST_LOGIN_EMAIL", "tester@lovli.app").lower()
    password = os.environ.get("TEST_LOGIN_PASSWORD", "LovliTest@123")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = await _create_user_doc(
            name="Lovli Tester",
            email=email,
            hashed_password=hash_password(password),
            auth_provider="password",
        )
    token = create_jwt(user["id"], user["email"])
    return AuthResponse(access_token=token, user=_public_user(user))


def _allowed_redirect_uris() -> list[str]:
    raw = os.environ.get("GOOGLE_ALLOWED_REDIRECT_URIS", "") or ""
    return [r.strip() for r in raw.split(",") if r.strip()]


@api.get("/auth/google/config")
async def google_oauth_config():
    """Public config consumed by the frontend to build Google's authorize URL.

    Returns whether Google sign-in is enabled and the public client_id.
    The client_secret never leaves the backend.
    """
    client_id = (os.environ.get("GOOGLE_CLIENT_ID") or "").strip()
    return {
        "enabled": bool(client_id),
        "client_id": client_id,
        "scope": "openid email profile",
        "allowed_redirect_uris": _allowed_redirect_uris(),
    }


@api.post("/auth/google/code", response_model=AuthResponse)
async def google_code_exchange(req: GoogleCodeRequest):
    """Standard Google OAuth 2.0 authorization-code exchange.

    Frontend flow:
      1. User clicks "Continue with Google" on /login or /signup.
      2. Frontend redirects browser to https://accounts.google.com/o/oauth2/v2/auth
         with our client_id, redirect_uri, response_type=code, scope, state.
      3. Google redirects back to {redirect_uri}?code=...&state=...
      4. Frontend POSTs {code, redirect_uri, state} to this endpoint.
      5. We exchange the code with Google for tokens (using client_secret),
         fetch userinfo, upsert the user, and issue OUR Lovli JWT.
    """
    client_id = (os.environ.get("GOOGLE_CLIENT_ID") or "").strip()
    client_secret = (os.environ.get("GOOGLE_CLIENT_SECRET") or "").strip()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=503, detail="Google sign-in is not configured."
        )

    redirect_uri = (req.redirect_uri or "").strip()
    allowed = _allowed_redirect_uris()
    if not redirect_uri or (allowed and redirect_uri not in allowed):
        raise HTTPException(status_code=400, detail="Unauthorized redirect URI")

    code = (req.code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    try:
        async with httpx.AsyncClient(timeout=15.0) as hc:
            token_r = await hc.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            if token_r.status_code != 200:
                logger.warning(
                    "google token exchange failed: %s %s",
                    token_r.status_code,
                    token_r.text,
                )
                raise HTTPException(
                    status_code=401, detail="Sign-in failed. Try again."
                )
            tokens = token_r.json()
            access_token = tokens.get("access_token")
            if not access_token:
                raise HTTPException(
                    status_code=401, detail="Sign-in failed. Try again."
                )

            ui_r = await hc.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if ui_r.status_code != 200:
                logger.warning(
                    "google userinfo failed: %s %s", ui_r.status_code, ui_r.text
                )
                raise HTTPException(
                    status_code=401, detail="Sign-in failed. Try again."
                )
            info = ui_r.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("google oauth exchange failed: %s", e)
        raise HTTPException(
            status_code=502, detail="Auth provider unavailable. Try again."
        ) from e

    email = (info.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email returned by Google.")
    if info.get("verified_email") is False:
        raise HTTPException(
            status_code=400,
            detail="Your Google email is not verified. Verify it and try again.",
        )
    google_sub = (info.get("id") or "").strip() or None
    name = info.get("name") or email.split("@")[0]
    picture = info.get("picture")

    # Match by stable google_sub first, then by email (covers existing email/password
    # users who now sign in with Google for the first time).
    user = None
    if google_sub:
        user = await db.users.find_one({"google_sub": google_sub}, {"_id": 0})
    if not user:
        user = await db.users.find_one({"email": email}, {"_id": 0})

    if not user:
        user = await _create_user_doc(
            name=name,
            email=email,
            google_picture=picture,
            google_sub=google_sub,
            auth_provider="google",
        )
    else:
        new_provider = "both" if user.get("hashed_password") else "google"
        update_set: dict = {
            "google_picture": picture or user.get("google_picture"),
            "auth_provider": new_provider,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        # Persist google_sub if we now have it and it wasn't stored
        if google_sub and not user.get("google_sub"):
            update_set["google_sub"] = google_sub
        # If the email changed on Google's side (rare) keep our user, don't overwrite email.
        await db.users.update_one({"id": user["id"]}, {"$set": update_set})
        user = await db.users.find_one({"id": user["id"]}, {"_id": 0})

    await _touch_last_login(user["id"])
    user["last_login_at"] = datetime.now(timezone.utc).isoformat()

    token = create_jwt(user["id"], user["email"])
    return AuthResponse(access_token=token, user=_public_user(user))


@api.get("/auth/me", response_model=PublicUser)
async def me(user_id: str = Depends(get_current_user_id)):
    user = await _get_user(user_id)
    return _public_user(user)


@api.patch("/auth/onboarding", response_model=PublicUser)
async def onboarding(
    req: OnboardingRequest,
    user_id: str = Depends(get_current_user_id),
):
    update: dict = {
        "onboarding_complete": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if req.preferred_platform is not None:
        update["preferred_platform"] = req.preferred_platform
    if req.preferred_style is not None:
        update["preferred_style"] = req.preferred_style
    if req.language_preference is not None:
        update["language_preference"] = req.language_preference
    if req.timezone is not None:
        update["timezone"] = req.timezone
    await db.users.update_one({"id": user_id}, {"$set": update})
    user = await _get_user(user_id)
    return _public_user(user)


@api.patch("/settings", response_model=PublicUser)
async def update_settings(
    req: SettingsUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    update: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    for field in (
        "name",
        "preferred_platform",
        "preferred_style",
        "language_preference",
        "timezone",
    ):
        val = getattr(req, field)
        if val is not None:
            update[field] = val
    await db.users.update_one({"id": user_id}, {"$set": update})
    user = await _get_user(user_id)
    return _public_user(user)


# =============================================================================
# Usage
# =============================================================================
@api.get("/usage", response_model=UsageResponse)
async def usage(
    client_local_date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
):
    user = await _get_user(user_id)
    local_date = _normalize_local_date(client_local_date)
    user = await _maybe_reset_daily(user, local_date)
    return UsageResponse(
        plan=user["plan"],
        daily_generation_count=user["daily_generation_count"],
        daily_limit=_daily_limit(user["plan"]),
        last_generation_reset_date=user.get("last_generation_reset_date"),
        timezone=user.get("timezone", "Asia/Kolkata"),
    )


# =============================================================================
# Generate replies
# =============================================================================
@api.post(
    "/generate-replies",
    response_model=GenerateRepliesResponse,
    # PR-INT: drop None-valued response fields so rich=false stays byte-identical
    # to the legacy shape (no stray reply_labels: null / read: null keys).
    response_model_exclude_none=True,
)
async def generate_replies_endpoint(
    platform: str = Form(...),
    vibe: str = Form(...),
    language: str = Form("Hinglish"),
    manual_text: Optional[str] = Form(None),
    user_note: Optional[str] = Form(None),
    memory_card_id: Optional[str] = Form(None),
    client_local_date: Optional[str] = Form(None),
    timezone_str: Optional[str] = Form(None, alias="timezone"),
    # PR-INT: opt-in rich mode. Default False keeps the response byte-identical.
    rich: bool = Form(False),
    image: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user_id),
):
    # Accept new canonical values + map any legacy label (Hinge/Bumble/Tinder/Other)
    # to its canonical form. Reject anything that's still not valid.
    normalized_platform = _normalize_platform_value(platform)
    if normalized_platform not in PLATFORMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid platform. Allowed: {PLATFORMS}",
        )
    platform = normalized_platform
    if vibe not in VIBES:
        raise HTTPException(status_code=400, detail=f"Invalid vibe. Allowed: {VIBES}")
    if not (manual_text and manual_text.strip()) and image is None:
        raise HTTPException(
            status_code=400,
            detail="Provide a screenshot or paste the chat text.",
        )

    user = await _get_user(user_id)
    local_date = _normalize_local_date(client_local_date)
    user = await _maybe_reset_daily(user, local_date)

    if timezone_str and timezone_str != user.get("timezone"):
        await db.users.update_one(
            {"id": user_id},
            {
                "$set": {
                    "timezone": timezone_str,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        user["timezone"] = timezone_str

    limit = _daily_limit(user["plan"])
    if user["plan"] == "free" and user["daily_generation_count"] >= limit:
        raise HTTPException(status_code=429, detail="Daily generation limit reached.")

    image_b64: Optional[str] = None
    image_mime = "image/png"
    if image is not None:
        mime = (image.content_type or "").lower()
        if mime not in ALLOWED_IMAGE_MIME:
            raise HTTPException(
                status_code=400, detail="Use a clear JPG, PNG, or WEBP image."
            )
        raw = await image.read()
        if len(raw) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Image too large (max 6MB).")
        if len(raw) < 200:
            raise HTTPException(status_code=400, detail="Please upload a clear image.")
        image_b64 = base64.b64encode(raw).decode("utf-8")
        image_mime = (
            "image/jpeg" if mime in ("image/jpeg", "image/jpg") else mime
        )

    memory_context: Optional[str] = None
    if memory_card_id:
        mc = await db.memory_cards.find_one(
            {"id": memory_card_id, "user_id": user_id}, {"_id": 0}
        )
        if mc:
            parts: list[str] = [f"Nickname: {mc.get('nickname','')}."]
            if mc.get("goal"):
                parts.append(f"What user wants with this person: {mc['goal']}.")
            if mc.get("current_situation"):
                parts.append(f"Current situation: {mc['current_situation']}.")
            if mc.get("relationship_stage"):
                parts.append(f"Stage: {mc['relationship_stage']}.")
            if mc.get("where_met"):
                parts.append(f"Where they met: {mc['where_met']}.")
            if mc.get("likes"):
                parts.append(f"Likes: {mc['likes']}.")
            if mc.get("dislikes"):
                parts.append(f"Avoid: {mc['dislikes']}.")
            if mc.get("communication_style"):
                parts.append(f"Communication style: {mc['communication_style']}.")
            if mc.get("inside_jokes"):
                parts.append(f"Inside jokes: {mc['inside_jokes']}.")
            if mc.get("important_dates"):
                parts.append(f"Important context: {mc['important_dates']}.")
            if mc.get("best_approach"):
                parts.append(f"Best approach: {mc['best_approach']}.")
            if mc.get("notes"):
                parts.append(f"Notes: {mc['notes']}.")
            memory_context = " ".join(parts)

    try:
        result = await generate_replies(
            LovliRequest(
                platform=platform,
                vibe=vibe,
                language=language,
                manual_text=manual_text,
                user_note=user_note,
                image_base64=image_b64,
                image_mime=image_mime,
                memory_context=memory_context,
                session_id=f"u-{user_id}",
                rich=rich,
            )
        )
    except LovliLlmError as e:
        logger.warning("LLM generation failed for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=503,
            detail="Lovli couldn't generate replies right now. Try again.",
        )

    # PR-INT: when rich=true, the LLM result has replies as [{text,label}] +
    # an additional "read" block. Flatten replies → [str] for the contract,
    # extract labels into reply_labels, and surface read alongside. When
    # rich=false, the result is exactly the legacy shape (replies: [str]).
    rich_reply_labels: Optional[list[str]] = None
    rich_read: Optional[dict] = None
    response_replies: list[str]
    if rich:
        raw_replies = result.get("replies") or []
        # validate_payload_v2 has already guaranteed shape, but stay defensive.
        flat_replies: list[str] = []
        labels: list[str] = []
        for r in raw_replies:
            if isinstance(r, dict):
                flat_replies.append(str(r.get("text", "")))
                labels.append(str(r.get("label", "")))
            else:
                flat_replies.append(str(r))
                labels.append("")
        response_replies = flat_replies
        rich_reply_labels = labels
        rich_read = result.get("read") if isinstance(result.get("read"), dict) else None
    else:
        response_replies = list(result["replies"])

    gen = Generation(
        user_id=user_id,
        input_type=(
            "both"
            if image_b64 and manual_text
            else ("screenshot" if image_b64 else "text")
        ),
        platform=platform,
        vibe=vibe,
        user_note=user_note,
        manual_text=manual_text,
        memory_card_id=memory_card_id,
        generated_replies=response_replies,
        tone_notes=result.get("tone_notes"),
    )
    gdoc = gen.model_dump()
    gdoc["created_at"] = gdoc["created_at"].isoformat()
    await db.generations.insert_one(gdoc)

    await db.users.update_one(
        {"id": user_id},
        {
            "$inc": {"daily_generation_count": 1},
            "$set": {
                "last_generation_reset_date": local_date,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        },
    )
    new_count = user["daily_generation_count"] + 1

    return GenerateRepliesResponse(
        generation_id=gen.id,
        replies=response_replies,
        tone_notes=result.get("tone_notes", ""),
        daily_generation_count=new_count,
        daily_limit=limit,
        plan=user["plan"],
        reply_labels=rich_reply_labels,
        read=rich_read,  # type: ignore[arg-type]  # pydantic coerces dict → ReplyRead
    )


@api.post("/ask-lovli", response_model=AskLovliResponse)
async def ask_lovli_endpoint(
    req: AskLovliRequest,
    user_id: str = Depends(get_current_user_id),
):
    """PR-V2-4: one Ask Lovli coach-chat turn.

    Each message counts against the same daily usage plumbing as generations
    (free plan shares daily_limit; over limit → 429, same shape clients handle).
    History is capped server-side at ~20 turns. person_id optionally pulls that
    memory card into context.
    """
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Say something first.")

    user = await _get_user(user_id)
    local_date = _normalize_local_date(None)
    user = await _maybe_reset_daily(user, local_date)

    limit = _daily_limit(user["plan"])
    if user["plan"] == "free" and user["daily_generation_count"] >= limit:
        raise HTTPException(status_code=429, detail="Daily generation limit reached.")

    history = [{"role": t.role, "text": t.text} for t in req.history[-20:]]

    memory_context: Optional[str] = None
    if req.person_id:
        mc = await db.memory_cards.find_one(
            {"id": req.person_id, "user_id": user_id}, {"_id": 0}
        )
        if mc:
            parts: list[str] = [f"Nickname: {mc.get('nickname','')}."]
            if mc.get("goal"):
                parts.append(f"What user wants with this person: {mc['goal']}.")
            if mc.get("current_situation"):
                parts.append(f"Current situation: {mc['current_situation']}.")
            if mc.get("relationship_stage"):
                parts.append(f"Stage: {mc['relationship_stage']}.")
            if mc.get("where_met"):
                parts.append(f"Where they met: {mc['where_met']}.")
            if mc.get("likes"):
                parts.append(f"Likes: {mc['likes']}.")
            if mc.get("dislikes"):
                parts.append(f"Avoid: {mc['dislikes']}.")
            if mc.get("communication_style"):
                parts.append(f"Communication style: {mc['communication_style']}.")
            if mc.get("inside_jokes"):
                parts.append(f"Inside jokes: {mc['inside_jokes']}.")
            if mc.get("important_dates"):
                parts.append(f"Important context: {mc['important_dates']}.")
            if mc.get("best_approach"):
                parts.append(f"Best approach: {mc['best_approach']}.")
            if mc.get("notes"):
                parts.append(f"Notes: {mc['notes']}.")
            memory_context = " ".join(parts)

    try:
        reply = await ask_lovli(
            message=message,
            history=history,
            memory_context=memory_context,
            session_id=f"ask-{user_id}",
        )
    except LovliLlmError as e:
        logger.warning("Ask Lovli failed for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=503,
            detail="Lovli couldn't reply right now. Try again.",
        )

    await db.users.update_one(
        {"id": user_id},
        {
            "$inc": {"daily_generation_count": 1},
            "$set": {
                "last_generation_reset_date": local_date,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        },
    )

    return AskLovliResponse(reply=reply)


@api.post("/feedback")
async def submit_feedback(
    req: FeedbackRequest,
    user_id: str = Depends(get_current_user_id),
):
    update: dict = {}
    if req.feedback is not None:
        update["feedback"] = req.feedback
    if req.copied_reply_index is not None:
        update["copied_reply_index"] = req.copied_reply_index
    if not update:
        return {"ok": True}
    res = await db.generations.update_one(
        {"id": req.generation_id, "user_id": user_id}, {"$set": update}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Generation not found")
    return {"ok": True}


# =============================================================================
# Memory cards
# =============================================================================
@api.get("/memory-cards", response_model=List[MemoryCard])
async def list_memory_cards(user_id: str = Depends(get_current_user_id)):
    cur = db.memory_cards.find({"user_id": user_id}, {"_id": 0}).sort(
        "created_at", -1
    )
    items = []
    async for d in cur:
        items.append(_serialize(d))
    return items


@api.post("/memory-cards", response_model=MemoryCard)
async def create_memory_card(
    req: MemoryCardCreate,
    user_id: str = Depends(get_current_user_id),
):
    card = MemoryCard(user_id=user_id, **req.model_dump())
    doc = card.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.memory_cards.insert_one(doc)
    return _serialize(doc)


@api.patch("/memory-cards/{card_id}", response_model=MemoryCard)
async def update_memory_card(
    card_id: str,
    req: MemoryCardUpdate,
    user_id: str = Depends(get_current_user_id),
):
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.memory_cards.update_one(
        {"id": card_id, "user_id": user_id}, {"$set": update}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Memory card not found")
    doc = await db.memory_cards.find_one(
        {"id": card_id, "user_id": user_id}, {"_id": 0}
    )
    return _serialize(doc)


@api.delete("/memory-cards/{card_id}")
async def delete_memory_card(
    card_id: str, user_id: str = Depends(get_current_user_id)
):
    res = await db.memory_cards.delete_one({"id": card_id, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Memory card not found")
    return {"ok": True}


# =============================================================================
# Waitlist (open endpoint; will associate user_id if Bearer present)
# =============================================================================
from fastapi import Header  # noqa: E402


@api.post("/waitlist")
async def add_waitlist(
    req: WaitlistRequest,
    authorization: Optional[str] = Header(default=None),
):
    user_id: Optional[str] = None
    if authorization and authorization.lower().startswith("bearer "):
        try:
            payload = decode_jwt(authorization.split(" ", 1)[1].strip())
            user_id = payload.get("sub")
        except Exception:
            user_id = None

    entry = WaitlistEntry(
        email=req.email.lower(),
        type=req.type,
        payload=req.payload or {},
        source=req.source,
        user_id=user_id,
    )
    doc = entry.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.waitlist.insert_one(doc)
    return {"ok": True, "id": entry.id}


# =============================================================================
# Admin (read-only). Protected by X-Admin-Key header matching ADMIN_KEY env.
# Use this endpoint to view and audit users.
# =============================================================================
def _check_admin_key(provided: Optional[str]) -> None:
    expected = (os.environ.get("ADMIN_KEY") or "").strip()
    if not expected:
        raise HTTPException(
            status_code=503, detail="Admin endpoint disabled (ADMIN_KEY not set)."
        )
    if not provided or provided.strip() != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@api.get("/admin/users")
async def admin_list_users(
    limit: int = 100,
    offset: int = 0,
    provider: Optional[str] = None,  # password | google | both
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
):
    """List users in the order they signed up (oldest first by default).

    Returns id, name, email, auth_provider, plan, google_sub, google_picture,
    created_at, last_login_at, daily_generation_count, plus aggregate counts.
    Never returns hashed_password.
    """
    _check_admin_key(x_admin_key)
    q: dict = {}
    if provider in ("password", "google", "both"):
        q["auth_provider"] = provider

    limit = max(1, min(int(limit), 500))
    offset = max(0, int(offset))

    projection = {
        "_id": 0,
        "hashed_password": 0,
    }
    cur = db.users.find(q, projection).sort("created_at", 1).skip(offset).limit(limit)
    items = []
    async for u in cur:
        items.append(_serialize(u))

    total = await db.users.count_documents(q)
    by_provider = {}
    async for row in db.users.aggregate(
        [{"$group": {"_id": "$auth_provider", "n": {"$sum": 1}}}]
    ):
        by_provider[row["_id"] or "unknown"] = row["n"]

    return {
        "total": total,
        "by_provider": by_provider,
        "limit": limit,
        "offset": offset,
        "users": items,
    }


@api.get("/admin/stats")
async def admin_stats(
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
):
    """Lightweight ops dashboard: users, generations, waitlist counts."""
    _check_admin_key(x_admin_key)
    users_total = await db.users.count_documents({})
    users_google = await db.users.count_documents({"auth_provider": {"$in": ["google", "both"]}})
    users_password = await db.users.count_documents({"auth_provider": {"$in": ["password", "both"]}})
    gens_total = await db.generations.count_documents({})
    memory_total = await db.memory_cards.count_documents({})
    waitlist_by_type = {}
    async for row in db.waitlist.aggregate(
        [{"$group": {"_id": "$type", "n": {"$sum": 1}}}]
    ):
        waitlist_by_type[row["_id"] or "unknown"] = row["n"]
    return {
        "users": {
            "total": users_total,
            "google": users_google,
            "password": users_password,
        },
        "generations_total": gens_total,
        "memory_cards_total": memory_total,
        "waitlist_by_type": waitlist_by_type,
    }


# =============================================================================
# App lifecycle
# =============================================================================
@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.users.create_index("google_sub", sparse=True)
        await db.generations.create_index("user_id")
        await db.generations.create_index("id", unique=True)
        await db.memory_cards.create_index("user_id")
        await db.memory_cards.create_index("id", unique=True)
        await db.waitlist.create_index("email")
    except Exception as e:
        logger.warning("index creation failed: %s", e)

    if os.environ.get("ALLOW_TEST_LOGIN", "").lower() == "true":
        email = os.environ.get("TEST_LOGIN_EMAIL", "tester@lovli.app").lower()
        password = os.environ.get("TEST_LOGIN_PASSWORD", "LovliTest@123")
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if not existing:
            await _create_user_doc(
                name="Lovli Tester",
                email=email,
                hashed_password=hash_password(password),
                auth_provider="password",
            )
            logger.info("Seeded test user %s", email)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---- mount + CORS -----------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Kubernetes liveness / readiness probes ---------------------------------
# These endpoints sit at the root of the FastAPI app (NOT under /api/) because
# Kubernetes probes hit the container directly on port 8001 — they do NOT go
# through the public ingress that strips the /api prefix.  Returning 404 here
# causes the pod to be marked unhealthy and restarted in a loop.  These routes
# are intentionally synchronous and dependency-free so they never block on
# Mongo / Anthropic / Google: a healthy pod is one whose Python process is
# alive and the FastAPI app object is responding.
@app.get("/", include_in_schema=False)
@app.get("/health", include_in_schema=False)
@app.get("/healthz", include_in_schema=False)
@app.head("/", include_in_schema=False)
@app.head("/health", include_in_schema=False)
@app.head("/healthz", include_in_schema=False)
def _liveness():
    return {"status": "ok", "service": "lovli"}


@app.exception_handler(404)
async def not_found_handler(_request, exc):
    return JSONResponse(
        status_code=404, content={"detail": getattr(exc, "detail", "Not Found")}
    )
