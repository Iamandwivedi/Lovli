// List bullet: a 5px filled circle, vertically centred on the first line of
// the text beside it. Replaces the retired glyph in bulleted result lists.
import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/src/theme";

type Props = {
  color?: string;
  /** lineHeight of the adjacent text, so the dot centres on its first line. */
  lineHeight?: number;
};

const DOT = 5;

export const Bullet: React.FC<Props> = ({ color = colors.lavender, lineHeight = 19 }) => (
  <View style={[styles.dot, { backgroundColor: color, marginTop: Math.round((lineHeight - DOT) / 2) }]} />
);

const styles = StyleSheet.create({
  dot: { width: DOT, height: DOT, borderRadius: 999 },
});
