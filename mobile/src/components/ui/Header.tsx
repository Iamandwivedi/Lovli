import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/theme';

interface HeaderProps {
  plan?: 'free' | 'pro';
  onSettingsPress?: () => void;
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
}

export function Header({ plan, onSettingsPress, title, showBack, onBackPress }: HeaderProps) {
  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable onPress={onBackPress} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.brandRow}>
            {/* Mark — stylised dot */}
            <View style={styles.mark} />
            <Text style={styles.wordmark}>lovli</Text>
          </View>
        )}
        {title && <Text style={styles.title}>{title}</Text>}
      </View>

      <View style={styles.right}>
        {plan && (
          <View style={[styles.planBadge, plan === 'pro' && styles.planBadgePro]}>
            <Text style={[styles.planText, plan === 'pro' && styles.planTextPro]}>
              {plan === 'pro' ? 'Pro' : 'Free'}
            </Text>
          </View>
        )}
        {onSettingsPress && (
          <Pressable onPress={onSettingsPress} style={styles.cogBtn} hitSlop={12}>
            <Text style={styles.cogIcon}>⚙</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.bg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lavender,
  },
  wordmark: {
    ...typography.sectionTitle,
    color: colors.text,
    letterSpacing: -0.5,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  backBtn: {
    padding: 4,
  },
  backArrow: {
    ...typography.body,
    color: colors.textSoft,
    fontSize: 20,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  planBadgePro: {
    borderColor: colors.lavender,
    backgroundColor: `rgba(167,139,250,0.12)`,
  },
  planText: {
    ...typography.toneLabel,
    color: colors.textMuted,
    fontSize: 10,
  },
  planTextPro: {
    color: colors.lavender,
  },
  cogBtn: {
    padding: 4,
  },
  cogIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
});
