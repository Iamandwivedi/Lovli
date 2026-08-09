"""Idempotent index synchronisation driven by db/schema.py.

Replaces the ad-hoc `create_index` calls that used to live in server.on_startup.
Safe to run on every boot: Mongo treats an identical create_index as a no-op.

An index that already exists with DIFFERENT options is reported, not raised —
a boot must never fail because of index drift. Fix those by dropping the old
index during a maintenance window (see docs/DATABASE.md).
"""
from __future__ import annotations

import logging

from db.schema import COLLECTIONS

logger = logging.getLogger("lovli.db")


async def sync_indexes(db) -> dict:
    """Create every index declared in the registry.

    Returns {"created": [...], "conflicts": [...], "errors": [...]}.
    """
    created: list[str] = []
    conflicts: list[str] = []
    errors: list[str] = []

    for spec in COLLECTIONS:
        collection = db[spec.name]
        for index in spec.indexes:
            label = f"{spec.name}.{index.name}"
            try:
                await collection.create_index(list(index.keys), **index.to_mongo())
                created.append(label)
            except Exception as e:  # pymongo.errors.OperationFailure and friends
                message = str(e)
                # 85 IndexOptionsConflict / 86 IndexKeySpecsConflict: an index
                # with these keys or this name already exists with other options.
                if "already exists" in message or "IndexOptionsConflict" in message or "85" in message[:80]:
                    conflicts.append(label)
                    logger.warning("index conflict on %s: %s", label, message[:200])
                else:
                    errors.append(label)
                    logger.warning("index creation failed for %s: %s", label, message[:200])

    logger.info(
        "index sync complete: %d ok, %d conflicts, %d errors",
        len(created),
        len(conflicts),
        len(errors),
    )
    return {"created": created, "conflicts": conflicts, "errors": errors}


async def describe_indexes(db) -> dict:
    """Actual on-disk indexes per collection — for the admin health endpoint."""
    out: dict[str, list[str]] = {}
    for spec in COLLECTIONS:
        try:
            cursor = db[spec.name].list_indexes()
            out[spec.name] = [idx["name"] async for idx in cursor]
        except Exception:
            out[spec.name] = []
    return out
