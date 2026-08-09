# API Contract

All routes are prefixed `/api`. JWT auth via `Authorization: Bearer <token>` header (issued by signup/login or Google exchange). Health routes (`/`, `/health`, `/healthz`) are public, outside the `/api` prefix, and used for K8s probes.

## Auth

| Method | Path | Body | Response | Auth | Notes |
|---|---|---|---|---|---|
| POST | `/api/auth/signup` | `{name, email, password}` | `{token, user}` | none | 422 on validation error returns array `detail`. |
| POST | `/api/auth/login` | `{email, password}` | `{token, user}` | none | |
| GET | `/api/auth/google/config` | — | `{enabled, client_id, scope}` | none | Public OAuth config. |
| POST | `/api/auth/google/code` | `{code, redirect_uri, state}` | `{token, user}` | none | Exchanges Google auth code. |
| GET | `/api/auth/me` | — | user object | required | |
| PATCH | `/api/auth/onboarding` | partial preferences | user | required | |

## Generation

| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/generate-replies` | `multipart/form-data` with `platform`, `vibe`, `language`, `client_local_date`, `timezone`, optional `manual_text`, `user_note`, `memory_card_id`, `image` | `{generation_id, replies[], tone_notes, daily_generation_count, daily_limit, plan}` | required |
| POST | `/api/feedback` | `{generation_id, copied_reply_index?, feedback?}` | `{ok: true}` | required |
| GET | `/api/usage?client_local_date=YYYY-MM-DD` | — | `{daily_generation_count, daily_limit, plan}` | required |

## Memory

| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| GET | `/api/memory-cards` | — | `MemoryCard[]` | required |
| POST | `/api/memory-cards` | full memory object | `MemoryCard` | required |
| PATCH | `/api/memory-cards/{id}` | partial | `MemoryCard` | required |
| DELETE | `/api/memory-cards/{id}` | — | `{ok: true}` | required |

MemoryCard fields (all optional except `nickname`): `id, user_id, nickname, goal, current_situation, relationship_stage, where_met, likes, dislikes, communication_style, inside_jokes, important_dates, best_approach, notes, boundaries, created_at, updated_at`.

## Pro / Waitlist

| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/waitlist` | `{email, type: 'pro' \| 'memory' \| 'general', source, payload?}` | `{ok: true}` | optional |

## Settings

| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| PATCH | `/api/settings` | `{name?, preferred_platform?, language_preference?, timezone?}` | user | required |

