"""
Lovli backend — FastAPI app.

Auth scheme: JWT bearer (Authorization header). Email+password AND Google OAuth
flows both converge into the same JWT.

Key endpoints (all prefixed with /api):
- POST   /auth/signup
- POST   /auth/login
- POST   /auth/test-login         (DEV ONLY: ALLOW_TEST_LOGIN=true AND ENVIRONMENT!=production)
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
    Header,
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
    DecodeRequest,
    decode_situation,
    FeatureRequest,
    FEATURE_SUFFIXES,
    generate_feature,
    generate_replies,
)
from db.guards import TenantScopeError, guard_status, tenant_guarded, unscoped
from db.indexes import describe_indexes, sync_indexes
from db.migrations import get_schema_version, run_migrations
from db.schema import CURRENT_SCHEMA_VERSION, USER_OWNED_COLLECTIONS
from engine.memory import (
    CLIENT_EVENT_TYPES,
    MEMORY_SCHEMA_VERSION,
    delete_user_memory,
    record_conversation_event,
    rebuild_user_memory,
    set_memory_paused,
)
from engine.memory_context import get_memory_context
from engine.reply_orchestrator import (
    build_generation_plan,
    build_memory_used,
    plan_is_personalized,
    plan_to_prompt_block,
)
from engine.reply_scoring import rerank_replies
from engine.text_features import extract_text_features
from models import (
    PLATFORMS,
    VIBES,
    AskLovliRequest,
    AskLovliResponse,
    AskThreadSync,
    AuthResponse,
    BootstrapResponse,
    DecodeResponse,
    EventCreateRequest,
    EventResponse,
    FeatureResponse,
    FeedbackRequest,
    MAX_ASK_THREAD_TURNS,
    GenerateRepliesResponse,
    Generation,
    MemoryPauseRequest,
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
    UserPreferences,
    UserPreferencesUpdate,
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
# Pool sizing: every request is I/O-bound (Mongo + Anthropic), so the pool, not
# CPU, is the concurrency limit. 100 connections comfortably serves thousands of
# users on one Railway instance; Atlas M10 allows 1500 total.
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=int(os.environ.get("MONGO_MAX_POOL_SIZE", "100")),
    minPoolSize=int(os.environ.get("MONGO_MIN_POOL_SIZE", "0")),
    serverSelectionTimeoutMS=int(os.environ.get("MONGO_SERVER_SELECTION_TIMEOUT_MS", "10000")),
    retryWrites=True,
    appname="lovli-api",
)
# Every collection access goes through the tenant guard: a query against a
# user-owned collection without a user_id filter raises instead of silently
# returning another user's data. Deliberate cross-user work uses db.unscoped().
db = tenant_guarded(client[os.environ.get("DB_NAME", "lovli_db")])

# ---- App / router -----------------------------------------------------------
app = FastAPI(title="Lovli API", version="1.0")
api = APIRouter(prefix="/api")

DAILY_LIMIT_FREE = 10  # PR4: bumped 8 → 10 — feature tools share the counter
DAILY_LIMIT_PRO = 10_000
ALLOWED_IMAGE_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 6 * 1024 * 1024  # 6MB


def _memory_engine_enabled() -> bool:
    """PR-M5 read-side gate: personalization (style block, rerank, memory_used).
    Event capture is always on — learning ships dark. Read per-call so the
    Railway env flip needs no code change and tests can toggle it."""
    return (os.environ.get("MEMORY_ENGINE_ENABLED") or "").strip().lower() == "true"


def _variant_features(replies: list[str]) -> list[dict]:
    """Tiny per-variant features for reply_generated events (never full texts)."""
    out = []
    for t in replies:
        f = extract_text_features(t)
        out.append({"chars": f.char_len, "emoji_count": f.emoji_count})
    return out


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

    # Give every account its preferences row at creation rather than waiting for
    # a lazy read. Otherwise a client that signs up and never calls /bootstrap
    # goes a whole session with nothing cloud-backed, and anything it changes is
    # lost on reinstall. Best-effort: signup must not fail over this.
    try:
        prefs = UserPreferences(
            user_id=doc["id"],
            language_preference=doc.get("language_preference") or "Hinglish",
            preferred_platform=doc.get("preferred_platform"),
        ).model_dump()
        prefs["created_at"] = prefs["created_at"].isoformat()
        prefs["updated_at"] = prefs["updated_at"].isoformat()
        await db.user_preferences.insert_one(prefs)
    except Exception:
        logger.exception("could not seed preferences for new user %s", doc.get("id"))
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


# ---- Dev-only auto sign-in ---------------------------------------------------
# Guardrail: refuse to boot if the dev bypass is flagged on in production.
if (
    os.environ.get("ENVIRONMENT", "development").lower() == "production"
    and os.environ.get("ALLOW_TEST_LOGIN", "").lower() == "true"
):
    raise RuntimeError("ALLOW_TEST_LOGIN must not be enabled when ENVIRONMENT=production")


@api.post("/auth/test-login", response_model=AuthResponse, include_in_schema=False)
async def test_login():
    """DEV-ONLY sign-in bypass for local development and automation.

    Double-gated: requires ALLOW_TEST_LOGIN=true AND ENVIRONMENT != production.
    Returns 404 (indistinguishable from a missing route) when disabled.
    Disable before launch: unset ALLOW_TEST_LOGIN / set ENVIRONMENT=production on Railway.
    """
    if os.environ.get("ENVIRONMENT", "development").lower() == "production":
        raise HTTPException(status_code=404, detail="Not Found")
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
    await _touch_last_login(user["id"])
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

def _extra_memory_context(mc: dict) -> str:
    """PR-V2-6: serialize the additive MemoryCard fields (stage, platform, city,
    timeline, facts) into LLM context. Empty string when none are set."""
    bits: list[str] = []
    if mc.get("stage"):
        dur = f" ({mc['stage_duration']})" if mc.get("stage_duration") else ""
        bits.append(f"Stage: {mc['stage']}{dur}.")
    if mc.get("platform"):
        bits.append(f"Platform: {mc['platform']}.")
    if mc.get("city"):
        bits.append(f"City: {mc['city']}.")
    timeline = mc.get("timeline") or []
    if isinstance(timeline, list) and timeline:
        lines = []
        for t in timeline[:12]:
            if not isinstance(t, dict) or not t.get("title"):
                continue
            piece = t["title"]
            if t.get("date_label"):
                piece += f" ({t['date_label']})"
            if t.get("detail"):
                piece += f": {t['detail']}"
            if t.get("upcoming"):
                piece += " [upcoming]"
            lines.append(piece)
        if lines:
            bits.append("Story so far: " + "; ".join(lines) + ".")
    facts = mc.get("facts") or []
    if isinstance(facts, list) and facts:
        likes = [f["text"] for f in facts if isinstance(f, dict) and f.get("text") and f.get("kind") != "avoid"]
        avoids = [f["text"] for f in facts if isinstance(f, dict) and f.get("text") and f.get("kind") == "avoid"]
        if likes:
            bits.append("Little things to remember: " + "; ".join(likes) + ".")
        if avoids:
            bits.append("Avoid: " + "; ".join(avoids) + ".")
    return " ".join(bits)



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
    # PR-V2-3 (additive): optional emotional/intent context folded into the
    # prompt. All absent → prompt + response byte-identical to pre-V2-3.
    feeling: Optional[str] = Form(None),
    intent: Optional[str] = Form(None),
    outcome: Optional[str] = Form(None),
    goal: Optional[str] = Form(None),
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
    mc: Optional[dict] = None
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
            extra = _extra_memory_context(mc)
            if extra:
                parts.append(extra)
            memory_context = " ".join(parts)

    # ---- memory engine (PR-M5, flag-gated): learned-style plan ----------
    stage_hint: Optional[str] = (
        (mc.get("relationship_stage") or mc.get("stage")) if mc else None
    )
    style_context: Optional[str] = None
    mem_plan = None
    if _memory_engine_enabled():
        try:
            mem_ctx = await get_memory_context(
                db, user_id, desired_tone=vibe, stage=stage_hint, surface="reply"
            )
            mem_plan = build_generation_plan(
                mem_ctx, vibe=vibe, surface="reply", stage=stage_hint
            )
            style_context = plan_to_prompt_block(mem_plan)
        except Exception:
            logger.exception("memory context failed for user %s", user_id)
            mem_plan = None

    # PR-M1: demand-signal event — metadata only, never the chat text.
    await record_conversation_event(
        db,
        user_id=user_id,
        type="reply_requested",
        conversation_id=memory_card_id,
        payload={
            "surface": "reply",
            "platform": platform,
            "vibe": vibe,
            "language": language,
            "stage": stage_hint,
            "has_image": bool(image_b64),
            "text_chars": len(manual_text or ""),
        },
    )

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
                feeling=feeling,
                intent=intent,
                outcome=outcome,
                goal=goal,
                style_context=style_context,
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

    # PR-M5: rerank the 3 variants against the learned style. Order only —
    # text is never rewritten; labels move in lockstep with their reply.
    reply_scores: Optional[list[float]] = None
    if mem_plan is not None and plan_is_personalized(mem_plan):
        response_replies, rich_reply_labels, reply_scores = rerank_replies(
            response_replies, rich_reply_labels, mem_plan, vibe
        )

    # PR-V2-3: map the rich read (+ wingman_advice) onto the additive insight
    # object. `read` is returned unchanged so old clients keep working.
    rich_insight: Optional[dict] = None
    if rich and rich_read:
        _temp_map = {"interested": "warm", "neutral": "mixed", "cold": "cold"}
        wingman = str(
            result.get("wingman_advice") or result.get("tone_notes") or ""
        ).strip()
        if wingman:
            rich_insight = {
                "temperature": _temp_map.get(str(rich_read.get("temperature")), "mixed"),
                "noticing": list(rich_read.get("signals") or [])[:3],
                "whats_going_on": str(rich_read.get("situation") or ""),
                "wingman_advice": wingman,
            }

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
        stage=stage_hint,
        memory_snapshot=(
            {
                "memory_schema_version": MEMORY_SCHEMA_VERSION,
                "level": mem_plan.level,
                "signals": mem_plan.signals,
            }
            if mem_plan is not None
            else None
        ),
        reply_scores=reply_scores,
    )
    gdoc = gen.model_dump()
    gdoc["created_at"] = gdoc["created_at"].isoformat()
    await db.generations.insert_one(gdoc)

    # PR-M1: outcome-side event — labels + tiny per-variant features only.
    await record_conversation_event(
        db,
        user_id=user_id,
        type="reply_generated",
        conversation_id=memory_card_id,
        payload={
            "surface": "reply",
            "generation_id": gen.id,
            "vibe": vibe,
            "language": language,
            "stage": stage_hint,
            "labels": rich_reply_labels or [],
            "variant_features": _variant_features(response_replies),
            "personalized": bool(reply_scores),
        },
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
        insight=rich_insight,  # type: ignore[arg-type]  # dict → ReplyInsight
        memory_used=(
            build_memory_used(mem_plan, reranked=bool(reply_scores))
            if mem_plan is not None
            else None
        ),  # type: ignore[arg-type]  # dict → MemoryUsed
    )


@api.post("/ask-lovli", response_model=AskLovliResponse, response_model_exclude_none=True)
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
    mc: Optional[dict] = None
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
            extra = _extra_memory_context(mc)
            if extra:
                parts.append(extra)
            memory_context = " ".join(parts)

    # ---- memory engine (PR-M5, flag-gated) ------------------------------
    stage_hint: Optional[str] = (
        (mc.get("relationship_stage") or mc.get("stage")) if mc else None
    )
    style_context: Optional[str] = None
    mem_plan = None
    if _memory_engine_enabled():
        try:
            mem_ctx = await get_memory_context(
                db, user_id, stage=stage_hint, surface="ask"
            )
            mem_plan = build_generation_plan(mem_ctx, surface="ask", stage=stage_hint)
            style_context = plan_to_prompt_block(mem_plan)
        except Exception:
            logger.exception("memory context failed for user %s", user_id)
            mem_plan = None

    await record_conversation_event(
        db,
        user_id=user_id,
        type="reply_requested",
        conversation_id=req.person_id,
        payload={
            "surface": "ask",
            "stage": stage_hint,
            "text_chars": len(message),
            "history_turns": len(history),
        },
    )

    try:
        reply = await ask_lovli(
            message=message,
            history=history,
            memory_context=memory_context,
            session_id=f"ask-{user_id}",
            style_context=style_context,
        )
    except LovliLlmError as e:
        logger.warning("Ask Lovli failed for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=503,
            detail="Lovli couldn't reply right now. Try again.",
        )

    await record_conversation_event(
        db,
        user_id=user_id,
        type="reply_generated",
        conversation_id=req.person_id,
        payload={
            "surface": "ask",
            "stage": stage_hint,
            "variant_features": _variant_features([reply]),
            "personalized": bool(style_context),
        },
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

    # Persist the thread server-side so it survives reinstalls and follows the
    # account to a new device. Best-effort: a sync failure must not lose the
    # reply the user is waiting on.
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        turns = [
            *history,
            {"role": "user", "text": message},
            {"role": "lovli", "text": reply},
        ][-MAX_ASK_THREAD_TURNS:]
        await db.ask_threads.update_one(
            {"user_id": user_id},
            {"$set": {"turns": turns, "updated_at": now_iso},
             "$setOnInsert": {"user_id": user_id, "created_at": now_iso}},
            upsert=True,
        )
    except Exception:
        logger.exception("ask thread sync failed for user %s", user_id)

    return AskLovliResponse(
        reply=reply,
        memory_used=(
            build_memory_used(mem_plan) if mem_plan is not None else None
        ),  # type: ignore[arg-type]
    )


@api.post("/decode", response_model=DecodeResponse, response_model_exclude_none=True)
async def decode_endpoint(
    manual_text: Optional[str] = Form(None),
    feeling: Optional[str] = Form(None),
    memory_card_id: Optional[str] = Form(None),
    language: str = Form("Hinglish"),
    client_local_date: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user_id),
):
    """PR-V2-5: qualitative decode of a chat. Same multipart input contract as
    /generate-replies (image or manual_text + optional feeling, memory_card_id).
    Counts against the same daily usage limit. vibe_label is clamped server-side
    to the 3 allowed values — never numbers/percentages."""
    if not (manual_text and manual_text.strip()) and image is None:
        raise HTTPException(
            status_code=400,
            detail="Provide a screenshot or paste the chat text.",
        )

    user = await _get_user(user_id)
    local_date = _normalize_local_date(client_local_date)
    user = await _maybe_reset_daily(user, local_date)

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
        image_mime = "image/jpeg" if mime in ("image/jpeg", "image/jpg") else mime

    memory_context: Optional[str] = None
    mc: Optional[dict] = None
    if memory_card_id:
        mc = await db.memory_cards.find_one(
            {"id": memory_card_id, "user_id": user_id}, {"_id": 0}
        )
        if mc:
            parts: list[str] = [f"Nickname: {mc.get('nickname','')}."]
            for key, label in (
                ("goal", "What user wants with this person"),
                ("current_situation", "Current situation"),
                ("relationship_stage", "Stage"),
                ("where_met", "Where they met"),
                ("likes", "Likes"),
                ("dislikes", "Avoid"),
                ("communication_style", "Communication style"),
                ("inside_jokes", "Inside jokes"),
                ("important_dates", "Important context"),
                ("best_approach", "Best approach"),
                ("notes", "Notes"),
            ):
                if mc.get(key):
                    parts.append(f"{label}: {mc[key]}.")
            extra = _extra_memory_context(mc)
            if extra:
                parts.append(extra)
            memory_context = " ".join(parts)

    # ---- memory engine (PR-M5, flag-gated) ------------------------------
    stage_hint: Optional[str] = (
        (mc.get("relationship_stage") or mc.get("stage")) if mc else None
    )
    style_context: Optional[str] = None
    mem_plan = None
    if _memory_engine_enabled():
        try:
            mem_ctx = await get_memory_context(
                db, user_id, stage=stage_hint, surface="decode"
            )
            mem_plan = build_generation_plan(mem_ctx, surface="decode", stage=stage_hint)
            style_context = plan_to_prompt_block(mem_plan)
        except Exception:
            logger.exception("memory context failed for user %s", user_id)
            mem_plan = None

    await record_conversation_event(
        db,
        user_id=user_id,
        type="reply_requested",
        conversation_id=memory_card_id,
        payload={
            "surface": "decode",
            "stage": stage_hint,
            "has_image": bool(image_b64),
            "text_chars": len(manual_text or ""),
        },
    )

    try:
        result = await decode_situation(
            DecodeRequest(
                manual_text=manual_text,
                image_base64=image_b64,
                image_mime=image_mime,
                feeling=feeling,
                memory_context=memory_context,
                language=language,
                session_id=f"decode-{user_id}",
                style_context=style_context,
            )
        )
    except LovliLlmError as e:
        logger.warning("Decode failed for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=503,
            detail="Lovli couldn't decode this right now. Try again.",
        )

    # PR4c: persist decode results so they appear in the More-tab RECENT strip.
    gen = Generation(
        user_id=user_id,
        input_type=(
            "both"
            if image_b64 and (manual_text and manual_text.strip())
            else ("screenshot" if image_b64 else "text")
        ),
        platform="decode",
        vibe=feeling or "",
        manual_text=manual_text,
        memory_card_id=memory_card_id,
        generated_replies=[],
        feature_id="decode",
        result=result,
        stage=stage_hint,
    )
    gdoc = gen.model_dump()
    gdoc["created_at"] = gdoc["created_at"].isoformat()
    await db.generations.insert_one(gdoc)

    await record_conversation_event(
        db,
        user_id=user_id,
        type="reply_generated",
        conversation_id=memory_card_id,
        payload={
            "surface": "decode",
            "generation_id": gen.id,
            "stage": stage_hint,
            "personalized": bool(style_context),
        },
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

    return DecodeResponse(
        **result,
        memory_used=(
            build_memory_used(mem_plan) if mem_plan is not None else None
        ),  # type: ignore[arg-type]
    )


@api.post("/feature", response_model=FeatureResponse, response_model_exclude_none=True)
async def feature_endpoint(
    feature_id: str = Form(...),
    manual_text: Optional[str] = Form(None),
    text_secondary: Optional[str] = Form(None),
    draft_text: Optional[str] = Form(None),
    feeling: Optional[str] = Form(None),
    memory_card_id: Optional[str] = Form(None),
    language: str = Form("Hinglish"),
    client_local_date: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user_id),
):
    """PR4: ONE additive route for the More-grid tools. Same multipart contract
    as /decode plus feature_id, optional text_secondary (fair_verdict: their
    side; what_should_i_do: your goal) and draft_text (glow_up_reply only).
    Shares the daily counter. Contract: /app/docs/FEATURE_API_AND_PROMPTS.md"""
    if feature_id not in FEATURE_SUFFIXES:
        raise HTTPException(status_code=400, detail="Unknown feature.")
    if feature_id == "glow_up_reply":
        if not (draft_text and draft_text.strip()):
            raise HTTPException(
                status_code=400, detail="Paste the reply you want to glow up."
            )
    elif not (manual_text and manual_text.strip()) and image is None:
        raise HTTPException(
            status_code=400,
            detail="Tell me what happened first — screenshot or paste.",
        )

    user = await _get_user(user_id)
    local_date = _normalize_local_date(client_local_date)
    user = await _maybe_reset_daily(user, local_date)

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
        image_mime = "image/jpeg" if mime in ("image/jpeg", "image/jpg") else mime

    memory_context: Optional[str] = None
    mc: Optional[dict] = None
    if memory_card_id:
        mc = await db.memory_cards.find_one(
            {"id": memory_card_id, "user_id": user_id}, {"_id": 0}
        )
        if mc:
            parts: list[str] = [f"Nickname: {mc.get('nickname','')}."]
            for key, label in (
                ("goal", "What user wants with this person"),
                ("current_situation", "Current situation"),
                ("relationship_stage", "Stage"),
                ("where_met", "Where they met"),
                ("likes", "Likes"),
                ("dislikes", "Avoid"),
                ("communication_style", "Communication style"),
                ("inside_jokes", "Inside jokes"),
                ("important_dates", "Important context"),
                ("best_approach", "Best approach"),
                ("notes", "Notes"),
            ):
                if mc.get(key):
                    parts.append(f"{label}: {mc[key]}.")
            extra = _extra_memory_context(mc)
            if extra:
                parts.append(extra)
            memory_context = " ".join(parts)

    # ---- memory engine (PR-M5, flag-gated) ------------------------------
    stage_hint: Optional[str] = (
        (mc.get("relationship_stage") or mc.get("stage")) if mc else None
    )
    style_context: Optional[str] = None
    mem_plan = None
    if _memory_engine_enabled():
        try:
            mem_ctx = await get_memory_context(
                db, user_id, stage=stage_hint, surface=f"feature:{feature_id}"
            )
            mem_plan = build_generation_plan(
                mem_ctx, surface=f"feature:{feature_id}", stage=stage_hint
            )
            style_context = plan_to_prompt_block(mem_plan)
        except Exception:
            logger.exception("memory context failed for user %s", user_id)
            mem_plan = None

    await record_conversation_event(
        db,
        user_id=user_id,
        type="reply_requested",
        conversation_id=memory_card_id,
        payload={
            "surface": f"feature:{feature_id}",
            "stage": stage_hint,
            "has_image": bool(image_b64),
            "text_chars": len(manual_text or "") + len(draft_text or ""),
        },
    )

    try:
        result = await generate_feature(
            FeatureRequest(
                feature_id=feature_id,
                manual_text=manual_text,
                text_secondary=text_secondary,
                draft_text=draft_text,
                image_base64=image_b64,
                image_mime=image_mime,
                feeling=feeling,
                memory_context=memory_context,
                language=language,
                session_id=f"feature-{feature_id}-{user_id}",
                style_context=style_context,
            )
        )
    except LovliLlmError as e:
        logger.warning("Feature %s failed for user %s: %s", feature_id, user_id, e)
        raise HTTPException(
            status_code=503,
            detail="Lovli couldn't work through this right now. Try again.",
        )

    has_text = bool((manual_text and manual_text.strip()) or (draft_text and draft_text.strip()))
    gen = Generation(
        user_id=user_id,
        input_type=(
            "both" if image_b64 and has_text else ("screenshot" if image_b64 else "text")
        ),
        platform="feature",
        vibe=feeling or "",
        manual_text=manual_text,
        memory_card_id=memory_card_id,
        generated_replies=list(result["replies"]),
        feature_id=feature_id,
        result=result,
        stage=stage_hint,
    )
    gdoc = gen.model_dump()
    gdoc["created_at"] = gdoc["created_at"].isoformat()
    await db.generations.insert_one(gdoc)

    await record_conversation_event(
        db,
        user_id=user_id,
        type="reply_generated",
        conversation_id=memory_card_id,
        payload={
            "surface": f"feature:{feature_id}",
            "generation_id": gen.id,
            "stage": stage_hint,
            "variant_features": _variant_features(list(result["replies"])),
            "personalized": bool(style_context),
        },
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

    return FeatureResponse(
        generation_id=gen.id,
        feature_id=feature_id,
        **result,
        memory_used=(
            build_memory_used(mem_plan) if mem_plan is not None else None
        ),  # type: ignore[arg-type]
    )


# ---- Recent results (PR4c) --------------------------------------------------
# Feeds the "RECENT" strip on the More tab: last N feature/decode results,
# re-openable read-only at zero generation cost.

@api.get("/recent-results")
async def recent_results(
    limit: int = 5,
    user_id: str = Depends(get_current_user_id),
):
    cursor = (
        db.generations.find(
            {"user_id": user_id, "feature_id": {"$ne": None}}, {"_id": 0}
        )
        .sort("created_at", -1)
        .limit(max(1, min(limit, 10)))
    )
    rows = await cursor.to_list(10)
    out = []
    for r in rows:
        result = r.get("result") or {}
        out.append(
            {
                "generation_id": r["id"],
                "feature_id": r["feature_id"],
                "verdict": result.get("verdict") or result.get("vibe_headline") or "",
                "created_at": r["created_at"],
            }
        )
    return out


@api.get("/generations/{gen_id}")
async def get_generation(
    gen_id: str,
    user_id: str = Depends(get_current_user_id),
):
    row = await db.generations.find_one(
        {"id": gen_id, "user_id": user_id}, {"_id": 0}
    )
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    return row


@api.delete("/generations")
async def delete_generations(user_id: str = Depends(get_current_user_id)):
    """'Delete my memories' also wipes stored results (the RECENT strip)."""
    res = await db.generations.delete_many({"user_id": user_id})
    return {"deleted": res.deleted_count}


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

    # PR-M1: dual-write a reply_copied event so OLD clients (which only call
    # /feedback) still feed the memory engine. New clients also post the richer
    # event via /api/events — the reducer dedupes on (generation_id, index).
    if req.copied_reply_index is not None:
        gen_doc = await db.generations.find_one(
            {"id": req.generation_id, "user_id": user_id}, {"_id": 0}
        )
        replies = (gen_doc or {}).get("generated_replies") or []
        idx = req.copied_reply_index
        text = replies[idx] if isinstance(idx, int) and 0 <= idx < len(replies) else ""
        await record_conversation_event(
            db,
            user_id=user_id,
            type="reply_copied",
            conversation_id=(gen_doc or {}).get("memory_card_id"),
            payload={
                "generation_id": req.generation_id,
                "index": idx,
                "text": text,
                "stage": (gen_doc or {}).get("stage"),
            },
            source="feedback",
        )
    return {"ok": True}


# =============================================================================
# Memory engine — events + user controls (PR-M1/M4)
# =============================================================================
@api.post("/events", response_model=EventResponse)
async def create_event(
    req: EventCreateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Append one behavioral event. user_id ALWAYS comes from the token, never
    the body; server-only event types are rejected so a client can't forge
    generation volume."""
    if req.type not in CLIENT_EVENT_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Invalid event type. Allowed: {CLIENT_EVENT_TYPES}"
        )
    event = await record_conversation_event(
        db,
        user_id=user_id,
        type=req.type,
        payload=req.payload,
        conversation_id=req.conversation_id,
        source="mobile",
        client_ts=req.client_ts,
    )
    if event is None:
        # Paused memory or a swallowed write error — either way the client
        # shouldn't retry or surface anything.
        return EventResponse(id="", status="recorded")
    return EventResponse(id=event["id"])


