import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Header, PrimaryCTA } from '../../src/components/ui';
import { colors, typography, spacing } from '../../src/theme';

export default function MemoryScreen() {
  return (
    <Screen>
      <Header />
      <View style={styles.root}>
        <Text style={styles.headline}>Memory</Text>
        <Text style={styles.sub}>
          Save context about the person you're chatting with.{'\n'}
          Lovli will remember it next time.
        </Text>
        <View style={styles.exampleNote}>
          <Text style={styles.exampleNickname}>Example · Priya</Text>
          <Text style={styles.exampleDetail}>Good to remember · Loves old Bollywood</Text>
          <Text style={styles.exampleDetail}>How they usually talk · Playful, lots of emojis</Text>
        </View>
        <PrimaryCTA label="Add someone" onPress={() => {}} style={{ marginTop: spacing[4] }} />
        <Text style={styles.hint}>Memory ships fully in the next update.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing[4], gap: spacing[3], alignItems: 'center', justifyContent: 'center' },
  headline: { ...typography.title, color: colors.text },
  sub: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  exampleNote: { width: '100%', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, padding: spacing[4], gap: spacing[2], opacity: 0.5 },
  exampleNickname: { ...typography.bodyMedium, color: colors.textSoft },
  exampleDetail: { ...typography.meta, color: colors.textMuted, fontSize: 13 },
  hint: { ...typography.meta, color: colors.textFaint, fontSize: 12, marginTop: spacing[2] },
});
