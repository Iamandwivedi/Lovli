// Card container — V3 dark standard material.
// Content cards stay quieter than navigation chrome: translucent fill, glass
// hairline, and a deep lift without overusing Liquid Glass.
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, space } from "@/src/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  /**
   * `glass`  — standard dark translucent material (default)
   * `solid`  — quieter surface, no shadow
   * `elevated` — hero/insight material with brighter glass stroke
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
    backgroundColor: colors.glassFillLow,
    borderColor: colors.glassStroke,
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.48,
    shadowRadius: 38,
    elevation: 7,
  },
  solid: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    shadowOpacity: 0,
    elevation: 0,
  },
  elevated: {
    backgroundColor: colors.glassFill,
    borderColor: colors.glassStroke,
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 44,
    elevation: 8,
  },
  padded: { padding: space.l },
});
