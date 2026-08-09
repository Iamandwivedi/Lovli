// Staged generating loader — "V2 · Coach — Reply · Generating".
// Centered pulsing ✦ over an ambient glow + sequential 5-stage checklist.
// Done: lavender-tint circle w/ check. Active: ringed glowing circle + serif text.
// Pending: hairline ring + disabled text.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AmbientGlow } from "@/src/components/AmbientGlow";
import { Sparkle } from "@/src/components/Sparkle";
import { colors, typography } from "@/src/theme";

export const GENERATION_STAGES = [
  "Reading the message…",
  "Checking the vibe…",
  "Understanding context…",
  "Finding the best reply…",
  "Writing naturally…",
];

type Props = {
  activeIndex: number;
  stages?: string[];
};

export const StagedLoader: React.FC<Props> = ({ activeIndex, stages = GENERATION_STAGES }) => {
  return (
    <View style={styles.root} testID="staged-loader">
      <View style={styles.heroArea}>
        <AmbientGlow size={420} style={styles.glow} />
        <Sparkle size={48} color={colors.lavender} glow animated />
      </View>

      <View style={styles.list}>
        {stages.map((label, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <View key={label} style={styles.row} testID={`loader-stage-${state}`}>
              {state === "done" ? (
                <View style={[styles.circle, styles.circleDone]}>
                  <Ionicons name="checkmark" size={12} color={colors.lavender} />
                </View>
              ) : state === "active" ? (
                <View style={[styles.circle, styles.circleActive]} />
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
  },
  heroArea: {
    alignItems: "center",
    justifyContent: "center",
    height: 220,
  },
  glow: {
    position: "absolute",
    alignSelf: "center",
  },
  list: {
    marginTop: 44,
    paddingHorizontal: 40,
    gap: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: "rgba(167,139,250,0.18)",
  },
  circleActive: {
    borderWidth: 2,
    borderColor: colors.lavender,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  circlePending: {
    borderWidth: 1.5,
    borderColor: colors.hairline,
  },
  textDone: {
    ...typography.body.base,
    fontSize: 14,
    color: colors.textFaint,
  },
  textActive: {
    fontFamily: typography.fonts.displayMedium,
    fontSize: 16.5,
    color: colors.text,
  },
  textPending: {
    ...typography.body.base,
    fontSize: 14,
    color: colors.textDisabled,
  },
});
