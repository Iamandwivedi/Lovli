// "Anything Lovli should know?" (research §2 / §5): the category's most-cited
// gap is one screenshot and no way to steer. Situation chips are the default;
// the note stays visible and always present. Chips map to a `user_note`
// prefix — no schema change.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Chip } from "@/src/components/Chip";
import { Input } from "@/src/components/Input";
import { colors, typography } from "@/src/theme";
export { buildUserNote } from "@/src/utils/reply-logic";

export const SITUATIONS = [
  "They went cold",
  "First message",
  "They asked something",
  "Planning to meet",
  "I messed up",
  "Just their bio",
] as const;
export type Situation = (typeof SITUATIONS)[number];

type Props = {
  situation: string | null;
  onSituation: (s: string | null) => void;
  note: string;
  onNote: (v: string) => void;
};

export const SituationSection: React.FC<Props> = ({ situation, onSituation, note, onNote }) => (
  <View testID="situation-section">
    <Text style={styles.sectionLabel}>ANYTHING LOVLI SHOULD KNOW?</Text>
    <View style={styles.chipsRow}>
      {SITUATIONS.map((s) => (
        <Chip
          key={s}
          label={s}
          selected={situation === s}
          onPress={() => onSituation(situation === s ? null : s)}
          testID={`situation-${s}`}
        />
      ))}
    </View>
    <Input
      placeholder="Add a note, e.g. we haven't talked in a week"
      multiline
      value={note}
      onChangeText={onNote}
      inputTestID="situation-note-input"
      containerStyle={{ marginTop: 10 }}
      style={{ minHeight: 48, paddingTop: 13 }}
      maxLength={280}
    />
  </View>
);

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.textFaint,
    marginBottom: 10,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
