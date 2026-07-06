// Lovli design tokens — V2 DARK ("Coach" redesign, PR-V2-1).
// Supersedes the PR2.x light theme. Source of truth: docs/DESIGN_SYSTEM_V2_DARK.md.
// All prior token names are preserved as aliases pointing at V2 dark values.

export const colors = {
  // -- Base surfaces (V2 dark) --
  bg: "#050509",              // Screen gradient top
  bgBottom: "#090A14",        // Screen gradient bottom
  heroBgBottom: "#0B0918",    // Hero/emotional screens gradient bottom
  surface: "#11121C",         // Card
  surfaceRaised: "#171827",   // Elevated/glass "insight" card
  hairline: "#2A2B3A",        // 1px card border
  border: "#2A2B3A",          // alias
  divider: "#1B1C29",         // inner row divider

  // -- Primary CTA (white pill) --
  ctaBg: "#FFFFFF",
  ctaBorder: "#E5E7EB",
  ctaText: "#050509",
  ctaShadow: "rgba(167,139,250,0.35)",
  // Legacy glossy-black CTA tokens → white CTA equivalents (no gloss on V2)
  ctaBase: "#FFFFFF",
  ctaGlossMid: "#FFFFFF",
  ctaGlossTop: "#FFFFFF",
  ctaHighlight: "rgba(255,255,255,0)",
  ctaSheen: "rgba(255,255,255,0)",

  // -- Avatar / accent gradient (135deg lavender → deep violet) --
  gradientStart: "#A78BFA",
  gradientEnd: "#8B5CF6",

  // -- Accents --
  sparkle: "#A78BFA",         // Lovli's ✦ signature
  violet: "#A78BFA",          // accent lavender (alias)
  violetDeep: "#8B5CF6",      // deep violet — gradients, ✦ inside white CTA
  lavender: "#A78BFA",
  lavenderSoft: "#C4B5FD",    // lavender TEXT
  lavenderText: "#C4B5FD",    // alias, explicit
  violetTint: "rgba(167,139,250,0.14)",       // lavender tint fill
  violetTintBorder: "rgba(167,139,250,0.3)",  // lavender tint border

  // -- Text --
  text: "#F8FAFC",            // primary
  textPrimary: "#F8FAFC",     // alias
  textSoft: "#E5E7EB",        // body
  textMuted: "#A1A1AA",       // secondary / sub-copy
  textSecondary: "#A1A1AA",   // alias
  textFaint: "#71717A",       // muted — placeholders, captions
  textDim: "#52525B",         // faint
  textDisabled: "#3F3F46",

  // -- Semantic --
  greenFlag: "#4ADE80",
  amber: "#FFB259",           // warm temperature
  pink: "#F0A5B2",            // watch-outs, destructive text
  redFlag: "#E0667A",         // rose — red-flag icon
  roseTint: "rgba(224,102,122,0.12)",

  // -- Shadows --
  shadowCard: "rgba(0,0,0,0.55)",
  shadowCta: "rgba(167,139,250,0.35)",

  // -- Legacy aliases (kept so earlier callers don't break) --
  rose: "#E0667A",
  coral: "#E0667A",
  card: "#11121C",
  cardGlass: "#171827",
  cardElevated: "#171827",
  borderStrong: "rgba(167,139,250,0.3)",
  sky: "#38BDF8",
  blue: "#60A5FA",
  danger: "#F0A5B2",
  dangerSoft: "#F0A5B2",
  success: "#4ADE80",
  lavenderGlow: "rgba(167,139,250,0.16)",
  lavenderGlowSoft: "rgba(167,139,250,0.08)",
  overlayDark: "rgba(5,5,9,0.65)",
  scrim: "rgba(5,5,9,0.55)",
  midnight: "#050509",
  ctaGlow: "rgba(167,139,250,0.35)",
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
  card: 20,
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

// V2 gradient stacks.
export const gradients = {
  // Avatar / accent gradient (135deg)
  primary: ["#A78BFA", "#8B5CF6"] as const,
  primaryAngled: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  // Default screen background (vertical)
  screen: ["#050509", "#090A14"] as const,
  // Hero/emotional screens (Welcome, Generating, Premium)
  hero: ["#050509", "#0B0918"] as const,
  // Progress track fill
  progress: ["#A78BFA", "#8B5CF6"] as const,
  glow: ["rgba(167,139,250,0.24)", "rgba(56,189,248,0.05)"] as const,
} as const;
