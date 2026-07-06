// Memory · List — "V2 · Coach — Memory · List".
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { AppHeader } from "@/src/components/AppHeader";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { MemoryCard, listMemoryCards } from "@/src/api/endpoints";
import { colors, radii, space, typography } from "@/src/theme";

// "Hinge · talking 3 weeks" — from new fields, falling back to legacy ones.
export function personMeta(c: MemoryCard): string {
  const stage = c.stage
    ? `${c.stage.toLowerCase()}${c.stage_duration ? ` ${c.stage_duration}` : ""}`
    : c.relationship_stage || c.current_situation || "";
  return [c.platform, stage].filter(Boolean).join(" · ");
}

export default function MemoryScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setCards((await listMemoryCards()) || []);
    } catch {
      // silent
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Screen testID="memory-page" bottomTabSpacing refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader />

      <View style={{ marginTop: space.s }}>
        <Text style={styles.h1}>Memory</Text>
        <Text style={styles.intro}>
          I remember the little things — so you never fumble them.
        </Text>
        <Text style={styles.sub}>
          {"Save a person and I'll keep track of what you tell me — names, dates, inside jokes."}
        </Text>
      </View>

      <PrimaryButton
        label="Add a memory"
        onPress={() => router.push("/memory/add")}
        testID="memory-add-button"
      />

      {cards.length > 0 ? (
        <View>
          <Text style={styles.sectionLabel}>YOUR PEOPLE</Text>
          <View style={{ gap: 10 }}>
            {cards.map((c, i) => (
              <PersonCard
                key={c.id}
                card={c}
                primary={i === 0}
                onPress={() => router.push(`/memory/${c.id}`)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const PersonCard: React.FC<{ card: MemoryCard; primary: boolean; onPress: () => void }> = ({
  card,
  primary,
  onPress,
}) => {
  const meta = personMeta(card);
  const chips = (card.facts || []).slice(0, 3);
  return (
    <Pressable
      onPress={onPress}
      testID={`memory-card-${card.id}`}
      style={({ pressed }) => [
        styles.person,
        primary ? styles.personPrimary : styles.personFlat,
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.personRow}>
        {primary ? (
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{card.nickname.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.avatar, styles.avatarTint]}>
            <Text style={styles.avatarTintText}>{card.nickname.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{card.nickname}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
      {primary && chips.length > 0 ? (
        <View style={styles.chipsRow}>
          {chips.map((f, i) => (
            <View key={i} style={styles.factChip}>
              <Text style={styles.factText} numberOfLines={1}>{f.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  h1: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 32,
    letterSpacing: -0.6,
    color: colors.text,
  },
  intro: {
    fontFamily: typography.fonts.displayMedium,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: colors.text,
    marginTop: 14,
    maxWidth: 300,
  },
  sub: {
    ...typography.body.base,
    fontSize: 14.5,
    color: colors.textMuted,
    marginTop: 10,
    maxWidth: 285,
  },
  sectionLabel: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.textFaint,
    marginBottom: 10,
  },
  person: { borderRadius: 20, padding: 17, borderWidth: 1 },
  personPrimary: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.hairline,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 5,
  },
  personFlat: { backgroundColor: colors.surface, borderColor: colors.hairline },
  personRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: typography.fonts.bodyBold, fontSize: 17, color: "#050509" },
  avatarTint: { backgroundColor: colors.violetTint },
  avatarTintText: { fontFamily: typography.fonts.bodyBold, fontSize: 17, color: colors.lavenderText },
  name: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    letterSpacing: -0.2,
    color: colors.text,
  },
  meta: { ...typography.body.caption, fontSize: 12.5, color: colors.textFaint, marginTop: 3 },
  chevron: { color: colors.textDim, fontSize: 22, paddingLeft: 4 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  factChip: {
    backgroundColor: colors.violetTint,
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
    maxWidth: 200,
  },
  factText: { ...typography.body.bodyMedium, fontSize: 12, color: colors.lavenderText },
});
