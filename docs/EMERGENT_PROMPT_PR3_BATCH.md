# EMERGENT PROMPT — Lovli "feels smart" batch (PR3 → Reply-Intelligence → PR3.5)

> **Paste everything below the line into Emergent.** It's a series of incremental PRs on the
> existing Expo light-theme app — not a rebuild. Execute ONE PR at a time and stop for review
> between each.

---

## CONTEXT (read first — do not rebuild anything)

This is the existing **Expo / React Native (SDK 54)** app in `/app/mobile`, already on the
**light theme** (PR2.1) + glossy-black-CTA polish (PR2.2). Backend (`/app/backend`,
FastAPI + Mongo + Claude) and web (`/app/frontend`) are **out of scope except where PR-INT
explicitly extends one endpoint additively.** All work is incremental PRs on top of what's
there. Nothing gets rewritten from scratch.

These three PRs implement a vetted UX review. The full triage lives in
`docs/UX_FEEDBACK_IMPLEMENTATION.md` — this prompt is the build order.

### HARD CONSTRAINTS (do not violate)
- ✅ Stay on Expo/RN SDK 54, light theme, existing components/tokens. ❌ No framework change, no dark-theme regression.
- ✅ `/generate-replies` gets ONE **additive, backward-compatible** extension (PR-INT only). ❌ No other backend changes, no schema/contract breakage, no new endpoints in this batch.
- ✅ `PAYMENTS_ENABLED=false` stays. ❌ No live IAP/RevenueCat.
- ✅ Memory is **restyle only**. ❌ No new Memory fields, no auto-extraction, no dashboard, no CRM.
- ✅ Honest AI only. ❌ No fabricated metrics (no "93% Natural", no "replied after Xh", no best-time-to-reply).
- ✅ Keep nav = **Reply · More · Memory**. ❌ No rename to "Coach".
- ✅ One PR at a time; stop for review after each with a report (files changed, what/why, testing, deviations).

### LOCKED PRODUCT DECISIONS (from the founder)
1. Memory = restyle only this cycle.
2. "Perceived intelligence" = honest model reads only (PR-INT).
3. Nav stays Reply / More / Memory.

### DO NOT BUILD IN THIS BATCH (defer; ask before touching any of these)
Memory CRM / auto-extraction / psychology field restructure / relationship score / dashboard
/ proactive nudges / personality detection / timeline extraction; fabricated confidence
scores or timestamp-based signals; best-time-to-reply; streaks; weekly insights; conversation
recap; nav rename. If you think one is trivial, ask first — it's a product call.

---

## PR3 — Reply tab polish (UI/copy ONLY, no backend)

Goal: make the Reply screen feel sharper and more personalized. Reply generation behavior is
**unchanged** — still calls `/generate-replies` exactly as today.

1. **Rotating hero headline.** Replace the static "Stuck on what to reply?" with a headline
   chosen on each Reply-tab focus from this local array (deterministic random per app open;
   keep the existing subhead):
   - "Stuck on what to reply?"
   - "Don't overthink the text."
   - "Reply like you — just smoother."
   - "Know what they actually mean."
   - "Win the conversation."
2. **"Using:" context chip.** A muted pill row directly above the Generate button reflecting
   live selections: `Using · Instagram · Playful · Hinglish · No memory` (swap the last for the
   memory nickname when one is chosen). Style: `violetTint` bg, `textMuted` text, small. Pure
   read from existing state — no new logic.
3. **Filled selected chips.** Update `src/components/Chip.tsx` selected state to a clearly
   **filled lavender**: background `#E4DCFF`, text `colors.violetDeep (#6A4BEE)`, no/!thin
   border (currently reads as an outline). Applies wherever Chip is used (language, vibe,
   platform). Unselected unchanged.
4. **Screenshot dropzone polish.** Keep behavior (tap to pick, multi-image). Refine for the
   deeper bg: crisp dashed border, violet upload glyph, helper "Tap to browse · JPG, PNG, WEBP".
5. **ReplyCard cleanup.** Keep the current 3-card result and its Copy/Regenerate behavior.
   Tighten spacing and ensure cards/controls read cleanly on white. (Labels arrive in PR-INT.)
6. **Section-label icons.** Add a small contextual icon beside section labels where natural
   (e.g. a globe by "Reply language"). Cosmetic only.

**Constraints:** no contract change; do not touch More/Memory/Paywall/backend. Report + stop.

---

## PR-INT — Reply Intelligence (ONE additive backend extension + Reply UI)

Goal: the Reply result actually understands the chat — a genuine situation read + 3
meaningfully different, labeled replies. **Opt-in and fully backward compatible.** This is the
only backend change in this batch.

### Backend — extend `/generate-replies` (additive)
- Add optional form field `rich: bool = Form(False)`.
  - `rich=false` (default) → response is **byte-identical to today** (`replies:[3 str]`,
    `tone_notes`, counts). Do not change this path.
  - `rich=true` → richer system prompt + extended response (below).
