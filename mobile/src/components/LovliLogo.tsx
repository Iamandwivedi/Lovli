// Lovli in-app mark: the wordmark in the display font. No tile, no glyph.
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, typography } from "@/src/theme";

type Props = {
  size?: number;
  /** Kept for callers; the wordmark is the only mark, so false renders it at the small size. */
  showName?: boolean;
  style?: ViewStyle;
};

export const LovliLogo: React.FC<Props> = ({ size = 36, showName = true, style }) => {
  const wordSize = showName ? size : Math.max(20, Math.round(size * 0.7));
  return (
    <View style={[styles.row, style]} testID="lovli-mark">
      <Text style={[styles.name, { fontSize: wordSize, lineHeight: Math.round(wordSize * 1.15) }]}>Lovli</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    ...typography.display.h1,
    color: colors.text,
    letterSpacing: 0,
  },
});
