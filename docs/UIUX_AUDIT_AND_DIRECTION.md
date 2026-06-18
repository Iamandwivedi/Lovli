# Lovli — UI/UX Audit & Design Direction (Mobile)

Prepared by the Design tab. No Figma created yet — this is the direction document for approval.
Basis: full read of `DESIGN_HANDOFF.md`, `docs/PROJECT_OVERVIEW.md`, `docs/MOBILE_SETUP.md`, and the live web frontend code (`AppReply.jsx`, `Onboarding.jsx`, `Memory.jsx`, `Pro.jsx`, `Settings.jsx`, auth pages), plus external UX research.

---

## 1. Current Lovli UX diagnosis

**What's already strong (keep, don't reinvent):**
- The design system is mature and disciplined: binding palette, 22/16/17/14 type rhythm, white-pill CTA, lavender-only accent, safe-area rules. This is rare for a product at this stage — the mobile app should inherit it, not replace it.
- Reply screen "Option B" layout is correct: upload-first, language visible, customize collapsed with a live summary. Low form fatigue.
- Copy discipline is excellent: tone labels instead of "Option 1/2/3", banned-vocabulary list, soft Memory labels, honest Pro framing.
- Trust cues exist at the right places (auth, upload, memory, settings).

**The real gaps are in the journey, not the visuals:**

1. **Onboarding delivers zero value.** "A few quick basics" is a settings form. A new user signs up, answers two preference questions, lands on an empty Reply screen. They never *see* what Lovli output looks like before being asked to do work (find a screenshot, paste a chat). Research is consistent here: AI consumer apps that show output before asking for input activate dramatically better.
2. **Cold-start dead end.** A user with no screenshot handy and no chat to paste has nothing to do. There's no example/demo path. This is the single biggest activation leak.
3. **Redundant empty state.** The card below the form ("Upload a chat screenshot to get started") repeats what the form above already says. Wasted prime space.
4. **Results live below the form.** After generating, the user scroll-jumps past the full input form. On mobile this should be a focused Results screen — replies as the hero, form gone.
5. **Memory is invisible until the user taps the tab.** The only in-flow mention is a muted line inside collapsed Customize. There's no moment connecting "this reply worked" → "save what you learned."
6. **Limit-hit moment is abrupt.** Free user at 8/8 goes straight to an upgrade modal. No warmth, no "resets at midnight" honesty.
7. **`window.confirm` on regenerate** breaks the premium feel (native browser dialog).
8. **The strongest trust fact is buried.** "Screenshots aren't stored" lives only in Settings → Privacy. It belongs at the moment of upload — that's when anxiety peaks.
9. **Vibe resets to Playful every session; language doesn't echo recency.** "Continue where you left off" hooks from the brief aren't realized.

---

## 2. Main user jobs-to-be-done

