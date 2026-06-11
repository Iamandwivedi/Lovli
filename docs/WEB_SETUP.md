# Web (frontend) Setup

React + CRA + craco + Tailwind + Shadcn UI. Deployed on Vercel.

## Local run

```bash
cd frontend
cp .env.example .env  # set REACT_APP_BACKEND_URL
yarn install
yarn start
```

Visit `http://localhost:3000`.

## Build

```bash
yarn build      # output → frontend/build/
```

## Vercel settings

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Create React App |
| Build Command | `yarn build` |
| Output Directory | `build` |
| Install Command | `yarn install --frozen-lockfile` |

`frontend/vercel.json` handles SPA fallback so React Router routes (`/login`, `/app`, `/memory`, etc.) load correctly on direct URL access.

## Env vars

Only `REACT_APP_BACKEND_URL`. CRA exposes any variable prefixed `REACT_APP_` at build time.

Never put `ANTHROPIC_API_KEY`, `MONGO_URL`, `JWT_SECRET`, or `GOOGLE_CLIENT_SECRET` in frontend env vars — they would be baked into the public JS bundle.

## Design system

Fully spec'd in `/DESIGN_HANDOFF.md`. Read that before any UI change.

## Tests

- `yarn lint` (ESLint).
- `mcp_lint_javascript` from Emergent tooling.
- Visual: `mcp_screenshot_tool` at viewport `390×844`.
