# EMERGENT PROMPT — Lovli V2 · Coach-first DARK redesign (13 final screens)

> **Paste everything below the line into Emergent, and attach the 3 design files:**
> `Lovli V2.html`, `Lovli UI Check V2.pdf`, `Lovli AI V2.zip`.
> The 13 screens whose canvas headings start with **"V2 · Coach —"** (purple `#A78BFA` labels)
> are the FINAL design and the visual source of truth. Ignore every other frame on the canvas
> (the "01–10" light/dark frames are superseded). This prompt is the screen-by-screen spec +
> the rules the files can't convey. Implement as the PRs below, **one at a time, stop for
> review after each.**

---

## CONTEXT

Existing Expo/RN (SDK 54) app in `/app/mobile` (PR1→PR3 + design-alignment PRs shipped, currently light theme). V2 is a full pivot: **from "AI reply tool" to "relationship coach"** — dark theme, 4-tab nav, emotion-first entry, explain-the-why replies, a new **Ask Lovli** chat tab, and a **Decode** result surface. This supersedes the earlier "no dark theme" constraint: **V2 IS the dark theme.** FastAPI backend in `/app/backend` — additive changes and two new endpoints are approved in this batch (scoped per-PR below; nothing else changes).

### HARD CONSTRAINTS
- ✅ Dark theme V2 everywhere in the app tabs/flows below. ❌ No leftover light-theme screens in the main flow; no framework change; no new packages beyond what's needed for blur/gradient already in Expo.
- ✅ Backend: ONLY the changes named in PR-V2-3 (rich reply payload), PR-V2-4 (`/api/ask-lovli`), PR-V2-5 (`/api/decode`), PR-V2-6 (additive Memory fields). ❌ No other contract changes; existing params/responses stay byte-compatible for old clients (all new response fields optional, all new request params optional).
- ✅ `PAYMENTS_ENABLED=false` stays — the Premium screen is visual only (CTA joins the pro waitlist via existing `POST /api/waitlist {type:'pro'}`). ❌ No live IAP.
- ✅ **Honesty (hard rule):** qualitative reads only. ❌ NO numeric confidence, NO "92%", NO percentage meters, NO relationship "score", NO fabricated social proof or user counts. The Decode meter is a 3-segment qualitative scale (Not into it / Mixed signals / Leaning interested) — words, not numbers.
- ✅ First-person Lovli voice everywhere (see VOICE). ❌ Never robotic, never "The AI has analyzed…".
- The design mockups include an iOS status bar (9:41 / 5G / battery) and a home-indicator bar inside a 390×844 rounded frame — that is mockup chrome. **Do NOT build those**; use SafeArea. Everything else inside the frame is real UI.

### VOICE (use these exact strings where specified)
Warm, witty, Hinglish-aware wingman. First person ("I'll read the vibe", "If I were your wingman…"). Short sentences. Em-dashes. Never clinical.

---

## DESIGN TOKENS (V2 dark — extract into `theme/tokens` and use everywhere)

**Color**
- Screen background: vertical gradient `#050509 → #090A14`. Hero/emotional screens (Welcome, Generating, Premium) use `#050509 → #0B0918` plus one large ambient radial glow: circle ~380–420px, `radial-gradient(closest-side, rgba(139,92,246,.24–.30), rgba(56,189,248,.05) 72%, transparent)`, slowly pulsing opacity .5→1 (~3s ease-in-out loop).
- Card: `#11121C` with 1px border `#2A2B3A`, radius 16–20.
- Elevated/glass card ("insight" surfaces): `#171827`, border `rgba(167,139,250,.3)` (or `#2A2B3A` when not highlighted), radius 20–22, shadow `0 16px 40px -10px rgba(0,0,0,.55)` + faint `0 0 30px rgba(167,139,250,.08)`.
- Inner row divider: `#1B1C29`.
- Accent lavender `#A78BFA`; deep violet `#8B5CF6` (gradients, the ✦ inside white CTA); lavender text `#C4B5FD`; lavender tint fill `rgba(167,139,250,.14)`; lavender tint border `rgba(167,139,250,.3–.4)`.
- Text: primary `#F8FAFC`, body `#E5E7EB`, secondary `#A1A1AA`, muted `#71717A`, faint `#52525B`, disabled `#3F3F46`.
- Semantic: warm amber `#FFB259` (Warm temperature), soft pink `#F0A5B2` (watch-outs, destructive text), rose `#E0667A` (red-flag icon, `rgba(224,102,122,.12)` tint).
- Avatar gradient: `linear-gradient(135deg, #A78BFA 0%, #8B5CF6 60%)`, initial letter in `#050509`.

