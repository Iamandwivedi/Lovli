# Lovli — UX Feedback → Implementation Plan (all 18 points + 8 features triaged)

> Source: the Figma-GPT/Emergent UX review. Decisions locked with Aman (2026-06-25):
> **(1) Memory = restyle only, no CRM/auto-extraction this cycle. (2) "Perceived
> intelligence" = honest model reads only — NO fabricated numbers. (3) Nav stays
> Reply / More / Memory.**
>
> Guardrails unchanged: light theme (PR2.1/2.2), `/backend` changes are **additive &
> backward-compatible only**, `PAYMENTS_ENABLED=false`, scope discipline. Every item below is
> bucketed; the DEFER list at the end is as important as the build list — do not build those.

---

## 0. Triage — every point in the review

| # | Review item | Verdict / bucket |
|---|---|---|
| 1 | Reply screen base flow | Keep — it's the strongest screen |
| A | Confidence badge "93% Natural" | **DEFER (honesty)** — fabricated number, kills trust. Replaced by honest `read.temperature` |
| B | Conversation temperature 🔥/🙂/❄ | **Reply-INT (honest)** — model's genuine call, in the read |
| C | Expected outcome bullets | **Reply-INT (honest)** — `read.outcome[]` |
| D | Conversation timeline detection | **DEFER** — needs reliable history; model may note it in `read.situation` if obvious |
| 2 | Memory psychology grouping | **DEFER** (CRM) — Aman: restyle only. Display polish OK, no field restructure |
| 3 | Memory AI auto-extraction | **DEFER** (CRM) |
| 4 | More-tab grouping into sections | **PR3.5** — 3 labeled groups |
| 5 | Rotating hero headline | **PR3** |
| 6 | Emotional empty states | **PR3.5** |
| 7 | AI personality / loading microcopy | **PR3.5** (loading lines) + tone pass |
| 8 | Paywall outcome framing | **PR3.5** (copy; stays flagged off) |
| 9 | Nav rename → Coach | **DEFER** — Aman: keep Reply/More/Memory |
| 10 | Memory list summary cards | **PR3.5** (restyle — displays existing fields only) |
| 11 | "Using: …" AI-context chip | **PR3** |
| 12 | Labeled replies (Safe/Flirty/Bold) | **Reply-INT (honest)** — labels backed by genuinely different replies |
| 13 | "Detected: …" signals | **Reply-INT (honest)** — `read.signals[]`; **drop "replied after 7h"** (no timestamps) |
| 14 | Streaks | **DEFER** — roadmap |
| 15 | Relationship dashboard/score | **DEFER** (CRM) |
| 16 | Proactive nudges | **DEFER** (CRM) |
| 17 | Onboarding value steps | **PR7** (copy ready below) |
| 18 | Visual polish (filled chips, icons, radius) | **PR3 / PR3.5** |
| F1 | Conversation score | **DEFER** — overlaps Reply-INT temperature |
| F2 | Best time to reply | **DEFER (honesty)** — needs data we don't have |
| F3 | Personality detection | **DEFER** (CRM-ish) |
| F4 | Relationship timeline auto-extract | **DEFER** (CRM) |
| F5 | Smart follow-up suggestions | **Partial** — `read.outcome` hints now; full follow-up later |
| F6 | Memory auto-extraction from chats | **DEFER** (CRM) |
| F7 | Conversation recap | **DEFER** — roadmap |
| F8 | Weekly dating insights | **DEFER** — roadmap |

**Positioning (endorsed):** "Your AI relationship memory + dating coach," not a reply
generator. Everything below leans into that without over-building.

---

## 1. PR3 — Reply tab polish (UI/copy, NO backend)

Current Reply behavior is untouched; this is presentation + the cheap "smart" cues.

