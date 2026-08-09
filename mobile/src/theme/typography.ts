// Typography tokens — V3 mock language.
// The design handoff specifies Bricolage Grotesque for display and Outfit for UI.
// App layout maps those family names to bundled/local fonts so screens can use
// the V3 tokens consistently.

import { TextStyle } from "react-native";

export const fonts = {
  displayBold: "BricolageGrotesque_700Bold",
  displaySemibold: "BricolageGrotesque_600SemiBold",
  displayMedium: "BricolageGrotesque_600SemiBold",

  bodyRegular: "Outfit_400Regular",
  bodyMedium: "Outfit_500Medium",
  bodySemibold: "Outfit_600SemiBold",
  bodyBold: "Outfit_700Bold",
} as const;

// Display scale — bold grotesque, tight line-height, no negative tracking.
export const display: Record<string, TextStyle> = {
  hero: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: 0,
  },
  h1: {
    fontFamily: fonts.displayBold,
    fontSize: 31,
    lineHeight: 36,
    letterSpacing: 0,
  },
  h2: {
    fontFamily: fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0,
  },
  h3: {
    fontFamily: fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0,
  },
};

// Body scale — Outfit-style UI text, calm and readable.
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
