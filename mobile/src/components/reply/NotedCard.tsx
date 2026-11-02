// "Noted" fact proposal (research §7 / §10): after a generation, one line —
// "Noted: she's in Koramangala, likes chai dates" — with Keep / Not this.
// One tap of investment per session is the Hook-model step most apps skip.
// Facts come ONLY from the backend's `suggested_facts`; nothing is invented
// here (a wrong fact shown confidently is worse than none).
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Sparkle } from "@/src/components/Sparkle";
import { haptic } from "@/src/lib/haptics";
import type { MemoryFact } from "@/src/api/endpoints";
import { colors, radii, typography } from "@/src/theme";

type Props = {
  personName: string;
  suggestions: MemoryFact[];
  onKeep: (fact: MemoryFact) => Promise<void>;
  onDismiss?: (fact: MemoryFact) => void;
};

export const NotedCard: React.FC<Props> = ({ personName, suggestions, onKeep, onDismiss }) => {
  const [cursor, setCursor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [kept, setKept] = useState(0);
  const current = suggestions[cursor];

  if (!current) {
    if (kept === 0) return null;
    return (
      <View style={[styles.card, styles.cardDone]} testID="noted-done">
        <Ionicons name="checkmark-circle" size={16} color={colors.green} />
        <Text style={styles.doneText}>
          {kept === 1 ? "Saved to " : `${kept} things saved to `}
          <Text style={styles.name}>{personName}</Text>
          {"'s memory"}
        </Text>
      </View>
    );
  }

  const keep = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onKeep(current);
      haptic.success();
      setKept((k) => k + 1);
      setCursor((c) => c + 1);
    } catch {
      // parent toasts; stay on this suggestion so the user can retry
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    haptic.selection();
    onDismiss?.(current);
    setCursor((c) => c + 1);
  };

  return (
    <View style={styles.card} testID="noted-card">
      <View style={styles.row}>
        <Sparkle size={12} color={colors.lavender} />
        <Text style={styles.text} numberOfLines={3}>
          <Text style={styles.label}>Noted: </Text>
          {current.kind === "avoid" ? `avoid: ${current.text}` : current.text}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={keep}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={`Keep: ${current.text}`}
          testID="noted-keep"
          style={({ pressed }) => [styles.keep, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]}
        >
          <Text style={styles.keepText}>{saving ? "Saving…" : "Keep"}</Text>
        </Pressable>
        <Pressable
          onPress={skip}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Not this"
          testID="noted-skip"
          style={({ pressed }) => [styles.skip, pressed && styles.skipPressed]}
        >
          <Text style={styles.skipText}>Not this</Text>
        </Pressable>
        {suggestions.length > 1 ? (
          <Text style={styles.count}>{`${cursor + 1}/${suggestions.length}`}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.violetTint,
    borderWidth: 1,
    borderColor: colors.violetTintBorder,
    borderRadius: radii.card,
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 10,
  },
  cardDone: { flexDirection: "row", alignItems: "center", gap: 8 },
  doneText: { ...typography.body.base, fontSize: 13.5, color: colors.textSoft },
  name: { ...typography.body.bodyBold, color: colors.lavenderText },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  text: { ...typography.body.base, fontSize: 14, lineHeight: 20, color: colors.textSoft, flex: 1 },
  label: { ...typography.body.bodyBold, color: colors.lavenderText },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  keep: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.ctaBg,
    alignItems: "center",
    justifyContent: "center",
  },
  keepText: { ...typography.body.bodyBold, fontSize: 13.5, color: colors.ctaText },
  skip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  skipPressed: { backgroundColor: "rgba(255,255,255,0.12)" },
  skipText: { ...typography.body.bodySemibold, fontSize: 13.5, color: colors.textSoft },
  count: { ...typography.body.caption, fontSize: 11.5, color: colors.textFaint, marginLeft: "auto" },
});