**Type**
- Headers/serif: **Fraunces** (weights 500–600, tight letter-spacing −.01em to −.025em). Body/UI: **Plus Jakarta Sans**.
- Section label (recurring): 12px, weight 700, letter-spacing .1em, UPPERCASE, `#71717A`.
- H1 sizes on screens: 30–34px serif; card serif text 17–24px.

**Primary CTA (identical on every screen)**
- Full-width pill: bg `#FFFFFF`, 1px border `#E5E7EB`, radius 999, padding-y 18, text `#050509` 16px weight 700, shadow `0 8px 28px rgba(167,139,250,.35)` + `0 2px 8px rgba(0,0,0,.4)`. Leading `✦` glyph in `#8B5CF6` 15px where specified.

**Chips (recurring)**
- Inactive: bg `#11121C`, 1px `#2A2B3A`, radius 999, padding 8×13–15, 13px weight 600 `#A1A1AA`.
- Active: bg `#A78BFA`, text `#050509`, weight 700, shadow `0 4px 14px rgba(167,139,250,.3)`, no border.
- Lavender-tint chips (memory facts / chat starters): text `#C4B5FD` on `rgba(167,139,250,.14)` fill (starters add border `rgba(167,139,250,.3)`).

**Tab bar (4 tabs — replaces the current 3-tab bar app-wide)**
- Height ~84 incl. safe area, bg `rgba(9,10,20,.9)` + blur(20), top hairline `#2A2B3A`, icons 23px with 11px labels.
- Tabs in order: **Reply** (chat-bubble outline) · **Ask Lovli** (`✦` text glyph, 20px) · **Memory** (heart outline) · **More** (2×2 grid outline).
- Active: `#A78BFA`, label weight 700, ✦ gets glow `text-shadow 0 0 12px rgba(167,139,250,.7)`. Inactive: `#71717A`, weight 600.
- "Ask Lovli anything" is REMOVED from the More grid — it lives in the tab now.

**Motion**
- `lovliPulse`: scale 1→1.1, opacity .8→1, 2.2–2.8s ease-in-out infinite (the big ✦).
- `lovliGlow`: opacity .5→1, 3–3.5s ease-in-out infinite (ambient radial).
- Screen transitions: keep existing; chips/CTA use existing press feedback.

**Back header (recurring on sub-screens)**
- Left chevron `‹` (22px, `#F8FAFC`, 1.8 stroke) + serif 20px weight-600 title, 14px gap. Padding 24 horizontal.

---

## PR-V2-1 — Dark foundation, 4-tab nav, Welcome + Onboarding (no backend)

**1a. Theme foundation.** Add the token set above; flip the app shell, nav, and all shared components to dark. Build the 4-tab bar exactly as specified. Reorder/replace the old tabs (Reply · Memory · More → **Reply · Ask Lovli · Memory · More**; Ask Lovli screen itself lands in PR-V2-4 — until then the tab shows the chat UI shell with the greeting + starters, input disabled with a "coming in this build soon" toast is NOT wanted — instead wire the tab but keep it feature-flagged hidden until PR-V2-4 merges; simplest: ship the tab bar with 4 tabs in PR-V2-4 and 3 in this PR **only if trivially flaggable — otherwise ship 4 tabs now with the static chat shell**).

