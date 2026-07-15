// Memory form — used by both Add Memory and Edit Memory.
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
  MemoryFact,
  createMemoryCard,
  deleteMemoryCard,
  listMemoryCards,
  updateMemoryCard,
} from "@/src/api/endpoints";
import { extractErrorMessage } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { ASK_PENDING_KEY } from "@/src/config/storage-keys";
import { resyncNotificationsFromStorage } from "@/src/utils/notifications";
import { colors, fontSize, space } from "@/src/theme/colors";

const STAGES = ["Not connected yet", "Texting", "Talking", "Dating", "Complicated"];
const FACT_KINDS: { kind: MemoryFact["kind"]; label: string }[] = [
  { kind: "like", label: "Like" },
  { kind: "avoid", label: "Avoid" },
  { kind: "date", label: "Date" },
];

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
  // Facts editing (edit mode): the little things — chips with add/remove.
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [factText, setFactText] = useState("");
  const [factKind, setFactKind] = useState<MemoryFact["kind"]>("like");
  // Per-person delete (edit mode): typed confirm flow.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  const addFact = () => {
    const text = factText.trim();
    if (!text) return;
    setFacts((p) => [...p, { text, kind: factKind }]);
    setFactText("");
  };

  const removeFact = (index: number) =>
    setFacts((p) => p.filter((_, i) => i !== index));

  const onDeletePerson = async () => {
    if (!id || confirmText.trim().toUpperCase() !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteMemoryCard(id);
      // Clear local references so nothing points at a deleted person.
      try {
        const raw = await storage.getItem<string>(ASK_PENDING_KEY, "");
        if (raw && JSON.parse(raw)?.personId === id) {
          await storage.removeItem(ASK_PENDING_KEY);
        }
      } catch {
        // pending context unreadable — drop it
        await storage.removeItem(ASK_PENDING_KEY);
      }
      resyncNotificationsFromStorage(); // their reminders cancel too
      setConfirmOpen(false);
      toast.success("Deleted — they're out of your Memory.");
      router.replace("/(tabs)/memory");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not delete right now."));
    } finally {
      setDeleting(false);
    }
  };

  const onSave = async () => {
    if (!form.nickname?.trim()) {
      toast.error("Add a nickname so you can find this memory later.");
      return;
    }
    try {
      setSaving(true);
      if (mode === "edit" && id) {
        await updateMemoryCard(id, { ...form, facts });
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

      {/* Section 4 — The little things (facts) — edit mode only */}
      {mode === "edit" ? (
        <GlassCard padded variant="solid">
          <Text style={styles.section}>The little things</Text>
          <Text style={styles.factHint}>Quick facts Lovli weaves into replies.</Text>
          {facts.length > 0 ? (
            <View style={[styles.chipsRow, { marginTop: space.m }]}>
              {facts.map((f, i) => (
                <View
                  key={`${f.text}-${i}`}
                  style={[styles.factChip, f.kind === "avoid" && styles.factChipAvoid]}
                >
                  <Text
                    style={[styles.factChipText, f.kind === "avoid" && styles.factChipTextAvoid]}
                    numberOfLines={1}
                  >
                    {f.kind === "date" ? "📅 " : ""}{f.text}
                  </Text>
                  <Pressable onPress={() => removeFact(i)} hitSlop={8} testID={`fact-remove-${i}`}>
                    <Ionicons name="close" size={13} color={f.kind === "avoid" ? colors.pink : colors.lavenderText} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ gap: space.s, marginTop: space.m }}>
            <TextInput
              value={factText}
              onChangeText={setFactText}
              placeholder="e.g. Loves filter coffee"
              placeholderTextColor={colors.textFaint}
              style={styles.factInput}
              onSubmitEditing={addFact}
              returnKeyType="done"
              testID="fact-text-input"
            />
            <View style={styles.factAddRow}>
              <View style={[styles.chipsRow, { flex: 1 }]}>
                {FACT_KINDS.map((k) => (
                  <Chip
                    key={k.kind}
                    label={k.label}
                    size="sm"
                    selected={factKind === k.kind}
                    onPress={() => setFactKind(k.kind)}
                    testID={`fact-kind-${k.kind}`}
                  />
                ))}
              </View>
              <Pressable
                onPress={addFact}
                disabled={!factText.trim()}
                style={[styles.factAddBtn, !factText.trim() && { opacity: 0.4 }]}
                testID="fact-add-button"
              >
                <Ionicons name="add" size={16} color="#050509" />
                <Text style={styles.factAddText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </GlassCard>
      ) : null}

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
        {mode === "edit" ? (
          <Pressable
            onPress={() => setConfirmOpen(true)}
            style={styles.deleteRow}
            testID="memory-delete-person"
          >
            <Ionicons name="trash-outline" size={15} color={colors.pink} />
            <Text style={styles.deleteText}>Delete this person</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Delete-person confirm sheet (typed flow) */}
      <Modal visible={confirmOpen} transparent animationType="slide" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setConfirmOpen(false)} />
        <View style={styles.sheet} testID="delete-person-sheet">
          <Text style={styles.sheetTitle}>{`Delete ${form.nickname || "this person"}?`}</Text>
          <Text style={styles.sheetSub}>
            Their card, timeline, and facts — gone for good. Type DELETE to confirm.
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="characters"
            style={styles.sheetInput}
            testID="delete-person-confirm-input"
          />
          <Pressable
            onPress={onDeletePerson}
            disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleting}
            accessibilityState={{ disabled: confirmText.trim().toUpperCase() !== "DELETE" || deleting }}
            style={[
              styles.sheetDeleteBtn,
              (confirmText.trim().toUpperCase() !== "DELETE" || deleting) && { opacity: 0.45 },
            ]}
            testID="delete-person-confirm-button"
          >
            <Text style={styles.sheetDeleteText}>{deleting ? "Deleting…" : "Delete them"}</Text>
          </Pressable>
          <Pressable onPress={() => { setConfirmOpen(false); setConfirmText(""); }} style={styles.sheetCancel} testID="delete-person-cancel">
            <Text style={styles.sheetCancelText}>Keep them</Text>
          </Pressable>
        </View>
      </Modal>
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
  factHint: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 },
  factChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(167,139,250,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 260,
  },
  factChipAvoid: { backgroundColor: "rgba(224,102,122,0.12)" },
  factChipText: { color: colors.violet, fontSize: fontSize.sm, flexShrink: 1 },
  factChipTextAvoid: { color: colors.pink },
  factInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: fontSize.base,
  },
  factAddRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  factAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  factAddText: { color: "#050509", fontSize: fontSize.sm, fontWeight: "700" },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  deleteText: { color: colors.pink, fontSize: fontSize.base, fontWeight: "600" },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    paddingBottom: 34,
    gap: 12,
  },
  sheetTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700" },
  sheetSub: { color: colors.textMuted, fontSize: fontSize.base, lineHeight: 20 },
  sheetInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
    color: colors.text,
    fontSize: fontSize.base,
  },
  sheetDeleteBtn: {
    backgroundColor: colors.pink,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 14,
  },
  sheetDeleteText: { color: "#FFFFFF", fontSize: fontSize.base, fontWeight: "700" },
  sheetCancel: { alignItems: "center", paddingVertical: 8 },
  sheetCancelText: { color: colors.textMuted, fontSize: fontSize.base, fontWeight: "600" },
});
