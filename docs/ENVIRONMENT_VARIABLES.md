# Environment Variables — Canonical List

Real values live ONLY in Railway / Vercel / local `.env` files. The committed `.env.example` files mirror this doc.

## Backend (Railway → service → Variables tab)

Minimum required (11):

| Variable | Example | Notes |
|---|---|---|
| `MONGO_URL` | `mongodb+srv://lovli_app:PASS@cluster0.xxxxx.mongodb.net/lovli?retryWrites=true&w=majority` | Atlas connection string. `/lovli` is the db name, inserted before `?`. URL-encode special chars in password. |
| `DB_NAME` | `lovli` | |
| `JWT_SECRET` | 64-char hex | Generate: `openssl rand -hex 32`. Rotating logs everyone out. |
| `ADMIN_KEY` | 64-char hex | Generate: `openssl rand -hex 32`. Used as `X-Admin-Key` header for `/api/admin/*`. |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-xxxxx` | From https://console.anthropic.com/settings/keys |
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` | From Google Cloud Console |
| `GOOGLE_ALLOWED_REDIRECT_URIS` | `https://app.lovli.in/auth,https://lovli.in/auth` | **Frontend** URLs only. Must EXACTLY match Google Console list. |
| `CORS_ORIGINS` | `https://app.lovli.in,https://lovli.in` | Comma-separated frontend origins. |
| `ALLOW_TEST_LOGIN` | `false` | NEVER `true` in production. |
| `PYTHONUNBUFFERED` | `1` | For real-time Railway logs. |

Optional (defaults in code, set only if you need to override):

| Variable | Default behavior | Notes |
|---|---|---|
| `JWT_ALGORITHM` | `HS256` | |
| `JWT_EXPIRE_MINUTES` | `10080` (7 days) | |
| `LLM_PROVIDER` | `auto` | `auto` / `anthropic` / `emergent`. |
| `CLAUDE_MODEL` | `claude-sonnet-4-5` | Override only if A/B testing. |
| `EMERGENT_LLM_KEY` | empty | Optional Emergent fallback. Leave empty for portable Railway deploy. |
| `ENVIRONMENT` | `production` | |

## Frontend (Vercel → Project → Settings → Environment Variables)

| Variable | Example | Notes |
|---|---|---|
| `REACT_APP_BACKEND_URL` | `https://api.lovli.in` | No trailing slash. Frontend code appends `/api/...` paths. During Railway → before DNS, set to `https://lovli-backend-production-xxxx.up.railway.app`. |

## Mobile (Expo `.env`)

| Variable | Example | Notes |
|---|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | `https://api.lovli.in` | Must be prefixed `EXPO_PUBLIC_` to be reachable from JS. No trailing slash. |
| `EXPO_PUBLIC_DEBUG` | `false` | Optional, gates verbose logs. |

## Variables that must NEVER appear in frontend or mobile bundles

`MONGO_URL`, `JWT_SECRET`, `ADMIN_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_SECRET`, `EMERGENT_LLM_KEY`. Anthropic / Mongo / admin calls go through the backend.

## Rotation

If any secret leaks (chat, screenshot, logs):
1. Anthropic key → https://console.anthropic.com/settings/keys → delete + recreate.
2. Mongo password → Atlas → Database Access → edit user → autogenerate.
3. Google client secret → Google Console → Credentials → Add Secret → delete old.
4. `JWT_SECRET` / `ADMIN_KEY` → `openssl rand -hex 32` and update in Railway. Rotating JWT logs everyone out (intentional).
