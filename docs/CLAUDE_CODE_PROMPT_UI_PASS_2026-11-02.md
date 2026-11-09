# Lovli mobile: UI pass (no dashes, real fonts, Google sign in)

Work only inside /mobile unless a task below explicitly names a backend file. Do the tasks in order A, B, C. Commit after each task with a clear message and STOP after each task to report what changed and what you could not verify. Do not refactor anything that is not part of the task. Do not touch /frontend.

Constraints that still apply: JWT lives in expo-secure-store only, never AsyncStorage. Backend URL comes only from EXPO_PUBLIC_BACKEND_URL. No secrets in the mobile bundle (OAuth client IDs are public identifiers and are fine, client secrets are not).

## Task A: remove dashes from all user facing copy

Rule: no em dashes (—), no en dashes (–), and no spaced hyphens used as a separator ( - ) anywhere a user can read text. Rewrite each sentence naturally using a comma, a period, a colon, or by splitting into two sentences. Do not just delete the dash and leave a run on sentence. Keep the first person Lovli voice and the meaning of every line.

Hyphens inside normal compound words are allowed (7-day, sign-in, re-send, one-time). Those are ordinary English, not what we are removing.

Scope (user facing only):
- Every JSX text node, button label, placeholder, toast message, error message, empty state, section title, and helper text in mobile/app and mobile/src.
- Copy constants and string tables anywhere in mobile/src (onboarding copy, paywall copy, feature cards on More, settings, notifications copy, Decode and Ask Lovli screens, memory screens, welcome, sample).
- Local notification titles and bodies.
- app.json strings a user sees (permission prompts like photosPermission).

Out of scope: code comments, identifiers, testIDs, kebab-case keys, CLI flags, file paths, and anything in node_modules or ios/Pods. Leave those alone.

Also add a safety net for AI generated text: create mobile/src/utils/cleanCopy.ts exporting cleanDashes(text: string): string that replaces " — " and " – " with ", " and any remaining — or – with ", " (collapse double commas or comma before a period). Apply it at the single place where generated replies, Decode output, Ask Lovli messages, and feature results (verdict, points, actions, replies) are rendered, not scattered across screens. If there is one shared Text component for AI output, apply it there.

Guardrail so this does not creep back: add mobile/scripts/check-dashes.sh that greps mobile/app and mobile/src (ts and tsx, excluding comment only lines) for — and – and exits non zero on a hit, and add it as "lint:copy" in mobile/package.json. Add one line to CLAUDE.md under mobile rules: "User facing copy never uses em dashes, en dashes, or spaced hyphens. Run yarn lint:copy before committing."

Report: a count of strings changed, and paste the 10 you found hardest to rewrite so I can review them.

## Task B: load the real fonts

Current state: mobile/src/theme/typography.ts declares Bricolage Grotesque for display and Outfit for body, but mobile/app/_layout.tsx maps those names to assets/fonts/ClashDisplay-*.ttf and to Plus Jakarta Sans from @expo-google-fonts/plus-jakarta-sans. So the app has never rendered the fonts the design tokens describe. Fix that.

Do this:
1. yarn add @expo-google-fonts/bricolage-grotesque @expo-google-fonts/outfit
2. In _layout.tsx load BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold from those packages, under their real names, and delete the alias mapping that pointed at Clash Display and Plus Jakarta Sans.
3. Keep mobile/src/theme/typography.ts as the single source of truth for family names. Nothing outside the theme should reference a fontFamily string directly. Grep for hardcoded fontFamily strings in app and src and route them through the theme tokens.
4. Remove @expo-google-fonts/fraunces and @expo-google-fonts/plus-jakarta-sans from package.json if nothing imports them after step 2, and delete assets/fonts/ClashDisplay-*.ttf if nothing references them. Keep SpaceMono only if something uses it.
5. Keep the splash screen hidden until fonts are loaded (there is already a useFonts pattern, keep it).
6. Review the display scale after the swap. Bricolage Grotesque sits a little wider than Clash Display, so check the Reply home headline, the paywall price line, and the More tab section titles for wrapping, and adjust size or letterSpacing in typography.ts only (not per screen).

Do not change colors, spacing, or layout in this task. Report with a before and after screenshot of Reply home, Welcome, and Paywall from the iOS simulator if you can run it, otherwise say so.

Alternative pairing (only if I ask for it after seeing B): Instrument Serif for display (regular and italic, used for headlines and the emotional lines in onboarding) with Manrope for body. Both are on @expo-google-fonts. The swap should be _layout.tsx plus typography.ts only, since everything goes through tokens.

## Task C: Google sign up and sign in (native)

Goal: a working "Continue with Google" on both login.tsx and signup.tsx that creates or signs in a Lovli account and lands the user exactly where email/password login lands. Right now login.tsx has a placeholder button that shows a "coming soon" toast and signup.tsx has no Google button at all.

Why the existing backend route is not enough: /auth/google/code is a web authorization code flow that needs an https redirect URI and the client secret. A native app cannot complete that cleanly. We will use the native Google Sign In SDK to get an id_token on device and verify it on the backend. This needs ONE additive backend endpoint, described below. You are allowed to edit backend/server.py, backend/models.py, backend/requirements.txt, backend/.env.example, and docs/API_CONTRACT.md for this task only. Do not modify /auth/google/code or any other existing route.

