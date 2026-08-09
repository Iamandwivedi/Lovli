// Typography tokens — Fraunces (display/headers) + Plus Jakarta Sans (body/UI).
// Editorial serif Fraunces replaces Clash Display for headers (PR2.1 light redesign).
// All token names from PR1 are preserved — only the underlying font family changed.

import { TextStyle } from "react-native";

export const fonts = {
  // Loaded via @expo-google-fonts/fraunces in app/_layout.tsx
  displayBold: "Fraunces_700Bold",
  displaySemibold: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_600SemiBold", // Fraunces SDK doesn't ship 500; map medium → 600 SemiBold

  // Loaded via @expo-google-fonts/plus-jakarta-sans (unchanged from PR1)
  bodyRegular: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemibold: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
} as const;

// Display scale — Fraunces serif, tight line-height, characterful.
export const display: Record<string, TextStyle> = {
  hero: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
};

// Body scale — Plus Jakarta Sans, calm and readable.
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
