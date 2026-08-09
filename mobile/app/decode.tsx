// Decode — "V2 · Coach — Decode". Entry from More ("Decode the situation" /
// "Read the signals"). Phases: input → generating → result.
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/src/components/Screen";
import { Input } from "@/src/components/Input";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { PersonChip } from "@/src/components/PersonChip";
import { Chip } from "@/src/components/Chip";
import { Sparkle } from "@/src/components/Sparkle";
import { StagedLoader } from "@/src/components/reply/StagedLoader";
import { useToast } from "@/src/context/ToastContext";
import {
  DecodeResult,
  MemoryCard,
  decodeSituation,
  getGeneration,
  listMemoryCards,
  patchMemoryCard,
} from "@/src/api/endpoints";
import { extractErrorMessage } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { ASK_PENDING_KEY } from "@/src/config/storage-keys";
import { colors, radii, space, typography } from "@/src/theme";

const DECODE_STAGES = [
  "Reading the chat…",
  "Weighing the signals…",
  "Reading between the lines…",
  "Checking both sides…",
  "Calling it honestly…",
];

const VIBE_LABELS = ["Not into it", "Mixed signals", "Leaning interested"] as const;

type Phase = "input" | "generating" | "result";

export default function DecodeScreen() {
  const router = useRouter();
  const toast = useToast();
  // `gen` param: re-open a stored decode read-only (RECENT strip, PR4c).
  const params = useLocalSearchParams<{ gen?: string }>();
  const restored = typeof params.gen === "string" && !!params.gen;
  const [phase, setPhase] = useState<Phase>("input");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [manual, setManual] = useState("");
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    listMemoryCards().then((c) => setCards(c || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!restored) return;
    getGeneration(String(params.gen))
      .then((row) => {
        setResult(row.result as unknown as DecodeResult);
        setMemoryId(row.memory_card_id ?? null);
        setPhase("result");
      })
      .catch(() => {
        toast.error("Could not load that result.");
        router.back();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored]);

  useEffect(() => {
    if (phase !== "generating") return;
    setStage(0);
    const id = setInterval(() => setStage((s) => Math.min(s + 1, DECODE_STAGES.length - 1)), 650);
    return () => clearInterval(id);
  }, [phase]);

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.85,
        exif: false,
      });
      if (!res.canceled) setImage(res.assets[0]);
    } catch {
      toast.error("Could not open your photos.");
    }
  };

  const run = async () => {
    if (!image && !manual.trim()) {
      toast.error("Show me the conversation first — screenshot or paste.");
      return;
    }
    setPhase("generating");
    setSaved(false);
    setPickerOpen(false);
    const minWait = new Promise((r) => setTimeout(r, 2200));
    try {
      const [data] = await Promise.all([
        decodeSituation({
          manual_text: manual,
          memory_card_id: memoryId,
          image: image
            ? {
                uri: image.uri,
                name: image.fileName || `chat.${(image.mimeType || "image/jpeg").split("/").pop()}`,
                type: image.mimeType || "image/jpeg",
              }
            : null,
        }),
        minWait,
      ]);
      setResult(data);
      setPhase("result");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Something went wrong. Try again."));
      setPhase("input");
    }
  };

  const saveToMemory = async (cardId: string) => {
    if (!result) return;
    try {
      const card = cards.find((c) => c.id === cardId);
      // PR-V2-6: decode saves land as timeline entries now.
      const entry = {
        title: "Decode saved",
        date_label: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        detail: `${result.vibe_headline} ${result.whats_really_going_on}`,
        upcoming: false,
      };
      await patchMemoryCard(cardId, { timeline: [...(card?.timeline || []), entry] });
      setSaved(true);
      setPickerOpen(false);
      toast.success("Saved to their card.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save."));
    }
  };

  const askLovliAboutThis = async () => {
    if (!result) return;
    const text =
      `I just decoded a chat. Verdict: ${result.vibe_label} — "${result.vibe_headline}" ` +
      `${result.whats_really_going_on} What should I do next?`;
    await storage.setItem(ASK_PENDING_KEY, JSON.stringify({ text, personId: memoryId }));
    router.push("/(tabs)/ask-lovli");
  };

  return (
    <Screen scroll={false} testID="decode-page">
      {phase === "generating" ? (
        <StagedLoader activeIndex={stage} stages={DECODE_STAGES} />
      ) : (
        <>
          <View style={styles.backHeader}>
            <Pressable
              onPress={() => (phase === "result" && !restored ? setPhase("input") : router.back())}
              hitSlop={12}
              testID="decode-back-button"
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.backTitle}>
              {phase === "result" ? "The decode" : "Decode the situation"}
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: space.l, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {phase === "input" ? (
              <>
                <Text style={styles.sub}>
                  {"Show me the conversation — I'll tell you what's really going on."}
                </Text>
                <Pressable
                  onPress={pickImage}
                  testID="decode-upload-area"
                  style={({ pressed }) => [styles.upload, pressed && { borderColor: colors.lavender }]}
                >
                  <View style={styles.uploadIcon}>
                    <Ionicons name="arrow-up" size={20} color={colors.lavender} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadTitle}>
                      {image ? "Screenshot added ✓ (tap to change)" : "Show me the conversation"}
                    </Text>
                    <Text style={styles.uploadHint}>Screenshot from any chat app</Text>
                  </View>
                </Pressable>
                <Input
                  placeholder="Or paste the chat here…"
                  multiline
                  numberOfLines={2}
                  value={manual}
                  onChangeText={setManual}
                  inputTestID="decode-manual-input"
                  style={{ minHeight: 52 }}
                />
                {cards.length > 0 ? (
                  <View>
                    <Text style={styles.sectionLabel}>{"WHO'S THIS ABOUT?"}</Text>
                    <View style={styles.chipsRow}>
                      <Chip label="No one" selected={memoryId === null} onPress={() => setMemoryId(null)} />
                      {cards.map((c) => (
                        <PersonChip
                          key={c.id}
                          name={c.nickname}
                          selected={memoryId === c.id}
                          onPress={() => setMemoryId((cur) => (cur === c.id ? null : c.id))}
                          testID={`decode-person-${c.id}`}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}

            {phase === "result" && result ? (
              <>
                {/* Overall vibe card */}
                <View style={styles.vibeCard} testID="decode-vibe-card">
                  <Text style={styles.sectionLabel}>OVERALL VIBE</Text>
                  <Text style={styles.vibeHeadline}>{result.vibe_headline}</Text>
                  <View style={styles.meterRow}>
                    {VIBE_LABELS.map((l) =>
                      l === result.vibe_label ? (
                        <LinearGradient
                          key={l}
                          colors={["#A78BFA", "#8B5CF6"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.meterSeg, styles.meterSegActive]}
                        />
                      ) : (
                        <View key={l} style={styles.meterSeg} />
                      ),
                    )}
                  </View>
                  <View style={styles.meterLabels}>
                    {VIBE_LABELS.map((l) => (
                      <Text
                        key={l}
                        style={[styles.meterLabel, l === result.vibe_label && styles.meterLabelActive]}
                      >
                        {l}
                      </Text>
                    ))}
                  </View>
                </View>

                {result.positive_signs.length > 0 ? (
                  <View>
                    <Text style={styles.sectionLabel}>POSITIVE SIGNS</Text>
                    {result.positive_signs.map((s, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Sparkle size={13} color={colors.lavender} />
                        <Text style={styles.bulletText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {result.watch_outs.length > 0 ? (
                  <View>
                    <Text style={styles.sectionLabel}>WATCH-OUTS</Text>
                    {result.watch_outs.map((s, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Sparkle size={13} color={colors.pink} />
                        <Text style={styles.bulletText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View>
                  <Text style={styles.sectionLabel}>{"WHAT'S REALLY GOING ON"}</Text>
                  <Text style={styles.paragraph}>{result.whats_really_going_on}</Text>
                </View>

                <View style={styles.moveCard}>
                  <Text style={styles.sectionLabel}>YOUR NEXT MOVE</Text>
                  <Text style={styles.wingmanLead}>If I were your wingman:</Text>
                  <Text style={styles.wingmanText}>{result.next_move.wingman}</Text>
                  <Text style={styles.outcomeLead}>Likely outcome:</Text>
                  <Text style={styles.outcomeText}>{result.next_move.likely_outcome}</Text>
                </View>

                {/* Footer actions */}
                <View style={styles.footerActions}>
                  <Pressable
                    onPress={() => {
                      if (saved) return;
                      if (memoryId) saveToMemory(memoryId);
                      else if (cards.length > 0) setPickerOpen((v) => !v);
                      else toast.error("Add someone in Memory first, then save this to their card.");
                    }}
                    style={styles.footerBtn}
                    testID="decode-save-memory"
                  >
                    <Ionicons
                      name={saved ? "bookmark" : "bookmark-outline"}
                      size={15}
                      color={colors.lavenderText}
                    />
                    <Text style={styles.footerSave}>{saved ? "Saved" : "Save to Memory"}</Text>
                  </Pressable>
                  <Pressable onPress={askLovliAboutThis} style={styles.footerBtn} testID="decode-ask-lovli">
                    <Sparkle size={13} color={colors.lavender} />
                    <Text style={styles.footerAsk}>Ask Lovli about this</Text>
                  </Pressable>
                </View>
                {pickerOpen ? (
                  <View style={styles.chipsRow}>
                    {cards.map((c) => (
                      <PersonChip
                        key={c.id}
                        name={c.nickname}
                        selected={false}
                        onPress={() => saveToMemory(c.id)}
                        testID={`decode-save-${c.id}`}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          {phase === "input" ? (
            <PrimaryButton label="Decode it" onPress={run} testID="decode-run-button" />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8, marginBottom: 16 },
  backTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.text,
  },
  sub: { ...typography.body.base, fontSize: 14.5, color: colors.textMuted },
  sectionLabel: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.textFaint,
    marginBottom: 10,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  upload: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
    borderWidth: 1.5,
    borderColor: "rgba(167,139,250,0.4)",
    borderStyle: "dashed",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: colors.surface,
  },
  uploadIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.violetTint,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: { ...typography.body.bodySemibold, fontSize: 14.5, color: colors.text },
  uploadHint: { ...typography.body.caption, fontSize: 12.5, color: colors.textFaint, marginTop: 3 },
  vibeCard: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 8,
  },
  vibeHeadline: {
    fontFamily: typography.fonts.displayMedium,
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.text,
    marginBottom: 14,
  },
  meterRow: { flexDirection: "row", gap: 5 },
  meterSeg: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.hairline },
  meterSegActive: {
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  meterLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  meterLabel: {
    fontFamily: typography.fonts.bodySemibold,
    fontSize: 10.5,
    color: colors.textDisabled,
  },
  meterLabelActive: { fontFamily: typography.fonts.bodyBold, color: colors.lavenderText },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 3 },
  bulletText: { ...typography.body.base, fontSize: 13.5, lineHeight: 19, color: colors.textMuted, flex: 1 },
  paragraph: { ...typography.body.base, fontSize: 13.5, lineHeight: 20, color: colors.textMuted },
  moveCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 20,
    paddingVertical: 17,
    paddingHorizontal: 18,
  },
  wingmanLead: { ...typography.body.bodyBold, fontSize: 13.5, color: colors.lavenderText },
  wingmanText: { ...typography.body.base, fontSize: 14, lineHeight: 20, color: colors.textSoft, marginTop: 4 },
  outcomeLead: { ...typography.body.bodyBold, fontSize: 12.5, color: colors.textFaint, marginTop: 12 },
  outcomeText: { ...typography.body.base, fontSize: 13, lineHeight: 18, color: colors.textFaint, marginTop: 3 },
  footerActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 26,
    marginTop: 4,
  },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 8 },
  footerSave: { ...typography.body.bodySemibold, fontSize: 13.5, color: colors.lavenderText },
  footerAsk: { ...typography.body.bodySemibold, fontSize: 13.5, color: colors.textMuted },
});
