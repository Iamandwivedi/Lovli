// Primary white pill CTA — only for main actions.
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, fontSize, radii } from "@/src/theme/colors";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
};

export const PrimaryButton: React.FC<Props> = ({ label, onPress, loading, disabled, style, testID }) => {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.glow} pointerEvents="none" />
      {loading ? (
        <ActivityIndicator color={colors.bg} size="small" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  glow: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  label: {
    color: colors.bg,
    fontWeight: "700",
    fontSize: fontSize.md,
    letterSpacing: 0.1,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
});
