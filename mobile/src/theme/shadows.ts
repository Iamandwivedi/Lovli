import { Platform } from 'react-native';
import { colors } from './colors';

// Surface shadow: inset 0 1px 0 rgba(248,250,252,.05)
// Float shadow: 0 24px 48px -20px rgba(0,0,0,.55) + 6% highlight
// RN doesn't support inset — we approximate with borderTop highlight

export const shadows = {
  surface: Platform.select({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 0,
    },
    android: { elevation: 1 },
    default: {},
  }),
  float: Platform.select({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.55,
      shadowRadius: 48,
    },
    android: { elevation: 8 },
    default: {},
  }),
  ctaGlow: Platform.select({
    ios: {
      shadowColor: colors.lavender,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.24,
      shadowRadius: 36,
    },
    android: { elevation: 6 },
    default: {},
  }),
} as const;