- In `llm_service.py`, add a rich branch (e.g. `build_reply_prompt_v2` + `validate_reply_v2`,
  reusing the SAME provider routing, one stricter retry, and 503 mapping as `generate_replies`).
  Rich-mode instruction to Claude (append to the existing Lovli persona/system):

  > In rich mode, first read the situation honestly, then write exactly 3 reply options that
  > differ in register (e.g. Safe → Flirty → Bold) within the user's selected vibe and
  > language, each labeled truthfully. Base every observation only on the actual chat — never
  > invent facts, times, or numbers. Output ONLY this JSON:
  > ```json
  > {
  >   "read": {
  >     "situation": "one honest line on what's going on",
  >     "temperature": "interested | neutral | cold",
  >     "signals": ["1–3 short genuine tells from the chat"],
  >     "outcome": ["1–3 'these replies will likely …' bullets"]
  >   },
  >   "replies": [
  >     {"text": "...", "label": "Safe"},
  >     {"text": "...", "label": "Flirty"},
  >     {"text": "...", "label": "Bold"}
  >   ],
  >   "tone_notes": "..."
  > }
  > ```
  Allowed labels (model picks 3 that fit): `Safe, Flirty, Bold, Funny, Sincere, Confident`.

- `validate_reply_v2`: `read.situation` non-empty; `temperature` ∈ {interested,neutral,cold};
  `signals` 1–3 non-empty strings; `outcome` 1–3 non-empty strings; `replies` exactly 3 objects
  each with non-empty `text` + `label`. Same fence-strip / regex-extract / one stricter retry.
- **API response shape (keep `replies` as `[str]` for compat; add optional fields):**
  add `reply_labels: Optional[List[str]]` and `read: Optional[{situation, temperature,
  signals[], outcome[]}]` to the response model. When `rich=false` both are `null`. When
  `rich=true`, map model JSON → `replies=[r.text]`, `reply_labels=[r.label]`, `read=read`.
- Daily counter, auth, image handling, memory_card expansion: unchanged (1 generation = 1 from
  the existing shared free pool).

### Frontend — Reply screen (send `rich=true`)
- Above the 3 ReplyCards, render a **read card**: `read.situation`, a **temperature chip**
  (🔥 Interested / 🙂 Neutral / ❄ Cold — value straight from `read.temperature`, no client
  computation), `signals` as 1–3 ticks, `outcome` as 1–3 ticks.
- Each ReplyCard shows its **label badge** from `reply_labels` (e.g. "Safe"). Copy/Regenerate
  unchanged.
- **Resilient fallback:** if `read`/`reply_labels` are missing or fail to parse, render the
  plain 3-reply view (today's UI). Never block replies on the read.

**Constraints:** `rich=false` path unchanged; no new endpoint; `/frontend` + Memory + More
untouched. Run lint + a curl smoke test of BOTH `rich=false` (old shape) and `rich=true`
(new shape) against the backend before reporting. Report + stop.

---

## PR3.5 — Copy & states (UI/copy app-wide, no backend)

Pure copy + presentation; big perceived-quality lift, near-zero risk.

1. **Loading microcopy.** While a generation is in flight, cycle every ~1.2s: "Reading the
   vibe…" → "Looking for hidden signals…" → "Thinking like them…" → "Picking the smoothest
   lines…", paired with the ✦ pulse. Frontend timer over the existing request.
2. **More-tab grouping.** Split the 10 cards into 3 labeled sections (keep the 2-col grid),
   each with a small `SectionHeader` + icon:
   - **Understand them** — Decode the situation · Read the signals · The other side
   - **Get advice** — What should I do? · Glow up my reply · Ask Lovli anything
   - **Relationship help** — Red flag check · Settle the fight · Fair verdict · Breakup clarity
3. **Paywall outcome copy** (stays `PAYMENTS_ENABLED=false`): "Never run out of replies" ·
   "Remember every person — automatically" · "Understand mixed signals" · "Defuse arguments
   before they blow up" · "Know what they actually mean" · "Decode any screenshot".
4. **Emotional empty states.** Memory: "Every connection is built on remembering the little
   things. Save your first one. ✦" Error/no-result states: warm and human, never a bare "No
   data".
5. **Memory list summary cards (restyle ONLY).** When memories exist, render each row with the
   **existing** fields: nickname (bold) · stage chip · "Updated 2d ago" · 1–2 saved facts
   already stored. No new fields, no extraction.
6. **Tone pass.** Sweep button/label/toast strings into the witty-warm-Hinglish voice. Kill
   any "Generating…/Submit/Error"-style GPT phrasing.

**Constraints:** no backend; Memory stays functionally identical; report + stop.

---

## EXECUTION PROTOCOL
- Do **PR3 first**, then **PR-INT**, then **PR3.5**. One at a time.
- After each PR: report files changed, what changed visually/functionally, what was preserved,
  deps added, testing result (lint + `expo export` bundle check; for PR-INT also the two curl
  smoke tests), and any deviation with the reason. Then **stop and wait** for go.
- Touch `/app/mobile` only, except PR-INT's single additive change to `/generate-replies`.
- If anything here conflicts with the real code, surface it and ask before proceeding —
  do not silently redesign.
