// Lovli design tokens — LIGHT (v2 redesign — PR2.1).
// Light/near-white background, dark text, glossy black primary CTA, violet accent.
// All PR1 token names are kept as aliases pointing at the new light values so no screen breaks.

export const colors = {
  // -- Base surfaces (light) --
  bg: "#F7F6FB",            // App background — soft near-white with faint cool-violet tint
  surface: "#FFFFFF",       // Card / sheet background
  surfaceRaised: "#FFFFFF", // Raised card — lifted by shadow, not color
  hairline: "#ECEAF3",      // 1px borders
  border: "#ECEAF3",        // alias

  // -- Glossy black primary CTA --
  ctaBase: "#0B0B10",       // Button base
  ctaGlossTop: "#2A2733",   // Top of vertical gloss gradient → bottom = ctaBase
  ctaText: "#FFFFFF",       // Label + ✦
  ctaHighlight: "rgba(255,255,255,0.12)", // 1px inner top highlight

  // -- Retired rose→coral gradient → aliased to glossy black so stragglers don't show rose --
  gradientStart: "#2A2733", // was rose — now black-gloss top
  gradientEnd:   "#0B0B10", // was coral — now black-gloss base

  // -- Accents (violet is THE primary accent) --
  sparkle: "#7C5CFF",       // Violet — Lovli's AI signature ✦
  violet: "#7C5CFF",        // alias
  violetDeep: "#6A4BEE",    // Violet TEXT / links (small-text contrast)
  lavender: "#B9A8FF",      // Soft secondary accent
  lavenderSoft: "#6A4BEE",  // Was a dark-theme soft lavender; on light, point at violetDeep for text contrast
  violetTint: "#EDE9FF",    // Selected-chip fill, icon-tile background

  // -- Text --
  text: "#14121C",          // Near-black headings & body
  textPrimary: "#14121C",   // alias
  textSoft: "#14121C",      // On dark theme this was a slightly-softer near-white. On light, headings stay primary.
  textMuted: "#6A6577",     // Sub-copy / helper
  textSecondary: "#6A6577", // alias
  textFaint: "#9A95A8",     // Placeholders, captions, disabled

  // -- Semantic flags (darkened for contrast on white) --
  greenFlag: "#15A34A",
  amber: "#D97706",
  redFlag: "#DC2626",

  // -- Shadows --
  shadowCard: "rgba(20,18,28,0.06)",  // Soft card lift
  shadowCta:  "rgba(11,11,16,0.28)",  // Black-CTA drop shadow

  // -- Retired rose/coral — alias to ctaBase so leftover usage renders black, not rose --
  rose: "#0B0B10",
  coral: "#0B0B10",

  // -- Legacy aliases (kept so PR1 doesn't break v1 callers) --
  card: "#FFFFFF",          // was dark surface — now white
  cardGlass: "#FFFFFF",
  cardElevated: "#FFFFFF",
  borderStrong: "#D8D3E6",
  sky: "#38BDF8",
  blue: "#60A5FA",
  danger: "#DC2626",
  dangerSoft: "#DC2626",    // small red text — needs contrast on white
  success: "#15A34A",
  lavenderGlow: "rgba(124, 92, 255, 0.16)",
  lavenderGlowSoft: "rgba(124, 92, 255, 0.08)",
  overlayDark: "rgba(20, 18, 28, 0.55)",
  scrim: "rgba(20, 18, 28, 0.45)",
  midnight: "#FFFFFF",      // was a dark sheet bg — now white (modal sheets are white on light theme)

  // Soft black-CTA halo (retired ctaGlow rose — now soft black/violet tint)
  ctaGlow: "rgba(11, 11, 16, 0.18)",
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

// Hero gradient color stops — now the glossy black gradient (vertical top→bottom).
// Any caller still using gradients.primary will render the new black gloss, not rose.
export const gradients = {
  primary: ["#2A2733", "#0B0B10"] as const,           // ctaGlossTop → ctaBase
  primaryAngled: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } }, // vertical gloss
  glow: ["rgba(11,11,16,0.18)", "rgba(11,11,16,0.04)"] as const,
} as const;
