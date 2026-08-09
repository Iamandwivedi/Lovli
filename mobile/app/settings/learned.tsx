// "Your style" — what Lovli has learned about how YOU text (PR-M6).
// Distinct from the Memory tab (person cards): this is the user's own learned
// texting profile. Controls: remove one preference, pause learning, reset all.
import React, { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { Sparkle } from "@/src/components/Sparkle";
import { useToast } from "@/src/context/ToastContext";
import { extractErrorMessage } from "@/src/api/client";
import {
  LearnedItem,
  MemorySummary,
  deleteLearnedMemory,
  getMemorySummary,
  pauseLearnedMemory,
  removeLearnedPreference,
} from "@/src/api/endpoints";
import { colors, radii, typography } from "@/src/theme";

export default function LearnedScreen() {
  const router = useRouter();
  const toast = useToast();
  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = useCallback(() => {
    getMemorySummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const togglePause = async () => {
    if (!summary) return;
    const next = !summary.paused;
    setSummary({ ...summary, paused: next });
    try {
      await pauseLearnedMemory(next);
      toast.success(next ? "Paused — Lovli stops learning for now." : "Learning again.");
    } catch (err) {
      setSummary({ ...summary, paused: !next });
      toast.error(extractErrorMessage(err, "Could not save."));
    }
  };

  const removeItem = async (item: LearnedItem) => {
    if (!summary) return;
    setSummary({ ...summary, learned: summary.learned.filter((l) => l.id !== item.id) });
    try {
      await removeLearnedPreference(item.id);
      toast.success("Forgotten.");
    } catch (err) {
      load();
      toast.error(extractErrorMessage(err, "Could not remove that."));
    }
  };

  const resetAll = async () => {
    if (confirmText.trim().toUpperCase() !== "RESET") return;
    setResetting(true);
    try {
      await deleteLearnedMemory();
      setConfirmOpen(false);
      setConfirmText("");
      toast.success("Clean slate — Lovli starts learning you fresh.");
      load();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not reset."));
    } finally {
      setResetting(false);
    }
  };

  const coldStart = !summary || summary.is_cold_start || summary.learned.length === 0;

  return (
    <Screen testID="learned-page">
      <View style={styles.backHeader}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="learned-back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.backTitle}>Your style</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 10, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroRow}>
          <Sparkle size={14} color={colors.lavender} />
          <Text style={styles.heroText}>
            Lovli quietly learns how you text — from what you copy, edit, and skip —
            so replies sound like you, not a bot.
          </Text>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : coldStart ? (
          <View style={styles.card} testID="learned-empty">
            <Text style={styles.emptyTitle}>Nothing learned yet</Text>
            <Text style={styles.emptyText}>
              {"Generate a few replies, copy the ones you like, edit the ones you don't — I pick up your style as you go."}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>{"LOVLI HAS LEARNED"}</Text>
            <View style={styles.card} testID="learned-list">
              {summary!.learned.map((item, i) => (
                <React.Fragment key={item.id}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.learnedRow}>
                    <Text style={styles.learnedLabel} numberOfLines={2}>
                      {item.label}
                    </Text>
                    <Pressable
                      onPress={() => removeItem(item)}
                      hitSlop={8}
                      testID={`learned-remove-${item.key}`}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>CONTROLS</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.valueRow}
            onPress={togglePause}
            testID="learned-pause-toggle"
            accessibilityRole="switch"
            accessibilityState={{ checked: !!summary?.paused }}
          >
            <Text style={styles.rowLabel}>Pause learning</Text>
            <View style={[styles.toggle, summary?.paused ? styles.toggleOn : styles.toggleOff]}>
              <View style={[styles.knob, summary?.paused ? styles.knobOn : styles.knobOff]} />
            </View>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.valueRow}
            onPress={() => setConfirmOpen(true)}
            testID="learned-reset-row"
          >
            <Text style={[styles.rowLabel, { color: colors.pink }]}>Reset what Lovli learned</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
        <Text style={styles.sectionHint}>
          Resetting only clears your learned texting style — your people in Memory stay untouched.
        </Text>
      </ScrollView>

      {/* Reset confirm — same typed-confirm pattern as Settings */}
      <Modal visible={confirmOpen} transparent animationType="slide" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setConfirmOpen(false)} />
        <View style={styles.sheet} testID="reset-confirm-sheet">
          <Text style={styles.sheetTitle}>Reset your style?</Text>
          <Text style={styles.sheetSub}>
            Everything Lovli learned about how you text — gone. Type RESET to confirm.
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="RESET"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="characters"
            style={styles.confirmInput}
            testID="reset-confirm-input"
          />
          <Pressable
            onPress={resetAll}
            disabled={confirmText.trim().toUpperCase() !== "RESET" || resetting}
            accessibilityState={{ disabled: confirmText.trim().toUpperCase() !== "RESET" || resetting }}
            style={[styles.deleteCta, (confirmText.trim().toUpperCase() !== "RESET" || resetting) && { opacity: 0.45 }]}
            testID="reset-confirm-button"
          >
            <Text style={styles.deleteCtaText}>{resetting ? "Resetting…" : "Reset it all"}</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8, marginBottom: 6 },
  backTitle: { fontFamily: typography.fonts.displayBold, fontSize: 22, letterSpacing: 0, color: colors.text },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 2, marginBottom: 4 },
  heroText: { ...typography.body.base, fontSize: 13, lineHeight: 19, color: colors.textMuted, flex: 1 },
  sectionLabel: {
    fontFamily: typography.fonts.bodyBold, fontSize: 12, letterSpacing: 1.2,
    textTransform: "uppercase", color: colors.textFaint, marginTop: 8,
  },
  sectionHint: {
    ...typography.body.caption, fontSize: 12, color: colors.textFaint,
    marginTop: -2, paddingHorizontal: 4,
  },
  card: { backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", borderRadius: 18, paddingHorizontal: 17, paddingVertical: 4 },
  learnedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 13 },
  learnedLabel: { ...typography.body.bodySemibold, fontSize: 14, color: colors.textSoft, flex: 1 },
  removeText: { ...typography.body.bodySemibold, fontSize: 13, color: colors.pink },
  emptyTitle: { ...typography.body.bodySemibold, fontSize: 14.5, color: colors.text, paddingTop: 12 },
  emptyText: { ...typography.body.base, fontSize: 13, lineHeight: 19, color: colors.textMuted, paddingVertical: 12 },
  valueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13 },
  rowLabel: { ...typography.body.bodySemibold, fontSize: 14, color: colors.textSoft },
  chevron: { color: colors.textDim, fontSize: 19 },
  divider: { height: 1, backgroundColor: colors.divider },
  toggle: { width: 42, height: 25, borderRadius: 999, justifyContent: "center", paddingHorizontal: 3 },
  toggleOn: {
    backgroundColor: colors.lavender,
    shadowColor: "#A78BFA", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 3,
  },
  toggleOff: { backgroundColor: colors.hairline },
  knob: { width: 19, height: 19, borderRadius: 999 },
  knobOn: { backgroundColor: "#FFFFFF", alignSelf: "flex-end" },
  knobOff: { backgroundColor: colors.textFaint, alignSelf: "flex-start" },
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surfaceRaised, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: colors.hairline, padding: 22, paddingBottom: 34, gap: 10,
  },
  sheetTitle: { fontFamily: typography.fonts.displaySemibold, fontSize: 20, color: colors.text },
  sheetSub: { ...typography.body.base, fontSize: 13.5, lineHeight: 19, color: colors.textMuted, marginBottom: 4 },
  confirmInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: "rgba(224,102,122,0.4)",
    borderRadius: radii.input, paddingVertical: 13, paddingHorizontal: 15,
    ...typography.body.bodySemibold, fontSize: 15, color: colors.text, letterSpacing: 1,
  },
  deleteCta: {
    backgroundColor: colors.redFlag, borderRadius: radii.pill, alignItems: "center", paddingVertical: 15, marginTop: 4,
  },
  deleteCtaText: { ...typography.body.bodyBold, fontSize: 15, color: "#FFFFFF" },
});
