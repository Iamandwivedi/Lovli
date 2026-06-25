// Lovli design tokens — LIGHT (PR2.2 polish on top of PR2.1).
// Deeper bg/card split, glossier black CTA, stronger card lift.
// All PR1 token names preserved as aliases pointing at the new light values.

export const colors = {
  // -- Base surfaces (light) --
  bg: "#ECEBF3",            // PR2.2: deeper cool-gray so white cards pop (was #F7F6FB)
  surface: "#FFFFFF",       // Card / sheet background
  surfaceRaised: "#FFFFFF", // Raised card — lifted by shadow, not color
  hairline: "#E2DFEC",      // PR2.2: more visible card outline (was #ECEAF3)
  border: "#E2DFEC",        // alias

  // -- Glossy BLACK primary CTA (PR2.2 — shinier, deeper) --
  ctaBase: "#050507",                    // Deeper base = more contrast/depth
  ctaGlossMid: "#16141C",                // NEW — mid stop in the 3-stop gradient
  ctaGlossTop: "#3D3A47",                // Brighter top = visible sheen
  ctaText: "#FFFFFF",                    // Label color
  ctaHighlight: "rgba(255,255,255,0.22)", // 1px inner top hairline (stronger)
  ctaSheen: "rgba(255,255,255,0.16)",    // NEW — specular sheen overlay (top → transparent)

  // -- Retired rose→coral gradient → aliased to glossy black so stragglers don't show rose --
  gradientStart: "#3D3A47", // was rose — now black-gloss top
  gradientEnd:   "#050507", // was coral — now black-gloss base

  // -- Accents (violet is THE primary accent) --
  sparkle: "#7C5CFF",       // Violet — Lovli's AI signature ✦ (logo/header only)
  violet: "#7C5CFF",        // alias
  violetDeep: "#6A4BEE",    // Violet TEXT / links (small-text contrast)
  lavender: "#B9A8FF",      // Soft secondary accent
  lavenderSoft: "#6A4BEE",  // On light — point at violetDeep for text contrast
  violetTint: "#EDE9FF",    // Selected-chip fill, icon-tile background

  // -- Text --
  text: "#14121C",          // Near-black headings & body
  textPrimary: "#14121C",   // alias
  textSoft: "#14121C",
  textMuted: "#6A6577",     // Sub-copy / helper
  textSecondary: "#6A6577", // alias
  textFaint: "#9A95A8",     // Placeholders, captions, disabled

  // -- Semantic flags (darkened for contrast on white) --
  greenFlag: "#15A34A",
  amber: "#D97706",
  redFlag: "#DC2626",

  // -- Shadows --
  shadowCard: "rgba(20,18,28,0.10)",   // PR2.2: stronger card lift (was 0.06)
  shadowCta:  "rgba(5,5,8,0.34)",      // PR2.2: tighter, darker = more "raised" (was rgba(11,11,16,0.28))

  // -- Retired rose/coral — alias to ctaBase so leftover usage renders black, not rose --
  rose: "#050507",
  coral: "#050507",

  // -- Legacy aliases (kept so PR1 doesn't break v1 callers) --
  card: "#FFFFFF",
  cardGlass: "#FFFFFF",
  cardElevated: "#FFFFFF",
  borderStrong: "#D8D3E6",
  sky: "#38BDF8",
  blue: "#60A5FA",
  danger: "#DC2626",
  dangerSoft: "#DC2626",
  success: "#15A34A",
  lavenderGlow: "rgba(124, 92, 255, 0.16)",
  lavenderGlowSoft: "rgba(124, 92, 255, 0.08)",
  overlayDark: "rgba(20, 18, 28, 0.55)",
  scrim: "rgba(20, 18, 28, 0.45)",
  midnight: "#FFFFFF",
  ctaGlow: "rgba(5, 5, 8, 0.18)",
} as const;

export const space = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  input: 16,
  lg: 18,
  card: 22,
  xl: 22,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

// 3-stop vertical glossy gradient (PR2.2). Locations applied in PrimaryButton.
export const gradients = {
  primary: ["#3D3A47", "#16141C", "#050507"] as const, // ctaGlossTop → ctaGlossMid → ctaBase
  primaryAngled: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } }, // vertical gloss
  glow: ["rgba(5,5,8,0.18)", "rgba(5,5,8,0.04)"] as const,
} as const;
