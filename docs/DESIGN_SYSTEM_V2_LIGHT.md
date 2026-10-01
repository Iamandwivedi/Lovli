# Lovli — Design System v2 (LIGHT) — supersedes PR1's dark palette

> **Direction change (Aman, this session).** Flip from the dark base to a **light, near-white
> layout with dark text, a glossy black primary CTA, and violet as the primary accent.**
> Editorial serif headers (Sitch-style), clean sans body. Rose→coral gradient is **retired.**
>
> **References:** `IMG_4309.pdf` (Sitch — light bg, serif headers, black pill buttons) and the
> Lovli brand sheet (violet sparkle logo on white, purple palette).
>
> **Why this is a contained change:** PR1 put every screen on theme tokens. Swapping
> `colors.ts` + `PrimaryButton` + typography + the tab/status bars re-skins the whole app;
> individual screens follow automatically. Keep all token NAMES from PR1 as aliases pointing
> at the new light values so nothing breaks.

---

## 1. Colors (`mobile/src/theme/colors.ts`)

Replace the dark values; **keep every existing token name as an alias** → new light value.

```
# Base
background        #F7F6FB   App background — soft near-white, faint cool-violet tint (premium, not sterile)
surface           #FFFFFF   Card / sheet background (white pops against the bg)
surfaceRaised     #FFFFFF   Raised card — same white, lifted by shadow not color
hairline          #ECEAF3   Borders / dividers / 1px outlines

# Text
textPrimary       #14121C   Near-black headings & body (faint warm)
textSecondary     #6A6577   Sub-copy, helper text
textMuted         #9A95A8   Placeholders, captions, disabled

# Accent (violet = THE primary accent)
violet            #7C5CFF   Active tab, sparkle ✦, selected ring, focus border, icons
violetDeep        #6A4BEE   Violet TEXT / links (use this, not #7C5CFF, for small text — contrast)
lavender          #B9A8FF   Soft secondary accent
violetTint        #EDE9FF   Selected-chip fill, icon-tile background (the soft lavender square)

# Primary CTA — glossy black
ctaBase           #0B0B10   Button base
ctaGlossTop       #2A2733   Top of the vertical gloss gradient → bottom = ctaBase
ctaText           #FFFFFF   Label + ✦
ctaHighlight      rgba(255,255,255,0.12)   1px inner top highlight (the "shine")

# Semantic flags (darkened for contrast on white)
greenFlag         #15A34A
amber             #D97706
redFlag           #DC2626

# Shadows
shadowCard        rgba(20,18,28,0.06)   Soft card lift (0 6 18)
shadowCta         rgba(11,11,16,0.28)   Black-CTA drop shadow (0 8 24)

# RETIRED — remove from use (delete or alias to violet so stragglers don't show rose)
rose, coral, gradientStart, gradientEnd  → no longer the hero. If a token is still imported
somewhere, alias gradientStart/End to ctaGlossTop/ctaBase so any leftover gradient renders
as the black gloss, not rose.
```

**Contrast notes (WCAG):** `textPrimary` on `background` ≈ 16:1 ✓. `textSecondary` ≈ 5:1 ✓.
`violet #7C5CFF` on white ≈ 4:1 — fine for icons/borders/large text, **but use `violetDeep
#6A4BEE` for any small violet text or links.**

---

## 2. Typography (`mobile/src/theme/typography.ts`)

**Headers → editorial serif. Body/UI → keep Plus Jakarta Sans (already bundled in PR1).**
**Retire Clash Display** as the header face (leave the TTFs in `/assets/fonts` unused, or delete).

- **Display / headers:** **Fraunces** — warm, characterful old-style serif with real weight
  range for hierarchy. Load via `@expo-google-fonts/fraunces` (`Fraunces_600SemiBold`,
  `Fraunces_700Bold`). Warm fits Lovli's "witty friend" better than a cold didone.
  - *Alt if you want the colder, higher-contrast Sitch look:* **Instrument Serif**
    (`@expo-google-fonts/instrument-serif`) — elegant but single-weight (limits hierarchy).
    Recommend Fraunces.
