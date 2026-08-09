// Chip — V3 glass selection pill.
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, space, typography } from "@/src/theme";

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
  size?: "sm" | "md";
};

export const Chip: React.FC<Props> = ({ label, selected, onPress, testID, size = "md" }) => {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        size === "sm" && styles.small,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          size === "sm" && styles.labelSmall,
          selected && styles.labelSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    paddingHorizontal: space.l - 2,
    paddingVertical: space.s - 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  small: { minHeight: 32, paddingHorizontal: 12, paddingVertical: 6 },
  unselected: {
    backgroundColor: colors.surfaceSoft,
    borderColor: "rgba(255,255,255,0.09)",
  },
  selected: {
    backgroundColor: "rgba(167,139,250,0.11)",
    borderColor: "rgba(167,139,250,0.36)",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  label: {
    ...typography.body.bodySemibold,
    color: colors.textSecondary,
    fontSize: 13,
  },
  labelSmall: { fontSize: 13 },
  labelSelected: {
    ...typography.body.bodyBold,
    color: colors.lavenderText,
    fontSize: 13,
  },
});