**1b. Welcome (match "V2 · Coach — Welcome").**
- Bg `#050509→#0B0918`, ambient glow circle top-center (380px, radial as tokens), pulsing.
- Centered column, 32px side padding: big `✦` 58px `#A78BFA` with strong glow (`text-shadow 0 0 40px rgba(167,139,250,.8), 0 0 90px rgba(139,92,246,.5)`), pulsing; 22px below: serif "Lovli" 26px weight 600.
- Headline (serif, 33px, line-height 1.12, centered, balanced): **"Your wingman for every text, talk & situationship."**
- Sub (15px `#A1A1AA`, centered, max-w 280): **"Hinglish-first advice that actually gets you."**
- Bottom: white CTA **"✦ Get started"**; 16px below, lock icon (13px `#71717A`) + 12.5px `#71717A`: **"Private by default — your chats stay yours."**

**1c. Onboarding · Goal (match "V2 · Coach — Onboarding · Goal").** Replace the current onboarding question screens' style with this template (keep existing question count/logic; this is Q1 of 3):
- Top row: back chevron + progress track (4px, `#2A2B3A`, radius 2) with fill `linear-gradient(90deg,#A78BFA,#8B5CF6)` + glow `0 0 10px rgba(167,139,250,.6)` at 33% + right label "1 of 3" (12.5px 600 `#71717A`).
- H1 serif 30px: **"What brings you here?"** Sub 14.5px `#A1A1AA`: **"I'll shape my advice around it."**
- Option list (10px gap), rows radius 16, padding 15×17:
  - Selected: bg `#171827`, 1.5px border `#A78BFA`, glow `0 0 24px rgba(167,139,250,.15)`, text 14.5px 700 `#F8FAFC`, right 21px lavender circle with dark check.
  - Unselected: bg `#11121C`, 1px `#2A2B3A`, text 14.5px 600 `#E5E7EB`.
- Options (exact copy): **Find a relationship / Fix things with someone / Get better at dating apps / Survive the talking stage / Heading toward marriage / Recover after a breakup**.
- Bottom white CTA **"Continue"** (no ✦ on this one).
- Store the answer; feed it into generation prompts as user context (additive, optional).

Report + stop.

## PR-V2-2 — Reply Home (emotion-first) + Intent screen + Generating (no backend yet; params wired but sent only in PR-V2-3)

**2a. Reply · Home (match "V2 · Coach — Reply · Home").** Replaces the current Reply home layout:
- Header: `✦` 18px lavender glow + serif "Lovli" 21px, left; right: 34px avatar circle (gradient, user initial, dark letter) → opens Settings.
- H1 serif 34px: **"What's happening?"** Sub 15px `#A1A1AA` max-w 290: **"Tell me what happened — or just show me the conversation."**
- **Emotional check-in** (new, optional): section label **"HOW ARE YOU FEELING?"** with right-aligned **"Skip"** (12.5px 600 `#52525B`). Chip wrap (8px gaps): **😊 Excited · 😔 Confused · 😰 Overthinking · ❤️ Falling for someone · 💔 Healing · 😎 Just curious**. Single-select toggle, fully skippable; selection is stored as `feeling` (sent to backend from PR-V2-3).
- **Upload row** (compact card, NOT the old big tile): bg `#11121C`, **1.5px dashed border `rgba(167,139,250,.4)`**, radius 18, padding 15×18; left 38px icon tile (radius 12, `rgba(167,139,250,.14)` fill, lavender upload arrow); title 14.5px 600 **"Show me the conversation"**, sub 12.5px `#71717A` **"Screenshot from any chat app"**. Opens image picker (existing flow).
- **Paste field** below (11px gap): card radius 16, placeholder 15px `#71717A` **"Or paste the chat here…"** (existing `manual_text` flow).
- The old visible Language toggle and "Customize · Platform · Vibe · Memory" collapsed row are **removed from this screen** — language/vibe defaults now live in Settings (PR-V2-7); keep sending the stored defaults to the API unchanged.
- Bottom white CTA **"✦ Get replies"**, then the 4-tab bar (Reply active).

