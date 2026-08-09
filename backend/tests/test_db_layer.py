"""Master database layer — schema registry, tenant isolation, migrations.

The isolation tests are the important ones: they prove that a query which
forgets `user_id` fails loudly instead of quietly returning another user's data.
"""
from __future__ import annotations

import asyncio

import pytest

from db import guards
from db.guards import TenantScopeError, tenant_guarded, unscoped
from db.indexes import sync_indexes
from db.migrations import CURRENT_SCHEMA_VERSION, get_schema_version, run_migrations
from db.schema import (
    BY_NAME,
    COLLECTIONS,
    DERIVED_COLLECTIONS,
    USER_OWNED_COLLECTIONS,
    Tenancy,
)
from tests._memstub import MemDb

USER_A = "user-a"
USER_B = "user-b"


def _run(coro):
    return asyncio.get_event_loop_policy().new_event_loop().run_until_complete(coro)


@pytest.fixture()
def raw():
    return MemDb()


@pytest.fixture()
def gdb(raw, monkeypatch):
    monkeypatch.setenv("DB_TENANT_GUARD", "enforce")
    return tenant_guarded(raw)


# ---- schema registry ---------------------------------------------------------

class TestSchemaRegistry:
    def test_every_collection_declares_purpose_and_tenancy(self):
        for spec in COLLECTIONS:
            assert spec.purpose.strip(), f"{spec.name} has no purpose"
            assert isinstance(spec.tenancy, Tenancy)

    def test_index_names_unique_per_collection(self):
        for spec in COLLECTIONS:
            names = [i.name for i in spec.indexes]
            assert len(names) == len(set(names)), f"duplicate index name in {spec.name}"

    def test_every_user_collection_indexes_user_id_first(self):
        """A user-scoped query must be index-covered, or it scans the collection."""
        for spec in COLLECTIONS:
            if spec.tenancy is not Tenancy.USER:
                continue
            leading = {i.keys[0][0] for i in spec.indexes}
            assert "user_id" in leading, f"{spec.name} has no index leading with user_id"

    def test_ttl_index_never_targets_an_iso_string_field(self):
        """Mongo TTL only works on BSON dates; our timestamps are ISO strings."""
        for spec in COLLECTIONS:
            for index in spec.indexes:
                if index.expire_after_seconds is None:
                    continue
                assert index.keys[0][0] == "expires_at", (
                    f"{spec.name}.{index.name} TTL must key on expires_at"
                )

    def test_user_owned_list_matches_registry(self):
        assert set(USER_OWNED_COLLECTIONS) == {
            c.name for c in COLLECTIONS if c.tenancy is Tenancy.USER
        }

    def test_derived_collections_point_at_a_real_source(self):
        for name in DERIVED_COLLECTIONS:
            source = BY_NAME[name].derived_from
            assert source in BY_NAME, f"{name} derives from unknown {source}"


# ---- tenant isolation --------------------------------------------------------

class TestTenantIsolation:
    def test_unscoped_find_one_raises(self, gdb):
        with pytest.raises(TenantScopeError):
            _run(gdb.memory_cards.find_one({"id": "card-1"}))

    def test_scoped_find_one_allowed(self, gdb, raw):
        _run(raw.memory_cards.insert_one({"id": "c1", "user_id": USER_A, "nickname": "A"}))
        doc = _run(gdb.memory_cards.find_one({"id": "c1", "user_id": USER_A}))
        assert doc["nickname"] == "A"

    def test_user_a_cannot_read_user_b(self, gdb, raw):
        _run(raw.memory_cards.insert_one({"id": "c2", "user_id": USER_B, "nickname": "B"}))
        assert _run(gdb.memory_cards.find_one({"id": "c2", "user_id": USER_A})) is None

    def test_bare_find_raises(self, gdb):
        with pytest.raises(TenantScopeError):
            gdb.generations.find()

    def test_unscoped_delete_many_raises(self, gdb):
        with pytest.raises(TenantScopeError):
            _run(gdb.conversation_events.delete_many({"type": "reply_copied"}))

    def test_unscoped_update_raises(self, gdb):
        with pytest.raises(TenantScopeError):
            _run(gdb.memory_atoms.update_one({"key": "x"}, {"$set": {"v": 1}}))

    def test_insert_without_user_id_raises(self, gdb):
        with pytest.raises(TenantScopeError):
            _run(gdb.memory_cards.insert_one({"id": "c3", "nickname": "orphan"}))

    def test_insert_many_checks_every_document(self, gdb):
        with pytest.raises(TenantScopeError):
            _run(gdb.memory_atoms.insert_many([
                {"user_id": USER_A, "key": "ok"},
                {"key": "missing-owner"},
            ]))

    def test_nested_or_filter_counts_as_scoped(self, gdb, raw):
        _run(raw.generations.insert_one({"id": "g1", "user_id": USER_A}))
        rows = _run(gdb.generations.find({"$or": [{"user_id": USER_A}]}).to_list(None))
        assert len(rows) == 1

    def test_aggregate_requires_user_match(self, gdb):
        with pytest.raises(TenantScopeError):
            gdb.conversation_events.aggregate([{"$group": {"_id": "$type"}}])

    def test_aggregate_with_user_match_allowed(self, gdb):
        gdb.conversation_events.aggregate(
            [{"$match": {"user_id": USER_A}}, {"$group": {"_id": "$type"}}]
        )

    def test_distinct_requires_scope(self, gdb):
        with pytest.raises(TenantScopeError):
            gdb.conversation_events.distinct("user_id")

    def test_global_collection_unrestricted(self, gdb):
        _run(gdb.waitlist.insert_one({"email": "x@y.z", "type": "pro"}))
        assert _run(gdb.waitlist.count_documents({})) == 1

    def test_identity_requires_a_specific_account(self, gdb):
        with pytest.raises(TenantScopeError):
            _run(gdb.users.find_one({}))

    def test_identity_lookup_by_email_allowed(self, gdb, raw):
        _run(raw.users.insert_one({"id": USER_A, "email": "a@lovli.in"}))
        assert _run(gdb.users.find_one({"email": "a@lovli.in"}))["id"] == USER_A

    def test_unscoped_escape_hatch_works(self, gdb, raw):
        _run(raw.users.insert_one({"id": USER_A, "email": "a@lovli.in"}))
        assert _run(unscoped(gdb).users.count_documents({})) == 1

    def test_warn_mode_allows_but_logs(self, raw, monkeypatch):
        monkeypatch.setenv("DB_TENANT_GUARD", "warn")
        db = tenant_guarded(raw)
        _run(raw.memory_cards.insert_one({"id": "c9", "user_id": USER_B}))
        assert _run(db.memory_cards.find_one({"id": "c9"}))["user_id"] == USER_B

    def test_off_mode_disables_checks(self, raw, monkeypatch):
        monkeypatch.setenv("DB_TENANT_GUARD", "off")
        db = tenant_guarded(raw)
        assert _run(db.memory_cards.find_one({"id": "nope"})) is None

    def test_guard_is_idempotent(self, gdb):
        assert tenant_guarded(gdb) is gdb

    def test_guard_status_reports_mode(self, monkeypatch):
        monkeypatch.setenv("DB_TENANT_GUARD", "enforce")
        assert guards.guard_status() == {"mode": "enforce", "enforced": True}


