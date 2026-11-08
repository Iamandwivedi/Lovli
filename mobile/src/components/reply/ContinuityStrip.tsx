// Continuity strip (research §5 / §7): the "AI remembers me" moment in the
// first two seconds. One line above the input when a person is selected —
// "Aanya · last time: she asked about Saturday chai · 2 days ago". Tapping
// opens her Memory card. Every surfaced fact stays tappable to correct.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptic } from "@/src/lib/haptics";
import type { MemoryCard } from "@/src/api/endpoints";
import { continuityLine } from "@/src/utils/reply-logic";
import { colors, radii, typography } from "@/src/theme";

export const ContinuityStrip: React.FC<{ card: MemoryCard; onPress: () => void }> = ({ card, onPress }) => {
  const line = continuityLine(card);
  return (
    <Pressable
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${card.nickname}. ${line}. Opens memory.`}
      testID="continuity-strip"
      style={({ pressed }) => [styles.strip, pressed && styles.pressed]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.text} numberOfLines={2}>
          <Text style={styles.name}>{card.nickname}</Text>
          <Text style={styles.sep}>{" · "}</Text>
          {line}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  strip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.violetTint,
    borderWidth: 1,
    borderColor: colors.violetTintBorder,
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pressed: { backgroundColor: "rgba(255,255,255,0.12)" },
  text: { ...typography.body.base, fontSize: 13.5, lineHeight: 19, color: colors.textSoft },
  name: { ...typography.body.bodyBold, fontSize: 13.5, color: colors.lavenderText },
  sep: { color: colors.textFaint },
});