**2b. Reply · Intent (match "V2 · Coach — Reply · Intent") — NEW screen between input and generation.** After screenshot/paste is provided (OCR/parse done), push this screen:
- Back header: chevron + serif 20px **"Got it. I read the chat."**
- **Chat preview card**: bg `#11121C`, border `#2A2B3A`, radius 18, padding 14×16, showing the parsed conversation as bubbles — their msgs left (bg `#171827`, border `#2A2B3A`, radius 14/14/14/4, 13px `#A1A1AA`), user msgs right (bg `rgba(167,139,250,.14)`, radius 14/14/4/14, 13px `#C4B5FD`). Max-width 78%. (Render the real parsed messages, max ~3–4, scrollable/fade if longer.)
- Section label **"WHAT DO YOU WANT?"** + single-select chips: **Reply · Understand · Flirt · Set boundaries · End it · Save the vibe** (default: Reply).
- Section label **"HOW SHOULD IT LAND?"** + single-select chips: **Make them smile · Keep the mystery · Sound confident · Don't look desperate · Be funny · Stay casual · Be mature** (optional, none preselected).
- Bottom white CTA **"✦ Write it for me"** → generation. Store `intent` + `outcome` (sent from PR-V2-3).

**2c. Reply · Generating (match "V2 · Coach — Reply · Generating").** Replace the current loader:
- Hero bg + centered pulsing `✦` 48px with heavy glow; ambient radial behind (420px, centered ~42% height).
- Below (44px gap), a staged checklist (15px row gap, 56px side padding), stages appear/advance sequentially:
  1. **Reading the message…** 2. **Checking the vibe…** 3. **Understanding context…** 4. **Finding the best reply…** 5. **Writing naturally…**
