// Card container — light variant per PR2.1.
// White surface, radius 22, soft shadow rgba(20,18,28,0.06). Optional 1px hairline.
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, radii, space } from "@/src/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  /**
   * `glass`  — white card, 1px hairline, soft shadow (default)
   * `solid`  — white card, no shadow, 1px hairline
   * `elevated` — white card, stronger shadow, no border (Sitch-style "lifted")
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
    shadowColor: "#14121C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
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
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 4,
  },
  padded: { padding: space.l },
});
