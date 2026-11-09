// PersonCard (Reply home V4): the "who are we texting?" zone above the
// composer. Three variants, decided by the saved people, the selection and a
// local "skipped" flag:
//   no people saved     → "Not sure yet? Start with a sample chat"
//   someone selected    → avatar, nickname, "Last time: …" plus a "Someone
//                         else" link (or "No one in particular" + "Change"
//                         when skipped)
//   people, none picked → "Who are we texting?" plus a row of up to three
//                         recent people and a Skip pill
// With the keyboard open the selected person collapses to a 32pt pill.
// The continuity text reuses reply-logic's continuityLine, as the old
// ContinuityStrip did.
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/src/components/GlassCard";
import { haptic } from "@/src/lib/haptics";
import type { MemoryCard } from "@/src/api/endpoints";
import { continuityLine } from "@/src/utils/reply-logic";
import { colors, radii, space, typography } from "@/src/theme";

export const NO_STORY_CARD = "No story yet. I'll start remembering after your first reply.";
export const NO_STORY_SHORT = "No story yet";
export const NO_ONE = "No one in particular";

/** "Last time: she asked about Saturday chai · 2 days ago", or the fallback
 *  when the person has no timeline entries yet. */
export function storyLine(card: MemoryCard, fallback: string): string {
  const timeline = card.timeline || [];
  if (timeline.length === 0) return fallback;
  const line = continuityLine(card);
  return line.charAt(0).toUpperCase() + line.slice(1);
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Epoch ms of the person's most recent timeline entry, or 0 with none. */
function latestEntryTime(card: MemoryCard): number {
  let latest = 0;
  for (const e of card.timeline || []) {
    if (e.date && ISO_RE.test(e.date)) {
      const t = new Date(e.date).getTime();
      if (t > latest) latest = t;
    }
  }
  if (latest === 0 && (card.timeline || []).length > 0) latest = 1; // dated nowhere, but has a story
  return latest;
}

/** Most recent timeline entry first; people with no story go last. */
export function sortByRecent(cards: MemoryCard[]): MemoryCard[] {
  return [...cards].sort((a, b) => {
    const diff = latestEntryTime(b) - latestEntryTime(a);
    if (diff !== 0) return diff;
    return (b.created_at || "").localeCompare(a.created_at || "");
  });
}

export const firstNameOf = (name: string): string => name.trim().split(/\s+/)[0] || name;

export const GradientAvatar: React.FC<{ name: string; size: number }> = ({ name, size }) => (
  <LinearGradient
    colors={[colors.gradientStart, colors.gradientEnd]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
  >
    <Text
      style={[styles.avatarText, { fontSize: Math.round(size * 0.44), lineHeight: Math.round(size * 0.6) }]}
      allowFontScaling={false}
    >
      {name.trim().charAt(0).toUpperCase()}
    </Text>
  </LinearGradient>
);

type Props = {
  cards: MemoryCard[];
  person: MemoryCard | null;
  skipped: boolean;
  /** Keyboard open: the selected person as a pill, nothing when nobody is selected. */
  compact?: boolean;
  onSelect: (id: string) => void;
  onSkip: () => void;
  onOpenPicker: () => void;
  onTrySample: () => void;
};

export const PersonCard: React.FC<Props> = ({
  cards,
  person,
  skipped,
  compact = false,
  onSelect,
  onSkip,
  onOpenPicker,
  onTrySample,
}) => {
  const openPicker = () => {
    haptic.selection();
    onOpenPicker();
  };

  if (compact) {
    if (!person) return null;
    return (
      <View style={styles.compactRow} testID="person-section">
        <View style={[styles.pill, styles.pillTint]} accessible accessibilityLabel={`Texting ${person.nickname}`}>
          <GradientAvatar name={person.nickname} size={20} />
          <Text style={styles.pillTextTint} numberOfLines={1}>
            {person.nickname}
          </Text>
        </View>
      </View>
    );
  }

  // Variant 1: nothing saved yet → play first.
  if (cards.length === 0) {
    return (
      <Pressable
        onPress={() => {
          haptic.selection();
          onTrySample();
        }}
        accessibilityRole="button"
        accessibilityLabel="Not sure yet? Start with a sample chat. See how I read a real convo before you share yours."
        testID="try-sample-chip"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <GlassCard style={styles.card}>
          <View style={styles.cardText}>
            <Text style={styles.title}>Not sure yet? Start with a sample chat</Text>
            <Text style={styles.sub}>See how I read a real convo before you share yours</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </GlassCard>
      </Pressable>
    );
  }

  // Variant 2: someone selected, or the user skipped choosing.
  if (person || skipped) {
    const title = person ? person.nickname : NO_ONE;
    const sub = person ? storyLine(person, NO_STORY_CARD) : null;
    const link = person ? "Someone else" : "Change";
    return (
      <View testID="person-section" style={styles.section}>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${sub || ""} Change who we are texting.`}
          testID="person-card"
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <GlassCard style={styles.card}>
            {person ? (
              <GradientAvatar name={person.nickname} size={36} />
            ) : (
              <View style={styles.iconCircle}>
                <Ionicons name="person-outline" size={20} color={colors.lavenderText} />
              </View>
            )}
            <View style={styles.cardText}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {sub ? (
                <Text
                  style={styles.sub}
                  numberOfLines={sub === NO_STORY_CARD ? 2 : 1}
                  ellipsizeMode="tail"
                  testID="person-story"
                >
                  {sub}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </GlassCard>
        </Pressable>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={link}
          testID="person-change"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => [styles.linkWrap, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.link}>{link}</Text>
        </Pressable>
      </View>
    );
  }

  // Variant 3: people saved, nobody picked yet.
  const recent = sortByRecent(cards).slice(0, 3);
  return (
    <View testID="person-section" style={styles.section}>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel="Who are we texting? Pick someone, or skip it."
        testID="person-card"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <GlassCard style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-outline" size={20} color={colors.lavenderText} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.title}>Who are we texting?</Text>
            <Text style={styles.sub}>Pick someone, or skip it.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </GlassCard>
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.pillRow}
        style={styles.pillScroll}
        testID="person-pills"
      >
        {recent.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => {
              haptic.selection();
              onSelect(c.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={c.nickname}
            testID={`person-${c.id}`}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [styles.pill, styles.pillTint, pressed && styles.pressed]}
          >
            <GradientAvatar name={c.nickname} size={20} />
            <Text style={styles.pillTextTint} numberOfLines={1}>
              {firstNameOf(c.nickname)}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => {
            haptic.selection();
            onSkip();
          }}
          accessibilityRole="button"
          accessibilityLabel="Skip choosing a person"
          testID="person-none"
          hitSlop={{ top: 6, bottom: 6 }}
          style={({ pressed }) => [styles.pill, styles.pillGlass, pressed && styles.pressed]}
        >
          <Text style={styles.pillTextGlass}>Skip</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
    minHeight: 72,
    paddingVertical: space.l,
    paddingHorizontal: space.l,
  },
  cardText: { flex: 1, gap: 2 },
  title: { ...typography.display.h3, color: colors.text },
  sub: { ...typography.body.small, color: colors.textMuted },
  pressed: { opacity: 0.85 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.violetTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: typography.fonts.bodyBold, color: colors.text },
  linkWrap: { alignSelf: "flex-start", minHeight: 28, justifyContent: "center" },
  link: { ...typography.body.label, color: colors.lavenderText },
  pillScroll: { marginHorizontal: -space.xs },
  pillRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: space.xs, paddingVertical: 2 },
  compactRow: { flexDirection: "row" },
  pill: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pillTint: { backgroundColor: colors.violetTint, borderColor: colors.violetTintBorder },
  pillGlass: { backgroundColor: colors.glassFill, borderColor: colors.glassStroke, paddingLeft: 14 },
  pillTextTint: { ...typography.body.bodySemibold, fontSize: 14, lineHeight: 18, color: colors.lavenderText, maxWidth: 140 },
  pillTextGlass: { ...typography.body.bodySemibold, fontSize: 14, lineHeight: 18, color: colors.text },
});
