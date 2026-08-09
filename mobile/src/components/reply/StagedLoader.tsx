// Staged generating loader — V3 app-icon spinner + sequential checklist.
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AmbientGlow } from "@/src/components/AmbientGlow";
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
        <View style={styles.spinner}>
          <Image source={require("../../../assets/images/icon.png")} style={styles.icon} />
        </View>
        <Text style={styles.title}>Catching the tone...</Text>
      </View>

      <View style={styles.list}>
        {stages.map((label, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <View key={label} style={styles.row} testID={`loader-stage-${state}`}>
              {state === "done" ? (
                <View style={[styles.circle, styles.circleDone]}>
                  <Ionicons name="checkmark" size={12} color={colors.green} />
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
  spinner: {
    width: 120,
    height: 120,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,5,9,0.42)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.18)",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 28,
    elevation: 8,
  },
  icon: {
    width: 66,
    height: 66,
    borderRadius: 16,
  },
  title: {
    fontFamily: typography.fonts.displayBold,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: 0,
    color: colors.text,
    marginTop: 24,
  },
  list: {
    marginTop: 28,
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
    backgroundColor: "rgba(134,200,157,0.16)",
    borderWidth: 1,
    borderColor: "rgba(134,200,157,0.40)",
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
