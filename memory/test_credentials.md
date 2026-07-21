# Test Credentials
# Agent writes here when creating/modifying auth credentials (admin accounts, test users).
# Testing agent reads this before auth tests. Fork/continuation agents read on startup.

## Lovli — primary test user (auto-seeded at backend startup)

- **Email**: `tester@lovli.app`
- **Password**: `LovliTest@123`
- Plan: `free` (8 generations / day)
- Timezone (default): `Asia/Kolkata`

## Auth scheme

- **JWT in `Authorization: Bearer <token>`** header. NOT cookies.
- Login response (and signup response) shape:
  ```json
  { "access_token": "<jwt>", "token_type": "bearer", "user": { ... } }
  ```
- Persist `access_token` under key `lovli_access_token` (SecureStore on native, AsyncStorage/IndexedDB on web — see `src/api/client.ts`). Frontend axios interceptor attaches it automatically.

## Bypass / automation helpers

- `ALLOW_TEST_LOGIN=true` (set in `/app/backend/.env`) exposes `POST /api/auth/test-login` (no body) returning the JWT for the seeded user. **Remove before launch.**
- The seeded user is created on backend startup if `ALLOW_TEST_LOGIN=true`.

## Google OAuth test identity

- Frontend "Continue with Google" → `https://auth.emergentagent.com/?redirect=<origin>/auth`.
- Returns `#session_id=…` in URL hash.
- Backend exchanges with `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` (header `X-Session-ID`), upserts user, issues our JWT.
- No app-managed password is stored for Google users.

## Cleanup

```bash
mongosh "$MONGO_URL" --eval "
use('lovli_db');
db.users.deleteMany({email: /tester@lovli/});
db.generations.deleteMany({});
db.memory_cards.deleteMany({});
db.waitlist.deleteMany({});
"
```

## RELEASE-PREP UPDATE (June 2026)
- `POST /api/auth/test-login` has been REMOVED from the codebase entirely (route + seeding + ALLOW_TEST_LOGIN). Do not use it.
- Use regular login instead: `POST /api/auth/login` with `{"email":"tester@lovli.app","password":"LovliTest@123"}` (user exists in the LOCAL preview DB only).
- `EXPO_PUBLIC_BACKEND_URL` now points at PRODUCTION `https://api.lovli.in`. NO testing agent / QA may run against production. For any future preview testing, flip it back to the commented preview-proxy line in /app/mobile/.env first (and restore it after).
- Backend LLM: `LLM_PROVIDER=anthropic` pinned; EMERGENT_LLM_KEY removed. Local LLM calls require ANTHROPIC_API_KEY in backend/.env.

## Dev auto sign-in (June 2026)

- `POST /api/auth/test-login` (no body) returns `{access_token, user}` for `tester@lovli.app`, seeding the user if missing.
- Gated: backend needs `ALLOW_TEST_LOGIN=true` + `ENVIRONMENT != production` (both set in dev `backend/.env`). Route 404s otherwise.
- Mobile app auto signs in on launch when `__DEV__` and `EXPO_PUBLIC_DEV_AUTO_LOGIN=true` (set in dev `mobile/.env`).
