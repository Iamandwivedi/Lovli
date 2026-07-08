// Shared feature screen — "V2 · Coach — Tools" (PR4). One config-driven phase
// machine (input → generating → result) for every More-grid tool, powered by
// POST /api/feature. Contract: /app/docs/FEATURE_API_AND_PROMPTS.md
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { Input } from "@/src/components/Input";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { PersonChip } from "@/src/components/PersonChip";
import { Chip } from "@/src/components/Chip";
import { Sparkle } from "@/src/components/Sparkle";
import { StagedLoader } from "@/src/components/reply/StagedLoader";
import { useToast } from "@/src/context/ToastContext";
import {
  FeaturePointTone,
  FeatureResult,
  MemoryCard,
  listMemoryCards,
  patchMemoryCard,
  runFeature,
} from "@/src/api/endpoints";
import { extractErrorMessage } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { ASK_PENDING_KEY } from "@/src/config/storage-keys";
import { FEATURE_CONFIG } from "@/src/constants/feature-config";
import { colors, space, typography } from "@/src/theme";

type Phase = "input" | "generating" | "result";

const TONE_COLOR: Record<FeaturePointTone, string> = {
  positive: colors.lavender,
  warning: colors.pink,
  neutral: colors.textFaint,
};

export default function FeatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const cfg = FEATURE_CONFIG[id ?? ""];

  const [phase, setPhase] = useState<Phase>("input");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [manual, setManual] = useState("");
  const [draft, setDraft] = useState("");
  const [secondary, setSecondary] = useState("");
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<FeatureResult | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    listMemoryCards().then((c) => setCards(c || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (phase !== "generating" || !cfg) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, cfg.stages.length - 1)), 700);
    return () => clearInterval(t);
  }, [phase, cfg]);

  if (!cfg) return <Redirect href="/(tabs)/more" />;

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
    if (cfg.wantsDraft) {
      if (!draft.trim()) {
        toast.error("Paste the reply you want to glow up first.");
        return;
      }
    } else if (!image && !manual.trim()) {
      toast.error("Tell me what happened first — screenshot or paste.");
      return;
    }
    setPhase("generating");
    setSaved(false);
    setPickerOpen(false);
    setCopiedIndex(null);
    const minWait = new Promise((r) => setTimeout(r, 2200));
    try {
      const [data] = await Promise.all([
        runFeature({
          feature_id: cfg.id,
          manual_text: manual,
          text_secondary: secondary,
          draft_text: draft,
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

  const copyReply = async (text: string, index: number) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedIndex(index);
      toast.success("Copied — go send it.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  const saveToMemory = async (cardId: string) => {
    if (!result) return;
    try {
      const card = cards.find((c) => c.id === cardId);
      const entry = {
        title: `${cfg.title} saved`,
        date_label: new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        detail: result.verdict,
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
    const topPoints = result.points.slice(0, 2).map((p) => p.text).join(" ");
    const text =
      `I just used "${cfg.title}". Your take was: "${result.verdict}" ${topPoints} ` +
      `What should I do next?`;
    await storage.setItem(ASK_PENDING_KEY, JSON.stringify({ text, personId: memoryId }));
    router.push("/(tabs)/ask-lovli");
  };

  return (
    <Screen scroll={false} testID="feature-page">
      {phase === "generating" ? (
        <StagedLoader activeIndex={stage} stages={cfg.stages} />
      ) : (
        <>
          <View style={styles.backHeader}>
            <Pressable
              onPress={() => (phase === "result" ? setPhase("input") : router.back())}
              hitSlop={12}
              testID="feature-back-button"
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.backTitle}>
              {phase === "result" ? cfg.resultTitle : cfg.title}
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: space.l, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {phase === "input" ? (
              <>
                <Text style={styles.sub}>{cfg.intro}</Text>

                {cfg.wantsDraft ? (
                  <Input
                    label="Your draft"
                    placeholder="Paste the reply you're about to send…"
                    multiline
                    numberOfLines={3}
                    value={draft}
                    onChangeText={setDraft}
                    inputTestID="feature-draft-input"
                    style={{ minHeight: 76 }}
                  />
                ) : null}

                <Pressable
                  onPress={pickImage}
                  testID="feature-upload-area"
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
                  placeholder={cfg.pastePlaceholder}
                  multiline
                  numberOfLines={2}
                  value={manual}
                  onChangeText={setManual}
                  inputTestID="feature-manual-input"
                  style={{ minHeight: 52 }}
                />

                {cfg.secondary ? (
                  <Input
                    label={cfg.secondary.label}
                    placeholder={cfg.secondary.placeholder}
                    value={secondary}
                    onChangeText={setSecondary}
                    inputTestID="feature-secondary-input"
                  />
                ) : null}

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
                          testID={`feature-person-${c.id}`}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}

            {phase === "result" && result ? (
              <>
                {/* Verdict glass card */}
                <View
                  style={[styles.verdictCard, cfg.rose && styles.verdictCardRose]}
                  testID="feature-verdict-card"
                >
                  <Text style={styles.sectionLabel}>{cfg.kicker}</Text>
                  <Text style={styles.verdict}>{result.verdict}</Text>
                </View>

                {result.points.length > 0 ? (
                  <View>
                    <Text style={styles.sectionLabel}>{cfg.pointsLabel}</Text>
                    {result.points.map((p, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Sparkle size={13} color={TONE_COLOR[p.tone] || colors.textFaint} />
                        <Text style={styles.bulletText}>{p.text}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {result.actions.length > 0 ? (
                  <View style={styles.moveCard}>
                    <Text style={styles.sectionLabel}>YOUR NEXT MOVE</Text>
                    {result.actions.map((a, i) => (
                      <View key={i} style={[styles.actionRow, i > 0 && { marginTop: 10 }]}>
                        {result.actions.length > 1 ? (
                          <Text style={styles.actionNum}>{i + 1}</Text>
                        ) : null}
                        <Text style={styles.actionText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {result.replies.length > 0 ? (
                  <View>
                    <Text style={styles.sectionLabel}>{"I'D SEND THIS"}</Text>
                    {result.replies.map((r, i) => (
                      <View key={i} style={[styles.replyCard, i > 0 && { marginTop: 10 }]}>
                        <Text style={styles.replyText}>{r}</Text>
                        <Pressable
                          onPress={() => copyReply(r, i)}
                          style={styles.copyBtn}
                          hitSlop={8}
                          testID={`feature-copy-${i}`}
                        >
                          <Ionicons
                            name={copiedIndex === i ? "checkmark" : "copy-outline"}
                            size={15}
                            color={copiedIndex === i ? colors.greenFlag : colors.lavenderText}
                          />
                          <Text style={styles.copyText}>{copiedIndex === i ? "Copied" : "Copy"}</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Footer actions — Decode pattern */}
                <View style={styles.footerActions}>
                  <Pressable
                    onPress={() => {
                      if (saved) return;
                      if (memoryId) saveToMemory(memoryId);
                      else if (cards.length > 0) setPickerOpen((v) => !v);
                      else toast.error("Add someone in Memory first, then save this to their card.");
                    }}
                    style={styles.footerBtn}
                    testID="feature-save-memory"
                  >
                    <Ionicons
                      name={saved ? "bookmark" : "bookmark-outline"}
                      size={15}
                      color={colors.lavenderText}
                    />
                    <Text style={styles.footerSave}>{saved ? "Saved" : "Save to Memory"}</Text>
                  </Pressable>
                  <Pressable onPress={askLovliAboutThis} style={styles.footerBtn} testID="feature-ask-lovli">
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
                        testID={`feature-save-${c.id}`}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          {phase === "input" ? (
            <PrimaryButton label={cfg.cta} onPress={run} testID="feature-run-button" />
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
  verdictCard: {
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
  verdictCardRose: { borderColor: "rgba(224,102,122,0.35)" },
  verdict: {
    fontFamily: typography.fonts.displayMedium,
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.text,
  },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 3 },
  bulletText: { ...typography.body.base, fontSize: 13.5, lineHeight: 19, color: colors.textMuted, flex: 1 },
  moveCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 20,
    paddingVertical: 17,
    paddingHorizontal: 18,
  },
  actionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  actionNum: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 12,
    color: colors.lavenderText,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.violetTint,
    textAlign: "center",
    lineHeight: 18,
    overflow: "hidden",
    marginTop: 1,
  },
  actionText: { ...typography.body.base, fontSize: 14, lineHeight: 20, color: colors.textSoft, flex: 1 },
  replyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.violetTintBorder,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  replyText: { ...typography.body.base, fontSize: 14.5, lineHeight: 21, color: colors.textSoft },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-end",
    marginTop: 8,
    paddingVertical: 2,
  },
  copyText: { ...typography.body.bodySemibold, fontSize: 12.5, color: colors.lavenderText },
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
