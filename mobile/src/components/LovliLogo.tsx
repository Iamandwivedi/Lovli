// Lovli wordmark + sparkle. Temporary mark — final logo will be swapped in here.
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
  const sparkleSize = Math.round(size * 0.6);
  const wordSize = Math.max(20, Math.round(size * 0.7));
  return (
    <View style={[styles.row, style]} testID="lovli-mark">
      <Sparkle size={sparkleSize} glow />
      {showName ? (
        <Text style={[styles.name, { fontSize: wordSize }]}>lovli</Text>
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
  name: {
    ...typography.display.h1,
    color: colors.text,
    letterSpacing: -0.6,
  },
});
