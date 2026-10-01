# EMERGENT PROMPT — Lovli design alignment (match the new Claude design)

> **Paste everything below the line into Emergent, and attach the 3 design files**
> (`Lovli.pdf`, `Lovli.html`, `Lovli AI Dating Coach.zip`). The attached design is the
> visual source of truth; this prompt is the screen-by-screen deltas + the rules the files
> can't convey (notably: show ALL 10 real features in More, keep payments off, keep the
> backend untouched except the already-approved PR-INT).

---

## CONTEXT
Existing Expo/RN (SDK 54) light-theme app in `/app/mobile` (PR1→PR3 shipped). The attached
design is a refinement of the SAME design system — it uses the app's existing tokens verbatim
(`#14121C` text, `#7C5CFF` violet, `#6A4BEE` deep, `#ECEBF3`/`#F7F6FB` bg, `#EDE9FF`/`#E4DCFF`
tints, `#3D3A47`→`#050507` glossy-black CTA, Fraunces + Plus Jakarta Sans). So this is a
restyle/relayout, not new infrastructure. Implement it as the PRs below, one at a time, stop
for review after each.

### HARD CONSTRAINTS
- ✅ Light theme, existing tokens/components. ❌ No dark regression, no framework change.
- ✅ Backend untouched **except** PR-INT (already approved: additive `rich=true` on
  `/generate-replies`). ❌ No other backend/contract changes, no new endpoints.
- ✅ `PAYMENTS_ENABLED=false` stays (paywall is visual only). ❌ No live IAP.
- ✅ Memory = restyle only. ❌ No new Memory fields, no auto-extraction, no CRM.
- ✅ Honest AI only. ❌ No fabricated numbers — in particular do NOT label any tool "an honest
  score" or show a numeric % ; use "Into you, or not?" style subs instead.
- ✅ Show **all 10 real features** in More (list in PR-DA2). The design template only showed 6
  and included two we don't have ("First message", "Plan the date") — **exclude those**.

### GLOBAL CHANGES (apply across all screens — part of PR-DA1)
1. **Bottom nav reorders to `Reply · Memory · More`** (Memory moves to the middle). Icons:
   Reply = chat bubble outline, Memory = heart outline, More = 2×2 grid. Active tab = violet
   `#7C5CFF`. (Currently Reply · More · Memory — swap Memory and More.)