@api.get("/memory/summary")
async def memory_summary(user_id: str = Depends(get_current_user_id)):
    """Guide §13.3 + §11.7: what Lovli has learned, in human words. Evidence
    event ids stay server-side."""
    texting = await db.texting_profiles.find_one({"user_id": user_id}, {"_id": 0})
    tones = await db.tone_profiles.find_one({"user_id": user_id}, {"_id": 0})
    phrases = await db.phrase_rules.find_one({"user_id": user_id}, {"_id": 0})
    user = await db.users.find_one(
        {"id": user_id}, {"_id": 0, "memory_paused": 1}
    )
    atoms = await db.memory_atoms.find(
        {"user_id": user_id}, {"_id": 0, "evidence_event_ids": 0}
    ).sort("confidence", -1).to_list(length=100)

    signal_count = int((texting or {}).get("signal_count") or 0)

    style_labels = {
        ("message_length", "short"): "You prefer short replies",
        ("message_length", "long"): "You prefer fuller replies",
        ("formality", "casual"): "You keep it casual",
        ("emoji_usage", "none"): "You skip emojis",
        ("emoji_usage", "light"): "You like light emoji use",
        ("emoji_usage", "heavy"): "You're emoji-friendly",
        ("capitalization", "casual_lowercase_allowed"): "You often text lowercase",
        ("punctuation", "light"): "You use light punctuation",
        ("directness", "high"): "You're direct",
    }
    texting_style = [
        label
        for (aspect, value), label in style_labels.items()
        if ((texting or {}).get("style_summary") or {}).get(aspect) == value
    ]

    tone_preferences: list[str] = []
    for stage, stage_tones in ((tones or {}).get("tones") or {}).items():
        for tone_name, info in stage_tones.items():
            if (info or {}).get("weight", 0) >= 0.3:
                where = "" if stage == "any" else f" ({stage.replace('_', ' ')})"
                tone_preferences.append(f"You like {tone_name.replace('_', ' ')} replies{where}")
    for t in (tones or {}).get("avoid_tones") or []:
        tone_preferences.append(f"You usually skip {t.replace('_', ' ')} replies")

    phrase_rules = [
        f'You avoid "{b["phrase"]}"'
        for b in (phrases or {}).get("blacklist") or []
        if b.get("phrase")
    ]

    boundaries = [
        a["value"]["text"]
        for a in atoms
        if a.get("domain") == "boundary"
        and isinstance(a.get("value"), dict)
        and a["value"].get("text")
    ]

    learned = [
        {
            "id": a["id"],
            "domain": a["domain"],
            "key": a["key"],
            "label": _atom_label(a),
            "confidence": a.get("confidence", 0),
            "support_count": a.get("support_count", 0),
        }
        for a in atoms
        if a.get("polarity", 1) > 0 and a.get("confidence", 0) >= 0.2
    ][:30]

    return {
        "is_cold_start": signal_count == 0,
        "event_count": signal_count,
        "paused": bool((user or {}).get("memory_paused")),
        "texting_style": texting_style,
        "tone_preferences": tone_preferences,
        "phrase_rules": phrase_rules,
        "boundaries": boundaries,
        "learned": learned,
    }


