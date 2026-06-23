import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen, PrimaryCTA, GhostButton, Icon } from '../src/components/ui';
import { colors, typography, spacing } from '../src/theme';

export default function LimitReachedScreen() {
  const router = useRouter();
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, []);
  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.iconHalo}>
          <Icon name="clock" size={28} color={colors.lavender} />
        </View>
        <Text style={styles.headline}>That's 8 for today.</Text>
        <Text style={styles.sub}>Resets at midnight · Your chats stay yours.</Text>
        <View style={styles.actions}>
          <PrimaryCTA label="Get Early Access" onPress={() => router.push('/pro')} />
          <GhostButton label="Back to Reply" onPress={() => router.replace('/(tabs)/reply')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6], gap: spacing[4] },
  iconHalo: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
    marginBottom: spacing[2],
  },
  headline: { ...typography.title, color: colors.text, textAlign: 'center' },
  sub: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  actions: { width: '100%', gap: spacing[3], marginTop: spacing[4] },
});
