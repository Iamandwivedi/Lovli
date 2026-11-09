# Lovli: forgot password + Google sign in config check

Do the tasks in order A, B, C. Commit after each task with a clear message and STOP after each task to report what changed and what you could not verify. Do not refactor anything that is not part of the task. Do not touch /frontend (the web app is retired). Read CLAUDE.md first and keep every rule in it.

Constraints that still apply: JWT lives in expo-secure-store only, never AsyncStorage. Backend URL comes only from EXPO_PUBLIC_BACKEND_URL. No secrets in the mobile bundle. User facing copy never uses em dashes, en dashes, or spaced hyphens (run `yarn lint:copy` in /mobile before every commit). Fonts come from theme tokens only. First person Lovli voice in all copy.

Decisions already made (do not re-open them):
- Reset flow is a 6 digit code typed into the app, NOT a magic link. The app is not published and has no universal links, so a link flow would mean deep link setup for a feature that should be boring. Code flow works on every dev build today.
- Email provider is Resend, called over plain HTTPS with the `httpx` client already in requirements. No new SDK.
- After a successful reset the user is signed in immediately (the endpoint returns the normal AuthResponse). Nobody should have to type the password they just set.
- Accounts created with Google have no password. They must never be able to set one through this flow.

## Task A: backend, password reset endpoints

Files: backend/server.py, backend/models.py, backend/.env.example, backend/db/indexes.py (if TTL indexes are declared there, check first), docs/API_CONTRACT.md, docs/ENVIRONMENT_VARIABLES.md, backend/tests/test_password_reset.py (new).

### A1. Models (backend/models.py)
Add next to LoginRequest:
- `ForgotPasswordRequest { email: EmailStr }`
- `ResetPasswordRequest { email: EmailStr, code: str (exactly 6 chars, digits only, validate), new_password: str }` with the SAME length rule as SignupRequest.password (min 6, max 128). Reuse the Field, do not invent a different rule.

### A2. Storage
New collection `password_resets`. One document per issued code:
`{ id, user_id, email, code_hash, expires_at (ISO), attempts (int), used (bool), created_at (ISO) }`.
- `code_hash` = sha256 of (code + JWT_SECRET) as hex. Never store the raw code. Never log the raw code in production.
- Codes expire 15 minutes after creation.
- Add an index on `{email, created_at}` in the same place the other collections declare indexes (backend/db/indexes.py or wherever `db.users` indexes live). Follow the existing pattern exactly. If the project has a TTL index pattern, add a TTL on `expires_at`; if not, do not introduce one, a nightly cleanup is not needed at this scale.

### A3. Email sending
Add a small `backend/email_service.py` with one function:
`async def send_password_reset_email(to_email: str, name: str, code: str) -> None`
- POST https://api.resend.com/emails with header `Authorization: Bearer {RESEND_API_KEY}` and body `{from: EMAIL_FROM, to: [to_email], subject, text, html}` using httpx with a 10 second timeout.
- `EMAIL_FROM` from env, default `Lovli <hello@lovli.in>`.
- Subject: `Your Lovli reset code`.
- Body (text and a minimal HTML version, same words): first person Lovli voice, no dashes, no marketing. Something like:
  "Hi {name}, here is your code to reset your Lovli password: {code}. It works for 15 minutes. If you did not ask for this, ignore this email and your password stays the same."
- Also add `async def send_google_account_notice(to_email: str, name: str)` for the case below, subject `About your Lovli sign in`, body telling them this email signs in with Google and there is no password to reset, so they should tap Continue with Google.
- If `RESEND_API_KEY` is empty AND `ENVIRONMENT != production`: do not call Resend, log the code at INFO level with a `[DEV ONLY]` prefix so local testing works, and return. This mirrors how the test login is gated.
- Guardrail, same style as the existing ALLOW_TEST_LOGIN boot check in server.py: if `ENVIRONMENT=production` and `RESEND_API_KEY` is empty, raise RuntimeError at boot. A silent reset flow in production is worse than a failed deploy.
- Any Resend failure is logged with `logger.exception` and swallowed by the caller (see A4), it must never surface to the client.

### A4. Routes (backend/server.py, next to /auth/login)

`POST /auth/forgot-password` → always returns `200 {"ok": true}`, whatever happened. Account existence must not leak through status code, body, or timing that is obviously different (do the DB lookup in all cases).
Inside:
1. Lower case the email. Look up the user.
2. Rate limit per email: if 3 or more `password_resets` documents exist for this email created in the last 60 minutes, do nothing and return ok. If the latest one was created less than 60 seconds ago, do nothing and return ok.
3. No user → return ok.
4. User exists but has no `hashed_password` (Google account) → send the Google notice email, return ok. Do NOT create a reset document.
5. User exists with a password → generate a 6 digit code with `secrets.randbelow(1_000_000)` zero padded, mark every earlier unused reset for this email as `used: true`, insert the new document, send the email, return ok.