_ATOM_LABELS = {
    ("style", "message_length.short"): "Prefers short replies",
    ("style", "message_length.long"): "Prefers fuller replies",
    ("style", "formality.casual"): "Casual wording",
    ("style", "capitalization.casual"): "Lowercase-friendly",
    ("style", "punctuation.light"): "Light punctuation",
    ("style", "directness.high"): "Direct style",
    ("style", "avoid_cringe"): "No pickup lines",
    ("style", "avoid_needy"): "Never sound needy",
    ("style", "intensity.reduce"): "Keep it low-key",
    ("style", "romance.light"): "Light on romance",
    ("style", "more_playful"): "A little playful",
    ("style", "voice.adjust"): "Adjusting to your voice",
    ("emoji", "emoji_usage.none"): "No emojis",
    ("emoji", "emoji_usage.light"): "At most one emoji",
    ("emoji", "emoji_usage.heavy"): "Emoji-friendly",
    ("emoji", "emoji_usage.reduce"): "Fewer emojis",
}


def _atom_label(atom: dict) -> str:
    label = _ATOM_LABELS.get((atom.get("domain"), atom.get("key")))
    if label:
        return label
    domain, key = atom.get("domain", ""), atom.get("key", "")
    if domain == "tone":
        stage, _, tone = key.partition(".")
        where = "" if stage == "any" else f" in {stage.replace('_', ' ')}"
        return f"Likes {tone.replace('_', ' ')} replies{where}"
    if domain == "phrase" and key.startswith("blacklist."):
        phrase = (atom.get("value") or {}).get("phrase") or key.removeprefix("blacklist.")
        return f'Avoids "{phrase}"'
    if domain == "phrase" and key.startswith("replace."):
        v = atom.get("value") or {}
        return f'Prefers "{v.get("to", "")}" over "{v.get("from", "")}"'
    if domain == "boundary":
        return f'Boundary: {(atom.get("value") or {}).get("text", key)}'
    return key.replace("_", " ").replace(".", " — ")


