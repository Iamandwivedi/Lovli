# Lovli (AI Dating Coach for Indian Chats) — plan.md

## 1) Objectives
- ✅ Prove the **core workflow** works reliably: (screenshot/text) → Claude (vision) → **strict JSON** → 3 natural replies + tone notes.
- ✅ Build a mobile-first web app (FastAPI + MongoDB + React) around the proven core with: Reply, Pro, Memory, Settings, Privacy/Terms.
- ✅ Add auth (JWT email/password + Emergent Google OAuth), daily limits with **user-local timezone reset**, Memory CRUD, and waitlists.
- ✅ Harden LLM reliability with **automatic provider fallback** (Anthropic → Emergent) on transient failures (e.g., overload/529/rate-limit/5xx).
- ✅ Achieve investor-grade polish: premium dark liquid-glass UI, culturally-aware tone, privacy-first behavior (no screenshot storage).

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation; do not proceed until stable) — **COMPLETE ✅**
1. Create `test_core.py`:
   - Render a realistic sample chat screenshot → base64.
   - Call Claude Sonnet 4.5 with vision using Lovli system prompt.
   - Support: image-only, text-only, text + memory context.
   - Parse **strict JSON** `{replies:[3 strings], tone_notes:string}` and validate.
   - Add 1 retry on JSON parse/validation failure.
2. Results:
   - ✅ All 3 flows pass consistently using **direct Anthropic key** (`ANTHROPIC_API_KEY`).

**Phase 1 user stories — done**
- ✅ US1: Run one script and see 3 replies printed for image input.
- ✅ US2: Run text-only path and get 3 replies.
- ✅ US3: Invalid JSON is detected and retried once.
- ✅ US4: Failures don’t count as success; errors surface clearly.
- ✅ US5: Pluggable architecture to switch providers/keys.

---

### Phase 2 — V1 App Development (MVP build) — **COMPLETE ✅**
1. **Design system pass**
   - ✅ Dark premium liquid-glass design system with violet/indigo/blue accents.
   - ✅ Tokens + component recipes captured in `/app/frontend/design_guidelines.md`.

