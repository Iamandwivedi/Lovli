// PersonPickerSheet (Reply home V4): "Who are we texting?" as a bottom sheet,
// modelled on PrivacySheet's modal mechanics but fully opaque. The selected
// person sorts first with a checkmark, the rest by most recent timeline
// entry, then "Someone new" (opens the memory form) and "No one in
// particular" (clears the selection and marks it skipped). Five rows show at
// once; longer lists scroll. Choosing anything closes the sheet.
import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/src/lib/haptics";
import type { MemoryCard } from "@/src/api/endpoints";
import { GradientAvatar, NO_ONE, NO_STORY_SHORT, sortByRecent, storyLine } from "@/src/components/reply/PersonCard";
import { colors, typography } from "@/src/theme";

const ROW = 60;
const VISIBLE_ROWS = 5;

type Props = {
  visible: boolean;
  cards: MemoryCard[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onSomeoneNew: () => void;
  onNoOne: () => void;
};

export const PersonPickerSheet: React.FC<Props> = ({
  visible,
  cards,
  selectedId,
  onClose,
  onSelect,
  onSomeoneNew,
  onNoOne,
}) => {
  const insets = useSafeAreaInsets();
  const ordered = useMemo(() => {
    const sorted = sortByRecent(cards);
    const selected = sorted.find((c) => c.id === selectedId);
    return selected ? [selected, ...sorted.filter((c) => c.id !== selectedId)] : sorted;
  }, [cards, selectedId]);

  const pick = (fn: () => void) => () => {
    haptic.selection();
    fn();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} testID="person-picker-sheet">
        <View style={styles.grabber} />
        <Text style={styles.title} accessibilityRole="header">
          Who are we texting?
        </Text>
        <ScrollView
          style={{ maxHeight: ROW * VISIBLE_ROWS + 1 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {ordered.map((c) => {
            const selected = c.id === selectedId;
            const story = storyLine(c, NO_STORY_SHORT);
            return (
              <Pressable
                key={c.id}
                onPress={pick(() => onSelect(c.id))}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${c.nickname}. ${story}${selected ? ". Selected" : ""}`}
                testID={`picker-person-${c.id}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <GradientAvatar name={c.nickname} size={36} />
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.nickname}
                  </Text>
                  <Text style={styles.story} numberOfLines={1} ellipsizeMode="tail">
                    {story}
                  </Text>
                </View>
                {selected ? <Ionicons name="checkmark" size={22} color={colors.lavender} /> : null}
              </Pressable>
            );
          })}

          <Pressable
            onPress={pick(onSomeoneNew)}
            accessibilityRole="button"
            accessibilityLabel="Someone new. Adds a person."
            testID="picker-someone-new"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={[styles.circle, styles.circleTint]}>
              <Ionicons name="add" size={22} color={colors.lavenderText} />
            </View>
            <Text style={[styles.name, styles.rowText]}>Someone new</Text>
          </Pressable>

          <Pressable
            onPress={pick(onNoOne)}
            accessibilityRole="button"
            accessibilityLabel={NO_ONE}
            testID="picker-no-one"
            style={({ pressed }) => [styles.row, styles.rowLast, pressed && styles.pressed]}
          >
            <View style={[styles.circle, styles.circleGlass]}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            </View>
            <Text style={[styles.name, styles.rowText]}>{NO_ONE}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.glassStrokeStrong,
    padding: 16,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassStrokeStrong,
    marginBottom: 20,
  },
  title: { ...typography.display.h2, color: colors.text, marginBottom: 8 },
  row: {
    minHeight: ROW,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLast: { borderBottomWidth: 0 },
  pressed: { opacity: 0.8 },
  rowText: { flex: 1, gap: 1 },
  name: { ...typography.body.bodySemibold, color: colors.text },
  story: { ...typography.body.small, color: colors.textMuted },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  circleTint: { backgroundColor: colors.violetTint, borderWidth: 1, borderColor: colors.violetTintBorder },
  circleGlass: { backgroundColor: colors.glassFill, borderWidth: 1, borderColor: colors.glassStroke },
});