## Admin

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/admin/stats` | `X-Admin-Key` header | counts |
| GET | `/api/admin/users` | `X-Admin-Key` header | list |

## Mobile usage notes (for Claude Fable)

- Store JWT in `expo-secure-store`. Attach as `Authorization: Bearer <token>` on every authed request.
- Use multipart for image upload. Image field name: `image`. Accept JPG/PNG/WEBP, max 6MB.
- Daily-limit math is server-side; UI reads `daily_generation_count` + `daily_limit` from `/api/usage` or each generation response.
- Always pass user's local date (`YYYY-MM-DD`) and timezone (IANA) so daily reset works correctly across timezones.
- Errors: on 422, server returns `detail` as an ARRAY of `{type, loc, msg}` objects. Handle both string and array shapes. Web has `extractErrorMessage(err, fallback)` in `frontend/src/lib/api.js` — port that helper.

## POST /api/ask-lovli  (PR-V2-4)

Auth: Bearer JWT required.

One Ask Lovli coach-chat turn. Each message counts against the same daily usage
plumbing as generations (free plan shares `daily_limit`; over limit → `429`
`{"detail": "Daily generation limit reached."}` — same shape clients already handle).

Request (JSON):
```json
{
  "message": "string (required, non-empty)",
  "history": [{ "role": "user" | "lovli", "text": "string" }],
  "person_id": "string | null"
}
```
- `history` is capped server-side at the last ~20 turns.
- `person_id` (optional) pulls that memory card into the coach's context.

Response `200`:
```json
{ "reply": "string" }
```

Errors: `400` empty message · `401` bad/missing token · `429` daily limit ·
`503` LLM unavailable.

Persona: warm first-person wingman, Hinglish-aware, short conversational answers,
one good follow-up when useful. HONESTY RULE enforced in the system prompt:
qualitative only — no percentages, no scores, no invented facts.

## POST /api/decode  (PR-V2-5)

Auth: Bearer JWT required. Multipart form (same input contract as /generate-replies).

Fields: `manual_text` (string, optional) · `image` (file, optional — JPG/PNG/WEBP ≤6MB) ·
`feeling` (string, optional) · `memory_card_id` (string, optional) ·
`language` (string, default "Hinglish") · `client_local_date` (optional).
At least one of `manual_text` / `image` is required.

Counts against the same daily usage limit as generations (429 same shape).

Response `200`:
```json
{
  "vibe_label": "Not into it" | "Mixed signals" | "Leaning interested",
  "vibe_headline": "string",
  "positive_signs": ["string"],
  "watch_outs": ["string"],
  "whats_really_going_on": "string",
  "next_move": { "wingman": "string", "likely_outcome": "string" }
}
```
The 3 `vibe_label` values are the ONLY scale values — clamped server-side.
Qualitative only: no numbers, no percentages, no scores.

Errors: `400` no input / bad image · `401` · `413` image too large · `429` daily limit · `503` LLM unavailable.

## MemoryCard additive fields + PATCH  (PR-V2-6)

`MemoryCard` gains OPTIONAL fields (old cards unaffected; absent unless set):
- `stage` (string, e.g. "Talking"), `stage_duration` (string, e.g. "3 weeks"),
  `platform` (string, e.g. "Hinge"), `city` (string, e.g. "Mumbai")
- `timeline`: `[{ "title": str, "date_label": str|null, "detail": str|null, "upcoming": bool }]`
- `facts`: `[{ "text": str, "kind": "like" | "avoid" | "date" }]`

`PATCH /api/memory-cards/{id}` (already present) accepts partial updates incl. the
new fields. GET/POST shapes unchanged — new fields simply appear when set.

Context: when a card is attached (`memory_card_id` / `person_id`), stage/platform/
city/timeline/facts are serialized into the LLM context for generate-replies,
ask-lovli, and decode.

## Feature engine + Recent results  (PR4)

### POST /api/feature
See `/app/docs/FEATURE_API_AND_PROMPTS.md` for the full contract (multipart like
/decode + `feature_id`, optional `text_secondary` / `draft_text`; returns
`{generation_id, feature_id, verdict, points[{text,tone}], actions[], replies[]}`).

### GET /api/recent-results?limit=5  (PR4c)
Auth: Bearer. Last N (≤10) stored feature/decode results, newest first — feeds
the More-tab RECENT strip.
```json
[{ "generation_id": "uuid", "feature_id": "red_flag_check" | "decode" | ...,
   "verdict": "one-line verdict (vibe_headline for decode rows)",
   "created_at": "ISO timestamp" }]
```

### GET /api/generations/{generation_id}  (PR4c)
Auth: Bearer, owner-scoped (404 otherwise). Full stored generation row incl.
`result` (feature shape, or DecodeResponse shape when `feature_id == "decode"`)
and `memory_card_id`. Used for zero-cost read-only restore of a result.

### DELETE /api/generations  (PR4c)
Auth: Bearer. Deletes ALL generation rows for the user → `{"deleted": n}`.
Wired into Settings → "Delete my memories" (wipes the RECENT strip).

## Memory engine  (PR-M1..M7)

Event-sourced learning layer: append-only `conversation_events` → deterministic
reducers → derived memory (`memory_atoms`, `texting_profiles`, `tone_profiles`,
`phrase_rules`). Personalization (prompt style block + reply reranking +
`memory_used` response field) is gated by the backend env
`MEMORY_ENGINE_ENABLED=true`; event capture is always on.

### POST /api/events  (PR-M1)
Auth: Bearer. Records ONE behavioral event. `user_id` always comes from the
token — never the body.

```json
{ "type": "reply_edited", "payload": { "generation_id": "…", "generated_text": "…", "edited_text": "…" },
  "conversation_id": "<memory_card_id or null>", "client_ts": "ISO-8601 or null" }
