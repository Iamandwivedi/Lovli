// Reply card (research §5, "Result screen"):
//   · tap the card → copy, with a haptic and an inline "Copied" morph (no toast)
//   · long-press     → "More like this" (regenerate in this register)
//   · pencil         → inline editable field pre-filled with the reply.
//     EDITING IS THE POINT: users should change words before sending.
//   · tiny tone bar (Safe → Flirty → Bold), middle card ~8 % larger type and a
//     lavender hairline by default (mid-intensity sends ~3× more than max-bold)
//   · "In your style" chip when the learned style shaped this reply
//   · body face at 17 pt so it reads like a message, not a quote
//   · staggered spring-in, 60 ms apart; Reduce Motion → 150 ms fade.
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Sparkle } from "@/src/components/Sparkle";
import { haptic } from "@/src/lib/haptics";
import { REDUCED_FADE_MS, SPRING, useReduceMotion } from "@/src/hooks/useReduceMotion";
import { colors, radii, typography } from "@/src/theme";

export const REPLY_LABEL_FALLBACK = ["Safe", "Flirty", "Bold"] as const;
const LABEL_COLOR = [colors.green, colors.pink, colors.amber] as const;

type Props = {
  text: string;
  label: string;
  /** 0 = safest, 2 = boldest — drives the tone bar and the stagger. */
  index: number;
  emphasized?: boolean;
  /** Learned-style signals this reply was tuned to (shows the "In your style" chip). */
  styleSignals?: string[] | null;
  onCopy: (text: string) => void;
  onEditCommitted?: (original: string, edited: string) => void;
  onMoreLikeThis?: () => void;
};

