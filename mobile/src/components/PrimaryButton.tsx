// Primary CTA — V3 white iOS pill.
// White fill, 1px #E5E7EB border, dark label, lavender halo shadow.
// Leading ✦ glyph in deep violet #8B5CF6 (withSparkle, default true).
// Press → scale 0.96 spring + Haptics.Medium + shadow tightens.
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radii, typography } from "@/src/theme";
import { Sparkle } from "./Sparkle";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  /** ✦ leads primary CTAs by convention. Pass false for e.g. onboarding "Continue". */
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
  // 0 = resting, 1 = pressed.
  const pressed = useRef(new Animated.Value(0)).current;
  const scale = pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
  const shadowOpacity = pressed.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.18] });
  const shadowOffsetY = pressed.interpolate({ inputRange: [0, 1], outputRange: [8, 3] });
  const shadowRadius = pressed.interpolate({ inputRange: [0, 1], outputRange: [28, 14] });

  const animateTo = (toValue: number) =>
    Animated.spring(pressed, {
      toValue,
      useNativeDriver: false, // shadow* aren't on the native driver allowlist
      friction: 7,
      tension: 180,
    }).start();

  const handlePressIn = () => {
    if (isDisabled) return;
    animateTo(1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };
  const handlePressOut = () => {
    if (isDisabled) return;
    animateTo(0);
  };

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          transform: [{ scale }],
          shadowOpacity,
          shadowOffset: { width: 0, height: shadowOffsetY as unknown as number },
          shadowRadius,
        },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        testID={testID}
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      >
        {loading ? (
          <ActivityIndicator color={colors.ctaText} size="small" />
        ) : (
          <View style={styles.row}>
            {withSparkle ? <Sparkle size={15} color={colors.violetDeep} /> : null}
            <Text style={styles.label} numberOfLines={1}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.ctaBg,
    borderWidth: 1,
    borderColor: colors.ctaBorder,
    // Lavender halo per V3 spec.
    shadowColor: "#A78BFA",
    elevation: 8,
  },
  pressable: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: {
    ...typography.body.bodyBold,
    color: colors.ctaText,
    fontSize: 16,
    letterSpacing: 0.1,
  },
  disabled: { opacity: 0.45 },
});
