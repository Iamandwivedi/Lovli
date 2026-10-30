// The read card (research §5, "Result screen"): comes FIRST, before replies.
// Leads with the temperature pill (Warm / Mixed / Cold — word + icon, never
// colour alone) and one first-person sentence of why. Qualitative only: no
// percentages, per the honesty rule (§11).
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { GlassCard } from "@/src/components/GlassCard";
import { Sparkle } from "@/src/components/Sparkle";
import { REDUCED_FADE_MS, SPRING, useReduceMotion } from "@/src/hooks/useReduceMotion";
import type { ReplyInsight } from "@/src/api/endpoints";
import { colors, typography } from "@/src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
export type Temperature = ReplyInsight["temperature"];

export const TEMPERATURE: Record<Temperature, { label: string; icon: IoniconName; color: string }> = {
  warm: { label: "Warm", icon: "flame-outline", color: colors.amber },
  mixed: { label: "Mixed", icon: "pulse-outline", color: colors.lavenderText },
  cold: { label: "Cold", icon: "snow-outline", color: colors.sky },
};

export const TemperaturePill: React.FC<{ temperature: Temperature; animate?: boolean; testID?: string }> = ({
  temperature,
  animate = true,
  testID,
}) => {
  const reduceMotion = useReduceMotion();
  const meta = TEMPERATURE[temperature];
  const scale = useSharedValue(animate && !reduceMotion ? 0.9 : 1);
  const opacity = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    // The "result" beat — ~250 ms colour settle.
    opacity.value = withTiming(1, { duration: reduceMotion ? REDUCED_FADE_MS : 250 });
    if (!reduceMotion) scale.value = withSpring(1, SPRING);
  }, [animate, opacity, reduceMotion, scale]);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        styles.pill,
        { backgroundColor: `${meta.color}1F`, borderColor: `${meta.color}66` },
        aStyle,
      ]}
      testID={testID}
      accessibilityLabel={`Temperature: ${meta.label}`}
    >
      <Ionicons name={meta.icon} size={13} color={meta.color} />
      <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
    </Animated.View>
  );
};

export const InsightCard: React.FC<{ insight: ReplyInsight }> = ({ insight }) => (
  <GlassCard padded variant="elevated" testID="insight-card">
    <View style={styles.header}>
      <Text style={styles.eyebrow}>THE READ</Text>
      <TemperaturePill temperature={insight.temperature} testID="insight-temp-pill" />
    </View>
    <Text style={styles.why} testID="insight-why">
      {insight.whats_going_on}
    </Text>
    {insight.noticing.length > 0 ? (
      <View style={styles.noticing}>
        {insight.noticing.map((n, i) => (
          <View key={i} style={styles.noticeRow}>
            <Sparkle size={11} color={colors.lavender} />
            <Text style={styles.noticeText}>{n}</Text>
          </View>
        ))}
      </View>
    ) : null}
    <Text style={styles.advice}>
      <Text style={styles.adviceLabel}>{"If I were your wingman: "}</Text>
      {insight.wingman_advice}
    </Text>
  </GlassCard>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  eyebrow: {
    ...typography.body.bodySemibold,
    color: colors.lavenderText,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  why: {
    fontFamily: typography.fonts.displayMedium,
    fontSize: 18,
    lineHeight: 25,
    letterSpacing: 0,
    color: colors.text,
  },
  noticing: { marginTop: 12, gap: 2 },
  noticeRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 3 },
  noticeText: { ...typography.body.base, fontSize: 13.5, lineHeight: 19, color: colors.textSoft, flex: 1 },
  advice: {
    ...typography.body.base,
    fontSize: 13.5,
    lineHeight: 19.5,
    color: colors.textMuted,
    marginTop: 12,
  },
  adviceLabel: { ...typography.body.bodySemibold, color: colors.text },
});
