// Temporary Lovli mark — small SVG-style composition using Views.
// Per spec: do not redesign the final brand logo yet.
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fontSize } from "@/src/theme/colors";

type Props = {
  size?: number;
  showName?: boolean;
  style?: ViewStyle;
};

export const LovliLogo: React.FC<Props> = ({ size = 36, showName = true, style }) => {
  return (
    <View style={[styles.row, style]} testID="lovli-mark">
      <View style={[styles.markWrap, { width: size, height: size, borderRadius: size * 0.32 }]}>
        <View style={[styles.glow, { width: size, height: size, borderRadius: size * 0.32 }]} />
        <View style={[styles.markInner, { width: size, height: size, borderRadius: size * 0.32 }]}>
          <Ionicons name="sparkles" size={size * 0.5} color="#FFFFFF" />
        </View>
      </View>
      {showName ? (
        <Text style={[styles.name, { fontSize: Math.max(18, size * 0.55) }]}>Lovli</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  markWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: colors.lavenderGlow,
  },
  markInner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.violet,
    overflow: "hidden",
  },
  name: {
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
    fontSize: fontSize.xl,
  },
});