1. **"I got a message and I'm overthinking. Give me something I can send right now."** (core, time-pressured, emotional)
2. **"Make my reply sound like me — natural Hinglish, not a pickup line."** (identity/authenticity)
3. **"Help me not mess this up with this specific person."** (Memory's job)
4. **"Let me do this privately, without anyone knowing I use an app."** (discretion — dark UI, no loud branding, no social features)
5. **"Reduce my anxiety, don't add to it."** (emotional job — calm visuals, no scores, no judgment)

Every screen decision should be testable against job #1: time from app-open to copied reply.

---

## 3. Biggest friction points (ranked)

| # | Friction | Where | Severity |
|---|---|---|---|
| 1 | No value preview before first effort | Onboarding → Reply | High |
| 2 | No example/demo chat for cold start | Reply screen | High |
| 3 | Results buried under input form | Post-generation | High |
| 4 | Memory discovery near-zero in flow | Reply ↔ Memory | Medium |
| 5 | "Screenshots aren't stored" hidden in Settings | Upload moment | Medium |
| 6 | Abrupt limit-hit modal | Free limit | Medium |
| 7 | Native confirm dialog on regenerate | Results | Low |
| 8 | No recency/continuity cues | Reply screen | Low |

---

## 4. Activation hook opportunities

Target moment: **"I got a reply I can actually send" within the first session, under 60 seconds.**

1. **Value-first onboarding (biggest lever).** Keep the two questions (platform, language) but wrap them in a 3-step flow where step 1 *shows* the product: a mock chat snippet morphing into 3 reply cards (animated, ~2s). Step 2: "Where do you mostly chat?" Step 3: language. Skippable throughout. The user arrives at Reply already knowing what the payoff looks like.
2. **"No screenshot? Try an example"** — a quiet text link under the paste field that drops a canned Hinglish chat into the textarea (pure client-side, no backend change). One tap → generate → aha moment with zero personal exposure. This also de-risks the privacy fear on first use: they try it with fake data first.
3. **First-run state of the Reply screen** replaces the redundant empty card with a single example reply card (marked "Example") showing tone label + Hinglish reply — a preview of the payoff sitting right below the CTA.
4. **Paste-first emphasis on first session.** Research on screenshot-upload UX says upload feels heavier than paste for first-timers. Keep upload visually primary (it's the long-term habit) but let the example link lower the floor.

---

## 5. Trust-building opportunities

Principle: **trust cues at the moment of anxiety, not in a settings page.**

1. Move "Screenshots are never stored" to the upload card itself (12.5px, LockKeyhole, muted) — shown at least on first upload. Settings keeps the longer version.
2. Keep existing cue placement (auth: "Your chats stay yours.", memory: "Private by default…").
3. **Discretion as a feature:** the app already looks nothing like a dating app — preserve this. No hearts, no pink, no flame icons anywhere in mobile. Splash and app icon should be abstract/calm so it's safe to open in public.
4. Loading state microcopy that's calm and transparent: "Reading the chat…" → "Writing natural replies…" (two quiet steps, no fake progress bars). Reduces black-box anxiety about what the AI is doing.
5. Never use urgency, counters of other users, or social proof — consistent with the brief; research confirms fabricated proof destroys trust in sensitive-data products.

---

## 6. Retention opportunities

Retention = usefulness loop, not gamification. Mapping to the Hook model without dark patterns:

- **Trigger** (internal): "I don't know what to reply" — already strong; no notifications needed yet.
- **Action**: keep generation under 3 taps from app open. Remember last-used language and vibe per session start ("Last time: Hinglish • Playful" quiet restore) — implements "continue where you left off."
- **Reward**: 3 replies with tone variety is already a variable reward. Keep regenerate cheap-feeling but honest about the generation cost (replace `window.confirm` with a styled inline confirm).
- **Investment** (the missing piece): **Memory is Lovli's retention engine.** Each saved Memory makes the next session's replies measurably better → classic stored-value loop. The design job is connecting the success moment to the investment moment:
  - After a copy action, show a one-line, dismissible nudge below the cards: "Want future replies to remember them? Add a Memory." Shown max once per session, never blocks anything.
  - When a Memory *is* used, label results subtly: "Personalized with ‹nickname›'s memory" — proof the investment paid off.
- **Usage counter as gentle daily rhythm:** "3 of 8 used today" is honest scarcity, not manufactured. Keep it visible but quiet.

No streaks, no reminders, no notifications — per brief.

---

## 7. Pro conversion opportunities

Pro is waitlist-only, so the goal is **qualified desire, not pressure.**

1. **The limit-hit moment is the conversion moment.** Redesign it as a warm full-screen state, not a punishing modal: "That's 8 for today. Resets at midnight." + secondary line "Want unlimited? Get early access to Pro." Honesty ("resets at midnight") makes the upsell feel fair.
2. **Contextual whisper at 6/8:** usage counter turns lavender-tinted with "2 left today" — awareness before the wall, no popup.
3. Pro tab keeps the existing structure (stacked PlanCards, "Get Early Access", no comparison table). Design polish only: clearer hero, benefit phrasing already binding.
4. When advanced memory ships later, the Memory tab is the natural Pro surface ("Advanced memory — coming with Pro"). Note only; not designed now.

---

## 8. Design direction recommendation

**Direction: "Quiet Confidence" — evolve the existing system into a native-feeling mobile app.**

Not a redesign. The brand system (palette, type rhythm, white-pill CTA, lavender accent) carries over exactly. What changes is *structure and feel*, using native mobile patterns the web app couldn't:

1. **Reply → Results as two screens** (stack navigation). Input screen stays calm; Results screen makes the 3 cards the hero with a compact context bar on top ("Instagram • Hinglish • Playful") and a "New chat" action. This fixes friction #3 and matches your screen list (screens 5 and 7 are already separate in the brief).
2. **Customize as a bottom sheet** instead of inline accordion. Native, thumb-friendly, keeps the main screen at a fixed calm height on small phones. Collapsed summary chip stays on the main screen.
3. **Haptics on key moments** (copy success, generation complete) — subtle, Expo-supported.
4. **Toast → "Copied. Go send it."** kept, plus light haptic.
5. **Typography:** keep Space Grotesk + Figtree. Slightly larger reply text on mobile (17px stays, line-height 1.6) — replies are the hero content.
6. **Depth model:** background #050509 → card #11121C → sheet/modal #171827; elevation by surface lightness + soft shadow, not glow. Dark-mode research: avoid pure-black-on-white halation — already handled by your off-white text tokens.
7. **Motion:** existing rules (fade-up 200–320ms, 80ms stagger) port directly to Reanimated; nothing springy except nav indicator.
8. **Onboarding:** 3 light steps with value preview (see §4.1), progress dots, skip always visible.

What we deliberately do NOT do: glassmorphism-heavy effects (expensive in RN), gradient fills, any new bottom tabs, any new reply-card actions, scores of any kind.

---

## 9. Screen-by-screen improvement plan

1. **Splash** — black #050509, LovliMark centered, no tagline, no animation beyond a soft fade. Discreet by design.
2. **Login / Signup** — port web layout (glass card, 22px h1, "Your chats stay yours." cue, Google button). One change: warmer h1 ("Welcome back" / "Nice to meet you") instead of generic "Log in".
3. **Onboarding (3 steps)** — NEW: step 1 value preview animation; step 2 platform; step 3 language. Skip on every step. Ends on Reply screen.
4. **Reply screen** — keep Option B order. Changes: privacy line on upload card ("Screenshots are never stored"); "No screenshot? Try an example" link under paste field; first-run example reply card replaces redundant empty state; customize opens bottom sheet; usage counter with 2-left lavender state.
5. **Customize bottom sheet** — platform chips, vibe chips, memory selector, quick note. Drag handle, "Done" pill. Summary chip updates live on main screen.
6. **Generating state** — full-card calm loader, two-step microcopy ("Reading the chat…" → "Writing natural replies…"), lavender dots kept.
7. **Results screen** — context bar (platform • language • vibe, tappable to go back), "Choose a reply" h2, 3 cards with tone label + Copy + Regenerate only, optional "Personalized with ‹nickname›'s memory" line, post-copy Memory nudge (once per session), "New chat" ghost button at bottom.
8. **Limit-reached state** — warm full-screen card: "That's 8 for today. Resets at midnight." + Get Early Access secondary path. Replaces abrupt modal.
9. **Memory empty state** — BookHeart hero, existing copy, Add Memory CTA; add one illustrative ghost card showing what a memory looks like (greyed example).
10. **Memory list** — journal cards, soft labels, hide empty fields, Edit/Delete.
11. **Add/Edit Memory** — full screen (not modal, better for keyboards on mobile), 3 form sections per brief, privacy line, Save Memory pill.
12. **Pro screen** — port existing structure; polish hero spacing; Coming soon pill; waitlist form with 5 reason chips.
13. **Settings** — port 4 sections; top-right cog entry only.
14. **System states** — error toast style, offline state ("You're offline. Replies need a connection."), generation failure ("Lovli couldn't generate replies right now. Try again."), image-too-large, empty memory selector.

---

## 10. What I need you to approve before Figma

Decisions that change flow or copy (everything else is within the existing system):

1. **Value-preview onboarding step** (mock chat → replies animation before the 2 questions). Yes/no?
2. **"Try an example" link** on the Reply screen (canned chat pasted client-side; no backend change). Yes/no?
3. **Results as a separate screen** on mobile (vs. inline below form like web). Yes/no?
4. **Customize as bottom sheet** (vs. inline accordion like web). Yes/no?
5. **Post-copy Memory nudge** (one quiet line, once per session, dismissible). Yes/no?
6. **Limit-reached full-screen state** with "Resets at midnight" honesty (vs. current modal). Yes/no?
7. **First-run example reply card** in place of the current empty state. Yes/no?

### Recommended first Figma frames (after approval)

Build order — foundation first, hero flow second, periphery last:

1. **Foundations page** — color tokens, type scale, spacing, radius, icon set.
2. **Components page** — Button (primary/secondary/destructive), Card, Input, Chip, Reply card, Upload card, Memory card, Bottom tab bar, Top header, Form section, Usage counter, Toast.
3. **Reply flow frames (390×844 + 360 check):** Reply default → Reply filled → Customize sheet → Generating → Results → Limit reached. *This is the money flow; design it end-to-end first.*
4. **Onboarding (3 frames) + Splash + Login + Signup.**
5. **Memory:** empty → list → add/edit.
6. **Pro + Settings.**
7. **States sheet:** errors, offline, loading, toasts.

---

## Research sources

- Onboarding/activation: [UXCam onboarding examples](https://uxcam.com/blog/10-apps-with-great-user-onboarding/), [Appcues onboarding tactics](https://www.appcues.com/blog/best-user-onboarding-examples), [VWO mobile onboarding guide](https://vwo.com/blog/mobile-app-onboarding-guide/)
- Trust/privacy UX: [Designing AI UIs people trust](https://highpeaksw.com/designing-ai-uis-people-actually-trust-microcopy-controls-and-recovery/), [Smashing Magazine privacy UX framework](https://www.smashingmagazine.com/2019/04/privacy-ux-aware-design-framework/)
- Conversion: [Paywall UX best practices](https://webuild.io/paywall-ux-design-best-practices/), [Adapty paywall design](https://adapty.io/blog/how-to-design-a-paywall-for-a-mobile-app/)
- Retention: [Hook model — Amplitude](https://amplitude.com/blog/the-hook-model), [Nir Eyal on app retention](https://medium.com/googleplaydev/optimize-app-retention-with-the-hooked-model-a0781f8e5d29)
- Dark mode: [Dark mode best practices 2026](https://www.tech-rz.com/blog/dark-mode-design-best-practices-in-2026/), [Appinventiv dark mode guide](https://appinventiv.com/blog/guide-on-designing-dark-mode-for-mobile-app/)
- India/localization: [Think with Google — localization for Indian users](https://www.thinkwithgoogle.com/intl/en-apac/future-of-marketing/creativity/app-website-localization-indian-users/), [Indian UX cultural perspective](https://medium.com/@thatsarhan/understanding-indian-ux-in-digital-products-a-cultural-perspective-7cdb210887dd)
