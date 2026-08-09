# Lovli Master Database

MongoDB Atlas. One cluster, one database (`lovli`), 12 collections. Everything a
user owns is keyed to `users.id` and reachable in one `/api/bootstrap` call.

The authoritative definition is code, not this doc:
**`backend/db/schema.py`** declares every collection, its owner, its indexes and
its retention. Index creation and migrations both read that registry, so adding
a collection there is enough — the deploy converges on it automatically.

## 1. Design rules

| Rule | Why |
|---|---|
| Every user-owned document carries `user_id` | Single, uniform tenancy key |
| Every query filters on `user_id` | Enforced at runtime by `db/guards.py`, not by convention |
| Ids are UUID4 strings in a custom `id` field | Mongo `_id` never leaks to clients |
| Timestamps are ISO-8601 strings | Stable JSON across clients |
| TTL uses a separate BSON `expires_at` | Mongo TTL cannot read ISO strings |
| Derived data is rebuildable | `memory_*` can be dropped and replayed from events |
| Migrations only add or backfill | Destructive changes go through a reviewed script |

## 2. Collections

### Identity

**`users`** — the account registry everything else points at.
Indexes: `id` (unique), `email` (unique), `google_sub` (sparse), `created_at`.

### Per-user product data

| Collection | Holds | Key indexes |
|---|---|---|
| `user_preferences` | Goal, default vibe, dating preference, notification toggles, app lock | `user_id` (unique) |
| `memory_cards` | The people the user is talking to: stage, timeline, facts | `(user_id, created_at ↓)`, `(user_id, id)` |
| `generations` | Every AI result — replies, decode, feature tools | `(user_id, created_at ↓)`, `(user_id, feature_id, created_at ↓)` |
| `ask_threads` | The Ask Lovli conversation | `user_id` (unique) |

### Memory engine

| Collection | Holds | Key indexes |
|---|---|---|
| `conversation_events` | Append-only behavioural log — source of truth for learning | `(user_id, ts)`, `(user_id, type)`, TTL on `expires_at` |
| `memory_atoms` | Derived beliefs with confidence + evidence | `(user_id, domain, key)` unique, `(user_id, confidence ↓)` |
| `texting_profiles` | Derived style summary | `user_id` (unique) |
| `tone_profiles` | Derived tone preference per stage | `user_id` (unique) |
| `phrase_rules` | Derived blacklist + preferred wording | `user_id` (unique) |

### Global

`waitlist` (premium signups — the email may not be a user) and `_meta`
(schema version + migration history).

## 3. Tenant isolation

`backend/db/guards.py` wraps the Motor database. A query against a user-owned
collection that does not filter on `user_id` **raises** instead of returning
data:

```python
await db.memory_cards.find_one({"id": card_id})                # TenantScopeError
await db.memory_cards.find_one({"id": card_id, "user_id": uid}) # ok
```

Inserts are checked too — a document without `user_id` is rejected. `$and`/`$or`
are walked recursively, and an aggregation must start with a `$match` on
`user_id`.

Deliberate cross-user work (admin listing, batch rebuilds, ops counters) opts
out explicitly, which keeps the intent visible in review:

```python
await unscoped(db).users.count_documents({})
```

A violation in production returns a generic 500 and logs
`TENANT SCOPE VIOLATION` with the route — it never serves the result.

Mode is set by `DB_TENANT_GUARD`: `enforce` (default), `warn`, `off`.
Production must run `enforce`. `tests/test_db_layer.py` covers all of it.

## 4. Scaling to thousands of users

**Indexes.** Every user-scoped read leads with `user_id`, so query cost scales
with *one user's* data, not the collection. A test asserts this holds for every
user-owned collection, so it cannot silently regress.

**Connection pool.** `maxPoolSize=100` (`MONGO_MAX_POOL_SIZE`). Requests are
I/O-bound — waiting on Mongo and Anthropic — so the pool, not CPU, is the
concurrency limit. Atlas M10 allows 1,500 connections, leaving headroom for
several instances.

**Bounded payloads.** `/api/bootstrap` caps memory cards at 200, recent results
at 5 and the Ask thread at 60 turns. `ask_threads` is capped at 200 turns on
write. Nothing returns an unbounded list.

**Workers.** `WEB_CONCURRENCY` defaults to 1 because the memory-context cache is
in-process. Raising it makes cache invalidation best-effort, bounded by the
cache's 10-minute TTL — correct but staler. Move that cache to Mongo or Redis
before scaling out horizontally.

**Growth.** `conversation_events` is the only collection that grows without
bound. Set `EVENT_RETENTION_DAYS` to have events carry `expires_at` and age out
via TTL; derived memory survives, because atoms keep their own evidence.

**When to scale.** M0 (free) is fine for development. Move to **M10** before
real traffic: M0 has no dedicated CPU, no performance advisor, and caps
connections at 500. Watch Atlas → Metrics for connection saturation and slow
queries; the Performance Advisor will suggest indexes if a query pattern drifts.

## 5. Schema versions and migrations

`_meta` holds `{_id: "schema", version, history[]}`. On boot the API syncs
indexes, then applies any migration newer than the recorded version. Both steps
are idempotent, and a failure is logged rather than fatal so a briefly
unreachable database cannot crash-loop the healthcheck.

| Version | Migration | Effect |
|---|---|---|
| 1 | `baseline` | Marks pre-existing databases; no-op |
| 2 | `seed_user_preferences` | Creates `user_preferences` for existing accounts, defaults `users.memory_paused` |

A brand-new database is *stamped* at the current version without running
backfills — there is nothing to backfill.

Check the live state any time:

```bash
curl -H "X-Admin-Key: $ADMIN_KEY" https://api.lovli.in/api/internal/db/health
```

Returns expected vs actual schema version, guard mode, per-collection counts and
the actual on-disk indexes.

## 6. Data that follows the login

Before this layer, the onboarding goal, default vibe, dating preference,
notification toggles, app lock and the entire Ask Lovli thread lived **only in
device storage** — a reinstall or a new phone lost all of it.

They now live in `user_preferences` and `ask_threads`, keyed to the account:

1. On sign-in the app calls `GET /api/bootstrap`.
2. `hydrateFromCloud()` (`mobile/src/lib/user-prefs.ts`) replays preferences into
   local storage, so the existing fast readers (notifications, app lock, Reply
   tab) work unchanged.
3. Every settings change writes locally *and* pushes to the cloud.

Local storage is now a cache. The account is the source of truth.

## 7. Backups and recovery

Atlas M10+ includes continuous backups with point-in-time restore. Enable:

- **Backup** → turn on Cloud Backup, keep the default policy (daily snapshot,
  7-day PITR window).
- **Alerts** → connection count > 80%, replication lag, disk > 75%.

Because derived memory is rebuildable, a partial restore can be repaired with:

```bash
curl -X POST -H "X-Admin-Key: $ADMIN_KEY" \
  -H 'Content-Type: application/json' -d '{"all": true}' \
  https://api.lovli.in/api/internal/memory/rebuild
```

## 8. Privacy

The engine stores derived traits and single message variants, never whole chat
transcripts, and screenshots are never persisted. `DELETE /api/memory` erases a
user's events and derived memory; the Settings "Delete my memories" flow also
clears cards, stored results and the Ask thread. Both are user-scoped.
