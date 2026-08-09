# Lovli — Local Development Setup (Codex / Claude Code handoff)

One-stop guide to run Lovli entirely on your own machine and install it on a
physical iPhone with an Apple Developer membership. Deeper references:
`docs/BACKEND_SETUP.md`, `docs/MOBILE_SETUP.md`, `docs/ENVIRONMENT_VARIABLES.md`,
`docs/RELEASE_CHECKLIST.md`.

## Repo layout

```
backend/   FastAPI + Motor (MongoDB) + Anthropic SDK — all routes under /api
mobile/    Expo SDK 54 + Expo Router + TypeScript (yarn 1.x — see packageManager)
frontend/  Legacy React web app (NOT the product — ignore for mobile work)
docs/      All project documentation
memory/    PRD + test credentials
```

## Prerequisites

- Python 3.11+, Node 20+, **yarn 1.x** (repo pins `yarn@1.22.22` — do not use npm/pnpm)
- MongoDB running locally (`brew services start mongodb-community`) or a MongoDB Atlas URI
- Xcode 15+ with Command Line Tools (for iOS device builds), CocoaPods
- An Anthropic API key (reply generation is Claude-only; without it, auth/memory
  work but every generate/decode/ask call fails)

## 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` for local dev:

- `MONGO_URL=mongodb://localhost:27017`, `DB_NAME=lovli`
- `JWT_SECRET=` any long random string (`openssl rand -base64 48`)
- `ANTHROPIC_API_KEY=sk-ant-...` (real key), `LLM_PROVIDER=anthropic`
- `ENVIRONMENT=development` and `ALLOW_TEST_LOGIN=true` → enables the dev
  auto sign-in endpoint (`POST /api/auth/test-login`, seeds `tester@lovli.app`).
  The server refuses to boot if `ENVIRONMENT=production` + `ALLOW_TEST_LOGIN=true`.
- Google OAuth vars are optional locally — email/password login works without them.

Run: `uvicorn server:app --host 0.0.0.0 --port 8001 --reload`
Check: `curl http://localhost:8001/health` → `{"status":"ok","service":"lovli"}`

## 2. Mobile app

```bash
cd mobile
yarn install
cp .env.example .env
```

Edit `mobile/.env`:

- `EXPO_PUBLIC_BACKEND_URL` — `http://localhost:8001` for simulator/web;
  **your Mac's LAN IP** (e.g. `http://192.168.1.50:8001`) for a physical iPhone,
  since the device can't reach your Mac's `localhost`. Phone and Mac must be on
  the same Wi-Fi, and uvicorn must bind `0.0.0.0` (it does above).
- `EXPO_PUBLIC_DEV_AUTO_LOGIN=true` — app signs in as `tester@lovli.app`
  automatically on launch (dev builds only; falls back to the login screen if the
  backend gate is off).

Run: `yarn start` (Metro dev server; press `i` for iOS simulator, `w` for web).

## 3. Install on a physical iPhone (Apple Developer membership)

Lovli uses native modules (`expo-secure-store`, `expo-local-authentication`,
`expo-notifications`, `expo-image-picker`) — Expo Go works for most flows, but
Face ID app lock and local notifications need a **dev build** on the device.

```bash
cd mobile
# One-time: plug in the iPhone via USB, trust the computer.
npx expo run:ios --device
```

- First run generates the native `ios/` project (prebuild) and opens signing.
  If signing fails, open `mobile/ios/Lovli.xcworkspace` in Xcode →
  Signing & Capabilities → select your Apple Developer team. Bundle id is
  `in.lovli.app` (set in `app.json`; change it if your team already uses it).
- On the phone: Settings → General → VPN & Device Management → trust your
  developer certificate the first time.
- The dev build connects to Metro (`yarn start`) over LAN; it hot-reloads like
  Expo Go but with all native modules enabled.
- `ios/` and `android/` are generated artifacts — regenerate anytime with
  `npx expo prebuild --clean` after `app.json` changes.

Device verification checklist (from `docs/RELEASE_CHECKLIST.md`): local
notification delivery (9 AM date reminders, Sun 6 PM weekly check-in, discreet
copy), Face ID cold-start gate, photo-library screenshot upload.

## 4. Before any release build

See `docs/RELEASE_CHECKLIST.md`. Non-negotiables:

1. `mobile/.env`: `EXPO_PUBLIC_BACKEND_URL=https://api.lovli.in`,
   `EXPO_PUBLIC_DEV_AUTO_LOGIN=false`
2. Railway env: `ENVIRONMENT=production`, no `ALLOW_TEST_LOGIN`/`TEST_LOGIN_*`
3. `PAYMENTS_ENABLED` stays false until IAP ships (Premium = waitlist only)
4. Honesty rule: qualitative reads only — no numeric confidence scores anywhere

## Test credentials

`tester@lovli.app` / `LovliTest@123` (auto-seeded by the dev test-login route).
More detail in `memory/test_credentials.md`.
