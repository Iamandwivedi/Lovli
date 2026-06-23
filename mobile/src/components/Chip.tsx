// Chip — used for vibe / language / platform selection.
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSize, radii, space } from "@/src/theme/colors";

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
          size === "sm" && { fontSize: fontSize.sm },
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
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: "rgba(167, 139, 250, 0.12)",
    borderColor: colors.lavender,
    shadowColor: colors.lavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  label: {
    color: colors.textSoft,
    fontSize: fontSize.base,
    fontWeight: "500",
  },
  labelSelected: {
    color: colors.text,
    fontWeight: "600",
  },
});