@api.delete("/memory")
async def delete_memory(user_id: str = Depends(get_current_user_id)):
    """Guide §13.4: wipe events + derived memory for the calling user only."""
    deleted = await delete_user_memory(db, user_id)
    return {"ok": True, "deleted": deleted}


@api.delete("/memory/preferences/{atom_id}")
async def remove_learned_preference(
    atom_id: str, user_id: str = Depends(get_current_user_id)
):
    """Remove ONE learned preference. Recorded as a preference_removed event so
    the tombstone survives every future rebuild (deleting the atom doc alone
    would resurrect it on the next replay)."""
    atom = await db.memory_atoms.find_one(
        {"id": atom_id, "user_id": user_id}, {"_id": 0}
    )
    if not atom:
        raise HTTPException(status_code=404, detail="Preference not found")
    await record_conversation_event(
        db,
        user_id=user_id,
        type="preference_removed",
        payload={"domain": atom["domain"], "key": atom["key"]},
        source="user",
    )
    # Rebuild inline (not debounced) so the summary reflects the removal at once.
    await rebuild_user_memory(db, user_id)
    return {"ok": True}


@api.post("/memory/pause")
async def pause_memory(
    req: MemoryPauseRequest, user_id: str = Depends(get_current_user_id)
):
    await set_memory_paused(db, user_id, req.paused)
    return {"ok": True, "paused": req.paused}


