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
    // PR2.2: stronger lift so white cards pop off the deeper bg
    shadowColor: "#14121C",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 22,
    elevation: 3,
  },
  solid: {
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  elevated: {
    backgroundColor: colors.surface,
    borderWidth: 0,
    shadowColor: "#14121C",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 5,
  },
  padded: { padding: space.l },
});
