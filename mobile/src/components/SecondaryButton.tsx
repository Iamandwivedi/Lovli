// Secondary / ghost button — light variant.
// White or transparent fill, hairline border, textPrimary label. Danger uses redFlag.
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radii, space, typography } from "@/src/theme";

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
        <ActivityIndicator color={colors.textPrimary} size="small" />
      ) : (
        <View style={styles.inner}>
          {iconLeft ? <View style={{ marginRight: 8 }}>{iconLeft}</View> : null}
          <Text
            style={[
              styles.label,
              variant === "danger" && { color: colors.redFlag },
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
    minHeight: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
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
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    borderColor: "rgba(220, 38, 38, 0.22)",
  },
  inner: { flexDirection: "row", alignItems: "center" },
  label: {
    ...typography.body.bodySemibold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  disabled: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
});