# ---- migrations --------------------------------------------------------------

class TestUnderscoreCollections:
    """PyMongo refuses attribute access for underscore-prefixed names, so the
    `_meta` collection must always be reached with db["_meta"]. Using db._meta
    worked against a permissive stub while raising AttributeError in
    production, which silently stopped migrations from running."""

    def test_attribute_access_is_refused_like_pymongo(self, raw):
        with pytest.raises(AttributeError):
            raw._meta

    def test_bracket_access_works(self, raw):
        _run(raw["_meta"].insert_one({"_id": "schema", "version": 1}))
        assert _run(raw["_meta"].find_one({"_id": "schema"}))["version"] == 1

    def test_guarded_db_supports_bracket_access(self, gdb):
        # The tenant guard must delegate through __getitem__ too, or the same
        # AttributeError resurfaces one layer up.
        assert _run(gdb["_meta"].find_one({"_id": "schema"})) is None

    def test_schema_version_read_works_end_to_end(self, raw):
        assert _run(get_schema_version(raw)) == 0


class TestMigrations:
    def test_fresh_database_is_stamped_not_backfilled(self, raw):
        result = _run(run_migrations(raw))
        assert result["status"] == "stamped-fresh"
        assert result["applied"] == []
        assert _run(get_schema_version(raw)) == CURRENT_SCHEMA_VERSION

    def test_existing_database_gets_backfilled(self, raw):
        _run(raw.users.insert_one({"id": USER_A, "email": "a@lovli.in",
                                   "language_preference": "English"}))
        result = _run(run_migrations(raw))
        assert result["status"] == "migrated"
        assert _run(get_schema_version(raw)) == CURRENT_SCHEMA_VERSION
        prefs = _run(raw.user_preferences.find_one({"user_id": USER_A}))
        assert prefs["language_preference"] == "English"
        assert prefs["default_vibe"] == "Playful"

    def test_migration_is_idempotent(self, raw):
        _run(raw.users.insert_one({"id": USER_A, "email": "a@lovli.in"}))
        _run(run_migrations(raw))
        first = _run(raw.user_preferences.count_documents({}))
        second_run = _run(run_migrations(raw))
        assert second_run["status"] == "up-to-date"
        assert _run(raw.user_preferences.count_documents({})) == first

    def test_backfill_defaults_memory_paused(self, raw):
        _run(raw.users.insert_one({"id": USER_A, "email": "a@lovli.in"}))
        _run(run_migrations(raw))
        assert _run(raw.users.find_one({"id": USER_A}))["memory_paused"] is False

    def test_migration_does_not_leak_across_users(self, raw):
        _run(raw.users.insert_one({"id": USER_A, "email": "a@lovli.in",
                                   "language_preference": "English"}))
        _run(raw.users.insert_one({"id": USER_B, "email": "b@lovli.in",
                                   "language_preference": "Hinglish"}))
        _run(run_migrations(raw))
        assert _run(raw.user_preferences.find_one({"user_id": USER_A}))["language_preference"] == "English"
        assert _run(raw.user_preferences.find_one({"user_id": USER_B}))["language_preference"] == "Hinglish"


# ---- indexes -----------------------------------------------------------------

class TestIndexSync:
    def test_sync_reports_every_declared_index(self, raw):
        expected = sum(len(spec.indexes) for spec in COLLECTIONS)

        class _IdxCol:
            async def create_index(self, keys, **opts):
                return opts.get("name")

        class _IdxDb:
            def __getitem__(self, _name):
                return _IdxCol()

        report = _run(sync_indexes(_IdxDb()))
        assert len(report["created"]) == expected
        assert report["errors"] == []

    def test_conflicts_do_not_raise(self):
        class _ConflictCol:
            async def create_index(self, keys, **opts):
                raise RuntimeError("Index already exists with a different name")

        class _ConflictDb:
            def __getitem__(self, _name):
                return _ConflictCol()

        report = _run(sync_indexes(_ConflictDb()))
        assert report["created"] == []
        assert len(report["conflicts"]) > 0
