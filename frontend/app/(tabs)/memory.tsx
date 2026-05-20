// Memory tab — private journal feel.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { AppHeader } from "@/src/components/AppHeader";
import { GlassCard } from "@/src/components/GlassCard";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useToast } from "@/src/context/ToastContext";
import { MemoryCard, deleteMemoryCard, listMemoryCards } from "@/src/api/endpoints";
import { colors, fontSize, radii, space } from "@/src/theme/colors";

const LABELS: { key: keyof MemoryCard; label: string }[] = [
  { key: "likes", label: "Good to remember" },
  { key: "dislikes", label: "Things to avoid" },
  { key: "communication_style", label: "How they usually talk" },
  { key: "inside_jokes", label: "Inside jokes" },
  { key: "important_dates", label: "Important moments" },
  { key: "best_approach", label: "What feels right" },
  { key: "notes", label: "Your notes" },
];

export default function MemoryScreen() {
  const router = useRouter();
  const toast = useToast();
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listMemoryCards();
      setCards(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const onDelete = (card: MemoryCard) => {
    Alert.alert(
      `Delete "${card.nickname}"?`,
      "You can't undo this.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMemoryCard(card.id);
              setCards((prev) => prev.filter((c) => c.id !== card.id));
              toast.success("Memory deleted.");
            } catch {
              toast.error("Could not delete right now.");
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <Screen testID="memory-page" bottomTabSpacing refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader />

      <View style={{ marginTop: space.m }}>
        <Text style={styles.h1}>Lovli Memory</Text>
        <Text style={styles.headline}>Remember meaningful details.</Text>
        <Text style={styles.sub}>
          Save the little things they mention so future replies feel more thoughtful.
        </Text>
        <View style={styles.trust}>
          <Ionicons name="shield-checkmark-outline" size={12} color={colors.lavender} />
          <Text style={styles.trustText}>Private by default. You control what gets saved.</Text>
        </View>
      </View>

      <PrimaryButton
        label="Add Memory"
        onPress={() => router.push("/memory/add")}
        testID="memory-add-button"
      />

      {loading ? null : cards.length === 0 ? (
        <GlassCard padded testID="memory-empty">
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.sub}>
            Save the little things so future replies feel more thoughtful.
          </Text>
        </GlassCard>
      ) : (
        cards.map((c) => <MemoryItem key={c.id} card={c} onDelete={() => onDelete(c)} onEdit={() => router.push(`/memory/${c.id}`)} />)
      )}
    </Screen>
  );
}

const MemoryItem: React.FC<{
  card: MemoryCard;
  onDelete: () => void;
  onEdit: () => void;
}> = ({ card, onDelete, onEdit }) => {
  const filled = LABELS.filter((l) => {
    const v = card[l.key];
    return typeof v === "string" && v.trim().length > 0;
  });

  return (
    <GlassCard padded testID={`memory-card-${card.id}`}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nickname}>{card.nickname}</Text>
          {card.relationship_stage ? (
            <View style={styles.stagePill}>
              <Text style={styles.stageText}>{card.relationship_stage}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {card.current_situation ? (
        <Text style={styles.situation}>{card.current_situation}</Text>
      ) : null}

      {filled.length > 0 ? (
        <View style={{ marginTop: space.m, gap: 10 }}>
          {filled.map((l) => (
            <View key={l.key}>
              <Text style={styles.fieldLabel}>{l.label}</Text>
              <Text style={styles.fieldValue}>{String(card[l.key])}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          testID={`memory-edit-${card.id}`}
          style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="create-outline" size={14} color={colors.textSoft} />
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          testID={`memory-delete-${card.id}`}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="trash-outline" size={14} color={colors.dangerSoft} />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  headline: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginTop: 6,
  },
  sub: { color: colors.textMuted, fontSize: fontSize.base, marginTop: 6, lineHeight: 20 },
  trust: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  trustText: { color: colors.textMuted, fontSize: 11.5 },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  nickname: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  stagePill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.card,
  },
  stageText: { color: colors.textSoft, fontSize: 11 },
  situation: { color: colors.textSoft, fontSize: fontSize.base, marginTop: space.m, lineHeight: 20 },
  fieldLabel: {
    color: colors.lavenderSoft,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  fieldValue: { color: colors.textSoft, fontSize: fontSize.base, marginTop: 3, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, marginTop: space.l },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editText: { color: colors.textSoft, fontSize: fontSize.sm, fontWeight: "600" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(248, 113, 113, 0.08)",
    borderColor: "rgba(248, 113, 113, 0.22)",
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deleteText: { color: colors.dangerSoft, fontSize: fontSize.sm, fontWeight: "600" },
});
