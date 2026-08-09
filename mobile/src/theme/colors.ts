// Lovli design tokens — V3 dark glass.
// Source of truth: lovli-design-system/project/Lovli UI Kit.dc.html.
// Legacy names are preserved as aliases so older screens keep compiling.

export const colors = {
  // -- Base surfaces (V3 dark) --
  bg: "#050509",              // Screen gradient top
  bgBottom: "#0A0918",        // Screen gradient bottom
  heroBgBottom: "#0A0918",    // Hero/emotional screens gradient bottom
  surface: "rgba(17,18,28,0.86)",         // Standard dark material
  surfaceRaised: "rgba(255,255,255,0.10)", // Elevated translucent material
  surfaceSoft: "rgba(255,255,255,0.045)",
  glassFill: "rgba(255,255,255,0.10)",
  glassFillLow: "rgba(255,255,255,0.06)",
  glassStroke: "rgba(255,255,255,0.10)",
  glassStrokeStrong: "rgba(255,255,255,0.16)",
  hairline: "#262737",        // 1px card border
  border: "#262737",          // alias
  divider: "#1B1C29",         // inner row divider

  // -- Primary CTA (white pill) --
  ctaBg: "#FFFFFF",
  ctaBorder: "#E5E7EB",
  ctaText: "#050509",
  ctaShadow: "rgba(167,139,250,0.22)",
  // Legacy glossy-black CTA tokens -> white CTA equivalents
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
  amber: "#D9A96E",           // warmth / free count / interested
  pink: "#D6A6B0",            // flirt, watch-outs, destructive text
  sky: "#9EC5DF",             // info
  green: "#86C89D",           // good signs
  redFlag: "#D6A6B0",         // rose/pink — red-flag icon
  roseTint: "rgba(214,166,176,0.12)",

  // -- Shadows --
  shadowCard: "rgba(0,0,0,0.55)",
  shadowCta: "rgba(167,139,250,0.22)",

  // -- Legacy aliases (kept so earlier callers don't break) --
  rose: "#D6A6B0",
  coral: "#D6A6B0",
  card: "#11121C",
  cardGlass: "#171827",
  cardElevated: "#171827",
  borderStrong: "rgba(167,139,250,0.30)",
  blue: "#60A5FA",
  danger: "#D6A6B0",
  dangerSoft: "#D6A6B0",
  success: "#86C89D",
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

// V3 gradient stacks.
export const gradients = {
  // Avatar / accent gradient (135deg)
  primary: ["#A78BFA", "#8B5CF6"] as const,
  primaryAngled: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  // Default screen background (vertical)
  screen: ["#050509", "#0A0918"] as const,
  // Hero/emotional screens (Welcome, Generating, Premium)
  hero: ["#050509", "#0A0918"] as const,
  // Progress track fill
  progress: ["#A78BFA", "#8B5CF6"] as const,
  glow: ["rgba(167,139,250,0.24)", "rgba(56,189,248,0.05)"] as const,
} as const;
