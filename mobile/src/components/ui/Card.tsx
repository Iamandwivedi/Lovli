import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, shadows } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'surface' | 'float';
  highlighted?: boolean;
}

export function Card({ children, style, variant = 'surface', highlighted = false }: CardProps) {
  return (
    <View style={[
      styles.base,
      variant === 'surface' ? styles.surface : styles.float,
      highlighted && styles.highlighted,
      style,
    ]}>
      {variant === 'float' && <View style={styles.floatHighlight} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  surface: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderTopWidth: 0,
    ...shadows.surface,
  },
  float: {
    backgroundColor: colors.float,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...shadows.float,
  },
  floatHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: `rgba(248,250,252,0.06)`,
  },
  highlighted: {
    borderColor: colors.lavender,
    borderWidth: 1,
  },
});
