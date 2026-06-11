# Deployment

## Architecture

```
┌──────────────┐  HTTPS   ┌──────────────────┐  HTTPS   ┌──────────────┐
│  lovli.in    │ ───────► │  Vercel          │ ───────► │  Railway     │
│  app.lovli.in│          │  (React build)   │   /api   │  (FastAPI)   │
└──────────────┘          └──────────────────┘          └──────┬───────┘
                                                                │
                                                          ┌─────▼──────┐
                                                          │ MongoDB    │
                                                          │ Atlas      │
                                                          └────────────┘
           Anthropic Claude  ◄──── server-side only ─────────┘
           Google OAuth      ◄──── code exchange ────────────┘
```

## 1. MongoDB Atlas

1. Create M0 free cluster (region: closest to users — Mumbai/Singapore for India).
2. **Database Access** → create user `lovli_app` → autogenerate password.
3. **Network Access** → add IP `0.0.0.0/0` with note "Allow Railway" (Railway IPs are dynamic).
4. Connect → Drivers → Python 3.12 → copy connection string.
5. Insert `/lovli` before `?` so the DB name is set:
   ```
   mongodb+srv://lovli_app:PASS@cluster0.xxxxx.mongodb.net/lovli?retryWrites=true&w=majority&appName=Cluster0
   ```

## 2. Railway (backend)

**New Project → Deploy from GitHub repo** → select `Iamandwivedi/Lovli`.

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Builder | Nixpacks (auto, via `backend/nixpacks.toml`) |
| Start Command | `uvicorn server:app --host 0.0.0.0 --port $PORT --workers 1` |
| Healthcheck Path | `/health` |
| Healthcheck Timeout | 30s |

Paste the **11 env vars** from `ENVIRONMENT_VARIABLES.md` into Variables → Raw Editor.

After green deploy → Settings → Networking → **Generate Domain** → copy URL.
Smoke test: open `https://YOUR-RAILWAY-URL/health` → must return `{"status":"ok","service":"lovli"}`.

## 3. Vercel (frontend)

**New Project → Import Git Repository** → select `Iamandwivedi/Lovli`.

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Create React App |
| Build Command | `yarn build` |
| Output Directory | `build` |
| Install Command | `yarn install --frozen-lockfile` |

Environment variable:
- `REACT_APP_BACKEND_URL` = your Railway URL (later → `https://api.lovli.in`).

`frontend/vercel.json` already handles SPA fallback rewrites for React Router.

## 4. Domains (final state)

| Domain | Points to | DNS record |
|---|---|---|
| `lovli.in` | Vercel (landing) | A `76.76.21.21` or CNAME per Vercel |
| `app.lovli.in` | Vercel (web app) | CNAME `cname.vercel-dns.com` |
| `api.lovli.in` | Railway (backend) | CNAME to Railway-provided host |

After DNS:
1. Update `REACT_APP_BACKEND_URL` in Vercel → `https://api.lovli.in` → redeploy.
2. Update `CORS_ORIGINS` + `GOOGLE_ALLOWED_REDIRECT_URIS` in Railway → swap any preview URLs for production domains.
3. Update Google Cloud Console → Credentials → Authorized redirect URIs to match.