### C1. Mobile

1. yarn add @react-native-google-signin/google-signin (this is a native module, so Expo Go will not work; a dev client build is required).
2. In app.json add the config plugin:
   ["@react-native-google-signin/google-signin", { "iosUrlScheme": "<REVERSED_IOS_CLIENT_ID>" }]
   Read the value from EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME is not possible at plugin time, so put the literal reversed client ID there once I give it to you (format com.googleusercontent.apps.XXXX). Until I give it, leave a clearly marked TODO and do not invent one.
3. Because mobile/ios is committed to the repo, the plugin will not apply by itself. After adding the plugin, run npx expo prebuild --platform ios --clean so Info.plist gets the URL scheme and run pod install. Android has no committed folder so Continuous Native Generation applies there. Tell me if prebuild changes anything unexpected in ios/ beyond the URL scheme and pods.
4. Env: add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to every profile in eas.json and to mobile/.env.example with placeholder values. These are public client IDs, not secrets.
5. Create mobile/src/auth/google.ts:
   - configure once: GoogleSignin.configure({ webClientId, iosClientId, scopes: ["email", "profile"], offlineAccess: false })
   - signInWithGoogle(): await hasPlayServices on Android, await GoogleSignin.signIn(), take idToken from the result, throw a typed error if missing. Return the idToken.
   - Treat user cancellation (statusCodes.SIGN_IN_CANCELLED) as a silent no op, never a toast.
   - signOutGoogle(): wraps GoogleSignin.signOut() and never throws.
6. Add to mobile/src/api/endpoints.ts: authGoogleToken(id_token: string) that POSTs /auth/google/token and returns AuthResponse (same shape as login). Keep the existing authGoogleConfig and authGoogleCode exports untouched.
7. Wire the button: on press, get idToken, call authGoogleToken, then go through the exact same post login path the password login uses (store JWT in SecureStore, hydrate the user, route to onboarding if the account is new and has no context, otherwise to the tabs). Do not duplicate that logic, reuse the function the password form calls.
8. Show the button on both login.tsx and signup.tsx with the same component, an "or" divider between it and the email form, and a loading state while the exchange is in flight. Hide the button if GET /auth/google/config returns enabled: false (the endpoint is already wired as authGoogleConfig). Keep the existing testIDs and add signup-google-button.
9. On logout and on delete account, call signOutGoogle() so the account picker shows next time.
10. Errors: a 503 from the backend means Google sign in is not configured, show "Google sign in is not available right now." Any other failure: "Could not sign you in with Google. Try again or use your email." Never show raw error text.

### C2. Backend (additive only)

1. Add google-auth to backend/requirements.txt.
2. In backend/models.py add GoogleTokenRequest with id_token: str (min_length 1).
3. In backend/server.py add POST /auth/google/token returning AuthResponse:
   - Read GOOGLE_CLIENT_ID (existing web client ID) and optional GOOGLE_IOS_CLIENT_ID. If GOOGLE_CLIENT_ID is empty, return 503 "Google sign-in is not configured." (keep that existing wording).
   - Verify with google.oauth2.id_token.verify_oauth2_token(token, google.auth.transport.requests.Request(), audience=None), then check aud is in the set of configured client IDs, iss is accounts.google.com or https://accounts.google.com, and email_verified is true. Return 401 on any failure, with a generic detail.
   - Build the same info dict the code flow uses (id from sub, email, name, picture) and run the exact same upsert and JWT issue logic as /auth/google/code. Extract that shared part into a helper function (for example _finish_google_login(info)) and have both routes call it so the two paths cannot drift. The helper must keep the current behavior: match by google_sub first, then by email, set auth_provider to google or both, persist google_sub and google_picture.
4. Add GOOGLE_IOS_CLIENT_ID to backend/.env.example with a comment. Do not add any secret.
5. Document the new route in docs/API_CONTRACT.md next to the other auth routes, and update the route list comment at the top of server.py.
6. Do not deploy. I will set the env on Railway and deploy myself.

### C3. Verification

- Run yarn tsc and the lint scripts. Build a dev client with eas build --profile development --platform ios only if I confirm; otherwise stop after the code is in and list the exact commands I need to run, in order, including the Railway env vars.
- Tell me plainly what you could not test from the sandbox (the native Google sheet, the real token exchange).

## Optional Task D (backend, only if I say yes): dashes in AI output

In backend/llm_service.py add one line to every system prompt (replies, decode, ask lovli, feature): "Never use em dashes or en dashes in any output. Use commas, periods, or separate sentences." Then add a tiny post processing step on the text fields of each response that replaces " — " and " – " with ", " and strips any remaining em or en dash, before validate_payload. No other prompt changes.

## Before you start

Read CLAUDE.md, docs/API_CONTRACT.md, mobile/src/theme/typography.ts, mobile/app/_layout.tsx, mobile/app/login.tsx, mobile/app/signup.tsx, mobile/src/api/endpoints.ts, and the Google section of backend/server.py. Then list the files you plan to touch per task and start Task A. Do not ask me questions you can answer by reading the repo.