`POST /auth/reset-password` → returns `AuthResponse` on success (same shape as /auth/login, sign them in).
Inside:
1. Lower case email. Find the most recent `password_resets` document for this email with `used == false`. If none → 400.
2. If `expires_at` is past → mark used, 400.
3. If `attempts >= 5` → mark used, 400.
4. Increment `attempts`. Compare hash. Wrong → 400.
5. Right → load the user. If the user has no `hashed_password` → 400 (defence in depth, should be unreachable). Set `hashed_password = hash_password(new_password)`, set `updated_at`, mark the reset document used, call `_touch_last_login`, return `AuthResponse(access_token=create_jwt(...), user=_public_user(user))`.
Every 400 uses the same detail string: `"That code is not right or has expired. Request a new one."` Do not differentiate the reasons to the client.

Do not add anything to /auth/test-login and do not change /auth/login or /auth/signup.

### A5. Env + docs
- backend/.env.example: add a block
  ```
  # ---- Transactional email (password reset) ---------------------------------
  # Required in production (the server refuses to boot without it there).
  # Leave empty locally and reset codes are printed to the server log instead.
  RESEND_API_KEY=
  EMAIL_FROM=Lovli <hello@lovli.in>
  ```
- docs/ENVIRONMENT_VARIABLES.md: document both variables with the same words.
- docs/API_CONTRACT.md: document both endpoints, their request bodies, the always-200 behaviour of forgot-password, and the single 400 message of reset-password.

### A6. Tests (backend/tests/test_password_reset.py)
Use the existing `_memstub.py` pattern and whatever fixture the other auth tests use. Cover:
- forgot-password for an unknown email returns 200 ok and inserts nothing.
- forgot-password for a password user inserts one document with a sha256 hash (not the raw code) and calls the email sender (monkeypatch it, assert it was called with a 6 digit string).
- forgot-password for a Google only user calls the Google notice sender and inserts nothing.
- a second forgot-password within 60 seconds inserts nothing.
- a fourth forgot-password within an hour inserts nothing.
- reset-password with the right code returns an access_token and the new password verifies with `verify_password`; the document is marked used.
- reset-password with a wrong code 5 times burns the code (6th attempt with the RIGHT code still fails).
- reset-password after expiry fails.
- reset-password with a 5 character code or letters is rejected by validation (422).
Run the whole backend test suite, not just the new file.

Report: endpoint list, the exact email copy you wrote (I want to read it), test output, and confirm the raw code is never logged outside the DEV ONLY branch.

## Task B: mobile, Forgot password link and screen

Files: mobile/app/login.tsx, mobile/app/forgot-password.tsx (new), mobile/src/api/endpoints.ts, mobile/src/context/AuthContext.tsx (only if B3 needs it).

### B1. endpoints.ts
Add next to the login/signup functions:
- `requestPasswordReset(email: string): Promise<void>` → POST /auth/forgot-password
- `resetPassword(email: string, code: string, new_password: string): Promise<AuthResponse>` → POST /auth/reset-password
Keep the same style and error handling as the neighbours.

### B2. login.tsx
Under the Password input, add a right aligned Pressable with the text `Forgot password?` in the existing `link` style but using `colors.textMuted`, testID `login-forgot-link`, that does `router.push("/forgot-password")`. It sits between the Password input and the Sign in button with `space.xs` above it. Do not move anything else on the screen.

### B3. AuthContext
There is an `establishSession(AuthResponse)` helper used by `loginWithGoogle`. Expose a `completePasswordReset(email, code, newPassword)` method on the context that calls `resetPassword` and passes the result through `establishSession`, so the token lands in SecureStore the same way every other sign in does. Do not store the token anywhere else.

### B4. forgot-password.tsx (new route, same Screen + GlassCard + LovliLogo framing as login.tsx)
One screen, two steps, state driven. Back arrow top left returns to login.

Step 1 "Reset your password":
- Sub copy: `Tell me the email you signed up with and I will send you a 6 digit code.`
- Email Input (autoComplete email, keyboardType email-address), prefilled if the login screen passed one (pass `email` as a route param from the login link when the field is not empty).
- PrimaryButton `Send code`. On press: validate non empty, call requestPasswordReset, move to step 2 regardless of outcome (the endpoint is always 200), toast `If that email has a Lovli account, the code is on its way.`
- Below the button, muted line: `Signed up with Google? There is no password to reset. Go back and tap Continue with Google.`

