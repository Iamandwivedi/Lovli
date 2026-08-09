"""Canonical collection registry — the single source of truth for Lovli's data.

Adding a collection means adding it HERE. `indexes.sync_indexes()` and
`guards.TenantGuard` both read this registry, so a new collection automatically
gets its indexes created and its tenancy enforced.

Scale notes are per-collection: the index set is chosen so that every query the
API actually issues is index-covered at thousands of users, and no query does a
collection scan.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

import pymongo

# Bumped whenever a migration changes document shape. See migrations.py.
CURRENT_SCHEMA_VERSION = 2


class Tenancy(str, Enum):
    """Who owns the documents in a collection — drives isolation enforcement."""

    #: Every doc belongs to exactly one user via `user_id`. Queries MUST filter
    #: on user_id (enforced by guards.TenantGuard).
    USER = "user"
    #: The user registry itself. Keyed by `id`/`email`/`google_sub` rather than
    #: `user_id`; admin listing is explicitly allowed via `unscoped()`.
    IDENTITY = "identity"
    #: Not user-owned (ops/config/marketing).
    GLOBAL = "global"


@dataclass(frozen=True)
class IndexSpec:
    keys: tuple[tuple[str, int], ...]
    name: str
    unique: bool = False
    sparse: bool = False
    #: Seconds until documents expire. Requires the FIRST key to be a BSON date
    #: field (we use `expires_at`), never an ISO string.
    expire_after_seconds: Optional[int] = None

    def to_mongo(self) -> dict:
        opts: dict = {"name": self.name}
        if self.unique:
            opts["unique"] = True
        if self.sparse:
            opts["sparse"] = True
        if self.expire_after_seconds is not None:
            opts["expireAfterSeconds"] = self.expire_after_seconds
        return opts


@dataclass(frozen=True)
class CollectionSpec:
    name: str
    tenancy: Tenancy
    purpose: str
    indexes: tuple[IndexSpec, ...] = field(default_factory=tuple)
    #: Fields that may satisfy the isolation guard for IDENTITY collections.
    identity_keys: tuple[str, ...] = ()
    #: True when documents are 100% rebuildable from another collection.
    derived_from: Optional[str] = None


ASC = pymongo.ASCENDING
DESC = pymongo.DESCENDING


COLLECTIONS: tuple[CollectionSpec, ...] = (
    # ---- identity ----------------------------------------------------------
    CollectionSpec(
        name="users",
        tenancy=Tenancy.IDENTITY,
        purpose="Account registry. Everything else links to users.id.",
        identity_keys=("id", "email", "google_sub"),
        indexes=(
            IndexSpec((("id", ASC),), "users_id_unique", unique=True),
            IndexSpec((("email", ASC),), "users_email_unique", unique=True),
            # Sparse: password-only accounts have no google_sub.
            IndexSpec((("google_sub", ASC),), "users_google_sub", sparse=True),
            # Admin listing sorts by signup order.
            IndexSpec((("created_at", ASC),), "users_created_at"),
        ),
    ),
    # ---- per-user product data ---------------------------------------------
    CollectionSpec(
        name="user_preferences",
        tenancy=Tenancy.USER,
        purpose=(
            "Cloud home for settings that used to live only on the device "
            "(goal, default vibe, dating preference, notification toggles, "
            "app lock). Restored on any device at login."
        ),
        indexes=(
            IndexSpec((("user_id", ASC),), "user_prefs_user_unique", unique=True),
        ),
    ),
    CollectionSpec(
        name="memory_cards",
        tenancy=Tenancy.USER,
        purpose="The people a user is talking to, plus timeline and facts.",
        indexes=(
            IndexSpec((("id", ASC),), "cards_id_unique", unique=True),
            # Serves list_memory_cards: find({user_id}).sort(created_at, -1)
            IndexSpec((("user_id", ASC), ("created_at", DESC)), "cards_user_created"),
            # Serves the owner-scoped single-card lookup.
            IndexSpec((("user_id", ASC), ("id", ASC)), "cards_user_id"),
        ),
    ),
    CollectionSpec(
        name="generations",
        tenancy=Tenancy.USER,
        purpose="Every AI result (replies, decode, feature tools) = the generation log.",
        indexes=(
            IndexSpec((("id", ASC),), "gens_id_unique", unique=True),
            IndexSpec((("user_id", ASC), ("created_at", DESC)), "gens_user_created"),
            # Serves /recent-results: find({user_id, feature_id: {$ne: null}})
            #                          .sort(created_at, -1)
            IndexSpec(
                (("user_id", ASC), ("feature_id", ASC), ("created_at", DESC)),
                "gens_user_feature_created",
            ),
        ),
    ),
    CollectionSpec(
        name="ask_threads",
        tenancy=Tenancy.USER,
        purpose=(
            "Ask Lovli coach conversation. Previously AsyncStorage-only, so it "
            "vanished on reinstall; now follows the account."
        ),
        indexes=(
            IndexSpec((("user_id", ASC),), "ask_threads_user_unique", unique=True),
        ),
    ),
    # ---- memory engine ------------------------------------------------------
    CollectionSpec(
        name="conversation_events",
        tenancy=Tenancy.USER,
        purpose="Append-only behavioral event log — source of truth for learning.",
        indexes=(
            IndexSpec((("id", ASC),), "events_id_unique", unique=True),
            # Reducer replay reads the user's events in (ts, id) order.
            IndexSpec((("user_id", ASC), ("ts", ASC)), "events_user_ts"),
            IndexSpec((("user_id", ASC), ("type", ASC)), "events_user_type"),
            # Retention: expires_at is a real BSON date set only when
            # EVENT_RETENTION_DAYS is configured. Docs without it never expire.
            IndexSpec(
                (("expires_at", ASC),),
                "events_ttl",
                sparse=True,
                expire_after_seconds=0,
            ),
        ),
    ),
    CollectionSpec(
        name="memory_atoms",
        tenancy=Tenancy.USER,
        purpose="Derived atomic beliefs about how the user texts.",
        derived_from="conversation_events",
        indexes=(
            IndexSpec(
                (("user_id", ASC), ("domain", ASC), ("key", ASC)),
                "atoms_user_domain_key_unique",
                unique=True,
            ),
            # Summary screen sorts by confidence.
            IndexSpec((("user_id", ASC), ("confidence", DESC)), "atoms_user_confidence"),
            IndexSpec((("user_id", ASC), ("id", ASC)), "atoms_user_id"),
        ),
    ),
    CollectionSpec(
        name="texting_profiles",
        tenancy=Tenancy.USER,
        purpose="Derived read-optimized style summary (one per user).",
        derived_from="conversation_events",
        indexes=(IndexSpec((("user_id", ASC),), "texting_user_unique", unique=True),),
    ),
    CollectionSpec(
        name="tone_profiles",
        tenancy=Tenancy.USER,
        purpose="Derived tone preferences by conversation stage (one per user).",
        derived_from="conversation_events",
        indexes=(IndexSpec((("user_id", ASC),), "tone_user_unique", unique=True),),
    ),
    CollectionSpec(
        name="phrase_rules",
        tenancy=Tenancy.USER,
        purpose="Derived phrase blacklist and preferred replacements (one per user).",
        derived_from="conversation_events",
        indexes=(IndexSpec((("user_id", ASC),), "phrase_user_unique", unique=True),),
    ),
    # ---- global -------------------------------------------------------------
    CollectionSpec(
        name="waitlist",
        tenancy=Tenancy.GLOBAL,
        purpose="Premium / early-access signups. Not user-owned (email may be a non-user).",
        indexes=(
            IndexSpec((("email", ASC),), "waitlist_email"),
            IndexSpec((("created_at", DESC),), "waitlist_created"),
        ),
    ),
    CollectionSpec(
        name="_meta",
        tenancy=Tenancy.GLOBAL,
        purpose="Schema version and migration bookkeeping.",
    ),
)

BY_NAME: dict[str, CollectionSpec] = {c.name: c for c in COLLECTIONS}

#: Collections whose documents must be deleted when a user deletes their account.
USER_OWNED_COLLECTIONS: tuple[str, ...] = tuple(
    c.name for c in COLLECTIONS if c.tenancy is Tenancy.USER
)

#: Derived collections — safe to drop and rebuild from conversation_events.
DERIVED_COLLECTIONS: tuple[str, ...] = tuple(
    c.name for c in COLLECTIONS if c.derived_from
)


def spec_for(collection_name: str) -> Optional[CollectionSpec]:
    return BY_NAME.get(collection_name)
