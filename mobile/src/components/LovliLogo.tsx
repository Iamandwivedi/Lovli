// Lovli in-app mark — V3 spark squircle + optional wordmark.
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, typography } from "@/src/theme";
import { Sparkle } from "./Sparkle";

type Props = {
  size?: number;
  showName?: boolean;
  style?: ViewStyle;
};

export const LovliLogo: React.FC<Props> = ({ size = 36, showName = true, style }) => {
  const sparkleSize = Math.round(size * 0.48);
  const wordSize = Math.max(20, Math.round(size * 0.7));
  return (
    <View style={[styles.row, style]} testID="lovli-mark">
      <View style={[styles.tile, { width: size, height: size, borderRadius: Math.max(10, size * 0.34) }]}>
        <Sparkle size={sparkleSize} color={colors.lavenderSoft} glow />
      </View>
      {showName ? (
        <Text style={[styles.name, { fontSize: wordSize }]}>Lovli</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(167,139,250,0.10)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.26)",
    overflow: "hidden",
  },
  name: {
    ...typography.display.h1,
    color: colors.text,
    letterSpacing: 0,
  },
});
