# Lovli Mobile — Design Handoff v1 (Expo / React Native)

Source of truth: `design/lovli-mobile-design-board.html` (open in any browser; import to Figma via html.to.design).
Tokens, type scale, and component rules inherit `DESIGN_HANDOFF.md` exactly — this doc only covers what's new or mobile-specific. Read both.

---

## 1. Frame list (board → screen)

| Frame | Screen | Status |
|---|---|---|
| A1 | Tokens & type specimen | reference only — mirror to `theme/` |
| B1 | Splash | build |
| B2 | Onboarding 1 — value preview | build (NEW pattern) |
| B3 | Onboarding 2 — platform | build |
| B4 | Onboarding 3 — language | build |
| B5 | Login | build |
| B6 | Signup | build |
| C1 | Reply — first run | build first |
| C2 | Reply — filled | build first |
| C3 | Customize bottom sheet | build first |
| C4 | Generating | build first |
| C5 | Results screen | build first |
| C6 | Post-copy nudge + toast | build first |
| C7 | Limit reached | build first |
| D1 | Memory — empty | build |
| D2 | Memory — list | build |
| D3 | Add/Edit Memory | build |
| E1 | Pro | build |
| E2 | Settings | build |
| E3 | System states sheet | reference for toasts/errors |

## 2. What changed vs. the web app (the 7 approved decisions)

1. **Onboarding step 1 = value preview.** Mock incoming chat ("Movie kab dekh rahe ho phir? 😏") animates into 3 mini reply cards (staggered fade-up, 80ms). Steps 2–3 are the existing platform/language questions. Skip on every step. Saves via existing `PATCH /auth/onboarding` — no API change.
2. **"No screenshot? Try an example"** — lavender text link under paste field. Tap inserts a canned Hinglish chat into the textarea client-side (constant in `constants/product.ts`). No backend change.
3. **Results is a separate screen** (`ResultsScreen` pushed onto Reply stack). Context bar: back chevron + "Platform • Language • Vibe" + usage count. Form state is preserved on back.
4. **Customize is a bottom sheet** (e.g. `@gorhom/bottom-sheet`). Drag handle, Done pill. Summary line on the collapsed trigger updates live: "Instagram • Playful • Aisha".
5. **Post-copy Memory nudge** — one dismissible row under the copied card: "Want future replies to remember them? Add a Memory". Show max once per session; never show if a memory was already used for this generation.
6. **Limit reached = warm full-screen state** (C7), not a modal: "That's 8 for today." / "Resets at midnight…" + Get Early Access + Back to Reply. Triggered at 429 or remaining=0.
7. **First-run example reply card** below the form (tone label + "Example" tag). Hide permanently after first successful generation.

Also: upload card now carries "Screenshots are never stored" lock-line; regenerate confirm is a styled inline dialog (E3), never `Alert.alert` default styling if avoidable, never `window.confirm`.

## 3. Interaction notes

- **Haptics:** `expo-haptics` light impact on Copy success and generation complete. Nothing else.
- **Copy:** `expo-clipboard`; button swaps to "Copied" (lavender outline) for 1.8s + toast "Copied. Go send it."
- **Generating:** two-step microcopy — "Reading the chat…" then "Writing natural replies" (swap at ~40% of typical latency). Three lavender dots pulse. No progress bars.
- **Usage whisper:** at 6/8 the usage chip turns lavender-tinted: "6 of 8 used today · 2 left". No popup.
- **Motion:** fade-up 8px/200–320ms, 80ms stagger on reply cards, bottom-sheet spring per library default. Nothing bouncy.
- **Memory used:** results screen shows quiet line "Personalized with ‹nickname›'s memory" under the heading when applicable.

## 4. Implementation notes for Expo

- Theme files mirror frame A1: `colors.ts`, `typography.ts` (Space Grotesk via `expo-font`, Figtree body), `spacing.ts` (4px base; card padding 16–20), `radius.ts` (12 input / 16 card / 24 sheet & nav / 999 pills).
- Glass effect: use solid `#171827` at 92–95% opacity + border. **Do not use expo-blur on scrolling lists** (perf); blur acceptable on the static bottom nav only.
- CTA glow: `shadowColor #A78BFA, shadowOpacity 0.22, shadowRadius 16, elevation 8`.
- Bottom nav: floating pill, 3 tabs (Reply/Pro/Memory), lavender top indicator on active tab, safe-area aware. Settings via top-right cog only.
- Status-bar style light; root background `#050509` (also splash backgroundColor in `app.json`).
- All copy strings in this doc and the board are binding — see `docs/PROJECT_OVERVIEW.md` banned vocabulary.

## 5. Build order

1. Theme + core components (Button, Card, Input, Chip, Screen, BottomTabs, TopHeader).
2. Reply flow C1→C7 end-to-end including API wiring. This is the activation path; ship it first.
3. Auth + onboarding (B2 animation can be a static composition first, animate later).
4. Memory D1–D3, Pro E1, Settings E2.
5. System states E3 polish pass.

## 6. Do not build

- No notifications, reminders, streaks, gamification.
- No new reply-card actions (no Save/Share/Score/Rate/Shorter/More flirty).
- No comparison table on Pro, no pricing, no "Most Popular".
- No real delete-account logic (placeholder stays disabled).
- No scores/predictions of any kind anywhere.

## 7. Open questions for Aman

1. Canned example chat text — approve the one on the board (movie-plan tease) or supply your own?
2. Memory nudge frequency: once per session (current spec) or once per day?
3. B2 onboarding animation: animated on v1 or static composition first?
