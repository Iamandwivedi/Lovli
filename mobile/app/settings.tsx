import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header } from '../src/components/ui';
import { colors, typography, spacing, radius } from '../src/theme';

const ROWS = [
  { label: 'Account', sub: 'Name, email' },
  { label: 'Language', sub: 'Hinglish' },
  { label: 'Platform', sub: 'Instagram' },
  { label: 'Sign out', sub: '', danger: true },
];

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Header showBack onBackPress={() => router.back()} />
      <View style={styles.root}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.list}>
          {ROWS.map(row => (
            <Pressable key={row.label} style={styles.row}>
              <View>
                <Text style={[styles.rowLabel, row.danger && styles.rowLabelDanger]}>{row.label}</Text>
                {row.sub ? <Text style={styles.rowSub}>{row.sub}</Text> : null}
              </View>
              {!row.danger && <Text style={styles.chevron}>›</Text>}
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing[4], gap: spacing[4] },
  title: { ...typography.title, color: colors.text },
  list: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rowLabel: { ...typography.body, color: colors.textSoft },
  rowLabelDanger: { color: colors.error },
  rowSub: { ...typography.meta, color: colors.textFaint, fontSize: 12, marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: 18 },
});
