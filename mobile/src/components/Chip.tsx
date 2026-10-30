// Chip — V3 glass selection pill.
// Research §12: 44 pt minimum target, selection haptic on every tap, spring
// scale 0.96 on press-in (150 ms fade-only when Reduce Motion is on), 12 %
// white overlay while pressed.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { haptic } from "@/src/lib/haptics";
import { SPRING, useReduceMotion } from "@/src/hooks/useReduceMotion";
import { colors, radii, space, typography } from "@/src/theme";

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
  size?: "sm" | "md";
  /** Optional leading element (dot, icon, mini avatar). */
  leading?: React.ReactNode;
  accessibilityLabel?: string;
  /** Skip the selection haptic (e.g. when the parent fires its own). */
  silent?: boolean;
};

export const Chip: React.FC<Props> = ({
  label,
  selected,
  onPress,
  testID,
  size = "md",
  leading,
  accessibilityLabel,
  silent,
}) => {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pressTo = (v: number) => {
    scale.value = reduceMotion ? withTiming(1, { duration: 1 }) : withSpring(v, SPRING);
  };

  return (
    <Animated.View style={aStyle}>
      <Pressable
        onPress={() => {
          if (!silent) haptic.selection();
          onPress();
        }}
        onPressIn={() => pressTo(0.96)}
        onPressOut={() => pressTo(1)}
        testID={testID}
        hitSlop={size === "sm" ? 6 : 0}
        accessibilityRole="button"
        accessibilityState={{ selected: !!selected }}
        accessibilityLabel={accessibilityLabel || label}
        style={({ pressed }) => [
          styles.chip,
          size === "sm" && styles.small,
          selected ? styles.selected : styles.unselected,
          pressed && styles.pressed,
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <Text
          style={[
            styles.label,
            size === "sm" && styles.labelSmall,
            selected && styles.labelSelected,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: space.l - 2,
    paddingVertical: space.s,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  small: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 6 },
  leading: { alignItems: "center", justifyContent: "center" },
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
  pressed: { backgroundColor: "rgba(255,255,255,0.12)" },
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
