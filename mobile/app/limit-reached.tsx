import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, PrimaryCTA, GhostButton } from '../src/components/ui';
import { colors, typography, spacing } from '../src/theme';

export default function LimitReachedScreen() {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.root}>
        <Text style={styles.emoji}>⏳</Text>
        <Text style={styles.headline}>That's 8 for today.</Text>
        <Text style={styles.sub}>Resets at midnight · Your chats stay yours.</Text>
        <View style={styles.actions}>
          <PrimaryCTA label="Get Early Access" onPress={() => {}} />
          <GhostButton label="Back to Reply" onPress={() => router.replace('/(tabs)/reply')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6], gap: spacing[4] },
  emoji: { fontSize: 48, marginBottom: spacing[2] },
  headline: { ...typography.title, color: colors.text, textAlign: 'center' },
  sub: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  actions: { width: '100%', gap: spacing[3], marginTop: spacing[4] },
});
