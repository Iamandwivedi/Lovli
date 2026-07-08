# Lovli — PRD & Build Log

## Product
Lovli: AI dating coach for Indian chats. Users upload/paste a chat screenshot, pick a language (English / Hinglish / Hindi + English mixed), and get natural replies. **V2 pivot (current)**: from "AI reply tool" → "relationship coach" — dark theme, 4-tab nav (Reply · Ask Lovli · Memory · More), emotion-first entry, explain-the-why replies, Ask Lovli chat, Decode surface.

## Source of truth
- Design spec: user's "EMERGENT PROMPT — Lovli V2 · Coach-first DARK redesign (13 final screens)" message + attached `Lovli V2.html` artifact. The 13 "V2 · Coach —" frames are final.
- Tokens: `/app/mobile/docs/DESIGN_SYSTEM_V2_DARK.md` (supersedes the light doc).
- Voice: first-person warm Hinglish-aware wingman. HONESTY RULE: qualitative only — never numeric confidence/%/scores.
- `PAYMENTS_ENABLED=false` stays. Premium CTA → existing `POST /api/waitlist {type:'pro'}`.
- Backend changes allowed ONLY: PR-V2-3 (rich reply payload), PR-V2-4 (/api/ask-lovli), PR-V2-5 (/api/decode), PR-V2-6 (additive Memory fields). Old clients stay byte-compatible.

## PR plan (one at a time, stop for user review after each)
- [x] **PR-V2-1** — Dark tokens, 4-tab bar (Ask Lovli = static shell), Welcome, 3-step Onboarding (Goal/Platform/Language; goal → AsyncStorage `lovli_goal`). ✅ tested (iteration_9), user review pending
- [x] **PR-V2-2** — Reply Home (emotion check-in chips, compact upload/paste, remove visible language/customize rows), Intent phase (chat preview bubbles + WHAT DO YOU WANT? + HOW SHOULD IT LAND? chips), staged Generating loader (5 stages). Phase machine inside the Reply tab (home→intent→generating→results). ✅ tested 9/9 (iteration_10), user review pending
- [x] **PR-V2-3.1** — Language override chips stay on Intent; **person picker moved to Reply Home** (between paste field and CTA; "No one" default; toggle; hidden with 0 cards; resets on results→home). Cold-boot bug fixed (memory-cards fetch fired before token restore → 401 → hidden row; now refetches on user load). ✅ testing agent 6/6 (iteration_11), user review pending
- [ ] **PR-V2-3** — Reply · Generated "explain the why" UI + backend optional `feeling`/`intent`/`outcome` params + optional `insight` response object; "OR MAKE IT…" tone chips; copied toast
- [x] **PR-V2-4** — Ask Lovli live: `POST /api/ask-lovli` (auth, history ≤20 turns, person_id context, daily-limit shared, 400/401/429/503 handled) + chat UI (starter chips send+hide, typing indicator, AsyncStorage thread persistence `lovli_ask_thread`, retry affordance on failed sends, auto-scroll). Contract added to /app/docs/API_CONTRACT.md. ✅ backend curl 4/4 + testing agent 7/7 frontend (iteration_12), user review pending
- [x] **PR-V2-5** — `POST /api/decode` (qualitative-only, label clamped server-side, contract documented) + Decode surface (/decode: input → decode-staged loader → result with 3-segment meter, ✦ bullets, next-move card, Save to Memory via PATCH notes, ✦ Ask Lovli handoff via `lovli_ask_pending`) + More·Tools 9-tile grid (Decode + Read the signals live; other 7 = "coming soon" until PR4; rose Red-flag tile; Premium upsell row kept). Carry-in: logout clears ask thread/pending. ✅ curl 4/4 + testing agent 6/6 (iteration_13), user review pending
- [x] **PR-V2-6** — Memory List + Timeline: additive MemoryCard fields (stage/stage_duration/platform/city/timeline[]/facts[]), PATCH partial updates, `_extra_memory_context()` feeds new fields into all 3 LLM endpoints; V2 list (oldest person = primary elevated card, list chips exclude "avoid" facts), person detail with glowing timeline (upcoming outlined + sorted last), Add-a-moment sheet, fact chips (avoid = pink); Edit → /memory/edit/[id] (MemoryForm); Decode Save-to-Memory now writes a timeline entry. ✅ backend pytest 11/11 + frontend e2e (iteration_14); primary-ordering fix applied & screenshot-verified. Scope notes: facts add/remove UI + person deletion UI deferred. User review pending
- [ ] **PR-V2-7** — Premium (waitlist CTA, no IAP) + Settings (preferences = default language/vibe/dating; notifications toggles; privacy; footer)
- [ ] Final QA pass: visual diff vs V2 frames, old-client byte-compat, honesty grep, dark-theme audit

