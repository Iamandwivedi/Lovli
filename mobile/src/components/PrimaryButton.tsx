// Primary CTA — rose → coral gradient pill with a small ✦ sparkle.
// Hero action across the app. Replaces the v1 solid white pill.
// Behaviour API is unchanged — same props, same call sites.
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radii, typography } from "@/src/theme";
import { Sparkle } from "./Sparkle";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  /** Hide the trailing sparkle on secondary-feeling primary CTAs. Defaults true. */
  withSparkle?: boolean;
};

export const PrimaryButton: React.FC<Props> = ({
  label,
  onPress,
  loading,
  disabled,
  style,
  testID,
  withSparkle = true,
}) => {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.wrap,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {!isDisabled ? <View style={styles.glow} pointerEvents="none" /> : null}
      <LinearGradient
        colors={gradients.primary as unknown as readonly [string, string]}
        start={gradients.primaryAngled.start}
        end={gradients.primaryAngled.end}
        style={styles.btn}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            {withSparkle ? (
              <Sparkle size={14} color={colors.text} />
            ) : null}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: 54,
    borderRadius: radii.pill,
  },
  glow: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: radii.pill,
    backgroundColor: colors.ctaGlow,
    shadowColor: colors.rose,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 8,
  },
  btn: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: {
    ...typography.body.bodySemibold,
    color: colors.text,
    fontSize: 16,
    letterSpacing: 0.1,
  },
  disabled: { opacity: 0.45 },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.94,
  },
});
