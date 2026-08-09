"""One-off backfill: derive thin conversation_events from historical generations.

Run manually (PR-M7) AFTER the engine is deployed:

    cd backend && python -m scripts.backfill_events [--dry-run]

For every generation row it writes:
- one reply_requested + one reply_generated (metadata only, source="backfill")
- one reply_copied when copied_reply_index is set (with the copied text)

Idempotent: events carry a deterministic id derived from the generation id, so
re-running upserts instead of duplicating. Derived memory is rebuilt per user at
the end (respecting the same reducers as live traffic).
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from engine.memory import rebuild_user_memory  # noqa: E402
from engine.text_features import extract_text_features  # noqa: E402

_BACKFILL_NS = uuid.UUID("2f0b7a94-1d0c-4bb6-9e21-c6a5f7d3e802")


def _eid(generation_id: str, suffix: str) -> str:
    return str(uuid.uuid5(_BACKFILL_NS, f"{generation_id}:{suffix}"))


async def main(dry_run: bool) -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "lovli_db")]

    written = 0
    users: set[str] = set()
    cursor = db.generations.find({}, {"_id": 0})
    async for g in cursor:
        user_id = g.get("user_id")
        gen_id = g.get("id")
        if not user_id or not gen_id:
            continue
        users.add(user_id)
        created = g.get("created_at") or ""
        surface = "reply"
        if g.get("feature_id") == "decode":
            surface = "decode"
        elif g.get("feature_id"):
            surface = f"feature:{g['feature_id']}"
        base = {
            "user_id": user_id,
            "conversation_id": g.get("memory_card_id"),
            "source": "backfill",
            "metadata": {},
            "ts": created,
            "created_at": created,
        }
        replies = g.get("generated_replies") or []
        events = [
            {
                **base,
                "id": _eid(gen_id, "requested"),
                "type": "reply_requested",
                "payload": {
                    "surface": surface,
                    "platform": g.get("platform"),
                    "vibe": g.get("vibe"),
                    "stage": g.get("stage"),
                    "has_image": g.get("input_type") in ("screenshot", "both"),
                    "text_chars": len(g.get("manual_text") or ""),
                },
            },
            {
                **base,
                "id": _eid(gen_id, "generated"),
                "type": "reply_generated",
                "payload": {
                    "surface": surface,
                    "generation_id": gen_id,
                    "vibe": g.get("vibe"),
                    "stage": g.get("stage"),
                    "labels": [],
                    "variant_features": [
                        {
                            "chars": extract_text_features(t).char_len,
                            "emoji_count": extract_text_features(t).emoji_count,
                        }
                        for t in replies
                    ],
                    "personalized": False,
                },
            },
        ]
        idx = g.get("copied_reply_index")
        if isinstance(idx, int) and 0 <= idx < len(replies):
            events.append(
                {
                    **base,
                    "id": _eid(gen_id, "copied"),
                    "type": "reply_copied",
                    "payload": {
                        "generation_id": gen_id,
                        "index": idx,
                        "text": replies[idx],
                        "stage": g.get("stage"),
                    },
                }
            )
        if dry_run:
            written += len(events)
            continue
        for ev in events:
            await db.conversation_events.replace_one({"id": ev["id"]}, ev, upsert=True)
            written += 1

    print(f"{'would write' if dry_run else 'wrote'} {written} events for {len(users)} users")
    if not dry_run:
        for uid in sorted(users):
            res = await rebuild_user_memory(db, uid)
            print(f"rebuilt {uid}: {res['events_replayed']} events")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
