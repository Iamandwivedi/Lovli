# Auth-Gated App Testing Playbook (Lovli)

## Step 1: Test Credentials available

We expose a JWT-based custom auth (email + password) and an Emergent Google OAuth flow.
For automated testing without browser OAuth, use the credentials in `/app/memory/test_credentials.md`.

## Step 2: Backend API Smoke

```bash
# 1. Sign up (or sign in) the test user
curl -X POST "$REACT_APP_BACKEND_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"name":"Lovli Tester","email":"tester@lovli.app","password":"LovliTest@123"}'

# 2. Login -> get JWT
TOKEN=$(curl -s -X POST "$REACT_APP_BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@lovli.app","password":"LovliTest@123"}' | jq -r .access_token)

# 3. Authenticated /api/auth/me
curl "$REACT_APP_BACKEND_URL/api/auth/me" -H "Authorization: Bearer $TOKEN"

# 4. Generate replies (text-only)
curl -X POST "$REACT_APP_BACKEND_URL/api/generate-replies" \
  -H "Authorization: Bearer $TOKEN" \
  -F "platform=Hinge" \
  -F "vibe=Confident" \
  -F "language=Hinglish" \
  -F "manual_text=Her: defend your samosa top 3 right now" \
  -F "client_local_date=2026-01-15" \
  -F "timezone=Asia/Kolkata"
```

## Step 3: Browser Testing

Login via the UI at `/login` with `tester@lovli.app` / `LovliTest@123`.
JWT is persisted to localStorage under key `lovli_jwt`.

## Notes

- Lovli uses BEARER JWT auth (Authorization header), not cookies.
- Google OAuth path additionally upserts the user and issues the same JWT.
- Free plan: 8 generations / day, reset on the user's local date.
- ALLOW_TEST_LOGIN=true exposes /api/auth/test-login for automation. Remove before launch.

## Cleanup test data

```bash
mongosh "$MONGO_URL" --eval "
use('lovli_db');
db.users.deleteMany({email: /tester@lovli/});
db.generations.deleteMany({});
db.memory_cards.deleteMany({});
db.waitlist.deleteMany({});
"
```
