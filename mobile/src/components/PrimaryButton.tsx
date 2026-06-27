// Primary CTA — glossy BLACK pill (PR2.2 polish).
// 3-stop vertical gloss + specular sheen overlay + 1px top highlight + drop shadow.
// Press → scale 0.96 spring + Haptics.Medium + shadow drops in ("presses into" the surface).
// NO sparkle on the button itself (PR2.2 — sparkle lives in LovliLogo only).
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  /**
   * PR-DA1: ✦ restored on primary CTAs. Default true. Pass `withSparkle={false}`
   * for CTAs that shouldn't have one (e.g. destructive confirms).
   */
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
  // Animated values for the "press into surface" effect.
  const pressed = useRef(new Animated.Value(0)).current;
  // 0 = resting, 1 = pressed.
  const scale = pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
  const shadowOpacity = pressed.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.18] });
  const shadowOffsetY = pressed.interpolate({ inputRange: [0, 1], outputRange: [10, 4] });
  const shadowRadius = pressed.interpolate({ inputRange: [0, 1], outputRange: [22, 14] });

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
    // Tactile haptic on press-in — single biggest "clicky" win on device.
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
        {/* Body: 3-stop vertical gloss gradient */}
        <LinearGradient
          colors={[colors.ctaGlossTop, colors.ctaGlossMid, colors.ctaBase] as unknown as readonly [string, string, ...string[]]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fill}
        >
          {/* Specular sheen overlay (top → transparent), ~55% height */}
          <LinearGradient
            pointerEvents="none"
            colors={[colors.ctaSheen, "rgba(255,255,255,0)"] as unknown as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.sheen}
          />
          {/* 1px inner top hairline highlight */}
          <View pointerEvents="none" style={styles.innerHighlight} />

          {loading ? (
            <ActivityIndicator color={colors.ctaText} size="small" />
          ) : (
            <View style={styles.row}>
              {withSparkle ? <Sparkle size={14} color={colors.ctaText} /> : null}
              <Text style={styles.label} numberOfLines={1}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: 54,
    borderRadius: radii.pill,
    // Animated shadow values flow through the inline style on <Animated.View>.
    shadowColor: "#050508",
    elevation: 8,
  },
  pressable: {
    flex: 1,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
    borderTopLeftRadius: radii.pill,
    borderTopRightRadius: radii.pill,
  },
  innerHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: {
    ...typography.body.bodySemibold,
    color: colors.ctaText,
    fontSize: 16,
    letterSpacing: 0.1,
  },
  disabled: { opacity: 0.45 },
});

// Hint to TS for Easing import (kept so future motion tweaks don't need a re-import).
void Easing;