# ---- internal (admin-key protected) ----------------------------------------
@api.post("/internal/memory/rebuild")
async def internal_memory_rebuild(
    body: dict,
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
):
    """Replay derived memory from events. {"user_id": "..."} for one user or
    {"all": true} to batch over every user with events."""
    _check_admin_key(x_admin_key)
    if body.get("all") is True:
        # Deliberate cross-user scan; each rebuild is still user-scoped.
        user_ids = await unscoped(db).conversation_events.distinct("user_id")
        results = []
        for uid in user_ids:
            results.append(await rebuild_user_memory(db, uid))
        return {"rebuilt": len(results), "results": results}
    target = str(body.get("user_id") or "").strip()
    if not target:
        raise HTTPException(status_code=400, detail="user_id or all:true required")
    return await rebuild_user_memory(db, target)


@api.get("/internal/db/health")
async def internal_db_health(
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
):
    """Schema version, index state, and per-collection counts. Use this after a
    deploy to confirm the database converged on the declared schema."""
    _check_admin_key(x_admin_key)
    raw = unscoped(db)
    counts: dict[str, int] = {}
    for name in ("users", *USER_OWNED_COLLECTIONS, "waitlist"):
        try:
            counts[name] = await raw[name].count_documents({})
        except Exception:
            counts[name] = -1
    return {
        "schema_version": {
            "expected": CURRENT_SCHEMA_VERSION,
            "actual": await get_schema_version(raw),
        },
        "tenant_guard": guard_status(),
        "counts": counts,
        "indexes": await describe_indexes(raw),
    }


