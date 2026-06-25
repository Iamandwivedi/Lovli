// Primary CTA — glossy black pill with a small ✦ sparkle (PR2.1 light redesign).
// Vertical gradient #2A2733 → #0B0B10, 1px inner top highlight, drop shadow.
// Public props are unchanged from PR1 — same call sites everywhere.
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radii, typography } from "@/src/theme";
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
      <LinearGradient
        colors={[colors.ctaGlossTop, colors.ctaBase] as unknown as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.btn}
      >
        {/* 1px inner top highlight — the "shine" */}
        <View pointerEvents="none" style={styles.innerHighlight} />
        {loading ? (
          <ActivityIndicator color={colors.ctaText} size="small" />
        ) : (
          <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            {withSparkle ? (
              <Sparkle size={14} color={colors.ctaText} />
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
    // Black-CTA drop shadow per spec
    shadowColor: "#0B0B10",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 6,
  },
  btn: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    overflow: "hidden",
  },
  innerHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: {
    ...typography.body.bodySemibold,
    color: colors.ctaText,
    fontSize: 16,
    letterSpacing: 0.1,
  },
  disabled: { opacity: 0.45 },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.96,
  },
});