export const ReplyCard: React.FC<Props> = ({
  text,
  label,
  index,
  emphasized,
  styleSignals,
  onCopy,
  onEditCommitted,
  onMoreLikeThis,
}) => {
  const reduceMotion = useReduceMotion();
  const [value, setValue] = useState(text);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const lastCommitted = useRef(text);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entrance: spring from 12 px below, 60 ms apart (research §12).
  const translateY = useSharedValue(reduceMotion ? 0 : 12);
  const opacity = useSharedValue(0);
  const pressScale = useSharedValue(1);
  useEffect(() => {
    const delay = index * 60;
    opacity.value = withDelay(delay, withTiming(1, { duration: reduceMotion ? REDUCED_FADE_MS : 220 }));
    if (!reduceMotion) translateY.value = withDelay(delay, withSpring(0, SPRING));
  }, [index, opacity, reduceMotion, translateY]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: pressScale.value }],
  }));

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const commitEdit = () => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      onEditCommitted?.(text, value);
    }
  };

  const copy = () => {
    commitEdit();
    haptic.success();
    onCopy(value);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  const toggleEdit = () => {
    haptic.selection();
    setEditing((e) => {
      if (e) commitEdit(); // "Done" means the edit is final.
      return !e;
    });
  };

  const labelColor = LABEL_COLOR[Math.min(index, 2)];

  return (
    <Animated.View style={aStyle}>
      <Pressable
        onPress={() => !editing && copy()}
        onLongPress={() => {
          if (editing || !onMoreLikeThis) return;
          haptic.light();
          onMoreLikeThis();
        }}
        onPressIn={() => {
          if (editing) return;
          // One haptic per gesture: the copy (success) or the long-press (light).
          if (!reduceMotion) pressScale.value = withSpring(0.985, SPRING);
        }}
        onPressOut={() => {
          pressScale.value = reduceMotion ? 1 : withSpring(1, SPRING);
        }}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`${label} reply. ${value}`}
        accessibilityHint="Tap to copy. Long press for more like this."
        testID={`reply-card-${index}`}
        style={({ pressed }) => [
          styles.card,
          emphasized && styles.cardEmphasized,
          copied && styles.cardCopied,
          pressed && !editing && styles.cardPressed,
        ]}
      >
        {/* Label row: tone label + tone bar, morphs to "Copied" */}
        <View style={styles.labelRow}>
          {copied ? (
            <View style={styles.copiedRow} testID={`reply-copied-${index}`}>
              <Ionicons name="checkmark-circle" size={15} color={colors.green} />
              <Text style={styles.copiedText}>Copied. Go send it</Text>
            </View>
          ) : (
            <View style={styles.toneRow}>
              <View style={[styles.toneDot, { backgroundColor: labelColor, shadowColor: labelColor }]} />
              <Text style={[styles.toneLabel, { color: labelColor }]} testID={`reply-tone-label-${index}`}>
                {label}
              </Text>
              <View style={styles.toneBar} accessibilityLabel={`Intensity ${index + 1} of 3`}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[styles.toneSeg, i <= index && { backgroundColor: labelColor, opacity: 0.9 }]}
                  />
                ))}
              </View>
            </View>
          )}
          <Pressable
            onPress={toggleEdit}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={editing ? "Done editing" : "Edit this reply"}
            testID={`reply-edit-${index}`}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <Ionicons name={editing ? "checkmark" : "pencil-outline"} size={16} color={colors.lavenderText} />
          </Pressable>
        </View>

        {editing ? (
          <TextInput
            value={value}
            onChangeText={setValue}
            multiline
            autoFocus
            onBlur={commitEdit}
            style={[styles.text, emphasized && styles.textEmphasized, styles.input]}
            testID={`reply-edit-input-${index}`}
            accessibilityLabel="Edit reply"
          />
        ) : (
          <Text style={[styles.text, emphasized && styles.textEmphasized]} testID={`reply-text-${index}`}>
            {value}
          </Text>
        )}

        {/* Footer: "In your style" chip + hint */}
        <View style={styles.footer}>
          {styleSignals && styleSignals.length > 0 ? (
            <Pressable
              onPress={() => {
                haptic.selection();
                setStyleOpen((o) => !o);
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="In your style. Shows which habits were matched."
              style={({ pressed }) => [styles.styleChip, pressed && { opacity: 0.85 }]}
              testID={`reply-style-chip-${index}`}
            >
              <Sparkle size={10} color={colors.lavender} />
              <Text style={styles.styleChipText}>In your style</Text>
              <Ionicons name={styleOpen ? "chevron-up" : "chevron-down"} size={11} color={colors.lavenderText} />
            </Pressable>
          ) : (
            <View />
          )}
          <Text style={styles.hint}>{editing ? "Tap ✓ when done" : "Tap to copy · hold for more"}</Text>
        </View>
        {styleOpen && styleSignals && styleSignals.length > 0 ? (
          <Text style={styles.styleDetail} testID={`reply-style-detail-${index}`}>
            Matched: {styleSignals.join(" · ")}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassFillLow,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  cardEmphasized: {
    backgroundColor: colors.glassFill,
    borderColor: colors.violetTintBorder,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
    elevation: 6,
  },
  cardCopied: { borderColor: "rgba(134,200,157,0.45)" },
  cardPressed: { backgroundColor: "rgba(255,255,255,0.12)" },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 28,
  },
  toneRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  toneDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  toneLabel: {
    ...typography.body.caption,
    fontFamily: typography.fonts.bodySemibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  toneBar: { flexDirection: "row", gap: 3, marginLeft: 2 },
  toneSeg: {
    width: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  copiedRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  copiedText: { ...typography.body.bodySemibold, fontSize: 12.5, color: colors.green },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.violetTint,
  },
  iconBtnPressed: { backgroundColor: "rgba(255,255,255,0.12)" },
  text: {
    ...typography.body.base,
    fontSize: 16.5,
    lineHeight: 24,
    color: colors.text,
    marginTop: 10,
  },
  // ~12 % larger so the emphasis registers (8 % did not read on device).
  textEmphasized: { fontSize: 18.5, lineHeight: 27 },
  input: { padding: 0, minHeight: 50, textAlignVertical: "top" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 14,
  },
  styleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.violetTint,
    borderWidth: 1,
    borderColor: colors.violetTintBorder,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  styleChipText: { ...typography.body.bodySemibold, fontSize: 11.5, color: colors.lavenderText },
  styleDetail: { ...typography.body.caption, fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 8 },
  hint: { ...typography.body.caption, fontSize: 11.5, color: colors.textFaint },
});
