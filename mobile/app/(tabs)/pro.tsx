import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Header, PrimaryCTA } from '../../src/components/ui';
import { colors, typography, spacing } from '../../src/theme';

const FEATURES = [
  { icon: '∞', label: 'Unlimited replies per day' },
  { icon: '◎', label: 'Advanced memory' },
  { icon: '✦', label: 'More reply styles' },
  { icon: '⚡', label: 'Early access to new AI features' },
];

export default function ProScreen() {
  return (
    <Screen>
      <Header />
      <View style={styles.root}>
        <Text style={styles.headline}>Go further with Pro</Text>
        <Text style={styles.sub}>Free stays free. Pro is for when you're serious.</Text>
        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
        <PrimaryCTA label="Get Early Access" onPress={() => {}} />
        <Text style={styles.freeLine}>Free stays free — always.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing[4], gap: spacing[4], justifyContent: 'center' },
  headline: { ...typography.title, color: colors.text, textAlign: 'center' },
  sub: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  features: { gap: spacing[3], marginVertical: spacing[4] },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.hairline },
  featureIcon: { fontSize: 18, color: colors.lavender, width: 28, textAlign: 'center' },
  featureLabel: { ...typography.body, color: colors.textSoft },
  freeLine: { ...typography.meta, color: colors.textFaint, textAlign: 'center', marginTop: spacing[2] },
});
