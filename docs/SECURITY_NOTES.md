# Security Notes

## CORS

Backend reads `CORS_ORIGINS` (comma-separated). Production:

```
CORS_ORIGINS=https://app.lovli.in,https://lovli.in
```

`allow_credentials=true` is set — we use cookies/Authorization headers. **Never** set `*` as origin when credentials are enabled (browsers reject it).

For local dev / Expo tunnel, append additional origins temporarily, e.g.
```
CORS_ORIGINS=https://app.lovli.in,https://lovli.in,http://localhost:3000,http://localhost:19006
```

## Google OAuth

`GOOGLE_ALLOWED_REDIRECT_URIS` (backend) and Google Cloud Console → Credentials → Authorized redirect URIs must match exactly. Both lists must contain the **frontend** URLs (Vercel + custom domains). Never the Railway URL.

```
https://app.lovli.in/auth
https://lovli.in/auth
```

## Secrets

Never appear in the frontend bundle: `ANTHROPIC_API_KEY`, `MONGO_URL`, `JWT_SECRET`, `ADMIN_KEY`, `GOOGLE_CLIENT_SECRET`, `EMERGENT_LLM_KEY`.

If any secret leaks (chat, screenshot, repo, logs), rotate immediately (see `docs/ENVIRONMENT_VARIABLES.md` → Rotation).

## JWT

- HS256 with `JWT_SECRET`.
- Default expiry 7 days.
- Rotating `JWT_SECRET` invalidates ALL active sessions — users get re-prompted to log in.

## Admin

`/api/admin/*` endpoints require `X-Admin-Key` header matching `ADMIN_KEY`. There is no admin UI yet — use `curl` or a tool like Postman. Never share `ADMIN_KEY`.

## Test login

`ALLOW_TEST_LOGIN=false` in production. The seeded `tester@lovli.app / LovliTest@123` account exists in dev DB only.
