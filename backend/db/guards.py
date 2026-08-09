"""Tenant-isolation proxy — the hard guarantee that user data never mixes.

Wraps the Motor database so that any query against a USER-owned collection must
filter on `user_id`. A missing scope is a bug, and this turns that bug into a
loud failure instead of one user quietly reading another's chats.

    db = tenant_guarded(raw_db)
    await db.memory_cards.find_one({"id": card_id})               # -> raises
    await db.memory_cards.find_one({"id": card_id, "user_id": u}) # -> ok

Legitimate cross-user work (admin listing, batch rebuilds, ops counters) must
say so explicitly:

    await db.unscoped().users.count_documents({})

Modes via env `DB_TENANT_GUARD`:
    enforce (default) — raise TenantScopeError
    warn              — log the violation, allow the query
    off               — no checking (emergency escape hatch only)
"""
from __future__ import annotations

import logging
import os
from typing import Any, Iterable

from db.schema import BY_NAME, Tenancy

logger = logging.getLogger("lovli.db")


class TenantScopeError(RuntimeError):
    """Raised when a user-owned collection is accessed without a user_id filter."""


def _mode() -> str:
    return (os.environ.get("DB_TENANT_GUARD") or "enforce").strip().lower()


# Operations whose FIRST positional argument is a query filter.
_FILTER_OPS = frozenset(
    {
        "find",
        "find_one",
        "count_documents",
        "update_one",
        "update_many",
        "delete_one",
        "delete_many",
        "replace_one",
        "find_one_and_update",
        "find_one_and_replace",
        "find_one_and_delete",
        "distinct",  # (key, filter) — handled separately
    }
)

# Operations whose first argument is a document (or list of documents).
_DOC_OPS = frozenset({"insert_one", "insert_many"})


def _filter_keys(query: Any) -> set[str]:
    """Every field name referenced anywhere in a filter, including $and/$or."""
    keys: set[str] = set()
    if not isinstance(query, dict):
        return keys
    for key, value in query.items():
        if key in ("$and", "$or", "$nor") and isinstance(value, Iterable):
            for sub in value:
                keys |= _filter_keys(sub)
        elif not key.startswith("$"):
            keys.add(key)
    return keys


def _scoped(query: Any, required: Iterable[str]) -> bool:
    keys = _filter_keys(query)
    return any(r in keys for r in required)


class _GuardedCollection:
    __slots__ = ("_collection", "_spec", "_name")

    def __init__(self, collection, spec, name: str):
        self._collection = collection
        self._spec = spec
        self._name = name

    def _violation(self, operation: str, detail: str) -> None:
        message = (
            f"unscoped {operation} on '{self._name}' ({detail}). "
            f"Add user_id to the filter, or use db.unscoped() if this is "
            f"intentional cross-user work."
        )
        mode = _mode()
        if mode == "off":
            return
        if mode == "warn":
            logger.error("TENANT GUARD (warn): %s", message)
            return
        raise TenantScopeError(message)

    def _check_filter(self, operation: str, query: Any) -> None:
        if self._spec is None or self._spec.tenancy is Tenancy.GLOBAL:
            return
        if self._spec.tenancy is Tenancy.USER:
            if not _scoped(query, ("user_id",)):
                self._violation(operation, "no user_id in filter")
            return
        # IDENTITY: must target a specific account, never "any user".
        if not _scoped(query, self._spec.identity_keys):
            self._violation(
                operation, f"no {'/'.join(self._spec.identity_keys)} in filter"
            )

    def _check_documents(self, operation: str, payload: Any) -> None:
        if self._spec is None or self._spec.tenancy is not Tenancy.USER:
            return
        documents = payload if isinstance(payload, list) else [payload]
        for document in documents:
            if isinstance(document, dict) and not document.get("user_id"):
                self._violation(operation, "document has no user_id")
                return

    def aggregate(self, pipeline, *args, **kwargs):
        if self._spec is not None and self._spec.tenancy is Tenancy.USER:
            first = pipeline[0] if pipeline else {}
            match = first.get("$match") if isinstance(first, dict) else None
            if not _scoped(match, ("user_id",)):
                self._violation("aggregate", "pipeline does not start with a user_id $match")
        return self._collection.aggregate(pipeline, *args, **kwargs)

    def distinct(self, key, filter=None, *args, **kwargs):
        self._check_filter("distinct", filter or {})
        return self._collection.distinct(key, filter, *args, **kwargs)

    def __getattr__(self, name: str):
        target = getattr(self._collection, name)
        if name not in _FILTER_OPS and name not in _DOC_OPS:
            return target

        def wrapper(*args, **kwargs):
            if args:
                if name in _DOC_OPS:
                    self._check_documents(name, args[0])
                else:
                    self._check_filter(name, args[0])
            elif name in _FILTER_OPS:
                # find() with no arguments scans the whole collection.
                self._check_filter(name, {})
            return target(*args, **kwargs)

        return wrapper


class TenantGuardedDatabase:
    """Drop-in proxy for a Motor database that enforces per-user scoping."""

    __slots__ = ("_db", "_cache")

    def __init__(self, db):
        self._db = db
        self._cache: dict[str, _GuardedCollection] = {}

    def unscoped(self):
        """The raw, unguarded database — for deliberate cross-user operations."""
        return self._db

    def _guarded(self, name: str, target):
        cached = self._cache.get(name)
        if cached is not None:
            return cached
        guarded = _GuardedCollection(target, BY_NAME.get(name), name)
        self._cache[name] = guarded
        return guarded

    def __getitem__(self, name: str):
        # Bracket access, because PyMongo refuses attribute access for names
        # starting with an underscore (e.g. the "_meta" collection).
        return self._guarded(name, self._db[name])

    def __getattr__(self, name: str):
        if name.startswith("__"):
            raise AttributeError(name)
        cached = self._cache.get(name)
        if cached is not None:
            return cached
        target = getattr(self._db, name)
        # Non-collection attributes (client, name, command, ...) pass through.
        if not hasattr(target, "find_one"):
            return target
        return self._guarded(name, target)


def tenant_guarded(db) -> TenantGuardedDatabase:
    return db if isinstance(db, TenantGuardedDatabase) else TenantGuardedDatabase(db)


def unscoped(db):
    """Return the raw database whether or not `db` is guarded (test-friendly)."""
    return db.unscoped() if isinstance(db, TenantGuardedDatabase) else db


def guard_status() -> dict:
    return {"mode": _mode(), "enforced": _mode() == "enforce"}


__all__ = [
    "TenantScopeError",
    "TenantGuardedDatabase",
    "tenant_guarded",
    "unscoped",
    "guard_status",
]
