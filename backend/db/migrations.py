"""Forward-only schema migrations.

Runs on boot, after index sync. The applied version is recorded in `_meta`:

    {"_id": "schema", "version": 2, "history": [{version, name, applied_at}]}

Rules:
- Migrations are idempotent — re-running one must be harmless.
- Migrations only ADD or BACKFILL. Never drop user data here; destructive
  changes go through a reviewed one-off script.
- A fresh database is stamped at CURRENT_SCHEMA_VERSION without running the
  backfills (there is nothing to backfill).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Awaitable, Callable

from db.schema import CURRENT_SCHEMA_VERSION

logger = logging.getLogger("lovli.db")

_META_ID = "schema"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _m001_baseline(db) -> dict:
    """Baseline for databases that predate the migration runner. No-op."""
    return {"note": "baseline"}


async def _m002_seed_user_preferences(db) -> dict:
    """Give every existing account a user_preferences document.

    Before this, settings like the onboarding goal and default vibe lived only
    in device storage, so they were lost on reinstall. Seeds from whatever the
    user record already knows; the app fills in the rest on next save.
    """
    seeded = 0
    cursor = db.users.find({}, {"_id": 0, "id": 1, "language_preference": 1,
                               "preferred_style": 1, "preferred_platform": 1})
    async for user in cursor:
        user_id = user.get("id")
        if not user_id:
            continue
        existing = await db.user_preferences.find_one(
            {"user_id": user_id}, {"_id": 0, "user_id": 1}
        )
        if existing:
            continue
        await db.user_preferences.insert_one(
            {
                "user_id": user_id,
                "goal": None,
                "default_vibe": "Playful",
                "dating": None,
                "language_preference": user.get("language_preference") or "Hinglish",
                "preferred_platform": user.get("preferred_platform"),
                "notif_reminders": True,
                "notif_checkin": False,
                "notif_details": False,
                "app_lock": False,
                "schema_version": CURRENT_SCHEMA_VERSION,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
        )
        seeded += 1

    # memory_paused is read on every event write; default it explicitly so the
    # field exists rather than relying on a missing-key falsy read.
    result = await db.users.update_many(
        {"memory_paused": {"$exists": False}}, {"$set": {"memory_paused": False}}
    )
    return {"preferences_seeded": seeded, "users_defaulted": result.modified_count}


#: (version, name, fn). Order matters; never renumber a shipped migration.
MIGRATIONS: tuple[tuple[int, str, Callable[..., Awaitable[dict]]], ...] = (
    (1, "baseline", _m001_baseline),
    (2, "seed_user_preferences", _m002_seed_user_preferences),
)


async def get_schema_version(db) -> int:
    doc = await db._meta.find_one({"_id": _META_ID})
    return int((doc or {}).get("version", 0))


async def _is_fresh_database(db) -> bool:
    """No users yet → nothing to backfill, so stamp and skip."""
    return await db.users.count_documents({}) == 0


async def run_migrations(db, *, allow_stamp: bool = True) -> dict:
    """Apply every migration newer than the recorded version."""
    current = await get_schema_version(db)
    if current >= CURRENT_SCHEMA_VERSION:
        return {"from": current, "to": current, "applied": [], "status": "up-to-date"}

    if current == 0 and allow_stamp and await _is_fresh_database(db):
        await db._meta.update_one(
            {"_id": _META_ID},
            {
                "$set": {
                    "version": CURRENT_SCHEMA_VERSION,
                    "stamped_at": _now_iso(),
                    "note": "fresh database — stamped without backfill",
                }
            },
            upsert=True,
        )
        logger.info("fresh database stamped at schema v%d", CURRENT_SCHEMA_VERSION)
        return {
            "from": 0,
            "to": CURRENT_SCHEMA_VERSION,
            "applied": [],
            "status": "stamped-fresh",
        }

    applied: list[dict] = []
    for version, name, fn in MIGRATIONS:
        if version <= current:
            continue
        logger.info("applying migration v%d (%s)", version, name)
        result = await fn(db)
        entry = {
            "version": version,
            "name": name,
            "applied_at": _now_iso(),
            "result": result,
        }
        await db._meta.update_one(
            {"_id": _META_ID},
            {"$set": {"version": version, "updated_at": _now_iso()},
             "$push": {"history": entry}},
            upsert=True,
        )
        applied.append(entry)

    final = await get_schema_version(db)
    logger.info("migrations complete: v%d -> v%d (%d applied)", current, final, len(applied))
    return {"from": current, "to": final, "applied": applied, "status": "migrated"}