- **Body / UI:** **Plus Jakarta Sans** (unchanged from PR1).

Scale: titles 28–32 Fraunces Bold (tight line-height ~1.05), section heads 20 Fraunces
SemiBold, body 15–16 Jakarta Regular/Medium, caption 13 Jakarta. Headers in `textPrimary`.

> Load the new font(s) in `app/_layout.tsx` alongside Plus Jakarta Sans; hold splash until
> ready (same FOUT-prevention pattern PR1 already established).

---

## 3. Component deltas (public APIs unchanged — visual only)

- **`PrimaryButton`** — was rose→coral gradient → now **glossy black pill.** Fill = vertical
  gradient `ctaGlossTop #2A2733 → ctaBase #0B0B10`; 1px inner top highlight `ctaHighlight`;
  drop shadow `shadowCta`; white label + trailing ✦ (violet or white). Full pill radius.
  Keep spring press-to-0.97. Props unchanged. *(This is the "shiny black Generate replies" button.)*
- **`SecondaryButton`** — light style: white/transparent fill, `hairline` border,
  `textPrimary` label. Danger variant uses `redFlag`.
- **`Chip`** — unselected: transparent fill, `hairline` border, `textSecondary` label.
  Selected: `violetTint #EDE9FF` fill + `violet #7C5CFF` border + `violetDeep` label.
  (Replaces the dark violet-glow selected state.)
- **`GlassCard`** — white `surface`, radius 22, soft `shadowCard` lift; optional 1px
  `hairline`. (Borderless-white-with-shadow reads cleanest, Sitch-style.)
- **`Input`** — white field, `hairline` border, radius 16; focus border `violet #7C5CFF`.
- **`AppHeader` / `LovliLogo`** — violet ✦ sparkle stays; wordmark "lovli" now renders in
  **Fraunces** (or keep the brand-sheet sans logo if you prefer the exact logo lockup).
  `CreditsChip` ("10 free left" / "Pro") on light: `violetTint` fill, `violetDeep` text.
- **`Sparkle`** — unchanged (violet ✦); shows well on light.

---

## 4. Chrome that must flip with the theme

- **Bottom tab bar** — light bg (`surface`/translucent), top hairline `#ECEAF3`, active tab
  `violet #7C5CFF`, inactive `textMuted #9A95A8`. (Currently dark — must invert.)
- **Status bar** — switch to **dark content** (`<StatusBar style="dark" />` / `barStyle
  dark-content`) since the background is now light.
- **Icon tiles** behind the More-grid emojis → `violetTint #EDE9FF` squares (were dark).
- **Splash / app background** — light.

---

## 5. How this slots into the PR plan

Emergent is mid-**PR2** (3-tab nav done; routing + restyle Reply/Memory pending). **Do the
light conversion FIRST so PR2's restyle targets light tokens — don't restyle to dark then
redo.** Suggested:

- **PR2.1 — Light Design System v2 (this doc):** swap `colors.ts` (light values + aliases),
  `typography.ts` (Fraunces headers), `PrimaryButton` (glossy black), `Chip`/`GlassCard`/
  `Input` light states, tab bar + status bar flip, load new font. **No screen logic changes.**
- Then **finish PR2** (routing `/(tabs)/pro → /paywall`, paywall flagged off, restyle Reply +
  Memory) against the new light tokens.
- PR3+ proceed as planned, all on the light system.

Everything else from v2 (3 tabs, mocked features on `/api/feature`, payments flagged off,
Memory kept) is unchanged — this is purely the visual language.

---

### Definition of done (PR2.1)
- App is light/near-white, dark text, **glossy black primary CTA**, violet accent everywhere.
- Editorial **serif headers (Fraunces)** + Plus Jakarta body; Clash Display retired as header.
- Rose→coral fully gone (no rose/coral pixels; any leftover gradient token renders black).
- Tab bar + status bar flipped to light; all token names preserved as aliases (zero screen breaks).
- `/backend` + `/frontend` untouched; no behavior changes.
