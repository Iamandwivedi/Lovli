import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, typography, radius, spacing } from '@/theme';

interface SegmentedControlProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  scrollable?: boolean;
}

export function SegmentedControl({ options, value, onChange, scrollable = false }: SegmentedControlProps) {
  const content = options.map(opt => (
    <Pressable
      key={opt}
      style={[styles.option, value === opt && styles.optionActive]}
      onPress={() => onChange(opt)}
    >
      <Text
        style={[styles.label, value === opt && styles.labelActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {opt}
      </Text>
    </Pressable>
  ));

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.root} contentContainerStyle={styles.scrollContent}>
        {content}
      </ScrollView>
    );
  }

  return <View style={[styles.root, styles.flexRow]}>{content}</View>;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radius.row,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  flexRow: {
    flexDirection: 'row',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 2,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: spacing[3],
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  optionActive: {
    backgroundColor: colors.float,
    borderWidth: 1,
    borderColor: colors.lavender,
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
