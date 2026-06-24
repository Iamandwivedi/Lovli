// Typography tokens — Clash Display (display/headers) + Plus Jakarta Sans (body/UI).
// Use these style objects directly in StyleSheet.create — do NOT pass fontFamily
// strings around manually elsewhere.

import { TextStyle } from "react-native";

export const fonts = {
  // Loaded via expo-font in app/_layout.tsx
  displayBold: "ClashDisplay-Bold",        // 700
  displaySemibold: "ClashDisplay-Semibold", // 600
  displayMedium: "ClashDisplay-Medium",    // 500

  // Loaded via @expo-google-fonts/plus-jakarta-sans
  bodyRegular: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemibold: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
} as const;

// Display scale — tight line-height, characterful.
export const display: Record<string, TextStyle> = {
  hero: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
};

// Body scale — calm, readable.
export const body: Record<string, TextStyle> = {
  large: {
    fontFamily: fonts.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
  },
  base: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  small: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  bodySemibold: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
};

export const typography = { display, body, fonts };
