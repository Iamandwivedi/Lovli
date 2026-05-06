# Lovli (AI Dating Coach for Indian Chats) — plan.md

## 1) Objectives
- Prove the **core workflow** works reliably: (screenshot/text) → Claude (vision) → **strict JSON** → 3 natural replies + tone notes.
- Build a mobile-first web app (FastAPI + MongoDB + React) around the proven core with: Reply, Pro, Memory, Settings, Privacy/Terms.
- Add auth (JWT email/password + Emergent Google OAuth), daily limits with **user-local timezone reset**, Memory CRUD, and waitlists.

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation; do not proceed until stable)
1. **Websearch quick check**: emergentintegrations vision usage + Claude Sonnet 4.5 image payload + JSON-mode prompting patterns.
2. Create `test_core.py`:
   - Load sample chat screenshot (png/jpg/webp) → base64.
   - Call Claude via **Emergent Universal LLM key** (vision-capable) with Lovli system prompt.
   - Send: platform + vibe + language preference + optional user note.
   - Parse **strict JSON** `{replies:[3 strings], tone_notes:string}`; validate and print.
   - Run a **text-only** test path (no image) in same file.
   - Add 1 retry on JSON parse failure (stricter instruction).
3. Fix prompt/formatting until:
   - Both image + text flows consistently return valid JSON.
   - Errors fail fast with clear logs.

**Phase 1 user stories**
- US1: As a builder, I can run a single script and see 3 replies printed for an image input.
- US2: As a builder, I can run the text-only path and get 3 replies printed.
- US3: As a builder, invalid JSON is detected and retried once automatically.
- US4: As a builder, failures don’t count as success and are clearly surfaced.
- US5: As a builder, I can later swap to direct `ANTHROPIC_API_KEY` by changing one config/service.

---

### Phase 2 — V1 App Development (MVP; build fast around proven core; no auth yet)
1. **Design system pass** (dark premium, liquid-glass, violet/indigo/blue glow): define tokens, card/button styles, nav layout.
2. Backend (FastAPI + MongoDB):
   - Minimal models: `generations`, `memory_cards` (no users yet).
   - `POST /api/generate-replies` supports multipart: image optional + text optional + platform/vibe/language/user_note.
   - Implement `ClaudeService` wrapper (Emergent now; pluggable Anthropic later).
   - Store generation record (no image bytes) with extracted_context, outputs, created_at.
3. Frontend (React + Tailwind + shadcn/ui + framer-motion):
   - Routes: `/app`, `/pro`, `/memory`, `/early-access`, `/privacy`, `/terms`.
   - Bottom nav (Reply default); Reply screen includes uploader, manual text, selectors, generate, results cards, copy toast.
   - Memory screen: basic CRUD UI (create/list/edit/delete) stored server-side.
   - Pro + early-access forms post to waitlist.
4. Conclude Phase 2 with **1 round testing_agent_v3** on unauthenticated flows.

**Phase 2 user stories**
- US1: As a user, I can upload a chat screenshot and get 3 replies on the same page.
- US2: As a user, I can paste chat text instead of uploading an image.
- US3: As a user, I can copy a reply and see a “Copied. Go send it.” toast.
- US4: As a user, I can create/edit/delete a Memory card and see it in my list.
- US5: As a user, I can submit early-access interest (Pro/Memory/General) and see success.

---

### Phase 3 — Add Auth + Limits + Personalization (production-friendly refactor)
1. Auth (FastAPI):
   - JWT email/password: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`.
   - Emergent Google OAuth: `/api/auth/google/session` exchange session → JWT.
   - Add optional onboarding endpoint: `PATCH /api/auth/onboarding`.
   - Add `ALLOW_TEST_LOGIN` gated `/api/auth/test-login`.
2. Data model expansion:
   - `users` collection as specified; link `generations`/`memory_cards` by `user_id`.
3. Daily limit + timezone reset:
   - `GET /api/usage` and enforcement inside `POST /api/generate-replies`.
   - Frontend sends `client_local_date (YYYY-MM-DD)` + `timezone`.
   - Only increment daily count on successful generation.
4. Reply + Memory integration:
   - Attach optional `memory_card_id` to generation; include memory context in prompt.
5. Conclude Phase 3 with **testing_agent_v3** covering auth, limits, memory per-user isolation.

**Phase 3 user stories**
- US1: As a new user, I can sign up and land on `/app` with Reply tab open.
- US2: As a user, I can one-tap Google login and reach `/app`.
- US3: As a free user, I see “X of 8 used today” and it resets by my local date.
- US4: As a user, when I hit 8/8 I see a polished UpgradeModal and can’t generate more.
- US5: As a user, I can select a Memory card to personalize generated replies.

---

### Phase 4 — Hardening, UX polish, and final QA
1. Improve reliability: better error messages, upload validation, JSON schema validation, graceful 503 handling.
2. UX polish: loading microcopy rotation, subtle motion, consistent premium glass styling across routes.
3. Privacy: confirm screenshots not stored; add UI copy + backend assertions.
4. Final **testing_agent_v3** full suite (all routes + major flows) + fix regressions.

**Phase 4 user stories**
- US1: As a user, I always understand what went wrong and what to do next.
- US2: As a user, my screenshot is used to generate replies but not stored.
- US3: As a user, navigation between Reply/Pro/Memory feels instant and stable.
- US4: As a user, settings updates persist (platform/style/language/timezone).
- US5: As a user, Privacy/Terms pages render cleanly and match the app aesthetic.

---

## 3) Next Actions (do now)
1. Run Phase 1 websearch, then implement `test_core.py` (image + text flows).
2. Obtain/choose a sample chat screenshot for the POC run.
3. Iterate prompt + JSON parsing until stable success.

---

## 4) Success Criteria
- **POC success**: `test_core.py` consistently returns valid JSON with 3 replies + tone_notes for both image and text.
- **V1 app success**: mobile-first Reply flow works end-to-end; Memory CRUD works; waitlists submit.
- **Auth + limits success**: email+password + Google OAuth work; 8/day enforced; timezone reset correct; counter only increments on success.
- **Quality bar**: premium dark liquid-glass UI, Hinglish-aware tone, privacy-respecting (no screenshot storage), all tests pass post-polish.
