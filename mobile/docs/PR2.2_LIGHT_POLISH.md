# Lovli — PR2.2 Light Polish (3 tweaks)

Small visual refinements on top of PR2.1 (light theme). Token + 3-component changes only.
No screen logic, no behavior change. `/backend` + `/frontend` untouched.

## 1. Remove the ✦ sparkle from ALL CTAs

- `src/components/PrimaryButton.tsx`: dropped `Sparkle` import + render. Kept the `withSparkle` prop in the type as `@deprecated` (accepted-but-ignored) so existing call sites pass-through cleanly.
- Sparkle remains in `LovliLogo` / header only — it's the brand mark.

## 2. Black CTA shinier + clickier

**`src/theme/colors.ts`:**

```diff
- ctaBase: "#0B0B10",
- ctaGlossTop: "#2A2733",
- ctaHighlight: "rgba(255,255,255,0.12)",
- shadowCta: "rgba(11,11,16,0.28)",
+ ctaBase: "#050507",
+ ctaGlossMid: "#16141C",          // NEW — 3-stop mid
+ ctaGlossTop: "#3D3A47",
+ ctaHighlight: "rgba(255,255,255,0.22)",
+ ctaSheen: "rgba(255,255,255,0.16)",  // NEW — specular sheen overlay
+ shadowCta:  "rgba(5,5,8,0.34)",
```

`gradients.primary` updated to `["#3D3A47", "#16141C", "#050507"]`. Retired `gradientStart` / `gradientEnd` aliases re-pointed to the new top/base so nothing regresses to flat.

**`src/components/PrimaryButton.tsx`:**
- 3-stop gloss gradient with `locations=[0, 0.5, 1]` (vertical).
- Specular sheen overlay = second `LinearGradient` from `ctaSheen → transparent`, ~55% height (clipped to pill top corners).
- 1px inner top hairline at `ctaHighlight` (0.22).
- Drop shadow via Animated values — resting `{offsetY:10, opacity:0.34, radius:22}`; on press, animates to `{offsetY:4, opacity:0.18, radius:14}` (button "presses into" the surface).
- Press feedback: `scale → 0.96` (spring), and `Haptics.impactAsync(Medium)` fires on `pressIn` (no-op when disabled/loading).

## 3. Differentiate white cards from background

**`src/theme/colors.ts`:**

```diff
- bg: "#F7F6FB",
- hairline / border: "#ECEAF3",
- shadowCard: "rgba(20,18,28,0.06)",
+ bg: "#ECEBF3",                       // deeper cool-gray
+ hairline / border: "#E2DFEC",
+ shadowCard: "rgba(20,18,28,0.10)",
```

**`src/components/GlassCard.tsx`** (default `glass` variant):
- `shadowOpacity 0.06 → 0.10`, `shadowRadius 18 → 22`, `shadowOffset.height 6 → 8`. Hairline now the deeper `#E2DFEC`.

**`src/components/Input.tsx`:**
- Resting border `borderColor: "#DAD6E8"` (was `colors.hairline`) so the field stays defined inside white cards. Focus border still violet `#7C5CFF`.

## Definition of done

- ✦ No longer rendered on any primary CTA (still in logo/header).
- Black CTA visibly glossier (3-stop, top sheen) + haptic + press-in shadow.
- White cards clearly separate from the deeper `#ECEBF3` bg; inputs stay defined inside cards.
- `/backend` + `/frontend` untouched; no behavior/logic changes; all token names preserved.
