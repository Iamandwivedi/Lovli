// Lovli design tokens — Dark Core (v2 redesign per PR1).
// Keep the existing dark base. Layer the rose→coral gradient + violet sparkle
// as the hero accent on top. Do NOT switch to a warm/white background.

export const colors = {
  // -- Surfaces (dark core) --
  bg: "#050509",            // App background — Lovli core near-black with slight violet tint
  surface: "#101019",       // Card surface 1
  surfaceRaised: "#16131F", // Card surface 2 (elevated / hero cards)
  hairline: "#1E1B29",      // 1px borders
  border: "#1E1B29",        // alias

  // -- Hero gradient (rose → coral) — used for primary CTAs --
  gradientStart: "#FF5E7E", // rose
  gradientEnd:   "#FF8A5B", // coral

  // -- Accents --
  sparkle: "#7C5CFF",       // Violet — Lovli's AI signature ✦
  lavender: "#B9A8FF",      // Secondary / active state
  lavenderSoft: "#C4B5FD",
  rose: "#FF5E7E",
  coral: "#FF8A5B",

  // -- Text --
  text: "#F5F3FA",
  textSoft: "#E5E0EE",
  textMuted: "#9B96A8",
  textFaint: "#6E687C",

  // -- States --
  greenFlag: "#34D399",
  amber: "#FBBF24",
  redFlag: "#F87171",

  // -- Legacy aliases (kept so PR1 doesn't break v1 callers) --
  card: "#101019",
  cardGlass: "#16131F",
  cardElevated: "#16131F",
  borderStrong: "#2A2738",
  violet: "#7C5CFF",
  sky: "#38BDF8",
  blue: "#60A5FA",
  danger: "#F87171",
  dangerSoft: "#FCA5A5",
  success: "#34D399",
  lavenderGlow: "rgba(124, 92, 255, 0.20)",
  lavenderGlowSoft: "rgba(124, 92, 255, 0.10)",
  overlayDark: "rgba(5, 5, 9, 0.78)",
  scrim: "rgba(0, 0, 0, 0.55)",
  midnight: "#090A14",

  // Gradient glow color for primary CTAs
  ctaGlow: "rgba(255, 94, 126, 0.22)",
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

// Hero gradient color stops (use with expo-linear-gradient).
export const gradients = {
  primary: ["#FF5E7E", "#FF8A5B"] as const,        // rose → coral
  primaryAngled: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }, // 135°
  glow: ["rgba(255,94,126,0.18)", "rgba(255,138,91,0.10)"] as const,
} as const;
