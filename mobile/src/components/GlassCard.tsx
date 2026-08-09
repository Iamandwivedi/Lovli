// Card container — light variant (PR2.2 polish).
// White surface, deeper hairline, stronger soft shadow so cards lift off the bg.
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, radii, space } from "@/src/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  /**
   * `glass`  — white card, 1px hairline, soft lift (default)
   * `solid`  — white card, no shadow, 1px hairline
   * `elevated` — white card, strongest shadow, no border
   */
  variant?: "glass" | "solid" | "elevated";
  testID?: string;
};

export const GlassCard: React.FC<Props> = ({
  children,
  style,
  padded = true,
  variant = "glass",
  testID,
}) => {
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        variant === "solid" && styles.solid,
        variant === "elevated" && styles.elevated,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radii.card,
    // V2 dark: deep soft lift
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 4,
  },
  solid: {
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  elevated: {
    // V2 "insight" surface: #171827 + lavender-tint border + heavy lift
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 8,
  },
  padded: { padding: space.l },
});