```

Allowed client types: `reply_copied · reply_edited · reply_rejected ·
reply_rated · tone_selected · phrase_disliked · boundary_added · feedback_chip ·
onboarding_pref · preference_removed`. Server-only types
(`reply_requested/reply_generated/memory_reset`) → `400`. Payload capped at 8KB
→ `422`. Response `200`: `{"id": "evt-uuid", "status": "recorded"}` (empty `id`
when memory is paused — treat as success, never retry).

### GET /api/memory/summary  (PR-M4)
Auth: Bearer. What Lovli has learned, in human words:
```json
{ "is_cold_start": false, "event_count": 41, "paused": false,
  "texting_style": ["You prefer short replies"], "tone_preferences": ["You like safe replies"],
  "phrase_rules": ["You avoid \"hey there\""], "boundaries": [],
  "learned": [{ "id": "atom-uuid", "domain": "style", "key": "message_length.short",
                "label": "Prefers short replies", "confidence": 0.84, "support_count": 17 }] }
```

### DELETE /api/memory  (PR-M4)
Auth: Bearer. Wipes the caller's events + ALL derived memory →
`{"ok": true, "deleted": {…per-collection counts}}`. Wired into Settings →
"Delete my memories" alongside the existing wipes, and into "Your style" →
Reset.

### DELETE /api/memory/preferences/{atom_id}  (PR-M4)
Auth: Bearer, owner-scoped (404 otherwise). Removes ONE learned preference via a
`preference_removed` tombstone event (survives every rebuild) → `{"ok": true}`.

### POST /api/memory/pause  (PR-M4)
Auth: Bearer. `{"paused": true|false}` → pauses/resumes event capture.

### Generation responses (PR-M5, additive)
When `MEMORY_ENGINE_ENABLED=true` AND enough signal is learned,
`/generate-replies`, `/ask-lovli`, `/decode`, and `/feature` responses gain:
```json
"memory_used": { "is_personalized": true, "signals": ["short replies", "light emoji"] }
```
Absent otherwise (`response_model_exclude_none`) — old clients unaffected.
`/generate-replies` additionally reranks the 3 variants against the learned
style: `replies[0]` is the best fit, `reply_labels` move in lockstep, text is
never rewritten.

### Internal (X-Admin-Key)
- `POST /api/internal/memory/rebuild` — `{"user_id": "…"}` or `{"all": true}`;
  replays derived memory from the event log.
- `GET /api/internal/memory/stats` — events by type, users with events,
  personalized-generation count, copy/edit rates, reset count.

## Cloud-backed user state  (PR-DB)

Data that used to live only in device storage now lives on the account, so a
reinstall or a new phone restores the same app. See `docs/DATABASE.md`.

### GET /api/bootstrap
Auth: Bearer. Optional `?client_local_date=YYYY-MM-DD`. **One call that
rehydrates the whole app after sign-in** — replaces the fan-out of `auth/me` +
`memory-cards` + `usage` + `recent-results` + `memory/summary`.

```json
{ "user": { … PublicUser … },
  "preferences": { "user_id": "…", "goal": "Find a relationship",
                   "default_vibe": "Playful", "dating": "Women",
                   "language_preference": "Hinglish", "preferred_platform": "instagram",
                   "notif_reminders": true, "notif_checkin": false,
                   "notif_details": false, "app_lock": false },
  "usage": { "plan": "free", "daily_generation_count": 3, "daily_limit": 10, … },
  "memory_cards": [ … ≤200, newest first … ],
  "recent_results": [ … ≤5 … ],
  "ask_thread": [ { "role": "user", "text": "…" } ],
  "memory_summary": { "signal_count": 41, "style_summary": { … } },
  "server": { "schema_version": 2, "memory_engine_enabled": false } }
```
Every list is capped, so the payload stays small however long the account has
been active.

### GET / PATCH /api/preferences
Auth: Bearer. Created lazily on first read (old accounts heal automatically).
PATCH is partial — only supplied fields are written; `language_preference` and
`preferred_platform` are mirrored onto the user record so existing endpoints stay
consistent. Empty PATCH → `400`.

### GET / PUT / DELETE /api/ask-thread
Auth: Bearer. `PUT {"turns": [{role, text}]}` replaces the thread (server caps
it at 200 turns, keeping the most recent). The thread is also written
automatically on every `/api/ask-lovli` turn, so it persists without the client
doing anything.

### GET /api/internal/db/health  (X-Admin-Key)
Expected vs actual schema version, tenant-guard mode, per-collection document
counts, and the actual on-disk indexes. Run after every deploy.
