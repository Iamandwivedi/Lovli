# Lovli — Design System v2 (LIGHT) — supersedes PR1's dark palette

> **Direction change.** Flip from the dark base to a **light, near-white layout with dark text,
> a glossy black primary CTA, and violet as the primary accent.** Editorial serif headers
> (Fraunces, Sitch-style), clean sans body (Plus Jakarta). Rose→coral gradient is **retired.**
>
> **References:** `IMG_4309.pdf` (Sitch — light bg, serif headers, black pill buttons) and the
> Lovli brand sheet (violet sparkle logo on white, purple palette).
>
> **Why this is contained:** PR1 put every screen on theme tokens. Swapping `colors.ts` +
> `PrimaryButton` + typography + the tab/status bars re-skins the whole app; individual
> screens follow automatically. Every PR1 token NAME is preserved as an alias mapped to the
> new light value so nothing breaks.

---

## 1. Colors (`mobile/src/theme/colors.ts`)

| Token              | Hex                   | Use |
|--------------------|-----------------------|-----|
| `background`/`bg`  | `#F7F6FB`             | App background — soft near-white, faint cool-violet tint |
| `surface`          | `#FFFFFF`             | Card / sheet background |
| `surfaceRaised`    | `#FFFFFF`             | Raised card — lifted by shadow, not color |
| `hairline`         | `#ECEAF3`             | Borders / dividers / 1px outlines |
| `textPrimary`/`text` | `#14121C`           | Near-black headings & body |
| `textSecondary`/`textMuted` | `#6A6577`    | Sub-copy, helper text |
| `textMuted`/`textFaint` | `#9A95A8`        | Placeholders, captions, disabled |
| `violet`/`sparkle` | `#7C5CFF`             | Active tab, ✦, selected ring, focus border, icons |
| `violetDeep`       | `#6A4BEE`             | Violet TEXT / links (small-text contrast) |
| `lavender`         | `#B9A8FF`             | Soft secondary accent |
| `violetTint`       | `#EDE9FF`             | Selected-chip fill, icon-tile background |
| `ctaBase`          | `#0B0B10`             | Black CTA base |
| `ctaGlossTop`      | `#2A2733`             | Top of vertical gloss gradient |
| `ctaText`          | `#FFFFFF`             | CTA label + ✦ |
| `ctaHighlight`     | `rgba(255,255,255,0.12)` | 1px inner top highlight |
| `greenFlag`        | `#15A34A`             | Semantic — green flag |
| `amber`            | `#D97706`             | Semantic — amber |
| `redFlag`          | `#DC2626`             | Semantic — red flag |
| `shadowCard`       | `rgba(20,18,28,0.06)` | Soft card lift |
| `shadowCta`        | `rgba(11,11,16,0.28)` | Black-CTA drop shadow |

**Retired (aliased so stragglers don't show rose):** `rose`, `coral`, `gradientStart`,
`gradientEnd`, `ctaGlow`. Any leftover gradient renders as the **black gloss**, not rose.

**Contrast (WCAG):** `textPrimary` on `background` ≈ 16:1 ✓. `textSecondary` ≈ 5:1 ✓.
`violet #7C5CFF` on white ≈ 4:1 — fine for icons / borders / large text. **Use `violetDeep
#6A4BEE` for any small violet text or links.**

---

## 2. Typography (`mobile/src/theme/typography.ts`)

- **Display / headers — Fraunces** (`@expo-google-fonts/fraunces`), `SemiBold (600)` + `Bold (700)`.
  Warm, characterful old-style serif fits Lovli's "witty friend" tone.
- **Body / UI — Plus Jakarta Sans** (unchanged from PR1).
- **Retired** as the header face: **Clash Display** (TTFs left in `/assets/fonts` unused).

Scale: titles 28–32 Fraunces Bold (tight line-height ~1.05), section heads 20 Fraunces SemiBold,
body 15–16 Jakarta Regular/Medium, caption 13 Jakarta. Headers in `textPrimary`.

Fraunces is loaded in `app/_layout.tsx` alongside Plus Jakarta Sans; splash is held until ready.

---

## 3. Component deltas (public APIs unchanged)

- **`PrimaryButton`** — glossy black pill. Fill = vertical gradient `ctaGlossTop → ctaBase`;
  1px inner top highlight `ctaHighlight`; drop shadow `shadowCta`; white label + trailing ✦
  (white). Full pill radius. Spring press-to-0.97. Props unchanged.
- **`SecondaryButton`** — white/transparent fill, `hairline` border, `textPrimary` label. Danger uses `redFlag`.
- **`Chip`** — unselected: white fill, `hairline` border, `textSecondary` label.
  Selected: `violetTint #EDE9FF` fill + `violet #7C5CFF` border + `violetDeep` label.
- **`GlassCard`** — white `surface`, radius 22, soft `shadowCard` lift; optional 1px `hairline`.
- **`Input`** — white field, `hairline` border, radius 16; focus border `violet #7C5CFF`.
- **`AppHeader` / `LovliLogo`** — wordmark renders in **Fraunces**; CreditsChip on light:
  default `surface`+`hairline`+`textSecondary`; pro `violetTint` fill + `violetDeep` text.
- **`Sparkle`** — unchanged (violet ✦); reads well on light.

---

## 4. Chrome that flips with the theme

- **Bottom tab bar** — light `surface`/translucent bg, top hairline `#ECEAF3`,
  active `violet #7C5CFF`, inactive `textMuted #9A95A8`.
- **Status bar** — `dark` content.
- **More-grid icon tiles** — `violetTint #EDE9FF` squares.
- **Splash / app background** — light.

---

## 5. Slotting into the PR plan

- **PR2.1** — this conversion (no screen-logic changes).
- **PR2 (continued)** — `/(tabs)/pro → /paywall`, paywall flagged off, restyle Reply + Memory
  on the new light tokens (token-based restyle already done — picks up the new palette free).
- **PR3+** — proceed as planned, all on the light system.
