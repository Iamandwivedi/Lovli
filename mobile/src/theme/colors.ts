// Lovli v2 color tokens — source: docs/MOBILE_DESIGN_HANDOFF_V2.md
export const colors = {
  // Stage
  bg: '#050509',
  bgDeep: '#090A14',

  // Surfaces
  surface: '#11121C',
  float: '#171827',

  // Borders / hairlines
  hairline: 'rgba(248,250,252,0.07)',
  border: '#2A2B3A',
  borderStrong: '#3A3B4D',

  // Accents
  lavender: '#A78BFA',
  lavenderSoft: '#C4B5FD',
  violet: '#8B5CF6',
  sky: '#38BDF8',
  skySoft: '#60A5FA',

  // Text
  text: '#F8FAFC',
  textSoft: '#E5E7EB',
  textMuted: '#A1A1AA',
  textFaint: '#71717A',

  // CTA
  ctaBackground: '#FFFFFF',
  ctaText: '#050509',
  ctaGlow: 'rgba(167,139,250,0.24)',

  // Semantic
  error: '#F87171',
  errorBg: 'rgba(248,113,113,0.10)',
  success: '#34D399',

  // Stage radial wash (for reference — applied in Screen shell)
  stageWashLavender: 'rgba(167,139,250,0.075)',
  stageWashSky: 'rgba(56,189,248,0.035)',

  // Transparency helpers
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',

  // Nav backdrop
  navBackdrop: 'rgba(13,14,22,0.95)',
} as const;

export type ColorKey = keyof typeof colors;
