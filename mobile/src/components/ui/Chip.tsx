import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, radius } from '@/theme';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, active = false, onPress, style }: ChipProps) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive, style]}
      onPress={onPress}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.lavender,
    backgroundColor: `rgba(167,139,250,0.10)`,
  },
  label: {
    ...typography.meta,
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 13,
  },
  labelActive: {
    color: colors.lavender,
  },
});
