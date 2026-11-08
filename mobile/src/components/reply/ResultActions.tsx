// Result-screen actions (research §5): "Ask Lovli about this" (hands the
// thread to the chat tab with context), "Save to <name>'s memory", and
// "Report a bad read" — thumbs-down with three reasons that teach the engine.
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Chip } from "@/src/components/Chip";
import { haptic } from "@/src/lib/haptics";
import { colors, radii, typography } from "@/src/theme";

export const BAD_READ_REASONS = ["Too cheesy", "Wrong language", "Misread them"] as const;

type Props = {
  personName?: string | null;
  canSave: boolean;
  onAskLovli: () => void;
  onSave: () => void;
  onReport: (reason: string) => void;
};

export const ResultActions: React.FC<Props> = ({ personName, canSave, onAskLovli, onSave, onReport }) => {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState<string | null>(null);

  return (
    <View style={styles.wrap} testID="result-actions">
      <View style={styles.row}>
        <ActionPill
          icon={<Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.lavender} />}
          label="Ask Lovli about this"
          onPress={onAskLovli}
          testID="action-ask-lovli"
        />
        {personName ? (
          <ActionPill
            icon={<Ionicons name="heart-outline" size={14} color={canSave ? colors.lavender : colors.textFaint} />}
            label={`Save to ${personName}'s memory`}
            onPress={onSave}
            disabled={!canSave}
            hint={canSave ? undefined : "Copy a reply first"}
            testID="action-save-memory"
          />
        ) : null}
        <ActionPill
          icon={<Ionicons name="thumbs-down-outline" size={14} color={reported ? colors.textDim : colors.pink} />}
          label={reported ? "Thanks, noted" : "Report a bad read"}
          onPress={() => setReporting((r) => !r)}
          disabled={!!reported}
          testID="action-report"
        />
      </View>
      {personName && !canSave ? (
        <Text style={styles.disabledHint} testID="save-memory-hint">
          Copy a reply first to save it to {personName}&apos;s story.
        </Text>
      ) : null}
      {reporting && !reported ? (
        <View style={styles.reasons} testID="report-reasons">
          <Text style={styles.reasonsLabel}>WHAT WENT WRONG?</Text>
          <View style={styles.chips}>
            {BAD_READ_REASONS.map((r) => (
              <Chip
                key={r}
                label={r}
                size="sm"
                onPress={() => {
                  setReported(r);
                  setReporting(false);
                  onReport(r);
                }}
                testID={`report-reason-${r}`}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const ActionPill: React.FC<{
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
  testID?: string;
}> = ({ icon, label, onPress, disabled, hint, testID }) => (
  <Pressable
    onPress={() => {
      if (disabled) return;
      haptic.selection();
      onPress();
    }}
    accessibilityRole="button"
    accessibilityLabel={hint ? `${label}. ${hint}` : label}
    accessibilityState={{ disabled: !!disabled }}
    testID={testID}
    style={({ pressed }) => [styles.pill, disabled && styles.pillDisabled, pressed && !disabled && styles.pillPressed]}
  >
    {icon}
    <Text style={[styles.pillText, disabled && styles.pillTextDisabled]} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceSoft,
  },
  // Locked, not broken: full-opacity hairline pill with faint text + a hint below.
  pillDisabled: { borderColor: colors.divider },
  pillPressed: { backgroundColor: "rgba(255,255,255,0.12)" },
  pillText: { ...typography.body.bodySemibold, fontSize: 13, color: colors.textSoft },
  pillTextDisabled: { color: colors.textFaint },
  disabledHint: { ...typography.body.caption, fontSize: 12, color: colors.textFaint, marginTop: -4 },
  reasons: { gap: 8 },
  reasonsLabel: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 11.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.textFaint,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
