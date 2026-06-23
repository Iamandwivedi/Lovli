import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { Screen, Header, GhostButton, Card, Toast, ErrorBanner } from '../src/components/ui';
import { colors, typography, spacing, radius } from '../src/theme';
import type { GenerationResult } from '../src/types/generation';
import { getToneLabel } from '../src/constants/product';
import { sendFeedback } from '../src/services/generationApi';

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data: string; platform: string; vibe: string; language: string }>();
  const result: GenerationResult = JSON.parse(params.data ?? '{}');

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [dimmedExcept, setDimmedExcept] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleCopy = useCallback(async (text: string, index: number) => {
    await Clipboard.setStringAsync(text);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopiedIndex(index);
    setDimmedExcept(index);
    setShowToast(true);
    sendFeedback({ generation_id: result.generation_id, copied_reply_index: index }).catch(() => {});
    setTimeout(() => setCopiedIndex(null), 1800);
  }, [result.generation_id]);

  return (
    <Screen edges={['top']}>
      <Header
        showBack
        onBackPress={() => router.back()}
        title={`${params.platform} · ${params.language} · ${params.vibe}`}
      />

      {error ? <ErrorBanner message={error} onDismiss={() => setError('')} /> : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.usageBar}>
          <Text style={styles.usageMeta}>
            {result.daily_generation_count}/{result.daily_limit} today
          </Text>
        </View>

        {result.replies?.map((reply, i) => (
          <MotiView
            key={i}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: dimmedExcept !== null && dimmedExcept !== i ? 0.35 : 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 320, delay: i * 80 }}
          >
            <ReplyCard
              text={reply.text}
              toneLabel={getToneLabel(params.vibe ?? '')}
              isLead={i === 0}
              isCopied={copiedIndex === i}
              onCopy={() => handleCopy(reply.text, i)}
            />
          </MotiView>
        ))}

        <View style={styles.memoryNudge}>
          <Text style={styles.memoryNudgeText}>Save context for next time</Text>
        </View>

        {showRegenerateConfirm ? (
          <View style={styles.regenerateConfirm}>
            <Text style={styles.regenerateQuestion}>Generate fresh replies?</Text>
            <View style={styles.regenerateActions}>
              <GhostButton label="Cancel" onPress={() => setShowRegenerateConfirm(false)} style={{ flex: 1 }} />
              <Pressable style={styles.confirmBtn} onPress={() => { setShowRegenerateConfirm(false); router.back(); }}>
                <Text style={styles.confirmBtnText}>Yes, regenerate</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.regenerateLink} onPress={() => setShowRegenerateConfirm(true)}>
            <Text style={styles.regenerateLinkText}>Regenerate</Text>
          </Pressable>
        )}
      </ScrollView>

      <Toast message="Copied. Go send it." visible={showToast} onHide={() => setShowToast(false)} />
    </Screen>
  );
}

function ReplyCard({ text, toneLabel, isLead, isCopied, onCopy }: {
  text: string; toneLabel: string; isLead: boolean; isCopied: boolean; onCopy: () => void;
}) {
  return (
    <Card variant="float" style={styles.replyCard} highlighted={isLead}>
      <Text style={styles.toneLabel}>{toneLabel}</Text>
      <Text style={[styles.replyText, isLead && styles.replyTextLead]}>{text}</Text>
      <Pressable
        style={[styles.copyBtn, isCopied && styles.copyBtnCopied]}
        onPress={onCopy}
      >
        <Text style={[styles.copyBtnText, isCopied && styles.copyBtnTextCopied]}>
          {isCopied ? 'Copied' : 'Copy'}
        </Text>
      </Pressable>
      {isLead && (
        <View style={styles.editNote}>
          <Text style={styles.editNoteText}>Edit it if you want. Make it yours.</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[3], paddingBottom: 40 },
  usageBar: { alignItems: 'flex-end', marginBottom: spacing[1] },
  usageMeta: { ...typography.meta, color: colors.textFaint, fontSize: 12 },
  replyCard: { padding: spacing[4], gap: spacing[3] },
  toneLabel: { ...typography.toneLabel, color: colors.lavenderSoft },
  replyText: { ...typography.replyBody, color: colors.text },
  replyTextLead: { ...typography.replyLead },
  copyBtn: { borderRadius: radius.pill, backgroundColor: colors.white, paddingVertical: 12, alignItems: 'center' },
  copyBtnCopied: { backgroundColor: 'rgba(167,139,250,0.15)' },
  copyBtnText: { ...typography.bodyMedium, color: colors.ctaText, fontSize: 14, fontWeight: '600' },
  copyBtnTextCopied: { color: colors.lavender },
  editNote: { borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: spacing[2] },
  editNoteText: { ...typography.meta, color: colors.textFaint, fontSize: 12, textAlign: 'center' },
  memoryNudge: { alignItems: 'center', paddingVertical: spacing[2] },
  memoryNudgeText: { ...typography.meta, color: colors.lavender, fontSize: 13 },
  regenerateLink: { alignItems: 'center', paddingVertical: spacing[3] },
  regenerateLinkText: { ...typography.meta, color: colors.textMuted, fontSize: 13 },
  regenerateConfirm: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.hairline, padding: spacing[4], gap: spacing[3] },
  regenerateQuestion: { ...typography.bodyMedium, color: colors.textSoft, textAlign: 'center' },
  regenerateActions: { flexDirection: 'row', gap: spacing[2] },
  confirmBtn: { flex: 1, height: 44, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { ...typography.bodyMedium, color: colors.lavender, fontSize: 14 },
});
