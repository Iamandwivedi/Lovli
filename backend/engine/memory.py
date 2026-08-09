"""Memory engine I/O: event write path, debounced rebuild, delete, pause.

All functions take `db` (the Motor database) as their first argument — server.py
passes its module-level global, and tests pass a stub. Every query is scoped by
user_id (guide §16).

Failure policy: memory is a learning layer, never the product path. Nothing in
here may raise into a generation request — record_conversation_event catches
everything and returns None on failure.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from engine import memory_reducers

logger = logging.getLogger("lovli.memory")

MEMORY_SCHEMA_VERSION = memory_reducers.CURRENT_MEMORY_SCHEMA_VERSION

# Event types clients may write via POST /api/events. Server-only types are
# rejected there so a client can't forge reply_generated volume.
CLIENT_EVENT_TYPES = (
    "reply_copied",
    "reply_edited",
    "reply_rejected",
    "reply_rated",
    "tone_selected",
    "phrase_disliked",
    "boundary_added",
    "feedback_chip",
    "onboarding_pref",
    "preference_removed",
)
SERVER_EVENT_TYPES = ("reply_requested", "reply_generated", "memory_reset")
ALL_EVENT_TYPES = CLIENT_EVENT_TYPES + SERVER_EVENT_TYPES

DERIVED_COLLECTIONS = ("memory_atoms", "texting_profiles", "tone_profiles", "phrase_rules")

_REBUILD_DEBOUNCE_SECONDS = 2.0
# Escape hatch (plan D3): past this many events an inline replay is no longer
# "milliseconds" — leave rebuilds to the admin endpoint / a nightly job.
MAX_INLINE_REBUILD_EVENTS = 5000

# user_id -> {"dirty": bool, "task": asyncio.Task | None}. In-process is fine:
# Railway runs a single uvicorn worker (see Procfile).
_REBUILD_STATE: dict[str, dict] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def is_memory_paused(db, user_id: str) -> bool:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "memory_paused": 1})
    return bool(user and user.get("memory_paused"))


async def record_conversation_event(
    db,
    *,
    user_id: str,
    type: str,
    payload: dict,
    conversation_id: Optional[str] = None,
    source: str = "server",
    metadata: Optional[dict] = None,
    client_ts: Optional[str] = None,
) -> Optional[dict]:
    """Append one event, then schedule the debounced rebuild + cache invalidation.

    Returns the stored event, or None when the write was skipped or failed.
    Never raises — a broken memory layer must not break generation.
    """
    try:
        if type not in ALL_EVENT_TYPES:
            logger.warning("dropping unknown event type %r for user %s", type, user_id)
            return None
        if type != "memory_reset" and await is_memory_paused(db, user_id):
            return None

        now = _now_iso()
        ts = now
        if client_ts:
            try:
                datetime.fromisoformat(client_ts.replace("Z", "+00:00"))
                ts = client_ts
            except ValueError:
                pass
        event = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "conversation_id": conversation_id,
            "type": type,
            "ts": ts,
            "source": source,
            "payload": payload or {},
            "metadata": metadata or {},
            "created_at": now,
        }
        await db.conversation_events.insert_one(dict(event))

        schedule_rebuild(db, user_id)
        # Late import: memory_context imports nothing from this module, but the
        # cache lives there and this keeps startup order trivial.
        from engine.memory_context import invalidate_memory_context

        invalidate_memory_context(user_id)
        return event
    except Exception:
        logger.exception("failed to record %s event for user %s", type, user_id)
        return None


# ---- rebuild ----------------------------------------------------------------

async def rebuild_user_memory(db, user_id: str) -> dict:
    """Replay this user's full event log into fresh derived documents."""
    events = await db.conversation_events.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(length=None)

    state = memory_reducers.reduce_all(events)
    docs = memory_reducers.state_to_documents(
        state, user_id, datetime.now(timezone.utc)
    )

    await db.memory_atoms.delete_many({"user_id": user_id})
    if docs["memory_atoms"]:
        await db.memory_atoms.insert_many([dict(d) for d in docs["memory_atoms"]])
    for collection_name, doc in (
        ("texting_profiles", docs["texting_profile"]),
        ("tone_profiles", docs["tone_profile"]),
        ("phrase_rules", docs["phrase_rules"]),
    ):
        await getattr(db, collection_name).replace_one(
            {"user_id": user_id}, dict(doc), upsert=True
        )

    from engine.memory_context import invalidate_memory_context

    invalidate_memory_context(user_id)
    return {
        "user_id": user_id,
        "events_replayed": len(events),
        "memory_schema_version": MEMORY_SCHEMA_VERSION,
        "status": "rebuilt",
    }


def schedule_rebuild(db, user_id: str) -> None:
    """Debounced per-user rebuild. Multiple events inside the window collapse
    into one replay; events landing mid-replay trigger one more pass."""
    state = _REBUILD_STATE.setdefault(user_id, {"dirty": False, "task": None})
    state["dirty"] = True
    task = state.get("task")
    if task is not None and not task.done():
        return

    async def _run() -> None:
        try:
            while state["dirty"]:
                state["dirty"] = False
                await asyncio.sleep(_REBUILD_DEBOUNCE_SECONDS)
                count = await db.conversation_events.count_documents({"user_id": user_id})
                if count > MAX_INLINE_REBUILD_EVENTS:
                    logger.warning(
                        "skipping inline rebuild for user %s (%d events)", user_id, count
                    )
                    return
                await rebuild_user_memory(db, user_id)
        except Exception:
            logger.exception("background memory rebuild failed for user %s", user_id)
        finally:
            state["task"] = None

    try:
        state["task"] = asyncio.create_task(_run())
    except RuntimeError:
        # No running loop (sync test context) — the next rebuild call catches up.
        state["task"] = None


# ---- controls ---------------------------------------------------------------

async def delete_user_memory(db, user_id: str) -> dict:
    """Guide §13.4: wipe events + all derived memory for ONE user, then leave a
    fresh memory_reset marker so the deletion itself is part of the log."""
    deleted: dict[str, int] = {}
    res = await db.conversation_events.delete_many({"user_id": user_id})
    deleted["conversation_events"] = res.deleted_count
    for name in DERIVED_COLLECTIONS:
        res = await getattr(db, name).delete_many({"user_id": user_id})
        deleted[name] = res.deleted_count

    from engine.memory_context import invalidate_memory_context

    invalidate_memory_context(user_id)
    await record_conversation_event(
        db, user_id=user_id, type="memory_reset", payload={}, source="user"
    )
    return deleted


async def set_memory_paused(db, user_id: str, paused: bool) -> None:
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"memory_paused": bool(paused), "updated_at": _now_iso()}},
    )
    from engine.memory_context import invalidate_memory_context

    invalidate_memory_context(user_id)