Step 2 "Check your email":
- Sub copy: `I sent a code to {email}. It works for 15 minutes.`
- Code Input: 6 digits, `keyboardType number-pad`, `textContentType oneTimeCode`, `autoComplete sms-otp` on Android / `one-time-code` on iOS, maxLength 6, letterSpacing wide so it reads like a code.
- New password Input (secureTextEntry, autoComplete new-password, min 6 chars, show the rule as helper text: `At least 6 characters.`).
- Confirm password Input (secureTextEntry). Mismatch → toast `Those passwords do not match.`
- PrimaryButton `Set new password`. On press: client validation, then `completePasswordReset`. Success → toast `Done. You are signed in.` then `routeAfterAuth(user, router)`. Failure → toast the server message via `extractErrorMessage`, leave the fields alone.
- Secondary text button `Resend code` with a 60 second countdown (`Resend code in 42s`, disabled) that calls requestPasswordReset again and restarts the timer.
- Text link `Use a different email` that returns to step 1.

All copy: first person Lovli voice, no dashes, no exclamation marks except the toast above if you want one. Use theme tokens for every colour, size and font. Add testIDs: `forgot-email-input`, `forgot-send-button`, `forgot-code-input`, `forgot-password-input`, `forgot-confirm-input`, `forgot-submit-button`, `forgot-resend-button`, `forgot-change-email-link`.

### B5. Verify
Run `yarn typecheck`, `yarn lint`, `yarn lint:copy`. Then run the app against a local backend with `RESEND_API_KEY` empty, request a code, read it from the backend log, complete the reset, and confirm you land signed in on the Reply tab. If you cannot run the simulator, say so and describe what you checked instead.

Report: screenshots of step 1 and step 2 if you can, the lint and typecheck output, and anything in the design that felt off.

## Task C: Google sign in, make the config state honest

Google sign in is implemented in code (login + signup buttons, /auth/google/token, test_google_token.py) but is hidden in every build because the config is still placeholders. Do not try to create OAuth clients, you cannot. Your job is to audit and write me the exact checklist.

### C1. Audit, report only
Check and list the current value of each of these:
- mobile/eas.json: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in every profile (they are `REPLACE_ME` today).
- mobile/app.json: the `iosUrlScheme` on the `@react-native-google-signin/google-signin` plugin (it is a TODO today).
- mobile/.env and mobile/.env.example: the two EXPO_PUBLIC_GOOGLE_* values.
- backend/.env.example: `GOOGLE_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`.
- backend /auth/google/token: confirm it accepts an id_token whose audience is EITHER the web client ID or the iOS client ID, and what it does when GOOGLE_IOS_CLIENT_ID is empty.
- mobile/src/components/GoogleSignIn.tsx: confirm the button is hidden when `isGoogleConfigured()` is false and when `GET /auth/google/config` says `enabled: false`.
- Whether Android is in scope at all right now (is there an android profile in eas.json, is there a package name in app.json). If yes, the checklist needs an Android OAuth client with the package name and SHA-1 of the EAS keystore.

### C2. Write docs/GOOGLE_SIGNIN_SETUP.md
A step by step runbook I can follow in 20 minutes:
1. Google Cloud Console: which project, OAuth consent screen (External, app name Lovli, support email, scopes openid email profile, test users while unpublished).
2. Create the Web client (used by the backend to verify id_tokens and by Android). No redirect URIs needed for the mobile path.
3. Create the iOS client with bundle id `in.lovli.app`. Note the client ID and the reversed client ID.
4. If Android is in scope: create the Android client with the package name and the SHA-1 from `eas credentials`.
5. Exactly which value goes where: eas.json (all profiles), app.json iosUrlScheme (reversed iOS client ID), Railway env GOOGLE_CLIENT_ID and GOOGLE_IOS_CLIENT_ID, mobile/.env for local dev.
6. Rebuild note: changing app.json plugin config requires a new dev build (CNG), a JS only update is not enough.
7. How to verify: GET https://api.lovli.in/api/auth/google/config returns enabled true; the button appears on login and signup; signing in creates a user with auth_provider google.
Keep it plain, numbered, no dashes in prose.

### C3. One small code change
In mobile/src/auth/google.ts, when `isGoogleConfigured()` is false and `__DEV__` is true, `console.warn` once: `Google sign in is hidden: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is empty.` Nothing else changes.

Report: the audit table from C1 and the path to the new doc. Then stop.
