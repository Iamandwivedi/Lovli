// Card container. New dark surfaces + warm rose-tinted soft shadow on primary cards.
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, radii, space } from "@/src/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.30,
    shadowRadius: 22,
    elevation: 4,
  },
  solid: { backgroundColor: colors.surface },
  elevated: {
    backgroundColor: colors.surfaceRaised,
    borderColor: "#272132",
    shadowColor: colors.rose,
    shadowOpacity: 0.10,
    shadowRadius: 28,
  },
  padded: { padding: space.l },
});
