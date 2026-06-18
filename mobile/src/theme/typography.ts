// Lovli v2 typography — Space Grotesk (display) + Figtree (body)
// Source: docs/MOBILE_DESIGN_HANDOFF_V2.md §2
export const fonts = {
  display: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemiBold: 'Figtree_600SemiBold',
} as const;

export const typography = {
  // Hero — emotional moments only (28/600 Space Grotesk)
  hero: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 34,
    letterSpacing: -0.018 * 28,
  },
  // Title / page h1 (22/600 Space Grotesk)
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.012 * 22,
  },
  // Section h2 (17/600 Space Grotesk)
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.012 * 17,
  },
  // Body — default (15/400 Figtree, 1.55 leading)
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 15 * 1.55,
  },
  // Body medium
  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 15 * 1.55,
  },
  // Reply text — lead card 18, others 17
  replyLead: {
    fontFamily: fonts.body,
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 18 * 1.6,
  },
  replyBody: {
    fontFamily: fonts.body,
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 17 * 1.6,
  },
  // Meta / helper (12.5)
  meta: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    fontWeight: '400' as const,
    lineHeight: 12.5 * 1.4,
  },
  metaMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    fontWeight: '500' as const,
    lineHeight: 12.5 * 1.4,
  },
  // Tone label — CAPS ONLY, 11px (only usage of uppercase)
  toneLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
    letterSpacing: 0.08 * 11,
    textTransform: 'uppercase' as const,
  },
  // Label above input (12.5/500)
  inputLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
} as const;
