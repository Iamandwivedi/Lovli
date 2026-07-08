"""
backend/models.py — Pydantic models for Lovli.

Uses custom `id` (UUID strings). MongoDB's `_id` is excluded with projection.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

PLATFORMS = ("instagram", "dating_platform", "whatsapp")
VIBES = ("Playful", "Flirty", "Sincere", "Respectful", "Confident")
LANGUAGES = ("English", "Hinglish", "Hindi + English mixed")


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# -------- Users ---------------------------------------------------------------
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=_uuid)
    name: str
    email: EmailStr
    hashed_password: Optional[str] = None  # None for Google-only users
    google_sub: Optional[str] = None  # stable Google user id (the "sub" claim)
    google_picture: Optional[str] = None
    auth_provider: Literal["password", "google", "both"] = "password"

    plan: Literal["free", "pro"] = "free"
    daily_generation_count: int = 0
    last_generation_reset_date: Optional[str] = None  # YYYY-MM-DD in user's tz
    timezone: str = "Asia/Kolkata"

    preferred_platform: Optional[str] = None
    preferred_style: Optional[str] = None
    language_preference: str = "Hinglish"
    onboarding_complete: bool = False

    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
    last_login_at: Optional[datetime] = None


class PublicUser(BaseModel):
    """Shape returned to the frontend (no secrets)."""

    id: str
    name: str
    email: EmailStr
    google_picture: Optional[str] = None
    plan: Literal["free", "pro"] = "free"
    daily_generation_count: int = 0
    last_generation_reset_date: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    preferred_platform: Optional[str] = None
    preferred_style: Optional[str] = None
    language_preference: str = "Hinglish"
    onboarding_complete: bool = False
    created_at: datetime
    last_login_at: Optional[datetime] = None


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    """Legacy: Emergent-managed Google OAuth (kept for backwards compat, unused in V1.1)."""

    session_id: str


class GoogleCodeRequest(BaseModel):
    """Standard Google OAuth 2.0 authorization-code exchange request."""

    code: str = Field(min_length=1)
    redirect_uri: str = Field(min_length=1)
    state: Optional[str] = None


class OnboardingRequest(BaseModel):
    preferred_platform: Optional[str] = None
    preferred_style: Optional[str] = None
    language_preference: Optional[str] = None
    timezone: Optional[str] = None


class SettingsUpdateRequest(BaseModel):
    name: Optional[str] = None
    preferred_platform: Optional[str] = None
    preferred_style: Optional[str] = None
    language_preference: Optional[str] = None
    timezone: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PublicUser


# -------- Generations ---------------------------------------------------------
class Generation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=_uuid)
    user_id: str
    created_at: datetime = Field(default_factory=_now)
    input_type: Literal["screenshot", "text", "both"]
    platform: str
    vibe: str
    extracted_context: Optional[str] = None  # not used yet (kept for future)
    user_note: Optional[str] = None
    manual_text: Optional[str] = None
    memory_card_id: Optional[str] = None
    generated_replies: List[str]
    tone_notes: Optional[str] = None
    copied_reply_index: Optional[int] = None
    feedback: Optional[str] = None
    # PR4 (additive, nullable): set only for /api/feature generations.
    feature_id: Optional[str] = None
    result: Optional[dict] = None  # {verdict, points[], actions[], replies[]}


class FeedbackRequest(BaseModel):
    generation_id: str
    feedback: Optional[str] = None
    copied_reply_index: Optional[int] = None


# -------- Memory cards --------------------------------------------------------
class TimelineEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str
    date_label: Optional[str] = None
    detail: Optional[str] = None
    upcoming: bool = False


class FactEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str
    kind: Literal["like", "avoid", "date"] = "like"


class MemoryCard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=_uuid)
    user_id: str
    nickname: str
    relationship_stage: Optional[str] = None
    where_met: Optional[str] = None
    notes: Optional[str] = None
    likes: Optional[str] = None
    dislikes: Optional[str] = None
    communication_style: Optional[str] = None
    boundaries: Optional[str] = None
    important_dates: Optional[str] = None
    inside_jokes: Optional[str] = None
    # New V1.1 fields
    goal: Optional[str] = None  # friendship | talking | dating | serious | impress first
    current_situation: Optional[str] = None  # not connected yet | texting | talking | dating | complicated
    best_approach: Optional[str] = None  # free text guidance
    ai_summary: Optional[str] = None  # filled by future AI feature
    # PR-V2-6 additive fields (all optional — old cards unaffected)
    stage: Optional[str] = None            # e.g. "Talking"
    stage_duration: Optional[str] = None   # e.g. "3 weeks"
    platform: Optional[str] = None         # e.g. "Hinge"
    city: Optional[str] = None             # e.g. "Mumbai"
    timeline: Optional[List[TimelineEntry]] = None
    facts: Optional[List[FactEntry]] = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class MemoryCardCreate(BaseModel):
    nickname: str = Field(min_length=1, max_length=80)
    relationship_stage: Optional[str] = None
    where_met: Optional[str] = None
    notes: Optional[str] = None
    likes: Optional[str] = None
    dislikes: Optional[str] = None
    communication_style: Optional[str] = None
    boundaries: Optional[str] = None
    important_dates: Optional[str] = None
    inside_jokes: Optional[str] = None
    goal: Optional[str] = None
    current_situation: Optional[str] = None
    best_approach: Optional[str] = None
    stage: Optional[str] = None
    stage_duration: Optional[str] = None
    platform: Optional[str] = None
    city: Optional[str] = None
    timeline: Optional[List[TimelineEntry]] = None
    facts: Optional[List[FactEntry]] = None


class MemoryCardUpdate(BaseModel):
    nickname: Optional[str] = None
    relationship_stage: Optional[str] = None
    where_met: Optional[str] = None
    notes: Optional[str] = None
    likes: Optional[str] = None
    dislikes: Optional[str] = None
    communication_style: Optional[str] = None
    boundaries: Optional[str] = None
    important_dates: Optional[str] = None
    inside_jokes: Optional[str] = None
    goal: Optional[str] = None
    current_situation: Optional[str] = None
    best_approach: Optional[str] = None
    stage: Optional[str] = None
    stage_duration: Optional[str] = None
    platform: Optional[str] = None
    city: Optional[str] = None
    timeline: Optional[List[TimelineEntry]] = None
    facts: Optional[List[FactEntry]] = None


# -------- Waitlist ------------------------------------------------------------
class WaitlistEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=_uuid)
    email: EmailStr
    type: Literal["pro", "memory", "general"]
    payload: dict = Field(default_factory=dict)
    source: Optional[str] = None
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


class WaitlistRequest(BaseModel):
    email: EmailStr
    type: Literal["pro", "memory", "general"]
    payload: Optional[dict] = None
    source: Optional[str] = None


# -------- Generate replies ----------------------------------------------------

class ReplyRead(BaseModel):
    """Rich-mode (PR-INT) situation read. Only the model — no client computation."""
    situation: str
    temperature: Literal["interested", "neutral", "cold"]
    signals: List[str]
    outcome: List[str]


class GenerateRepliesResponse(BaseModel):
    generation_id: str
    replies: List[str]
    tone_notes: str
    daily_generation_count: int
    daily_limit: int
    plan: Literal["free", "pro"]
    # PR-INT additive fields. Both are None when rich=false (default) so the
    # legacy response shape is byte-identical (None is omitted from JSON by
    # FastAPI's response model when response_model_exclude_none isn't set —
    # we keep them explicit here; clients ignore unknown keys).
    reply_labels: Optional[List[str]] = None
    read: Optional[ReplyRead] = None


class UsageResponse(BaseModel):
    plan: Literal["free", "pro"]
    daily_generation_count: int
    daily_limit: int
    last_generation_reset_date: Optional[str]
    timezone: str


# ---- Ask Lovli (PR-V2-4) ----------------------------------------------------
class AskLovliTurn(BaseModel):
    role: Literal["user", "lovli"]
    text: str


class AskLovliRequest(BaseModel):
    message: str
    history: List[AskLovliTurn] = []
    person_id: Optional[str] = None


class AskLovliResponse(BaseModel):
    reply: str


# ---- Decode (PR-V2-5) --------------------------------------------------------
class DecodeNextMove(BaseModel):
    wingman: str
    likely_outcome: str


class DecodeResponse(BaseModel):
    vibe_label: Literal["Not into it", "Mixed signals", "Leaning interested"]
    vibe_headline: str
    positive_signs: List[str]
    watch_outs: List[str]
    whats_really_going_on: str
    next_move: DecodeNextMove


# ---- Feature engine (PR4) ----------------------------------------------------
class FeaturePoint(BaseModel):
    text: str
    tone: Literal["positive", "warning", "neutral"] = "neutral"


class FeatureResponse(BaseModel):
    generation_id: str
    feature_id: str
    verdict: str
    points: List[FeaturePoint]
    actions: List[str]
    replies: List[str] = []
