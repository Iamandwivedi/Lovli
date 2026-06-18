import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, radius, spacing } from '@/theme';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <View style={styles.root}>
      <Text style={styles.text}>{message}</Text>
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Text style={styles.dismiss}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: `rgba(248,113,113,0.25)`,
    borderRadius: radius.row,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  text: {
    ...typography.meta,
    color: colors.error,
    flex: 1,
    fontSize: 13,
  },
  dismiss: {
    color: colors.error,
    fontSize: 14,
    marginLeft: spacing[2],
  },
});