@api.get("/internal/memory/stats")
async def internal_memory_stats(
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
):
    """Guide §15.1 rollout metrics, straight off the event log."""
    _check_admin_key(x_admin_key)
    raw = unscoped(db)  # deliberate cross-user aggregates
    events_by_type: dict[str, int] = {}
    async for row in raw.conversation_events.aggregate(
        [{"$group": {"_id": "$type", "n": {"$sum": 1}}}]
    ):
        events_by_type[row["_id"] or "unknown"] = row["n"]
    users_with_events = len(await raw.conversation_events.distinct("user_id"))
    users_paused = await raw.users.count_documents({"memory_paused": True})
    personalized_generations = await raw.generations.count_documents(
        {"reply_scores": {"$ne": None}}
    )
    resets = events_by_type.get("memory_reset", 0)
    edits = events_by_type.get("reply_edited", 0)
    copies = events_by_type.get("reply_copied", 0)
    generated = events_by_type.get("reply_generated", 0)
    return {
        "events_by_type": events_by_type,
        "users_with_events": users_with_events,
        "users_paused": users_paused,
        "personalized_generations": personalized_generations,
        "copy_rate": round(copies / generated, 4) if generated else None,
        "edit_rate": round(edits / generated, 4) if generated else None,
        "memory_resets": resets,
        "memory_schema_version": MEMORY_SCHEMA_VERSION,
    }


