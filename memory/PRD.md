# Lovli Mobile App — Product Requirements (MVP)

## Product
Lovli is an AI dating coach for Indian chats. Users upload or paste a chat screenshot from Instagram, WhatsApp, or dating platforms, choose reply language, optionally customize vibe/platform/memory, and Lovli generates 3 natural replies they can copy and send.

This mobile app is the iOS/Android frontend for the existing Lovli web product at `https://app.lovli.in`. It does NOT include a new backend — all API calls go to the live Lovli backend.

## Backend
- Base URL: `https://app.lovli.in/api` (from `EXPO_PUBLIC_BACKEND_URL`)
- All AI generation (Claude), auth, memory CRUD, settings, and usage tracking live on the existing Lovli backend.
- Mobile app never holds Claude key, JWT secret, or Google client secret.

## Endpoints used
- `POST /auth/login` `{ email, password }` → `{ access_token, user }`
- `POST /auth/signup` `{ name, email, password }` → `{ access_token, user }`
- `GET  /auth/me` → user
- `GET  /auth/google/config` (mobile keeps Google button disabled until a mobile OAuth client is provisioned)
- `PATCH /auth/onboarding` `{ preferred_platform, language_preference, timezone }`
- `PATCH /settings` `{ name, preferred_platform, language_preference, timezone }`
- `GET  /usage?client_local_date=YYYY-MM-DD`
- `POST /generate-replies` (multipart with `platform`, `vibe`, `language`, `client_local_date`, `timezone`, optional `manual_text`, `user_note`, `memory_card_id`, `image`)
- `POST /feedback` `{ generation_id, copied_reply_index }`
- `POST /waitlist` `{ email, type:"pro", source, what_you_want? }`
- `GET  /memory-cards`, `POST /memory-cards`, `PATCH /memory-cards/:id`, `DELETE /memory-cards/:id`

## Screens
1. Splash — Lovli mark + loader; redirects to `/login`, `/onboarding`, or `/(tabs)/reply`.
2. Login — email/password + disabled Google button.
3. Signup — name/email/password.
4. Onboarding — default platform + reply language; can Skip.
5. Reply (tab) — upload screenshot or paste chat, choose language, optional customize (platform/vibe/memory), 3 replies result with Copy + Regenerate.
6. Pro (tab) — Free vs Pro cards, "Get Early Access" form (joins `/waitlist`).
7. Memory (tab) — list of memory cards (private journal feel), Add Memory, Edit, Delete.
8. Add/Edit Memory — sectioned form (Basic context / Good to remember / Your notes).
9. Settings — accessed from top-right icon (NOT a bottom tab); account, preferences, plan, privacy, logout.

## Tech
- Expo Router (file-based routing) with `(tabs)` group for bottom tabs.
- React Native components only.
- Token persisted via `expo-secure-store` (through `@/src/utils/storage` `secureSet`).
- `axios` client with Bearer token interceptor and 401 unauth handler.
- `expo-image-picker` for screenshot upload (gallery only, with permission flow).
- `expo-clipboard` for copy.

## Brand / design system
Color tokens in `src/theme/colors.ts` match the exact Lovli palette:
- bg `#050509`, midnight `#090A14`, card `#11121C`, glass `#171827`, border `#2A2B3A`
- lavender `#A78BFA`, lavenderSoft `#C4B5FD`, violet `#8B5CF6`, sky `#38BDF8`, blue `#60A5FA`
- text `#F8FAFC`, soft `#E5E7EB`, muted `#A1A1AA`, faint `#71717A`
- Primary CTA = solid white pill, black text, subtle glow.

## Constraints honoured
- No new backend.
- No Claude key, JWT secret, Google client secret in the app.
- No payments / Stripe / checkout.
- No score / ranking / analytics features.
- "Settings" is reached from the top-right icon, not a tab.
- Bottom tabs (Reply, Pro, Memory) never overlap content (each screen reserves `bottomTabSpacing`).
- All copy follows the calm, private, premium tone from the brief.