- Done rows: 20px circle `rgba(167,139,250,.18)` with lavender check + 14px `#71717A` text. Active row: 20px circle with 2px `#A78BFA` ring + glow, text serif 16.5px 500 `#F8FAFC`. Pending rows: 20px circle 1.5px `#2A2B3A` ring, 14px `#3F3F46` text.
- Time the stages to the real request (min ~400ms per stage, don't block on completion).

Report + stop.

## PR-V2-3 — Reply · Generated ("explain the why") + backend rich payload

**Backend (additive, approved):** extend `POST /api/generate-replies` —
- New optional form params: `feeling` (string, from the check-in), `intent` (string), `outcome` (string). Absent params = current behavior, byte-identical response for old clients.
- New optional response object `insight` alongside existing fields:
  ```json
  "insight": {
    "temperature": "warm | mixed | cold",
    "noticing": ["…", "…"],            // 1–3 short qualitative observations
    "whats_going_on": "…",              // one-liner
    "wingman_advice": "…"               // one-liner, first person
  }
  ```
- Also return `primary_reply` (string) + `alternatives_hint` unchanged replies array as today. Prompt the model for QUALITATIVE language only — never numbers/percentages.
- Smoke test with curl: old-style call (no new params) must return the exact current shape; new-style call returns `insight`.

**UI (match "V2 · Coach — Reply · Generated"):**
- Back header: chevron + serif 20px **"Your reply"**.
- **Insight block** (elevated glass card, `#171827`, border `rgba(167,139,250,.3)`, radius 22, padding 19×20, shadows per tokens):
  - Top row: label **"HERE'S WHAT I'M NOTICING"** (11px 700 .12em uppercase `#71717A`) + right **temperature pill**: `rgba(255,178,89,.12)` fill, 8px gradient dot (`#FFB259→#A78BFA`), 12px 700 text — `warm→"Warm"` `#FFB259`; `mixed→"Mixed"` muted grey; `cold→"Cold"` cool grey-blue.
  - `insight.noticing` as ✦-bulleted lines (✦ 13px `#A78BFA`, text 13.5px `#A1A1AA`, e.g. *""Wouldn't you like to know 😏" is an invitation, not a brush-off."*).
  - Then: **"What's really going on:"** (700 `#E5E7EB`) + `whats_going_on` in `#A1A1AA`.
  - Then: **"If I were your wingman:"** (700 `#C4B5FD`) + `wingman_advice` in `#E5E7EB`.
- Section label **"I'D SEND THIS 👇"**, then the **reply card** (`#11121C`, border `#2A2B3A`, radius 20, padding 18): the reply in serif 17px 500 `#F8FAFC`; below a hairline (`#1B1C29`) action row: **Copy** (`#C4B5FD`, 700, copy icon) · **Edit** (`#A1A1AA`, pencil) · **Regenerate** (`#A1A1AA`, refresh). One primary reply shown (first/best), not three cards.
- Section label **"OR MAKE IT…"** + chips: **Funny · Romantic · Confident · Shorter · Longer** — tapping regenerates with that modifier (reuse regenerate flow with a tone hint param — send via existing `user_note` if no dedicated param).
- **Copied toast** (on Copy): centered pill above the tab bar — bg `#171827`, border `rgba(167,139,250,.35)`, radius 999, padding 9×17, `✦` lavender + 13px 600 `#E5E7EB` **"Copied — go get 'em."**, auto-dismiss ~1.6s.
- Tab bar visible, Reply active. Resilient fallback: if `insight` missing, hide the block and show the reply card(s) as today.

Report + stop.

## PR-V2-4 — Ask Lovli (new tab + new endpoint)

**Backend (new, approved):** `POST /api/ask-lovli` — auth required.
- Request: `{ "message": string, "history": [{role: "user"|"lovli", text: string}], "person_id": string|null }` (history capped ~20 turns server-side; `person_id` optionally pulls that Memory card into context).
- Response: `{ "reply": string }`. Same LLM stack as generate-replies; coach persona system prompt (warm wingman, Hinglish-aware, qualitative-only honesty rule, short conversational answers, asks one good follow-up when useful). Rate-limit with the existing daily usage plumbing (count each message; same `daily_limit` plan gates).
- Add to API_CONTRACT.md.

**UI (match "V2 · Coach — Ask Lovli"):**
- Header: `✦` 19px lavender glow + serif **"Ask Lovli"** 26px.
- **Lovli bubbles** left: 30px round avatar (`#171827`, border `rgba(167,139,250,.35)`, lavender ✦, soft glow) + bubble `#171827`, border `#2A2B3A`, radius 20/20/20/5, padding 14×17, 14.5px `#E5E7EB`, max-w 82%.
- Greeting (always first): **"Hey — what's on your mind? Tell me the situation, or ask me anything. No judgement, promise."**
- **Starter chips** under the greeting (left-aligned column, 8px gap, indented 40px past the avatar): **"Help me respond to a message" / "Is this a red flag?" / "How do I restart a dead convo?"** — lavender-tint chip style (text `#C4B5FD`, fill `rgba(167,139,250,.1)`, border `rgba(167,139,250,.3)`, radius 999, padding 9×15). Tap = sends as user message. Hide once conversation starts.
- **User bubbles** right: bg `rgba(167,139,250,.16)`, radius 20/20/5/20, 14.5px `#F8FAFC`, max-w 82%.
- **Input bar** above tab bar: pill field (`#11121C`, border `#2A2B3A`, radius 999, padding 14×19, placeholder **"Message Lovli…"** 14.5px `#71717A`) + 46px white round send button (up-arrow, dark, CTA shadow).
- Typing indicator while waiting (pulsing ✦ avatar + "…" bubble). Persist the thread locally per session; "New chat" via header long-press NOT needed — keep simple, thread resets are out of scope.
- Tab bar: Ask Lovli active (✦ glowing).

Report + stop.

## PR-V2-5 — Decode surface + More · Tools grid (new endpoint)

**Backend (new, approved):** `POST /api/decode` — auth required. Same multipart input contract as `/generate-replies` (`image` or `manual_text`, plus optional `feeling`, `memory_card_id`). Response:
```json
{
  "vibe_label": "Not into it | Mixed signals | Leaning interested",
  "vibe_headline": "…",               // serif one-liner, e.g. "Leaning interested."
  "positive_signs": ["…"],
  "watch_outs": ["…"],
  "whats_really_going_on": "…",
  "next_move": { "wingman": "…", "likely_outcome": "…" }
}
```
Qualitative only — the 3 labels above are the ONLY scale values. Add to API_CONTRACT.md.

**5a. Decode result (match "V2 · Coach — Decode"):** entry: "Decode the situation" / "Read the signals" tools in More (both route here; input step reuses the Reply Home upload/paste components, then the PR-V2-2 loader with decode-flavored stages).
- Back header: chevron + serif 20px **"The decode"**.
- **Overall vibe card** (elevated glass, radius 22, padding 20): label **"OVERALL VIBE"**; serif 23px 500 headline (`vibe_headline`, e.g. **"Leaning interested."**); below, the **3-segment meter**: three equal bars (7px, radius 4, gap 5) — inactive `#2A2B3A`, the segment matching `vibe_label` filled `linear-gradient(90deg,#A78BFA,#8B5CF6)` + glow; under it the three labels 10.5px — **"Not into it" / "Mixed signals" / "Leaning interested"**, inactive `#3F3F46` 600, active `#C4B5FD` 700.
- Section **"POSITIVE SIGNS"**: lavender-✦ bulleted lines (13.5px `#A1A1AA`).
- Section **"WATCH-OUTS"**: same but ✦ in pink `#F0A5B2`.
- Section **"WHAT'S REALLY GOING ON"**: paragraph 13.5px `#A1A1AA`.
- **"YOUR NEXT MOVE" card** (`#11121C`, border `#2A2B3A`, radius 20, padding 17×18): **"If I were your wingman:"** (700 `#C4B5FD`) + `next_move.wingman` in `#E5E7EB` 14px; then **"Likely outcome:"** (700 `#71717A`) + `next_move.likely_outcome` 13px `#71717A`.
- Footer actions row (centered, 26px gap): **"Save to Memory"** (bookmark icon, `#C4B5FD`) — saves a note to the chosen person's card; **"✦ Ask Lovli about this"** (`#A1A1AA`, lavender ✦) — opens Ask Lovli with the decode summary preloaded as context.

**5b. More · Tools (match "V2 · Coach — More · Tools"):**
- H1 serif 26px **"More tools"**, sub 13.5px `#A1A1AA` **"For when you need more than a reply."**
- Three labeled sections, 2-col grid cards (`#11121C`, border `#2A2B3A`, radius 18, padding 12; 30px icon tile radius 10 `rgba(167,139,250,.12)` with 17px lavender line icon; title 13.5px 600 `#F8FAFC`; sub 11.5px `#71717A`):
  - **MAKE SENSE OF IT** — *Decode the situation* / "What's really going on?" (magnifier) · *Read the signals* / "Into you, or not?" (mini bar-chart) · *The other side* / "How they might see it." (clock/perspective).
  - **MAKE A MOVE** — *Glow up my reply* / "Make my draft land better." (✦) · *What should I do?* / "Your next move, mapped." (compass/route).
  - **WORK IT OUT** — *Settle the fight* / "Say it without the sting." (pen) · *Red flag check* / "Spot it early." (flag icon in rose `#E0667A` on `rgba(224,102,122,.12)` tile — the one non-lavender tile) · *Fair verdict* / "Who's right? Honestly." (scales) · *Breakup clarity* / "Closure, not spiralling." (heart-off).
- That's **9 tools** ("Ask Lovli anything" removed — it's the tab). Map each tile to the existing feature flows (restyled input/result using the V2 components); *Decode the situation* + *Read the signals* use the new `/api/decode`.
- Tab bar: More active.

Report + stop.

## PR-V2-6 — Memory · List + Timeline (additive backend fields)

**Backend (additive, approved):** extend the MemoryCard model with optional fields (old cards unaffected; all optional):
- `stage` (string, e.g. "Talking"), `stage_duration` (string, "3 weeks"), `platform` (exists? if not: string "Hinge"), `city` (string), `timeline`: `[{title, date_label, detail, upcoming: bool}]`, `facts`: `[{text, kind: "like"|"avoid"|"date"}]`.
- CRUD via existing `GET/POST /api/memory-cards` (+ add `PATCH /api/memory-cards/{id}` if not present — additive). Update API_CONTRACT.md.

**6a. Memory · List (match "V2 · Coach — Memory · List"):**
- H1 serif 32px **"Memory"**.
- Serif intro 24px 500 max-w 300: **"I remember the little things — so you never fumble them."** Sub 14.5px `#A1A1AA` max-w 285: **"Save a person and I'll keep track of what you tell me — names, dates, inside jokes."**
- White CTA **"✦ Add a memory"** (padding-y 17).
- Section label **"YOUR PEOPLE"**, then person cards:
  - Primary card (elevated `#171827`, border `#2A2B3A`, radius 20, padding 17, soft glow shadow): 44px gradient avatar w/ initial; serif name 18px; sub 12.5px `#71717A` (e.g. **"Hinge · talking 3 weeks"**); right chevron `#52525B`; below, fact chips (lavender tint, 12px 500 `#C4B5FD`, e.g. **"Birthday Aug 9"**, **"Dog: Simba"**).
  - Secondary cards: same layout, flat `#11121C`, avatar = lavender-tint circle with `#C4B5FD` initial, no chips row required (e.g. **"Kabir — College friend · it's complicated"**).
- Tab bar: Memory active (heart icon).

**6b. Memory · Timeline / person detail (match "V2 · Coach — Memory · Timeline"):**
- Header row: back chevron left, **"Edit"** right (13.5px 600 `#C4B5FD`).
- Person header: 56px gradient avatar (glow `0 0 26px rgba(167,139,250,.3)`); serif name 24px; below: stage pill (11.5px 700 `#C4B5FD` on `rgba(167,139,250,.14)`, e.g. **"Talking · 3 weeks"**) + 12px `#71717A` meta (**"Hinge · Mumbai"**).
- Section **"YOUR STORY SO FAR"** — vertical timeline: 11px lavender dots (`#A78BFA`, glow `0 0 10px rgba(167,139,250,.6)`) joined by 1.5px `#2A2B3A` lines; upcoming items use an outlined dot (1.5px `#A78BFA` ring, no fill). Each entry: title 14px 600 `#F8FAFC` + detail 12.5px `#71717A` (design examples: *Matched on Hinge — "June 12 — she liked your Goa photo"*, *First coffee date — "June 21 — Blue Tokai, went 3 hours"*, *Mentioned her dog, Simba — "June 28 — golden retriever, her whole world"*, upcoming: *Her birthday — "Coming up — August 9"*).
- **"＋ Add a moment"** link (13px 600 `#C4B5FD` with plus icon) under the timeline → simple add-entry sheet (title, date label, detail).
- Section **"THE LITTLE THINGS"** — fact chips: kind `like`/`date` = lavender tint `#C4B5FD`; kind `avoid` = pink `#F0A5B2` on `rgba(224,102,122,.12)` (e.g. **"Filter coffee over chai"**, **""The biryani incident""**, **"Avoid: one-word texts"**).
- Timeline + facts feed generation/decode context when this person's card is selected (pass `memory_card_id` as today).

Report + stop.

## PR-V2-7 — Premium + Settings (visual only; no payments)

**7a. Premium (match "V2 · Coach — Premium"):**
- Hero bg + ambient glow anchored top (circle 420×340, top −120).
- Header: 32px dim close circle (`rgba(248,250,252,.07)`, grey ×) left; right: `✦` + **"LOVLI PREMIUM"** (13px 700 .04em `#C4B5FD`).
- Before/after: strikethrough line 15px `#71717A` (strike color `rgba(224,102,122,.6)`): **"Overthinking every text."** → H1 serif 34px: **"Always know what to say."** (two lines).
- Outcome checklist (14px row gap): 28px circles `rgba(167,139,250,.14)` with lavender check + 15px 500 `#E5E7EB`:
  **Unlimited replies, any situation / Relationship memory for everyone you're talking to / Deeper message decoding / Ask Lovli anytime — no limits / Priority AI — faster, sharper answers**.
- Plan cards:
  - **Yearly** (selected): `#171827`, 1.5px `#A78BFA`, radius 20, glow; left: "Yearly" 15px 700 + **"2 months free"** 12.5px 600 `#C4B5FD`; right: **"₹291/mo"** (17px 700, "/mo" 13px `#71717A`) + **"₹3,499 billed yearly"** 12px `#71717A`; floating badge top-right −10px: **"BEST VALUE"** (10.5px 700, `#A78BFA` bg, dark text, radius 999, shadow).
  - **Monthly**: flat `#11121C` card — "Monthly" / **"₹399/mo"**.
- White CTA **"✦ Start 7 days free"**; below, 12px `#71717A` centered: **"Then ₹3,499/year · Restore · Terms"**.
- `PAYMENTS_ENABLED=false`: CTA posts to `/api/waitlist {type:'pro', source:'premium_v2'}` and shows a confirmation state. No tab bar on this modal screen.

**7b. Settings (match "V2 · Coach — Settings"):**
- Back header: chevron + serif 20px **"Settings"**.
- **ACCOUNT** card: 32px gradient avatar + email 14px 600; right **"✦ PREMIUM"** badge (10.5px 700 dark-on-lavender, radius 999) — show only for pro plan.
- **PREFERENCES** card (rows 13×17, dividers `#1B1C29`, value = 13px 600 `#C4B5FD` + chevron `#52525B`): **Default language** (Hinglish — keep all three backend options: English / Hinglish / Hindi + English mixed) · **Default vibe** (Playful) · **I'm dating** (Women). These are the defaults sent with every generation (replacing the removed on-screen toggles).
- **NOTIFICATIONS** card, toggle rows: **Date & birthday reminders** (on) · **Weekly check-in from Lovli** (off). Toggle: 42×25 pill — on: `#A78BFA` + glow, white 19px knob right; off: `#2A2B3A`, `#71717A` knob left.
- **PRIVACY** card: **Lock with Face ID** (toggle, on) · **Delete my memories** (chevron row → confirm flow wired to existing data-deletion).
- Footer card: **Restore purchases** (14px 600 `#C4B5FD`) / **Log out** (14px 600 `#F0A5B2`), divider between.

Report + stop.

---

## QA / ACCEPTANCE (run after each PR, full pass at the end)
1. Visual diff every implemented screen against its purple-labeled V2 frame in the attached files — spacing, hex values, radii, copy must match (copy above is exact).
2. Old-client compatibility: `POST /api/generate-replies` without new params returns the current shape byte-identical; new endpoints don't affect existing routes.
3. Honesty audit: grep UI + prompts for `%`, "score", "confidence" — none rendered anywhere.
4. All 9 More tools reachable and functional; Ask Lovli removed from the grid; 4 tabs work with correct active states.
5. Dark theme audit: no light-theme remnants in any tab flow; safe areas correct on notch + non-notch devices; blur tab bar renders on Android (fallback: solid `rgba(9,10,20,.96)`).
6. Copy toast, staged loader timing, chip single-select behavior, skip-ability of the feeling row all verified on device.