1. **Rotating hero headline (#5).** Replace the static "Stuck on what to reply?" with a
   headline picked on each Reply-tab focus from a local array (deterministic random per app
   open). On-brand, Hinglish-friendly set:
   - "Stuck on what to reply?"
   - "Don't overthink the text."
   - "Reply like you — just smoother."
   - "Know what they actually mean."
   - "Win the conversation."
   Keep the subhead ("Upload the chat, choose language, get 3 natural replies.").
2. **"Using:" context chip (#11).** A small muted row just above the Generate button that
   reflects current selections: `Using · Instagram · Playful · Hinglish · No memory` (or the
   memory nickname). Reads live from state; makes personalization visible. `violetTint` pill,
   `textMuted` text, no new logic.
3. **Filled selected chips (#18).** Bump `Chip` selected state from outline-ish to a clearly
   **filled lavender**: bg `#E4DCFF` + `violetDeep #6A4BEE` text, thin/no border — reads as a
   solid pill, not an outline. Applies to language, vibe, platform chips everywhere.
4. **Screenshot dropzone polish (v2 §4).** Keep current behavior; refine: clearer dashed
   border on the deeper bg, violet upload glyph, "Tap to browse · JPG, PNG, WEBP". Multi-pick
   stays as-is.
5. **ReplyCard refinement.** Current 3-card result stays (behavior unchanged in PR3). Tighten
   spacing, ensure Copy / Regenerate sit cleanly on white cards. (Labels come in Reply-INT.)
6. **Visual polish (#18).** Card radius already 22 ✓. Confirm CTA elevation (PR2.2) ✓. Add a
   small contextual icon beside section labels where natural (e.g. a globe by "Reply language").

No backend, no contract change. Lands on current `/generate-replies`.

---

## 2. PR3.5 — Copy & states (UI/copy, app-wide, NO backend)

Pure copy + presentation. Big perceived-quality jump for near-zero risk.

1. **Loading microcopy (#7).** While a generation is in flight, cycle lines every ~1.2s:
   "Reading the vibe…" → "Looking for hidden signals…" → "Thinking like them…" → "Picking the
   smoothest lines…". Frontend timer over the existing single request; pair with the ✦ pulse.
2. **More-tab grouping (#4).** Split the 10 cards into 3 labeled sections (keep 2-col grid):
   - **Understand them** — Decode the situation · Read the signals · The other side
   - **Get advice** — What should I do? · Glow up my reply · Ask Lovli anything
   - **Relationship help** — Red flag check · Settle the fight · Fair verdict · Breakup clarity
   Add lightweight `SectionHeader`s with a small icon each.
3. **Paywall outcome copy (#8)** — sell transformations, stays `PAYMENTS_ENABLED=false`:
   - "Never run out of replies"
   - "Remember every person — automatically"
   - "Understand mixed signals"
   - "Defuse arguments before they blow up"
   - "Know what they actually mean"
   - "Decode any screenshot"
   (Dropped "know when to text" — implies best-time-to-reply we don't have.)
4. **Emotional empty states (#6).**
   - Memory: "Every connection is built on remembering the little things. Save your first
     one. ✦"
   - Reply (pre-generation idle, optional): keep light.
   - No-results / error: warm, human, never a bare "No data".
5. **Memory list summary cards (#10, restyle only).** When memories exist, each row shows the
   **existing** fields nicely: nickname (bold), stage chip, "Updated 2d ago", and 1–2 saved
   facts (e.g. "Likes coffee", "Birthday July 3") pulled from current data. **No new fields,
   no auto-extraction** — purely a better render of what's already stored.
6. **Tone pass (#7).** Sweep button/label/toast microcopy for the witty-warm-Hinglish voice
   (per v2 §9). No GPT-flavored "Generating…/Submit/Error" strings.

---

## 3. Reply-Intelligence — honest reads (ADDITIVE backend + Reply UI)

> This is the one piece that needs the model to actually produce more, and it's the biggest
> "perceived intelligence" lever. **Opt-in, backward compatible** — exactly the discipline of
> the `/api/feature` route. Sequence it right after PR3 (or after PR4); review as one backend
> change. **No fabricated values** — every field is the model's genuine read of the chat.

### Backend (`/generate-replies`, additive)
- New optional form param `rich` (bool, default false). When false → **identical** old
  response `{replies:[3 str], tone_notes}`. When true → extended schema below.
- The system prompt (rich mode) asks Claude to (a) read the situation and (b) produce **3
  deliberately different-register replies** within the chosen vibe, labeled, so the labels are
  truthful — not 3 of the same tone.
- Extended response:
  ```json
  {
    "read": {
      "situation": "one honest line on what's going on",
      "temperature": "interested | neutral | cold",
      "signals": ["1–3 short, genuine tells from the chat"],
      "outcome": ["1–3 'these replies will likely …' bullets"]
    },
    "replies": [
      { "text": "…", "label": "Safe" },
      { "text": "…", "label": "Flirty" },
      { "text": "…", "label": "Bold" }
    ],
    "tone_notes": "…"
  }
  ```
- Add `validate_replies_v2` (parallel to `validate_payload`): `read.situation` non-empty;
  `temperature` ∈ the 3 values; `signals` 1–3 non-empty; `outcome` 1–3 non-empty; `replies`
  exactly 3 objects with non-empty `text` + `label`. Same fence-strip + 1 stricter retry +
  503 mapping. Mirror in `llm_service.py` (`build_reply_prompt_v2`, `generate_replies_v2` or a
  `rich` branch).
- Labels: keep a small fixed vocab (`Safe`, `Flirty`, `Bold`, `Funny`, `Sincere`,
  `Confident`) and let the model choose 3 that fit. Vibe chip still sets the dominant lean.
- Daily counter unchanged (1 per generation, shared pool).

### Frontend (Reply screen)
- Above the 3 ReplyCards, render a **read card**: `situation` line + a **temperature chip**
  (🔥 Interested / 🙂 Neutral / ❄ Cold — value straight from `read.temperature`, no
  computation) + `signals` as 1–3 ticks + `outcome` as 1–3 ticks. This is #B/#C/#13.
- Each ReplyCard gets its **label badge** (#12). Copy/Regenerate unchanged.
- If `rich` ever fails validation, fall back to the plain 3-reply render (resilient).

This makes the app *feel* like it understands the chat — because it actually does.

---

## 4. DEFER — do NOT build now (and why)

- **Memory CRM:** AI auto-extraction (#3,F6), psychology field restructure (#2 beyond display),
  relationship score/dashboard (#15), proactive nudges (#16), personality detection (#F3),
  timeline auto-extract (#F4). — Aman: Memory is **restyle only** this cycle.
- **Fabricated intelligence:** "93% Natural" (#A), "replied after Xh" / best-time-to-reply
  (#13 timestamp part, #F2). — We can't truthfully measure these; honesty > wow.
- **Nav rename → Coach (#9).** — Keep Reply / More / Memory.
- **Roadmap (post-core):** streaks (#14), weekly insights (#F8), conversation recap (#F7),
  full smart follow-ups (#F5 beyond `read.outcome`).

If Emergent thinks any deferred item is trivial, it still **asks first** — these are product
calls, not silent additions.

---

## 5. Sequencing & paste-ready kickoff

Recommended order: **PR3 (Reply UI) → Reply-INT (honest reads) → PR3.5 (copy/states) →**
then resume **PR4 (`/api/feature` + `decode_situation`) → PR5/6**. (Reply-INT and PR3.5 can
swap; Reply-INT is the higher-value lever.)

**Kickoff for PR3 (give this now):**

> **PR3 — Reply tab polish (UI/copy only, no backend, `/generate-replies` untouched). Full
> plan in `docs/UX_FEEDBACK_IMPLEMENTATION.md` §1.** Implement: (1) rotating hero headline
> from a local 5-line array, chosen per Reply-tab focus; (2) a muted "Using · Instagram ·
> Playful · Hinglish · <memory|No memory>" context chip above Generate, live from state; (3)
> filled selected chips — `Chip` selected = bg `#E4DCFF` + `#6A4BEE` text, no outline; (4)
> screenshot dropzone polish on the deeper bg; (5) ReplyCard spacing/contrast cleanup (no
> behavior change); (6) minor section-label icons. No contract changes, no Memory/More edits.
> Then stop for review before Reply-Intelligence.

Confirm PR3 scope and I'll hand you the Reply-Intelligence backend brief next.

---

### Definition of done (this batch, across PRs)
- Reply screen: rotating hero, context chip, filled chips, polished dropzone — on current endpoint.
- App-wide: loading microcopy, grouped More tab, outcome-framed paywall (still off), emotional
  empty states, Memory summary cards (existing fields only), witty-Hinglish tone pass.
- Reply-Intelligence: opt-in `rich` reply response with honest read + labeled replies;
  old response path byte-identical when `rich` is off.
- Nothing from the DEFER list built; no fabricated metrics; Memory functionally unchanged.