# =============================================================================
# Cloud-backed user state: preferences, Ask Lovli thread, bootstrap
#
# These replace data that used to live only in device storage. Everything is
# keyed to user_id, so signing in on a new phone restores the same app.
# =============================================================================
async def _get_or_create_preferences(user_id: str) -> dict:
    """Preferences are created lazily so old accounts heal on first read."""
    doc = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0})
    if doc:
        return doc
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "language_preference": 1, "preferred_platform": 1},
    ) or {}
    prefs = UserPreferences(
        user_id=user_id,
        language_preference=user.get("language_preference") or "Hinglish",
        preferred_platform=user.get("preferred_platform"),
    )
    doc = prefs.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    try:
        await db.user_preferences.insert_one(dict(doc))
    except Exception:
        # Lost a race with a concurrent request — re-read the winner.
        doc = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0}) or doc
    return doc


@api.get("/preferences", response_model=UserPreferences)
async def get_preferences(user_id: str = Depends(get_current_user_id)):
    return _serialize(await _get_or_create_preferences(user_id))


@api.patch("/preferences", response_model=UserPreferences)
async def update_preferences(
    req: UserPreferencesUpdate,
    user_id: str = Depends(get_current_user_id),
):
    await _get_or_create_preferences(user_id)
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.user_preferences.update_one({"user_id": user_id}, {"$set": update})

    # Keep the mirrored fields on the user record in step so existing endpoints
    # (onboarding, settings, generation defaults) stay consistent.
    mirrored = {
        k: update[k]
        for k in ("language_preference", "preferred_platform")
        if k in update
    }
    if mirrored:
        mirrored["updated_at"] = update["updated_at"]
        await db.users.update_one({"id": user_id}, {"$set": mirrored})

    doc = await db.user_preferences.find_one({"user_id": user_id}, {"_id": 0})
    return _serialize(doc)


@api.get("/ask-thread")
async def get_ask_thread(user_id: str = Depends(get_current_user_id)):
    """The Ask Lovli conversation, restored on any device."""
    doc = await db.ask_threads.find_one({"user_id": user_id}, {"_id": 0})
    return {"turns": (doc or {}).get("turns", []), "updated_at": (doc or {}).get("updated_at")}


