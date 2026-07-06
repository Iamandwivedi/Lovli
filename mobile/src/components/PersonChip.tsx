// PersonChip — chip with 18px gradient mini-avatar + name.
// Used by the Reply Home person picker and the Decode input step.
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radii, space, typography } from "@/src/theme";

type Props = {
  name: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

export const PersonChip: React.FC<Props> = ({ name, selected, onPress, testID }) => (
  <Pressable
    onPress={onPress}
    testID={testID}
    style={({ pressed }) => [
      styles.chip,
      selected ? styles.selected : styles.unselected,
      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
    ]}
  >
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.avatar}
    >
      <Text style={styles.avatarText} allowFontScaling={false}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
    <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
      {name}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: space.l - 2,
    paddingVertical: space.s - 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    maxWidth: 220,
  },
  unselected: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
  },
  selected: {
    backgroundColor: colors.lavender,
    borderColor: colors.lavender,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 10,
    color: "#050509",
  },
  name: {
    ...typography.body.bodySemibold,
    color: colors.textSecondary,
    fontSize: 13,
    flexShrink: 1,
  },
  nameSelected: {
    ...typography.body.bodyBold,
    color: "#050509",
    fontSize: 13,
  },
});
