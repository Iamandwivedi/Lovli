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
- Persist `access_token` to `localStorage.lovli_jwt`. Frontend axios interceptor attaches it automatically.

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