@api.put("/ask-thread")
async def put_ask_thread(
    req: AskThreadSync,
    user_id: str = Depends(get_current_user_id),
):
    now = datetime.now(timezone.utc).isoformat()
    turns = [t.model_dump() for t in req.turns]
    await db.ask_threads.update_one(
        {"user_id": user_id},
        {"$set": {"turns": turns, "updated_at": now},
         "$setOnInsert": {"user_id": user_id, "created_at": now}},
        upsert=True,
    )
    return {"ok": True, "turns": len(turns)}


@api.delete("/ask-thread")
async def delete_ask_thread(user_id: str = Depends(get_current_user_id)):
    res = await db.ask_threads.delete_many({"user_id": user_id})
    return {"ok": True, "deleted": res.deleted_count}


@api.get("/bootstrap", response_model=BootstrapResponse, response_model_exclude_none=True)
async def bootstrap(
    client_local_date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
):
    """ONE call that rehydrates the whole app after sign-in.

    Every read is user-scoped and index-covered; the payload is capped so it
    stays small no matter how long the account has been active.
    """
    user = await _get_user(user_id)
    local_date = _normalize_local_date(client_local_date)
    user = await _maybe_reset_daily(user, local_date)

    prefs = await _get_or_create_preferences(user_id)

    cards = []
    async for card in (
        db.memory_cards.find({"user_id": user_id}, {"_id": 0})
        .sort("created_at", -1)
        .limit(200)
    ):
        cards.append(_serialize(card))

    recent = []
    async for row in (
        db.generations.find(
            {"user_id": user_id, "feature_id": {"$ne": None}},
            {"_id": 0, "id": 1, "feature_id": 1, "result": 1, "created_at": 1},
        )
        .sort("created_at", -1)
        .limit(5)
    ):
        result = row.get("result") or {}
        recent.append(
            {
                "generation_id": row["id"],
                "feature_id": row["feature_id"],
                "verdict": result.get("verdict") or result.get("vibe_headline") or "",
                "created_at": row["created_at"],
            }
        )

    thread_doc = await db.ask_threads.find_one({"user_id": user_id}, {"_id": 0, "turns": 1})
    thread = (thread_doc or {}).get("turns", [])[-60:]

    # Learned-style summary is best-effort — never block sign-in on it.
    summary = None
    try:
        profile = await db.texting_profiles.find_one(
            {"user_id": user_id}, {"_id": 0, "style_summary": 1, "signal_count": 1}
        )
        if profile:
            summary = {
                "signal_count": profile.get("signal_count", 0),
                "style_summary": profile.get("style_summary", {}),
            }
    except Exception:
        logger.exception("bootstrap: memory summary failed for %s", user_id)

    return BootstrapResponse(
        user=_public_user(user),
        preferences=UserPreferences(**prefs),
        usage=UsageResponse(
            plan=user["plan"],
            daily_generation_count=user["daily_generation_count"],
            daily_limit=_daily_limit(user["plan"]),
            last_generation_reset_date=user.get("last_generation_reset_date"),
            timezone=user.get("timezone", "Asia/Kolkata"),
        ),
        memory_cards=cards,  # type: ignore[arg-type]
        recent_results=recent,
        ask_thread=thread,  # type: ignore[arg-type]
        memory_summary=summary,
        server={
            "schema_version": CURRENT_SCHEMA_VERSION,
            "memory_engine_enabled": _memory_engine_enabled(),
        },
    )


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
    # Deliberate cross-user read: admin listing spans all accounts.
    raw = unscoped(db)
    cur = raw.users.find(q, projection).sort("created_at", 1).skip(offset).limit(limit)
    items = []
    async for u in cur:
        items.append(_serialize(u))

    total = await raw.users.count_documents(q)
    by_provider = {}
    async for row in raw.users.aggregate(
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
    raw = unscoped(db)  # deliberate cross-user aggregates
    users_total = await raw.users.count_documents({})
    users_google = await raw.users.count_documents({"auth_provider": {"$in": ["google", "both"]}})
    users_password = await raw.users.count_documents({"auth_provider": {"$in": ["password", "both"]}})
    gens_total = await raw.generations.count_documents({})
    memory_total = await raw.memory_cards.count_documents({})
    waitlist_by_type = {}
    async for row in raw.waitlist.aggregate(
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
    """Bring the database up to spec: indexes first, then migrations.

    Both are idempotent and driven by db/schema.py, so every deploy converges
    on the declared schema. Failures are logged, never fatal — a database that
    is briefly unreachable must not crash the healthcheck and loop the pod.
    """
    raw = unscoped(db)
    try:
        report = await sync_indexes(raw)
        if report["conflicts"] or report["errors"]:
            logger.warning(
                "index sync finished with %d conflicts, %d errors",
                len(report["conflicts"]),
                len(report["errors"]),
            )
    except Exception as e:
        logger.warning("index sync failed: %s", e)

    try:
        result = await run_migrations(raw)
        logger.info("schema %s: v%s -> v%s", result["status"], result["from"], result["to"])
    except Exception as e:
        logger.warning("migrations failed: %s", e)

    logger.info(
        "boot ok | schema v%d | tenant guard: %s | memory engine: %s",
        CURRENT_SCHEMA_VERSION,
        guard_status()["mode"],
        "on" if _memory_engine_enabled() else "off (dark capture)",
    )


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


@app.exception_handler(TenantScopeError)
async def tenant_scope_handler(request, exc: TenantScopeError):
    """A query touched a user-owned collection without a user_id filter.

    That is always a server bug, and serving the result could leak another
    user's data — so fail the request loudly and log it for triage. The client
    gets a generic 500 with no internal detail.
    """
    logger.error("TENANT SCOPE VIOLATION on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Try again."},
    )
