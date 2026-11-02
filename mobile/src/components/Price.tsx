// Renders a rupee amount with the symbol in a family that actually has the
// glyph (see typography.fonts.currency). The digits inherit whatever style
// the parent passes, so this drops into any price line without layout change.
import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";
import { typography } from "@/src/theme";

type Props = {
  amount: string | number;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  testID?: string;
};

export const Rupee: React.FC<{ style?: StyleProp<TextStyle> }> = ({ style }) => (
  <Text style={[style, { fontFamily: typography.fonts.currency }]}>{"\u20B9"}</Text>
);

export const Price: React.FC<Props> = ({ amount, style, children, testID }) => (
  <Text style={style} testID={testID}>
    <Rupee style={style} />
    {amount}
    {children}
  </Text>
);
