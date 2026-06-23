// Lovli brand color tokens. Use these everywhere — no ad-hoc colors.
export const colors = {
  // Core dark surface
  bg: "#050509",
  midnight: "#090A14",
  card: "#11121C",
  cardGlass: "#171827",
  cardElevated: "#1B1C2A",
  border: "#2A2B3A",
  borderStrong: "#383A4D",

  // Accents (used sparingly: chips, focus, glow, icons)
  lavender: "#A78BFA",
  lavenderSoft: "#C4B5FD",
  violet: "#8B5CF6",
  sky: "#38BDF8",
  blue: "#60A5FA",

  // Text
  text: "#F8FAFC",
  textSoft: "#E5E7EB",
  textMuted: "#A1A1AA",
  textFaint: "#71717A",

  // States
  danger: "#F87171",
  dangerSoft: "#FCA5A5",
  success: "#86EFAC",

  // Glow / overlays
  lavenderGlow: "rgba(167, 139, 250, 0.25)",
  lavenderGlowSoft: "rgba(167, 139, 250, 0.12)",
  overlayDark: "rgba(5, 5, 9, 0.78)",
  scrim: "rgba(0, 0, 0, 0.55)",
} as const;

// Spacing rhythm (8pt grid).
export const space = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// Border radius
export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

// Typography sizes
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
