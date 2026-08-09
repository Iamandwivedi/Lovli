"""Lovli master database layer (MongoDB Atlas).

One place that knows the shape of every collection, how it is indexed, who owns
each document, and how the schema evolves.

Modules:
- schema.py      canonical collection registry: purpose, tenancy, indexes, retention
- indexes.py     idempotent index sync driven by the registry
- migrations.py  versioned, forward-only migration runner (_meta.schema_version)
- guards.py      tenant-isolation proxy: user-owned collections cannot be queried unscoped

Design rules (see docs/DATABASE.md):
1. Every user-owned document carries `user_id`; every query filters on it.
2. Document ids are UUID4 strings in a custom `id` field; Mongo `_id` never leaks.
3. Human-facing timestamps are ISO-8601 strings; TTL uses a separate BSON
   `expires_at` field, because Mongo TTL indexes require real dates.
4. Derived data (memory_*) is always rebuildable from source data.
"""

from db.schema import COLLECTIONS, CollectionSpec, IndexSpec, Tenancy  # noqa: F401
