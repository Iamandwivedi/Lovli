# Lovli

AI dating-chat reply coach for India. Upload or paste a chat from Instagram, WhatsApp, or a dating platform → choose vibe + language → get 3 natural replies that sound like you.

Web app live at **https://app.lovli.in**, landing at **https://lovli.in**.

## Repo layout

```
lovli/
├── backend/      FastAPI + MongoDB Atlas (deployed on Railway)
├── frontend/     React (CRA + craco) web app (deployed on Vercel)
├── mobile/       Expo / React Native app (built by Claude Fable, hits same backend)
├── docs/         All product, deployment, API, design, and ops docs
├── DESIGN_HANDOFF.md  Binding UI/UX spec for any next design agent
└── .gitignore
```

## Quick links

| Topic | Doc |
|---|---|
| Project overview & flow | [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) |
| Backend setup | [`docs/BACKEND_SETUP.md`](docs/BACKEND_SETUP.md) |
| Frontend setup | [`docs/WEB_SETUP.md`](docs/WEB_SETUP.md) |
| Mobile (Claude Fable) | [`docs/MOBILE_SETUP.md`](docs/MOBILE_SETUP.md) |
| Deployment (Railway / Vercel / Atlas) | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| Env variables (canonical) | [`docs/ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md) |
| API contract | [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) |
| Design system | [`DESIGN_HANDOFF.md`](DESIGN_HANDOFF.md) |
| Security & CORS | [`docs/SECURITY_NOTES.md`](docs/SECURITY_NOTES.md) |
| QA checklist | [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) |

## Who does what

| Agent / tool | Role |
|---|---|
| **Claude Fable** | Main mobile-app builder (Expo / RN / TypeScript) + Figma design planning |
| **Emergent** | Repo prep, backend/web changes, applying approved designs, bug fixes, production support |
| **Railway** | Backend hosting (FastAPI) |
| **Vercel** | Web app + landing hosting |
| **MongoDB Atlas** | Production database |
| **Anthropic Claude** | AI generation — called **only from the backend**, never from frontend or mobile |

## Golden rules

1. Claude API key, JWT secret, admin key, Mongo URL, Google client secret → **backend only**. Never in `frontend/` or `mobile/` bundles.
2. Frontend and mobile must talk to backend through env-driven base URLs (`REACT_APP_BACKEND_URL`, `EXPO_PUBLIC_BACKEND_URL`). No hardcoded Railway URLs in components.
3. Real `.env` files are git-ignored. `.env.example` files are committed.
4. Don't break the working product flow (auth, generation, memory CRUD, Pro waitlist). See `docs/QA_CHECKLIST.md` before merging anything.
5. Visual/UI changes must follow `DESIGN_HANDOFF.md`.
