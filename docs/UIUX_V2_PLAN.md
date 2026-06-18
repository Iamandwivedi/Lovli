# Lovli Mobile v2 — Critique & Redesign Plan ("Calm Conversation Studio")

For approval before the v2 board is built. v1 stays untouched as reference.

---

## 1. What exactly is weak in v1

**Composition, not components.** Every screen is a vertical stack of equal-weight rounded rectangles. Nothing is the hero. The Reply screen wraps the entire flow in one big glass container, which is precisely what makes it read as "a form on a card." The eye has nowhere to land first.

**No light model.** All borders are the same opacity, all surfaces the same flatness. There's no sense of which layer is closer to you. That's the real reason it feels "static dark template" despite correct tokens — depth in premium dark UI comes from a lighting logic (top highlights, surface lightness steps, focused soft shadow), not from more borders.

**Timid typography.** 22px heroes are utility-sized, not emotional. And the board leans on 11px uppercase micro-labels everywhere (eyebrows, section caps, field labels) — that's SaaS dashboard dialect, not iOS.

**The upload/paste duality is presented as two stacked form fields.** It should be one intelligent surface with two modes.

**Results have no reward arc.** Three identical cards; the climax action (Copy) carries the same visual weight as Regenerate. The moment that should feel like a gift feels like a list.

**Memory renders as a CRM.** Nickname + uppercase field rows = database record. Soft labels alone don't fix the shape of the layout.

**Pro is a pricing pattern.** Two stacked plan cards is exactly the "standard" feel we're trying to avoid.

**Motion exists only as prose.** A static board can't communicate a motion-led product; the v2 board itself must move.

## 2. Recommended v2 concept

**"Calm Conversation Studio."** The chat is the object on a stage; Lovli is the lighting. (The "wingman" naming option is out — banned vocabulary even internally.)

Spatial model, consistent on every screen:

1. **Stage** — near-black base with one very soft off-center radial wash (≤8% lavender, never a blob).
2. **Object** — the single focal surface: the chat canvas on Reply, the lead reply on Results, the journal page on Memory.
3. **Quiet rail** — supporting controls with minimal chrome (segmented control, one customize row, metadata line).
4. **Action** — the white pill CTA, fixed and safe-area aware, always reachable.

Rule of one: one bordered focal container per viewport region. Everything else is grouped by spacing, not boxes.

The Reply screen becomes a **chat canvas**: one tall soft surface that accepts a screenshot (rendered as a polished framed object with soft shadow and a tiny privacy chip — not an attached-file row) or pasted text (rendered as chat-context, not a flat textarea), with a quiet mode toggle inside the canvas. "No screenshot? Try an example" lives inside the canvas as the cold-start escape hatch.

## 3. Visual system changes

- **Light model:** three depth steps — base `#050509` + radial wash; surface `#11121C` with a 1px top-edge highlight (white at 4–6%); floating objects `#171827` + focused shadow. Border opacity hierarchy: focal full, secondary ~60%, tertiary none.
- **Typography:** emotional heroes go to 28px display (Reply heading, onboarding, limit state); utility pages keep 22px. Body 15px. Uppercase 11px survives only as tone labels on reply cards. Looser line-heights, fewer labels overall.
- **Controls:** language becomes an iOS-style segmented control; chips reserved for vibes inside the sheet; settings becomes an iOS inset-grouped list instead of boxed sections.
- **Results:** the first card is the **lead reply** — slightly larger type, lavender hairline, full-width Copy pill; cards 2–3 sit quieter below with compact Copy + small ghost Regenerate. No scores, no ranking language — emphasis through scale and order only.
- **Memory:** journal metaphor — entries read like a written note: nickname as a title, details as flowing grouped prose with soft inline labels, divider hairlines instead of field boxes. Empty state shows a warm ghost note, not a dashed CRM card.
- **Pro:** one aspirational narrative surface — "what Pro unlocks" as four quiet moments with thin icons, a single one-line free-tier acknowledgment, Coming soon pill, Get Early Access. No plan cards, no table.
- **Bottom nav:** lighter — drop the heavy border, smaller blur surface, gliding active indicator.

## 4. Motion system changes

Named tokens, designed into the board (the v2 HTML board embeds live CSS previews of every key motion, each annotated with its Reanimated/Moti mapping):

- **Durations:** instant 120ms · quick 180ms · standard 240ms · gentle 320ms.
- **Easing:** standard `cubic-bezier(0.2, 0.8, 0.2, 1)`; exits ease-in; springs only for the bottom sheet and CTA press (scale 0.97).
- **Signature moments:** onboarding chat-to-replies morph; canvas mode crossfade; screenshot drop-in (scale 1.04→1 + shadow settle); reply cards staggered fade-up (8px, 80ms); copy success (pill morphs to "Copied" + light haptic + toast); thinking state with three-phase microcopy ("Reading the chat…" → "Finding the right tone…" → "Making it sound natural…") on a breathing dot cluster, ~1.2s crossfades.
- **Haptics map:** copy = light impact; generation complete = success notification; sheet snap = selection tick; limit reached = none (deliberately quiet).
- Dedicated Motion Spec page: trigger / before / after / duration / easing / implementation / haptic per interaction.

## 5. Screens redesigned most

Reply (complete rebuild around the canvas), Results (reward arc + lead reply), Onboarding step 1 (animated morph moment), Memory (all three screens), Pro (full reframe). Lighter pass: auth, settings, system states (calmer, warmer copy already in place).

## 6. Kept from v1

All ten approved decisions (value-preview onboarding, try-an-example, separate results screen, customize sheet, post-copy nudge, warm limit state, first-run example card, "Screenshots are never stored," styled regenerate confirm, no extra card actions), plus the IA (3 tabs, settings cog), the entire copy system and banned vocabulary, tone labels, color tokens, and the two type families. Example chat stays "Movie kab dekh rahe ho phir? 😏". Nudge = once per session. Onboarding designed animated; may ship static.

## 7. Removed or simplified

The all-encompassing glass wrapper on Reply; the duplicate empty-state card; nearly all uppercase eyebrows; the Free/Pro plan-card duo; boxes-inside-boxes (memory selector hint, settings sections); the heavy nav border; repeated full borders on secondary content.

## 8. Why this improves the four metrics

**Activation:** the canvas + example link + animated value preview cut the distance from app-open to first generation; the fixed CTA removes scroll-hunting; the lead-reply emphasis makes the first result feel like an answer, not a list to evaluate.
**Trust:** calm visual temperature is itself a privacy signal; privacy cues stay at anxiety moments (upload, memory, auth); no neon, no dashboard density — it looks like something private.
**Retention:** Memory as a warm journal makes investment feel good rather than clinical; post-copy nudge connects success → investment; recency restore keeps session start at near-zero effort.
**Pro conversion:** an aspirational single-surface Pro plus the honest limit moment ("Resets at midnight") and the 6/8 whisper builds desire without pressure — consistent with waitlist economics.

---

## Delivery plan after approval

New board `design/lovli-mobile-design-board-v2.html` with 8 sections mirroring the required Figma pages (Direction / Tokens+Components / Reply flow / Onboarding+Auth / Memory / Pro+Settings / Motion spec with live previews / Build handoff), then import to the Figma file "Lovli Mobile UI v2" via html.to.design (one Browse click on your side), then I arrange, rename pages, and QA in Figma. `MOBILE_DESIGN_HANDOFF.md` gets a v2 rewrite with states, variants, flow map, and ship-static-first guidance.
