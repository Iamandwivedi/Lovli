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
from llm_service import LovliLlmError, LovliRequest, generate_replies
from models import (
    PLATFORMS,
    VIBES,
    AuthResponse,
    FeedbackRequest,
    GenerateRepliesResponse,
    Generation,
    GoogleSessionRequest,
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
    auth_provider: str = "password",
) -> dict:
    u = User(
        name=name,
        email=email,
        hashed_password=hashed_password,
        google_picture=google_picture,
        auth_provider=auth_provider,  # type: ignore[arg-type]
    )
    doc = u.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.users.insert_one(doc)
    return doc


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
    token = create_jwt(doc["id"], doc["email"])
    return AuthResponse(access_token=token, user=_public_user(doc))


@api.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not user.get("hashed_password"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
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


@api.post("/auth/google/session", response_model=AuthResponse)
async def google_session(req: GoogleSessionRequest):
    """Exchange an Emergent-managed Google session_id for our own JWT."""
    session_id = (req.session_id or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    try:
        async with httpx.AsyncClient(timeout=15.0) as hc:
            r = await hc.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
            )
        if r.status_code != 200:
            logger.warning(
                "emergent session-data non-200: %s %s", r.status_code, r.text
            )
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("emergent session-data failed: %s", e)
        raise HTTPException(
            status_code=502, detail="Auth provider unavailable"
        ) from e

    email = (data.get("email") or "").lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    if not email:
        raise HTTPException(status_code=400, detail="No email returned by provider")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = await _create_user_doc(
            name=name,
            email=email,
            google_picture=picture,
            auth_provider="google",
        )
    else:
        new_provider = "both" if user.get("hashed_password") else "google"
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "google_picture": picture or user.get("google_picture"),
                    "auth_provider": new_provider,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        user = await db.users.find_one({"id": user["id"]}, {"_id": 0})

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
@api.post("/generate-replies", response_model=GenerateRepliesResponse)
async def generate_replies_endpoint(
    platform: str = Form(...),
    vibe: str = Form(...),
    language: str = Form("Hinglish"),
    manual_text: Optional[str] = Form(None),
    user_note: Optional[str] = Form(None),
    memory_card_id: Optional[str] = Form(None),
    client_local_date: Optional[str] = Form(None),
    timezone_str: Optional[str] = Form(None, alias="timezone"),
    image: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user_id),
):
    if platform not in PLATFORMS:
        raise HTTPException(
            status_code=400, detail=f"Invalid platform. Allowed: {PLATFORMS}"
        )
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
            )
        )
    except LovliLlmError as e:
        logger.warning("LLM generation failed for user %s: %s", user_id, e)
        raise HTTPException(
            status_code=503,
            detail="Lovli couldn't generate replies right now. Try again.",
        )

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
        generated_replies=result["replies"],
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
        replies=result["replies"],
        tone_notes=result.get("tone_notes", ""),
        daily_generation_count=new_count,
        daily_limit=limit,
        plan=user["plan"],
    )


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
# App lifecycle
# =============================================================================
@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
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


@app.exception_handler(404)
async def not_found_handler(_request, exc):
    return JSONResponse(
        status_code=404, content={"detail": getattr(exc, "detail", "Not Found")}
    )
