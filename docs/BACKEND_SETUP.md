# Backend Setup

FastAPI + Motor (async MongoDB driver) + Anthropic SDK. Deployed on Railway.

## Entry point

`backend/server.py` exposes `app = FastAPI(...)`. All routes are mounted under the `/api` prefix via an `APIRouter` named `api`. Root-level health endpoints (`/`, `/health`, `/healthz`) sit on `app` directly for K8s probes.

## Local run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in values
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Visit `http://localhost:8001/health` → should return `{"status":"ok","service":"lovli"}`.

## Railway start command

```
uvicorn server:app --host 0.0.0.0 --port $PORT --workers 1
```

This lives in `backend/Procfile`, `backend/railway.json`, and `backend/nixpacks.toml` — Railway picks one automatically.

## Env vars

See `docs/ENVIRONMENT_VARIABLES.md` for the canonical list. `.env.example` mirrors it.

## Health

- `GET /` → `{"status":"ok","service":"lovli"}`
- `GET /health` → same
- `GET /healthz` → same
- `HEAD` variants supported.

These are dependency-free (no Mongo/Anthropic call) — a healthy pod = a live Python process with FastAPI responding. K8s liveness/readiness probes target `/health`.

## DB conventions

- All identifiers are UUID strings, not ObjectId.
- Timestamps are timezone-aware UTC via `datetime.now(timezone.utc)`.
- Collections: `users`, `generations`, `memory_cards`, `waitlist`.
- Unique index on `users.email` and `users.id` created at startup (wrapped in try/except so duplicates from older data don't crash startup).

## Adding a new endpoint

1. Define route under `api` router (so it gets `/api` prefix automatically).
2. Define request/response Pydantic models.
3. Document in `docs/API_CONTRACT.md`.
4. Add test in `docs/QA_CHECKLIST.md` smoke list.