## Session log
### 2026-07-06 (this fork)
- **PR-V2-2 shipped**: reply.tsx rewritten as phase machine; new `src/components/reply/StagedLoader.tsx`, `ChatPreview.tsx`, `src/utils/chatParse.ts`. feeling/intent/outcome held in state, NOT sent yet. `EMERGENT_LLM_KEY` restored in backend/.env (lost in fork). Metro is CI mode — restart expo after code changes.
- Fixed fork env: supervisor expo program pointed at `/app/frontend` (old web app) → now `/app/mobile`. `/app/mobile/.env` pointed at `https://api.lovli.in` (CORS-blocked from preview) → preview proxy URL active, prod URL kept commented for release builds.
- Backend `.env`: `DB_NAME=lovli_db`, `ALLOW_TEST_LOGIN=true` → tester@lovli.app seeded, `POST /api/auth/test-login` works.
- **PR-V2-1 shipped**: V2 dark tokens in `colors.ts` (all legacy alias names preserved), white-pill `PrimaryButton` (✦ #8B5CF6, lavender halo, haptics), dark `Chip`/`Input`/`GlassCard`/`Screen` (gradient bg), gradient avatar `AppHeader`, 4-tab `_layout` (blur bg iOS, solid fallback), `welcome.tsx` hero, `AmbientGlow` component, 3-step `onboarding.tsx`, `ask-lovli.tsx` static shell, `DESIGN_SYSTEM_V2_DARK.md`.
- Testing agent full pass: all 8 acceptance checks PASS (iteration_9.json).

## Known/deferred
- Legacy screens (reply, memory, more, settings, paywall) inherit dark tokens but await their dedicated V2 restyle PRs.
- RN-web console deprecation warnings (`shadow*` → boxShadow) — web-only, cosmetic, deferred.
- Pre-existing TS strict warnings in `_layout.tsx` (tab button children cast) — deferred by user.
- Package version drift flagged by tester (expo-linear-gradient/react-native-svg vs SDK pins) — app builds & renders fine; not touched per "don't downgrade on cutoff alone".

## Test credentials
See `/app/memory/test_credentials.md` (tester@lovli.app / LovliTest@123; token key `lovli_access_token`).
- [x] **PR4a** — `POST /api/feature` skeleton (all 7 prompt suffixes in llm_service; shared {verdict, points[{text,tone}], actions[], replies[]}; red_flag verdict clamped to 4 severity tiers incl. safety tier w/ support-first actions; replies policy enforced server-side — glow_up always / settle+what_should_i_do conditional / breakup_clarity never; generations += feature_id/result; free limit 8→10) + shared `app/feature/[id].tsx` config-driven screen (`feature-config.ts`) + **Red flag check live in More grid**. Contract doc `/app/docs/FEATURE_API_AND_PROMPTS.md` (original recovered + V2 reconciliation, user-approved). ✅ curl + unit tests + testing agent all-green (iteration_16). User review pending.
- [ ] **PR4b** — wire remaining 6 tools in the More grid (config + tiles only, backend already serves all 7): what_should_i_do, settle_the_fight, the_other_side, fair_verdict, breakup_clarity, glow_up_reply.
- [x] **PR4b** — remaining 6 tools wired (zero placeholders in More grid); chained "✦ Glow up this reply" hand-off (prefilled draft+person, never auto-runs); per-feature askSuffix for Ask Lovli handoffs (breakup_clarity = closure framing, exact copy verified); text_secondary inputs (Your goal / Other person's perspective); copy polish pass; user language sent on feature calls; More grid scroll fix; dead more-features.ts deleted. ✅ testing agent iteration_17 all green (incl. 429 at 10th free gen mid-flow + honesty regex). RELEASE_CHECKLIST PR4 blocker ticked. User review pending.
- [x] **PR4c** — RECENT strip on More tab (last 5 feature/decode results, tap = read-only restore at zero cost, hidden when empty, wiped by Delete my memories via new DELETE /api/generations); decode persistence added; copy fixes (fair_verdict 'BOTH SIDES, HONESTLY'; red_flag tier-aware Ask-Lovli handoff — safety suffix on tier 4). ✅ iterations 17-18 all green. User review pending.
- [ ] **Final PR (backlog)** — notifications wiring, Face ID (expo-local-authentication), facts-edit + per-person delete UI.
