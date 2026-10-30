// Staged generating loader (research §5, "Staged loader").
// Four truthful stages, each tied to a real backend step, ~700 ms minimum per
// stage so the eye can read; a lavender dot pulses on the active stage; no
// percentage bar (fake progress destroys trust). Labor-illusion rule: never
// pad beyond the real latency by more than ~1 s — the screen owns the timing.
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AmbientGlow } from "@/src/components/AmbientGlow";
import { Sparkle } from "@/src/components/Sparkle";
import { useReduceMotion } from "@/src/hooks/useReduceMotion";
import { colors, typography } from "@/src/theme";

/** Minimum dwell per stage. The last stage holds until the request resolves. */
export const STAGE_MS = 700;

export function buildGenerationStages(personName?: string | null): string[] {
  return [
    "Reading the last few messages",
    personName
      ? `Checking what you told me about ${personName}`
      : "Checking what you've told me so far",
    "Reading the room",
    "Writing three options",
  ];
}

export const GENERATION_STAGES = buildGenerationStages(null);

type Props = {
  activeIndex: number;
  stages?: string[];
  title?: string;
};

export const StagedLoader: React.FC<Props> = ({
  activeIndex,
  stages = GENERATION_STAGES,
  title = "Reading it with you…",
}) => {
  const reduceMotion = useReduceMotion();
  const activeLabel = stages[Math.min(activeIndex, stages.length - 1)] || "";
  return (
    <View style={styles.root} testID="staged-loader">
      <View style={styles.heroArea}>
        <AmbientGlow size={360} style={styles.glow} />
        <View style={styles.sparkleWrap}>
          <Sparkle size={34} color={colors.lavender} glow animated={!reduceMotion} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.list} accessibilityLiveRegion="polite" accessibilityLabel={activeLabel}>
        {stages.map((label, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <View key={label} style={styles.row} testID={`loader-stage-${state}`}>
              {state === "done" ? (
                <View style={[styles.circle, styles.circleDone]}>
                  <Ionicons name="checkmark" size={12} color={colors.green} />
                </View>
              ) : state === "active" ? (
                <ActiveDot pulse={!reduceMotion} />
              ) : (
                <View style={[styles.circle, styles.circlePending]} />
              )}
              <Text
                style={
                  state === "done"
                    ? styles.textDone
                    : state === "active"
                      ? styles.textActive
                      : styles.textPending
                }
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const ActiveDot: React.FC<{ pulse: boolean }> = ({ pulse }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!pulse) return;
    t.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, t]);
  const halo = useAnimatedStyle(() => ({
    opacity: 0.25 + t.value * 0.45,
    transform: [{ scale: 1 + t.value * 0.5 }],
  }));
  return (
    <View style={[styles.circle, styles.circleActive]}>
      <Animated.View style={[styles.activeHalo, halo]} />
      <View style={styles.activeCore} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
  },
  heroArea: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
  glow: {
    position: "absolute",
    alignSelf: "center",
  },
  sparkleWrap: {
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,5,9,0.42)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.18)",
  },
  title: {
    fontFamily: typography.fonts.displayBold,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: 0,
    color: colors.text,
    marginTop: 22,
  },
  list: {
    marginTop: 28,
    paddingHorizontal: 36,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: "rgba(134,200,157,0.16)",
    borderWidth: 1,
    borderColor: "rgba(134,200,157,0.40)",
  },
  circleActive: {},
  activeHalo: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(167,139,250,0.35)",
  },
  activeCore: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.lavender,
  },
  circlePending: {
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  textDone: {
    ...typography.body.base,
    fontSize: 14,
    color: colors.textFaint,
    flex: 1,
  },
  textActive: {
    fontFamily: typography.fonts.displayMedium,
    fontSize: 16.5,
    color: colors.text,
    flex: 1,
  },
  textPending: {
    ...typography.body.base,
    fontSize: 14,
    color: colors.textDisabled,
    flex: 1,
  },
});
