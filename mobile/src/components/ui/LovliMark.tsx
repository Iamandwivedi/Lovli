import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';

// Temporary Lovli mark — a rounded lavender square with a small inner
// highlight + a thin "sparkle" glyph. Replaces the previous 8x8 dot.
// Final brand mark will be swapped in here in a single edit.

interface LovliMarkProps {
  size?: number;
  style?: ViewStyle;
}

export function LovliMark({ size = 28, style }: LovliMarkProps) {
  const radius = Math.round(size * 0.32);
  const inset = Math.round(size * 0.18);
  const glyph = Math.round(size * 0.5);

  return (
    <View
      style={[
        styles.outer,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      {/* subtle inner highlight — top-left soft fade */}
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            top: inset / 2,
            left: inset / 2,
            right: inset / 2,
            bottom: size / 2,
            borderTopLeftRadius: radius * 0.6,
            borderTopRightRadius: radius * 0.6,
          },
        ]}
      />
      <Feather name="message-circle" size={glyph} color={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.violet,
    shadowColor: colors.lavender,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});