2. Backend (FastAPI + MongoDB)
   - ✅ Implemented full backend with:
     - JWT auth: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`
     - Emergent Google OAuth exchange: `/api/auth/google/session` → issues same JWT
     - Onboarding/preferences: `PATCH /api/auth/onboarding`
     - Daily usage: `GET /api/usage` (timezone-aware reset via `client_local_date`)
     - Core generation: `POST /api/generate-replies` (multipart; screenshot optional; Claude Vision)
     - Memory CRUD: `/api/memory-cards` (GET/POST/PATCH/DELETE)
     - Waitlists: `POST /api/waitlist` (pro/memory/general)
     - Settings: `PATCH /api/settings`
     - Feedback capture: `POST /api/feedback`
     - Test bypass: `POST /api/auth/test-login` when `ALLOW_TEST_LOGIN=true`
   - ✅ LLM service `backend/llm_service.py`:
     - Prefers **direct Anthropic** when `ANTHROPIC_API_KEY` is set
     - Falls back to Emergent only if direct key missing, or on transient errors
     - Never stores screenshot bytes in DB

3. Frontend (React + Tailwind + shadcn/ui + framer-motion)
   - ✅ Mobile-first app with premium liquid-glass UI.
   - ✅ All routes implemented:
     - `/login`, `/signup`, `/auth`, `/onboarding`, `/app`, `/pro`, `/memory`, `/settings`, `/early-access`, `/privacy`, `/terms`
   - ✅ App shell:
     - Sticky TopHeader (Lovli mark + plan badge + settings)
     - BottomNav (Reply default | Pro | Memory)
   - ✅ Core Reply flow:
     - Screenshot uploader with preview/remove
     - Manual chat text input + optional note
     - Platform + vibe chips
     - Generate CTA, loading microcopy, tone notes
     - 3 reply cards with Copy/Regenerate/Feedback
     - Copy toast: “Copied. Go send it.”
     - Upgrade modal at 8/8
   - ✅ Pro tab: comparison + early-access form.
   - ✅ Memory tab: hero + preview + functional CRUD dialog + early-access form + coming-soon buttons.

4. Manual smoke checks
   - ✅ Auth + reply generation works in deployed preview.
   - ✅ Memory CRUD and waitlist submission work.

**Phase 2 user stories — done**
- ✅ US1: Upload screenshot and get 3 replies on same page.
- ✅ US2: Paste chat text instead of uploading.
- ✅ US3: Copy reply shows correct toast.
- ✅ US4: Create/edit/delete memory cards.
- ✅ US5: Submit early-access interest (Pro/Memory/General).

---

### Phase 3 — Auth + Limits + Personalization + Testing — **COMPLETE ✅**
1. Auth (FastAPI)
   - ✅ Email/password JWT auth.
   - ✅ Emergent Google OAuth exchange → JWT.
   - ✅ Optional onboarding endpoint.
   - ✅ Test-login bypass gated by env.

2. Daily limit + timezone reset
   - ✅ Free: 8 generations/day.
   - ✅ Reset uses user-local date (`client_local_date`) and stores `last_generation_reset_date`.
   - ✅ Only increments daily count on successful generation.

3. Reply + Memory integration
   - ✅ Reply supports optional `memory_card_id` for personalization.

4. End-to-end testing
   - ✅ Backend: 100% pass after reliability hardening.
   - ✅ Frontend: 95% pass; only minor `data-testid` naming differences (no functional bugs).
   - ✅ Upgrade modal flow tested live.

5. Reliability hardening
   - ✅ `LLM_PROVIDER=auto` primary uses direct Anthropic.
   - ✅ Auto-fallback to Emergent on transient errors (e.g., 529 overload, 5xx, rate-limit, timeout).

**Phase 3 user stories — done**
- ✅ US1: New user signup → onboarding optional → `/app`.
- ✅ US2: One-tap Google login → `/app`.
- ✅ US3: Usage counter updates and resets by local date.
- ✅ US4: At 8/8, polished UpgradeModal blocks generation.
- ✅ US5: Memory card selection personalizes generation.

---

### Phase 4 — Hardening, UX polish, and final QA — **NO CRITICAL WORK REMAINING ✅**
1. Reliability
   - ✅ Already in place: graceful 503s, strict JSON validation + retry.
   - ✅ Provider fallback implemented for transient outages.

2. UX polish
   - ✅ Premium liquid-glass UI, subtle motion, loading microcopy rotation.

3. Privacy
   - ✅ Screenshots are used for generation but not stored.

4. Final QA
   - ✅ Completed: app verified visually (Login, Reply, Results, Memory, Pro, Upgrade modal).

**Phase 4 user stories — satisfied**
- ✅ US1: Clear errors and guidance.
- ✅ US2: Screenshot not stored.
- ✅ US3: Navigation stable across tabs.
- ✅ US4: Settings persist.
- ✅ US5: Privacy/Terms render cleanly.

---

## 3) Next Actions (do now)
1. ✅ Confirm everything is deployed and stable (done).
2. (Optional) Normalize any `data-testid` names for stricter automation parity (low priority; no functional impact).
3. 🚀 **Call `finish`** and deliver final summary.

---

## 4) Success Criteria
- ✅ **POC success**: `test_core.py` returns valid JSON for image/text/text+memory.
- ✅ **V1 app success**: mobile-first Reply flow works end-to-end; Memory CRUD works; waitlists submit.
- ✅ **Auth + limits success**: email+password + Google OAuth work; 8/day enforced; timezone reset correct; counter increments only on success.
- ✅ **Quality bar met**: premium dark liquid-glass UI, Hinglish-aware tone, privacy-respecting, tests pass with no critical bugs.