2. **✦ sparkle returns to the primary CTA** (e.g. "✦ Get replies", "✦ Add a memory", "✦ Start
   7 days free"). This intentionally reverses PR2.2's sparkle removal — the new design wants it.
   Keep the glossy-black pill from PR2.2; just add the leading ✦.
3. **First-person Lovli voice** in headers/subs ("I'll read the vibe and write back — in your
   voice", "Add a person and I'll keep track…"). Warm, witty, Hinglish-aware.
4. **More whitespace / airier layout** — bigger margins, more space around headlines and the
   CTA, fewer heavy borders. Premium-through-restraint, matching the attached design's spacing.

---

## PR-DA1 — Reply HOME + global restyle (no backend)
Match design screen **"01 — Reply · Home"**.
- Header: `✦ Lovli` wordmark left; a round profile avatar (user initial on `#EDE9FF`) top-right
  that opens Settings (replaces the gear; keep Settings reachable via the avatar).
- Headline (Fraunces): **"Stuck on what to say back?"** Sub: **"Drop the screenshot. I'll read
  the vibe and write back — in your voice."**
- Upload card: violet upload-tile icon + **"Upload a screenshot"** / **"From any chat app —
  PNG or JPG"**. Below it the paste field: **"Or paste the chat here…"**
- **Language toggle:** keep all THREE options (`English · Hinglish · Hindi + English mixed` —
  backend supports all three; don't drop the third) styled as the design's segmented pills,
  Hinglish selected = filled `#E4DCFF` + `#6A4BEE` text.
- **Customize** collapsed row: `Customize · Platform · Vibe · Memory` with chevron (existing
  collapsible — restyle to match).
- Primary CTA: glossy-black pill **"✦ Get replies"** (was "Generate replies"), with generous
  space above/below.
- Apply the global nav + voice + spacing changes here.
- Behavior unchanged — still calls `/generate-replies`. Report + stop.

## PR-INT — Reply GENERATED (the already-approved backend extension; UI matches design)
Match design screen **"01 — Reply · Generated"**. This is the previously-specced PR-INT
(`docs/EMERGENT_PROMPT_PR3_BATCH.md` §PR-INT). Build it so the UI matches this design exactly:
- Header: `‹ Your replies`.
- **The read** card: label "The read" + a **temperature pill** top-right. Map the model's
  `read.temperature` to the pill: `interested → "Warm"` (amber `#FFB259` dot on `#FFF3E6`),
  `neutral → "Mixed"` (muted), `cold → "Cold"` (cool grey/blue). Headline = `read.situation`
  ("She's into it — but she's waiting on you."). Below, `read.signals` as ✦-bulleted lines.
  (`read.outcome` can fold into the bullets.)
- **Reply cards:** three white cards, each with a label pill (**Safe / Flirty / Bold** from
  `reply_labels`) + a copy icon. Text = the reply.
- **`↻ Regenerate`** link centered below.
- Keep the resilient fallback to the plain 3-reply view if `rich` data is missing.
- Backend = the approved additive `rich=true` only; `rich=false` stays byte-identical. Run
  both curl smoke tests. Report + stop.

## PR-DA2 — More tools, sectioned, ALL 10 features (no backend)
Match design screen **"02 — More · Tools"** visual style (light cards, thin violet **line
icons** in `#EDE9FF` tiles — NOT the old colorful emoji tiles, NOT a big-emoji grid), but
populate it with **all 10 real features**, grouped into 3 labeled sections:

Header: **"More tools"** / **"For when you need more than a reply."**

**Make sense of it**
| Tool | Sub | Icon (Ionicons outline, closest fit) |
|---|---|---|
| Decode the situation | What's really going on? | `search` |
| Read the signals | Into you, or not? | `pulse` |
| Red flag check | Spot it early. | `flag` |
| The other side | See it from their POV | `swap-horizontal` |

**Make a move**
| What should I do? | Best move for your goal | `compass` |
| Glow up my reply | Make your draft smoother | `sparkles` |
| Ask Lovli anything | Any dating Q, no judgement | `chatbubble-ellipses` |

**Work it out**
| Settle the fight | Why it happened + how to fix | `people` |
| Fair verdict | Unbiased — who's right | `podium` |
| Breakup clarity | Stay or go? Think it through | `heart-dislike` |

- These are the canonical `feature_id`s from `docs/FEATURE_API_AND_PROMPTS.md`
  (`decode_situation, read_signals, red_flag_check, the_other_side, what_should_i_do,
  glow_up_reply, ask_lovli, settle_the_fight, fair_verdict, breakup_clarity`).
- **Exclude** the template-only "First message" and "Plan the date" (not real features).
- Cards still route to the existing feature flow / placeholder until PR4 wires the backend —
  no backend in this PR. Report + stop.

## PR-DA3 — Memory restyle + Paywall redesign (no backend)
**Memory** — match design **"03 — Memory"** (restyle only):
- Header **"Memory"** / **"Lovli remembers the little things."** Sub: **"Add a person and I'll
  keep track — names, dates, the small stuff that matters."**
- Glossy-black CTA **"✦ Add a memory"**.
- **"Recently added"** list: each saved person as a summary card — round avatar (initial),
  name (bold), a meta line (e.g. "Hinge · talking 3 weeks"), and 1–3 **fact chips** pulled
  from the EXISTING stored fields (likes / important dates / dislikes). No new fields, no
  extraction — purely a nicer render of current data.
- Emotional empty state retained.

**Paywall** — match design **"04 — Premium"** (stays `PAYMENTS_ENABLED=false`, CTA visual only):
- Eyebrow **"✦ LOVLI PREMIUM"**; Fraunces headline **"Never run out of the right words."**
- Outcome checks: **"Unlimited replies, any situation" · "Remember every person,
  automatically" · "Deeper reads, bolder moves"**.
- Two plans: **Yearly — ₹291/mo, "₹3,499 billed yearly", "2 months free", BEST VALUE**
  (selected) and **Monthly — ₹399/mo**.
- CTA **"✦ Start 7 days free"**; fine print **"Then ₹3,499/year · Restore · Terms"**.
- While `PAYMENTS_ENABLED=false`: render fully but the CTA is inert ("Coming soon" / dismiss),
  no RevenueCat. Report + stop.

---

## EXECUTION PROTOCOL
- Order: **PR-DA1 → PR-INT → PR-DA2 → PR-DA3**. One at a time, stop for review after each with
  the usual report (files changed, what/why, preserved, deps, testing, deviations).
- `/app/mobile` only, except PR-INT's single additive `/generate-replies` change.
- If anything in the attached design conflicts with the real code or these rules, surface it
  and ask — do not silently redesign or invent features.
