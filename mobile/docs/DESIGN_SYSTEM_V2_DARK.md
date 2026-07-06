# Lovli — Design System V2 (DARK · "Coach" redesign)

> Source of truth for all V2 screens. Supersedes `DESIGN_SYSTEM_V2_LIGHT.md`.
> Tokens live in `src/theme/colors.ts` + `src/theme/typography.ts`.

## Color

| Token | Value | Use |
|---|---|---|
| Screen bg | vertical gradient `#050509 → #090A14` | default screens (`gradients.screen`) |
| Hero bg | `#050509 → #0B0918` + ambient glow | Welcome, Generating, Premium (`gradients.hero`) |
| Ambient glow | radial `rgba(139,92,246,.24–.30) → rgba(56,189,248,.05) 72% → transparent`, ~380–420px circle, opacity pulses .5→1 (~3s) | `AmbientGlow` component |
| Card | `#11121C`, 1px border `#2A2B3A`, radius 16–20 | `surface` |
| Elevated / insight card | `#171827`, border `rgba(167,139,250,.3)` (or `#2A2B3A` unhighlighted), radius 20–22, shadow `0 16px 40px -10px rgba(0,0,0,.55)` + faint `0 0 30px rgba(167,139,250,.08)` | `surfaceRaised` |
| Row divider | `#1B1C29` | `divider` |
| Accent lavender | `#A78BFA` | `lavender` / `violet` / `sparkle` |
| Deep violet | `#8B5CF6` | gradients, ✦ inside white CTA (`violetDeep`) |
| Lavender text | `#C4B5FD` | `lavenderText` |
| Lavender tint fill | `rgba(167,139,250,.14)` | `violetTint` |
| Lavender tint border | `rgba(167,139,250,.3–.4)` | `violetTintBorder` |
| Text primary | `#F8FAFC` | `text` |
| Text body | `#E5E7EB` | `textSoft` |
| Text secondary | `#A1A1AA` | `textMuted` |
| Text muted | `#71717A` | `textFaint` |
| Text faint | `#52525B` | `textDim` |
| Text disabled | `#3F3F46` | `textDisabled` |
| Warm amber | `#FFB259` | Warm temperature (`amber`) |
| Soft pink | `#F0A5B2` | watch-outs, destructive text (`pink`) |
| Rose | `#E0667A` on `rgba(224,102,122,.12)` tint | red-flag icon (`redFlag` / `roseTint`) |
| Avatar gradient | `linear-gradient(135deg, #A78BFA 0%, #8B5CF6 60%)`, initial in `#050509` | `gradients.primary` |

## Type

- Headers / serif: **Fraunces** (500–600, letter-spacing −.01em to −.025em)
- Body / UI: **Plus Jakarta Sans**
- Section label (recurring): 12px, weight 700, letter-spacing .1em, UPPERCASE, `#71717A`
- H1 on screens: 30–34px serif; card serif text 17–24px

## Primary CTA (identical everywhere)

Full-width pill: bg `#FFFFFF`, 1px border `#E5E7EB`, radius 999, padding-y 18,
text `#050509` 16px weight 700, shadow `0 8px 28px rgba(167,139,250,.35)` +
`0 2px 8px rgba(0,0,0,.4)`. Leading ✦ glyph in `#8B5CF6` 15px where specified.
→ `PrimaryButton` (`withSparkle` default true).

## Chips

- Inactive: bg `#11121C`, 1px `#2A2B3A`, radius 999, padding 8×13–15, 13px weight 600 `#A1A1AA`
- Active: bg `#A78BFA`, text `#050509` weight 700, shadow `0 4px 14px rgba(167,139,250,.3)`, no border
- Lavender-tint chips (memory facts / chat starters): text `#C4B5FD` on `rgba(167,139,250,.14)` fill (starters add border `rgba(167,139,250,.3)`)

## Tab bar (4 tabs)

Height ~84 incl. safe area, bg `rgba(9,10,20,.9)` + blur(20) (Android fallback: solid `rgba(9,10,20,.96)`), top hairline `#2A2B3A`, icons 23px, labels 11px.
Order: **Reply** (chat-bubble outline) · **Ask Lovli** (✦ glyph 20px) · **Memory** (heart outline) · **More** (grid outline).
Active: `#A78BFA`, label 700, ✦ glow `text-shadow 0 0 12px rgba(167,139,250,.7)`. Inactive: `#71717A`, 600.

## Motion

- `lovliPulse`: scale 1→1.1, opacity .8→1, 2.2–2.8s ease-in-out infinite (big ✦)
- `lovliGlow`: opacity .5→1, 3–3.5s ease-in-out infinite (ambient radial)

## Back header (sub-screens)

Left chevron ‹ (22px `#F8FAFC`, 1.8 stroke) + serif 20px weight-600 title, 14px gap. 24px horizontal padding.

## Honesty rule

Qualitative reads only. **Never** numeric confidence, percentages, scores, or fabricated social proof. Decode meter = 3-segment qualitative scale (Not into it / Mixed signals / Leaning interested).
