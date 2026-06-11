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
