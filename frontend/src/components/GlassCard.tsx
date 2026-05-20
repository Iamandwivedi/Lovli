// Glass card — dark background, subtle border, soft shadow.
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, radii, space } from "@/src/theme/colors";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  variant?: "glass" | "solid" | "elevated";
  testID?: string;
};

export const GlassCard: React.FC<Props> = ({ children, style, padded = true, variant = "glass", testID }) => {
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
    backgroundColor: colors.cardGlass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 4,
  },
  solid: { backgroundColor: colors.card },
  elevated: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderStrong,
  },
  padded: { padding: space.l },
});
