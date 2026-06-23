// Dark glass secondary button — for non-primary actions.
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, fontSize, radii, space } from "@/src/theme/colors";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  variant?: "secondary" | "ghost" | "danger";
  testID?: string;
};

export const SecondaryButton: React.FC<Props> = ({
  label,
  onPress,
  loading,
  disabled,
  style,
  iconLeft,
  iconRight,
  variant = "secondary",
  testID,
}) => {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <View style={styles.inner}>
          {iconLeft ? <View style={{ marginRight: 8 }}>{iconLeft}</View> : null}
          <Text
            style={[
              styles.label,
              variant === "danger" && { color: colors.dangerSoft },
            ]}
          >
            {label}
          </Text>
          {iconRight ? <View style={{ marginLeft: 8 }}>{iconRight}</View> : null}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.l,
    paddingVertical: space.s,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  danger: {
    backgroundColor: "rgba(248, 113, 113, 0.08)",
    borderColor: "rgba(248, 113, 113, 0.25)",
  },
  inner: { flexDirection: "row", alignItems: "center" },
  label: {
    color: colors.text,
    fontWeight: "600",
    fontSize: fontSize.base,
  },
  disabled: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
});
