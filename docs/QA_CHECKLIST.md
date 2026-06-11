# QA Checklist

Run before merging anything that touches the production flow.

## Backend smoke (curl from local)

```bash
BASE=https://YOUR-RAILWAY-URL
curl $BASE/health                                       # expect 200 {"status":"ok",...}
curl $BASE/api/                                          # expect 200 {"service":"lovli",...}
curl $BASE/api/auth/google/config                       # expect 200 with client_id
```

## Auth flow

- [ ] Email signup → 201, token returned, user object includes `id`, `email`, `auth_provider`.
- [ ] Email signup with bad email → 422 with array `detail`. Frontend renders readable toast (not React crash).
- [ ] Email login happy path → 200.
- [ ] Email login wrong password → 401.
- [ ] Google login → button enabled, OAuth round-trip lands on `/auth?code=...`, exchange succeeds.
- [ ] `GET /api/auth/me` with token → user object.
- [ ] Refresh page → still logged in (JWT in localStorage).
- [ ] Logout → redirected to `/login`, protected routes blocked.

## Generation

- [ ] Manual text only → 3 replies + tone_notes + generation_id.
- [ ] Screenshot upload (JPG/PNG/WEBP) → 3 replies returned.
- [ ] Each of English / Hinglish / Hindi+English mixed → relevant language output.
- [ ] Memory-attached generation → reply uses memory context.
- [ ] Daily-limit reached on free plan → 429, upgrade modal opens on frontend.
- [ ] Copy button → "Copied. Go send it." toast; `/api/feedback` POST recorded.

## Memory

- [ ] Add Memory modal → all fields save.
- [ ] List loads existing cards.
- [ ] Edit + Delete work.
- [ ] Empty fields hidden in card.
- [ ] Soft labels visible: Good to remember / Things to avoid / How they usually talk / Inside jokes / Important moments / What feels right / Your notes.

## Pro

- [ ] Free vs Pro card content matches `PROJECT_OVERVIEW.md` exactly.
- [ ] No "wingman", "dating expert", "Most Popular" anywhere on page.
- [ ] Get Early Access form posts to `/api/waitlist` with `type=pro`.

## Settings

- [ ] 4 sections render (Account, Preferences, Plan, Privacy).
- [ ] Save changes persists name + language + platform.
- [ ] Bottom nav has exactly 3 tabs (Reply / Pro / Memory). Settings is NOT a bottom tab.
- [ ] Delete account button disabled, says "Delete account (coming soon)".

## Mobile (no overlap)

- [ ] Viewport 390×844. No horizontal scroll.
- [ ] Bottom nav doesn't overlap Generate CTA / Save buttons / last reply card. Clearance ≥ 90px.
- [ ] Safe-area-inset respected on top and bottom.
- [ ] All chips ≥ 36px tall, all inputs ≥ 44px tall.

## Security

- [ ] No raw `MONGO_URL`/`ANTHROPIC_API_KEY`/`JWT_SECRET` in frontend bundle (`yarn build && grep -r "sk-ant" frontend/build` returns nothing).
- [ ] No real `.env` committed. Only `.env.example`.
- [ ] `CORS_ORIGINS` lists exactly the prod frontends. No wildcard.
- [ ] Google Console redirect URIs match `GOOGLE_ALLOWED_REDIRECT_URIS`.
- [ ] `ALLOW_TEST_LOGIN=false` in production.
