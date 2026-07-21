# Lovli — Release Checklist (V2 Coach)

Every box below MUST be checked before a release build is cut. Until then the
app intentionally stays wired to the Emergent preview proxy for development.

## 🔴 Release blockers — env & providers

- [ ] **Flip backend URL**: `/app/mobile/.env` is back on the preview proxy for
  dev work (dev auto sign-in pass, June 2026). Before launch set
  `EXPO_PUBLIC_BACKEND_URL=https://api.lovli.in`.
- [x] **EMERGENT_LLM_KEY must not ship**: DONE — removed from `backend/.env`;
  `LLM_PROVIDER=anthropic` pinned so the provider never auto-falls back.
  Anthropic path smoke test: **verified on Railway post-deploy** (prod key never
  enters the dev environment — see "Backend deploy to Railway" below).
- [ ] **Disable dev auto sign-in bypass**: `/auth/test-login` was restored for
  development (user request, June 2026) but is DOUBLE-GATED: it 404s unless
  `ALLOW_TEST_LOGIN=true` AND `ENVIRONMENT != production`, and the server
  REFUSES TO BOOT if both `ENVIRONMENT=production` and `ALLOW_TEST_LOGIN=true`
  are set. The mobile auto sign-in additionally requires a dev build (`__DEV__`)
  AND `EXPO_PUBLIC_DEV_AUTO_LOGIN=true`, so it cannot ship in a release build.
  Before launch: (1) Railway must set `ENVIRONMENT=production` and must NOT set
  `ALLOW_TEST_LOGIN`/`TEST_LOGIN_*`; (2) set `EXPO_PUBLIC_DEV_AUTO_LOGIN=false`
  in `/app/mobile/.env`.
- [x] **Never point test tooling at production**: no testing agent, QA script, or
  automated test may EVER run against `https://api.lovli.in` — release-prep
  verification was config inspection + one smoke call only.
- [ ] `PAYMENTS_ENABLED` stays **false** until IAP ships — Premium screen is
  waitlist-only (`POST /api/waitlist`, source `premium_v2`).

## 🔴 Backend deploy to Railway (production runs the OLD backend until this is done)

- [ ] Push the current backend to the branch Railway deploys from.
- [ ] Confirm Railway env has `ANTHROPIC_API_KEY` + `LLM_PROVIDER=anthropic` +
  `ENVIRONMENT=production`, and does **NOT** have `EMERGENT_LLM_KEY` or
  `ALLOW_TEST_LOGIN` (or any `TEST_LOGIN_*` vars).
- [ ] Post-deploy verify: `GET https://api.lovli.in/api/` returns
  `{"service":"lovli","status":"ok"}`, and ONE real `/generate-replies` call
  from the app succeeds — **that call IS the Anthropic smoke test**.
- [ ] Sanity: `POST https://api.lovli.in/api/auth/test-login` returns 404.

## 🟡 Device verification required before launch (implemented, needs real device build)

- [ ] **Local notifications** (final PR): reminder scheduling (9 AM local on the
  entry's real `date`), weekly check-in (Sun 6 PM), discreet-by-default copy +
  "Show details" toggle, permission ask/denied/blocked flows, cold-start
  rescheduling, Android channel. Pure selection logic is unit-tested
  (`mobile/scripts/test-pure-logic.js`); delivery CANNOT be verified in the web
  preview — needs Expo Go / dev build on a real device.
- [ ] **Face ID app lock** (final PR): `expo-local-authentication` gate on cold
  launch + background→active, passcode fallback, no inactive→active loop. Gate
  logic unit-tested; the biometric prompt itself needs a real device build.

## 🟡 Known gaps shipping as "coming soon" (decide before launch)

- [x] **7 placeholder tools in the More grid** (PR4): DONE — all 9 tools live
  (Decode/Read the signals → `/decode`; other 7 → `POST /api/feature` via the
  shared `/feature/[id]` screen). Zero "coming soon" placeholders remain.
- [ ] **Facts edit + per-person delete UI**: Memory facts are display-only and
  a person can only be deleted via "Delete my memories" (all) — add per-card
  delete + facts editing, or accept for v1.
- [ ] **Notification toggles are preference-only**: "Date & birthday
  reminders" and "Weekly check-in" in Settings store a local pref
  (`lovli_prefs`) and are NOT wired to any push infrastructure.
- [ ] **Face ID toggle is preference-only**: needs `expo-local-authentication`
  install + lock-screen wiring; the Settings toggle currently only stores the
  preference.

## ✅ Verified in final V2 QA (June 2026)

- [x] Honesty rule: no numeric confidence/percentages/scores in UI or any of
  the three system prompts (generate-replies, ask-lovli, decode).
- [x] Full dark theme — no light-theme remnants (white is only used for the
  intentional CTA pill / toggle knob per `DESIGN_SYSTEM_V2_DARK.md`).
- [x] TypeScript strict pass clean (`npx tsc --noEmit`).
- [x] "Delete my memories" wipes memory cards + Ask Lovli thread + pending
  Decode hand-off context; logout clears the local thread too. (PR4c: also
  wipes stored results via `DELETE /api/generations`.)

## 💡 Backlog / ideas (not blockers — FEATURE FREEZE until release)

- **"This week ✦" upcoming strip on Reply home**: with `TimelineEntry.date` now
  structured, surface entries dated within 7 days in-app — useful for users who
  decline notification permission. Post-release.
- **Structured birthday field on the person** (MemoryCard) so birthdays remind
  without needing a timeline entry. Post-release.
- **Unlimited result history as a Premium perk**: the RECENT strip caps at 5 —
  "unlimited result history" is a natural free→pro differentiator to add to the
  paywall outcome list **when payments open** (do NOT touch paywall copy before
  then).
