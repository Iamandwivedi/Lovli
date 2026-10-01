# Lovli — PR2.2 Light Polish (3 tweaks)

> Small visual refinements on top of PR2.1 (light theme). Token + 3-component changes only.
> No screen logic, no behavior change. `/backend` + `/frontend` untouched.
>
> **References:** current-app screenshots (`Appss-1.pdf`). Grounded in the real files:
> `src/theme/colors.ts`, `src/components/PrimaryButton.tsx`, `GlassCard.tsx`, `Input.tsx`.

---

## 1. Remove the ✦ sparkle from ALL CTAs

Every primary button currently shows a trailing ✦ ("Generate replies ✦", "Add Memory ✦",
"Save Memory ✦"). Remove it from the button entirely. Keep the sparkle in the **logo /
header** (`LovliLogo`) — that's the brand mark and stays.

**`src/components/PrimaryButton.tsx`:**
- Delete the `Sparkle` import and the `{withSparkle ? <Sparkle …/> : null}` block.
- The `row` View now renders just the `<Text>` label (you can drop the `row` wrapper).
- Keep the `withSparkle` prop in the type as accepted-but-ignored (so existing call sites
  that pass `withSparkle` don't error), or remove it and clean up call sites. Either is fine.

Net: no CTA renders a sparkle.

---

## 2. Make the black CTA shinier + clickier

Right now the button reads fairly matte (flat `#2A2733 → #0B0B10`, 1px highlight). Goal:
glossy/premium and tactile on press.

### `src/theme/colors.ts`
```diff
- ctaBase: "#0B0B10",
- ctaGlossTop: "#2A2733",
- ctaHighlight: "rgba(255,255,255,0.12)",
+ ctaBase: "#050507",        // deeper base = more contrast/depth
+ ctaGlossMid: "#16141C",    // NEW mid stop
+ ctaGlossTop: "#3D3A47",    // brighter top = visible sheen
+ ctaHighlight: "rgba(255,255,255,0.22)",   // stronger top hairline
+ ctaSheen: "rgba(255,255,255,0.16)",       // NEW specular sheen (top→transparent)
- shadowCta:  "rgba(11,11,16,0.28)",
+ shadowCta:  "rgba(5,5,8,0.34)",            // tighter, darker = more "raised"
```
Also update `gradients.primary` → `["#3D3A47", "#16141C", "#050507"]` and any `gradientStart/
gradientEnd` aliases to the new top/base so nothing regresses to the flat look.

### `src/components/PrimaryButton.tsx`
- **3-stop gloss gradient:** `colors=[ctaGlossTop, ctaGlossMid, ctaBase]`, `locations=[0,
  0.5, 1]`, still vertical (`start {x:0,y:0} end {x:0,y:1}`).
- **Specular sheen overlay:** add a second `LinearGradient` (absolute, top, height ~55%)
  from `ctaSheen` → `transparent` — this is the glassy highlight across the top.
- **Inner top highlight:** keep the 1px line, now `ctaHighlight` (0.22).
- **Drop shadow:** `shadowCta`, offset `{0,10}`, radius `22`, elevation `8`.
- **Clicky press feedback:**
  - On `pressIn`, fire a haptic: `import * as Haptics from "expo-haptics";` →
    `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`. *(Install with `npx expo
    install expo-haptics` if not present.)* This is the single biggest "clicky" win on device.
  - Press transform → `scale: 0.96` (from 0.97) with a quick spring; on press also drop the
    shadow (`shadowOpacity → ~0.18`, `offset.height → 4`) so the button visibly **presses
    into** the surface. Restore on release.
- Guard haptics so they no-op when `disabled`/`loading`.

Result: brighter glassy top, deeper body, a real "press-in" + haptic tap.

---

## 3. Differentiate the white cards from the background

Today bg `#F7F6FB` vs card `#FFFFFF` differ by ~3% — cards (Memory empty state, the More
grid, the Customize-reply card) nearly blend in. Fix with three small moves:

### `src/theme/colors.ts`
```diff
- bg: "#F7F6FB",
+ bg: "#ECEBF3",            // deeper cool-gray — white cards now pop (Sitch-style bg/card split)
- hairline: "#ECEAF3",
- border: "#ECEAF3",
+ hairline: "#E2DFEC",      // slightly more visible card outline
+ border: "#E2DFEC",
- shadowCard: "rgba(20,18,28,0.06)",
+ shadowCard: "rgba(20,18,28,0.10)",   // a touch stronger lift
```
*(If `#ECEBF3` ever looks too gray, `#EEEDF5` is the safer half-step — one-token change.)*

### `src/components/GlassCard.tsx`
- Default (`glass`) variant: bump `shadowOpacity 0.06 → 0.10`, `shadowRadius 18 → 22`,
  `shadowOffset.height 6 → 8`. Keep the 1px hairline (now the more-visible `#E2DFEC`).

### `src/components/Input.tsx` (keep fields defined inside white cards)
- Since cards are pure white, give inputs a **slightly stronger border** so they don't
  vanish inside a card: `borderColor: colors.hairline` is fine now that hairline is `#E2DFEC`
  — but bump focus/default contrast by using `borderColor: "#DAD6E8"` for the resting field.
  Focus border stays violet `#7C5CFF`. (No fill change needed; white field on the deeper bg
  pops, and the stronger border defines it inside white cards.)

> After the bg change, eyeball the **upload dropzone** (dashed area) and the collapsed
> **Customize reply** card — both should still read as distinct surfaces. They're token-driven
> so they will, but confirm the dashed dropzone tint hasn't merged with the new bg.

---

## Paste-ready instruction for Emergent

> **PR2.2 — light polish (3 tweaks, tokens + PrimaryButton/GlassCard/Input only; no behavior
> change; `/backend` + `/frontend` untouched). Full detail in `docs/PR2.2_LIGHT_POLISH.md`.**
>
> 1. **Remove the ✦ from all CTAs.** Strip the `Sparkle` from `PrimaryButton` (import +
>    render). Sparkle stays only in `LovliLogo`/header. No primary button shows a sparkle.
> 2. **Black CTA shinier + clickier.** Tokens: `ctaGlossTop #3D3A47`, new `ctaGlossMid
>    #16141C`, `ctaBase #050507`, `ctaHighlight rgba(255,255,255,0.22)`, new `ctaSheen
>    rgba(255,255,255,0.16)`, `shadowCta rgba(5,5,8,0.34)`. In `PrimaryButton`: 3-stop
>    vertical gloss `[glossTop, glossMid, base]` at `locations [0,0.5,1]`, add a top
>    specular-sheen `LinearGradient` (`ctaSheen → transparent`, ~55% height), 1px highlight
>    at 0.22, shadow offset `{0,10}` r22. Press: `scale 0.96` + spring, drop shadow on press
>    (presses in), and fire `Haptics.impactAsync(Medium)` on `pressIn` (`npx expo install
>    expo-haptics`); no-op when disabled/loading.
> 3. **Differentiate white cards from bg.** Tokens: `bg #ECEBF3` (deeper), `hairline/border
>    #E2DFEC`, `shadowCard rgba(20,18,28,0.10)`. `GlassCard` glass variant: shadowOpacity
>    0.10, radius 22, offsetY 8. `Input` resting border `#DAD6E8` (focus stays violet).
>    Confirm the dashed upload dropzone + collapsed Customize-reply card still read distinct.

---

### Definition of done
- No ✦ on any primary CTA (still present in the logo/header).
- Black CTA is visibly glossier (bright top sheen, deep body) and gives a haptic + press-in on tap.
- White cards clearly separate from the deeper bg; inputs stay defined inside white cards.
- `/backend` + `/frontend` untouched; no behavior/logic changes; all token names preserved.
