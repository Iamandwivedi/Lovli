import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@/theme';
import { Icon } from './Icon';
import { LovliMark } from './LovliMark';

interface HeaderProps {
  // On Reply: shows Lovli mark + wordmark + cog. On other screens: pass `title`.
  title?: string;
  plan?: 'free' | 'pro';
  showBack?: boolean;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
}

export function Header({
  title,
  plan,
  showBack = false,
  onBackPress,
  onSettingsPress,
}: HeaderProps) {
  const isHome = !showBack && !title;

  function pressBack() {
    Haptics.selectionAsync().catch(() => {});
    onBackPress?.();
  }

  function pressSettings() {
    Haptics.selectionAsync().catch(() => {});
    onSettingsPress?.();
  }

  return (
    <View style={styles.root}>
      {showBack ? (
        <Pressable hitSlop={12} onPress={pressBack} style={styles.iconBtn}>
          <Icon name="chevron-left" size={24} color={colors.textSoft} />
        </Pressable>
      ) : (
        <View style={styles.brand}>
          <LovliMark size={28} />
          <Text style={styles.wordmark}>lovli</Text>
        </View>
      )}

      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : null}

      <View style={styles.right}>
        {isHome && plan === 'free' ? (
          <View style={styles.planBadge}>
            <Text style={styles.planText}>Free</Text>
          </View>
        ) : null}
        {isHome && plan === 'pro' ? (
          <View style={[styles.planBadge, styles.planBadgePro]}>
            <Text style={[styles.planText, styles.planTextPro]}>Pro</Text>
          </View>
        ) : null}
        {onSettingsPress ? (
          <Pressable hitSlop={12} onPress={pressSettings} style={styles.iconBtn}>
            <Icon name="settings" size={20} color={colors.textSoft} />
          </Pressable>
        ) : null}
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
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  wordmark: {
    ...typography.bodyMedium,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  title: {
    ...typography.meta,
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  planBadgePro: {
    borderColor: 'rgba(167,139,250,0.35)',
    backgroundColor: 'rgba(167,139,250,0.10)',
  },
  planText: {
    ...typography.meta,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  planTextPro: {
    color: colors.lavenderSoft,
  },
});
