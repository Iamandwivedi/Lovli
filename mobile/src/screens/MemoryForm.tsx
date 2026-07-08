// Memory form — used by both Add Memory and Edit Memory.
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { GlassCard } from "@/src/components/GlassCard";
import { Input } from "@/src/components/Input";
import { Chip } from "@/src/components/Chip";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SecondaryButton } from "@/src/components/SecondaryButton";
import { useToast } from "@/src/context/ToastContext";
import {
  MemoryCard,
  MemoryCardInput,
  createMemoryCard,
  listMemoryCards,
  updateMemoryCard,
} from "@/src/api/endpoints";
import { extractErrorMessage } from "@/src/api/client";
import { colors, fontSize, space } from "@/src/theme/colors";

const STAGES = ["Not connected yet", "Texting", "Talking", "Dating", "Complicated"];

const EMPTY: MemoryCardInput = {
  nickname: "",
  goal: "",
  current_situation: "",
  relationship_stage: "",
  where_met: "",
  likes: "",
  dislikes: "",
  communication_style: "",
  inside_jokes: "",
  important_dates: "",
  best_approach: "",
  notes: "",
  boundaries: "",
};

type Props = {
  mode: "create" | "edit";
  id?: string;
};

export const MemoryForm: React.FC<Props> = ({ mode, id }) => {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<MemoryCardInput>(EMPTY);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    (async () => {
      try {
        const cards = await listMemoryCards();
        const target = cards.find((c) => c.id === id);
        if (target) {
          // map MemoryCard → MemoryCardInput (strip id, replace null with "")
          const { id: _omit, ...rest } = target as MemoryCard;
          const next: MemoryCardInput = { ...EMPTY };
          for (const key of Object.keys(EMPTY) as (keyof MemoryCardInput)[]) {
            const v = (rest as Partial<MemoryCard>)[key];
            (next as unknown as Record<string, string>)[key as string] = typeof v === "string" ? v : "";
          }
          setForm(next);
        } else {
          toast.error("Memory not found.");
          router.back();
        }
      } catch {
        toast.error("Could not load memory.");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, id, router, toast]);

  const set = <K extends keyof MemoryCardInput>(key: K, value: MemoryCardInput[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const onSave = async () => {
    if (!form.nickname?.trim()) {
      toast.error("Add a nickname so you can find this memory later.");
      return;
    }
    try {
      setSaving(true);
      if (mode === "edit" && id) {
        await updateMemoryCard(id, form);
        toast.success("Memory updated.");
      } else {
        await createMemoryCard(form);
        toast.success("Memory saved.");
      }
      router.back();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save right now."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen testID="memory-form-loading">
        <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 80 }}>
          Loading…
        </Text>
      </Screen>
    );
  }

  return (
    <Screen testID={mode === "edit" ? "memory-edit-page" : "memory-add-page"}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="memory-form-back">
          <Ionicons name="chevron-back" size={24} color={colors.textSoft} />
        </Pressable>
        <Text style={styles.title}>{mode === "edit" ? "Edit Memory" : "Add Memory"}</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.sub}>
        Use nicknames, not real names. You can edit or delete this anytime.
      </Text>

      {/* Section 1 — Basic context */}
      <GlassCard padded variant="solid">
        <Text style={styles.section}>Basic context</Text>
        <View style={{ gap: space.m, marginTop: space.m }}>
          <Input
            label="Nickname"
            placeholder="e.g. Matcha"
            value={form.nickname}
            onChangeText={(v) => set("nickname", v)}
            inputTestID="memory-nickname-input"
            autoCapitalize="words"
          />
          <Input
            label="Current situation"
            placeholder="A line about where things are"
            value={form.current_situation || ""}
            onChangeText={(v) => set("current_situation", v)}
            multiline
            inputTestID="memory-situation-input"
          />
          <Input
            label="Where you met"
            placeholder="App, mutual friend, café…"
            value={form.where_met || ""}
            onChangeText={(v) => set("where_met", v)}
            inputTestID="memory-where-input"
          />
          <Input
            label="What do you want with this person?"
            placeholder="Casual, serious, just talking…"
            value={form.goal || ""}
            onChangeText={(v) => set("goal", v)}
            inputTestID="memory-goal-input"
          />
          <View>
            <Text style={styles.label}>Relationship stage</Text>
            <View style={styles.chipsRow}>
              {STAGES.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  size="sm"
                  selected={form.relationship_stage === s}
                  onPress={() =>
                    set(
                      "relationship_stage",
                      form.relationship_stage === s ? "" : s,
                    )
                  }
                  testID={`memory-stage-${s}`}
                />
              ))}
            </View>
          </View>
        </View>
      </GlassCard>

      {/* Section 2 — Good to remember */}
      <GlassCard padded variant="solid">
        <Text style={styles.section}>Good to remember</Text>
        <View style={{ gap: space.m, marginTop: space.m }}>
          <Input
            label="Good to remember"
            placeholder="Likes, favourites, soft spots"
            value={form.likes || ""}
            onChangeText={(v) => set("likes", v)}
            multiline
            inputTestID="memory-likes-input"
          />
          <Input
            label="Things to avoid"
            placeholder="Topics or jokes to skip"
            value={form.dislikes || ""}
            onChangeText={(v) => set("dislikes", v)}
            multiline
            inputTestID="memory-dislikes-input"
          />
          <Input
            label="How they usually talk"
            placeholder="Hinglish, short replies, voice notes…"
            value={form.communication_style || ""}
            onChangeText={(v) => set("communication_style", v)}
            multiline
            inputTestID="memory-style-input"
          />
          <Input
            label="Inside jokes"
            placeholder="Little things only you two know"
            value={form.inside_jokes || ""}
            onChangeText={(v) => set("inside_jokes", v)}
            multiline
            inputTestID="memory-jokes-input"
          />
          <Input
            label="Important moments"
            placeholder="Interview Friday, birthday next month…"
            value={form.important_dates || ""}
            onChangeText={(v) => set("important_dates", v)}
            multiline
            inputTestID="memory-moments-input"
          />
        </View>
      </GlassCard>

      {/* Section 3 — Your notes */}
      <GlassCard padded variant="solid">
        <Text style={styles.section}>Your notes</Text>
        <View style={{ gap: space.m, marginTop: space.m }}>
          <Input
            label="What feels right"
            placeholder="The vibe that works with them"
            value={form.best_approach || ""}
            onChangeText={(v) => set("best_approach", v)}
            multiline
            inputTestID="memory-approach-input"
          />
          <Input
            label="Your notes"
            placeholder="Anything else"
            value={form.notes || ""}
            onChangeText={(v) => set("notes", v)}
            multiline
            inputTestID="memory-notes-input"
          />
        </View>
      </GlassCard>

      <View style={{ gap: space.m, marginBottom: space.xl }}>
        <PrimaryButton
          label={
            saving
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Save Memory"
          }
          loading={saving}
          onPress={onSave}
          testID="memory-save-button"
        />
        <SecondaryButton
          label="Cancel"
          onPress={() => router.back()}
          variant="ghost"
          testID="memory-cancel-button"
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.s,
  },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: fontSize.base, lineHeight: 20 },
  section: { color: colors.text, fontSize: fontSize.lg, fontWeight: "600" },
  label: {
    color: colors.textSoft,
    fontSize: fontSize.sm,
    fontWeight: "500",
    marginBottom: 8,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
