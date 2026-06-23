import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, PrimaryCTA, Icon } from '../src/components/ui';
import type { IconName } from '../src/components/ui';
import { colors, typography, spacing } from '../src/theme';

const FEATURES: { icon: IconName; label: string }[] = [
  { icon: 'repeat', label: 'Unlimited replies per day' },
  { icon: 'bookmark', label: 'Advanced memory' },
  { icon: 'sliders', label: 'More reply styles' },
  { icon: 'zap', label: 'Early access to new AI features' },
];

export default function ProScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Header showBack onBackPress={() => router.back()} />
      <View style={styles.root}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Coming soon</Text>
        </View>
        <Text style={styles.headline}>Go further with Lovli</Text>
        <Text style={styles.sub}>
          Free stays free — 8 generations a day, 3 replies each time.
        </Text>
        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Icon name={f.icon} size={16} color={colors.lavender} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
        <PrimaryCTA label="Get Early Access" onPress={() => {}} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: spacing[4],
    gap: spacing[4],
    justifyContent: 'center',
  },
  pill: {
    alignSelf: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  pillText: {
    ...typography.meta,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  headline: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  sub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  features: {
    gap: spacing[1],
    marginVertical: spacing[2],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.18)',
  },
  featureLabel: {
    ...typography.body,
    color: colors.textSoft,
  },
});
