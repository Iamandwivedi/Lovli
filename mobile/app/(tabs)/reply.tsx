// Reply screen — the most important screen in the app.
// Upload screenshot or paste chat → choose language → generate 3 replies.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { AppHeader } from "@/src/components/AppHeader";
import { GlassCard } from "@/src/components/GlassCard";
import { Chip } from "@/src/components/Chip";
import { Input } from "@/src/components/Input";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SecondaryButton } from "@/src/components/SecondaryButton";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import {
  Language,
  MemoryCard,
  PlatformLabel,
  Replies,
  ReplyRead,
  Vibe,
  generateReplies,
  getUsage,
  getClientLocalDate,
  listMemoryCards,
  platformLabelToValue,
  platformValueToLabel,
  postFeedback,
} from "@/src/api/endpoints";
import { extractErrorMessage } from "@/src/api/client";
import { colors, fontSize, radii, space, typography } from "@/src/theme";

const PLATFORMS: PlatformLabel[] = ["Instagram", "Dating platform", "WhatsApp"];
const VIBES: Vibe[] = ["Playful", "Flirty", "Sincere", "Respectful", "Confident"];
const LANGUAGES: Language[] = ["English", "Hinglish", "Hindi + English mixed"];
// Human-feel tone label mapped from chosen vibe.
const TONE_LABEL: Record<Vibe, string> = {
  Playful: "Playful",
  Flirty: "Smooth",
  Sincere: "Sincere",
  Respectful: "Respectful",
  Confident: "Confident",
};

// PR-DA1: single first-person headline (rotation retired — design wants one steady line).
const HERO_HEADLINE = "Stuck on what to say back?";
const HERO_SUB =
  "Drop the screenshot. I'll read the vibe and write back — in your voice.";

type Pick = ImagePicker.ImagePickerAsset;

export default function ReplyScreen() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [image, setImage] = useState<Pick | null>(null);
  const [manual, setManual] = useState("");
  const [language, setLanguage] = useState<Language>(
    (user?.language_preference as Language) || "Hinglish",
  );
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [platform, setPlatform] = useState<PlatformLabel>(
    platformValueToLabel(user?.preferred_platform || "instagram"),
  );
  const [vibe, setVibe] = useState<Vibe>("Playful");
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [memoryPickerOpen, setMemoryPickerOpen] = useState(false);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Replies | null>(null);
  const [usage, setUsage] = useState({
    daily_generation_count: user?.daily_generation_count ?? 0,
    daily_limit: user?.daily_limit ?? 8,
    plan: user?.plan ?? "free",
  });

  const refreshUsageAndMemory = useCallback(async () => {
    try {
      const u = await getUsage(getClientLocalDate());
      setUsage(u);
    } catch {
      // silent
    }
    try {
      const cards = await listMemoryCards();
      setMemoryCards(cards || []);
    } catch {
      setMemoryCards([]);
    }
  }, []);

  useEffect(() => {
    refreshUsageAndMemory();
  }, [refreshUsageAndMemory]);

  useFocusEffect(
    useCallback(() => {
      refreshUsageAndMemory();
    }, [refreshUsageAndMemory]),
  );

  const selectedMemoryName = useMemo(
    () => (memoryId ? memoryCards.find((m) => m.id === memoryId)?.nickname : null),
    [memoryId, memoryCards],
  );

  const summary = useMemo(
    () => [platform, vibe, selectedMemoryName || "No memory"].filter(Boolean).join(" • "),
    [platform, vibe, selectedMemoryName],
  );

  const remaining = useMemo(() => {
    if (usage.plan === "pro") return Infinity;
    return Math.max(0, (usage.daily_limit ?? 8) - (usage.daily_generation_count ?? 0));
  }, [usage]);

  const pickImage = async () => {
    try {
      // Check permission first
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      let granted = status === "granted";
      if (!granted) {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        granted = req.status === "granted";
        if (!granted && !req.canAskAgain) {
          toast.error("Enable Photos in Settings to upload a screenshot.");
          return;
        }
        if (!granted) return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.85,
        exif: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      // 8MB safety check
      if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
        toast.error("This image is too large.");
        return;
      }
      setImage(asset);
    } catch {
      toast.error("Could not open your photos.");
    }
  };

  const removeImage = () => setImage(null);

  const onGenerate = async () => {
    if (!image && !manual.trim()) {
      toast.error("Upload a screenshot or paste the chat first.");
      return;
    }
    if (usage.plan !== "pro" && remaining <= 0) {
      toast.error("You've used today's free generations.");
      return;
    }
    try {
      setGenerating(true);
      const data = await generateReplies({
        platform: platformLabelToValue(platform),
        vibe,
        language,
        manual_text: manual,
        memory_card_id: memoryId,
        // PR-INT: ask for the situation read + labeled replies. Server is
        // backward compatible — if rich isn't honored or the LLM produces
        // a malformed rich payload, the renderer falls back to the plain view.
        rich: true,
        image: image
          ? {
              uri: image.uri,
              name: image.fileName || `chat.${(image.mimeType || "image/jpeg").split("/").pop()}`,
              type: image.mimeType || "image/jpeg",
            }
          : null,
      });
      setResult(data);
      setUsage({
        daily_generation_count: data.daily_generation_count,
        daily_limit: data.daily_limit,
        plan: data.plan,
      });
      if (user) {
        updateUser({
          ...user,
          daily_generation_count: data.daily_generation_count,
          daily_limit: data.daily_limit,
          plan: data.plan,
        });
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, "Something went wrong. Try again."));
    } finally {
      setGenerating(false);
    }
  };

  const onRegenerate = async () => {
    setResult(null);
    await onGenerate();
  };

  const onCopy = async (text: string, index: number) => {
    try {
      await Clipboard.setStringAsync(text);
      toast.success("Copied. Go send it.");
      if (result?.generation_id) {
        postFeedback(result.generation_id, index).catch(() => {});
      }
    } catch {
      toast.error("Could not copy.");
    }
  };

  return (
    <Screen testID="reply-page" bottomTabSpacing>
      <AppHeader />

      <View style={{ marginTop: space.l }}>
        <Text style={styles.h1} testID="reply-heading">
          {HERO_HEADLINE}
        </Text>
        <Text style={styles.sub}>{HERO_SUB}</Text>
      </View>

      {/* Upload card */}
      <GlassCard padded variant="solid" testID="upload-card">
        {image ? (
          <View style={styles.preview} testID="upload-preview">
            <Image source={{ uri: image.uri }} style={styles.previewImg} resizeMode="cover" />
            <Pressable
              onPress={removeImage}
              testID="upload-remove-button"
              style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.8 }]}
              hitSlop={10}
            >
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={pickImage}
            testID="upload-area"
            style={({ pressed }) => [styles.upload, pressed && styles.uploadPressed]}
          >
            <View style={styles.uploadIcon}>
              <Ionicons name="cloud-upload-outline" size={26} color={colors.violet} />
            </View>
            <Text style={styles.uploadTitle}>Upload a screenshot</Text>
            <Text style={styles.uploadHint}>From any chat app — PNG or JPG</Text>
          </Pressable>
        )}

        <View style={styles.privacyLine}>
          <Ionicons name="shield-checkmark-outline" size={12} color={colors.violet} />
          <Text style={styles.privacyText}>Only upload chats you're comfortable sharing.</Text>
        </View>
      </GlassCard>

      {/* Manual paste */}
      <Input
        label="Or paste the chat"
        placeholder="Or paste the chat here…"
        multiline
        numberOfLines={4}
        value={manual}
        onChangeText={setManual}
        inputTestID="manual-text-input"
      />

      {/* Reply language */}
      <View>
        <View style={styles.sectionRow}>
          <Ionicons name="globe-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.section}>Reply language</Text>
        </View>
        <View style={styles.chipsRow}>
          {LANGUAGES.map((l) => (
            <Chip
              key={l}
              label={l}
              selected={language === l}
              onPress={() => setLanguage(l)}
              testID={`language-${l}`}
            />
          ))}
        </View>
      </View>

      {/* Customize reply */}
      <GlassCard padded variant="solid" testID="customize-card">
        <Pressable
          onPress={() => setCustomizeOpen((v) => !v)}
          testID="customize-toggle"
          style={styles.customHeader}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Customize reply</Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {summary}
            </Text>
          </View>
          <Ionicons
            name={customizeOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>

        {customizeOpen ? (
          <View style={{ marginTop: space.l, gap: space.l }}>
            <View>
              <View style={styles.sectionRow}>
                <Ionicons name="phone-portrait-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.subSection}>Platform</Text>
              </View>
              <View style={styles.chipsRow}>
                {PLATFORMS.map((p) => (
                  <Chip
                    key={p}
                    label={p}
                    selected={platform === p}
                    onPress={() => setPlatform(p)}
                    testID={`platform-${p}`}
                  />
                ))}
              </View>
            </View>
            <View>
              <View style={styles.sectionRow}>
                <Ionicons name="sparkles-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.subSection}>Vibe</Text>
              </View>
              <View style={styles.chipsRow}>
                {VIBES.map((v) => (
                  <Chip
                    key={v}
                    label={v}
                    selected={vibe === v}
                    onPress={() => setVibe(v)}
                    testID={`vibe-${v}`}
                  />
                ))}
              </View>
            </View>
            <View>
              <View style={styles.sectionRow}>
                <Ionicons name="bookmark-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.subSection}>Personalize with memory</Text>
              </View>
              <Pressable
                onPress={() => setMemoryPickerOpen(true)}
                testID="memory-picker-open"
                style={({ pressed }) => [styles.memorySelect, pressed && { opacity: 0.85 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.memorySelectText}>
                    {selectedMemoryName || "None"}
                  </Text>
                  <Text style={styles.memorySelectHint}>
                    Memory is optional — tap to choose.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </GlassCard>

      {/* Usage / privacy row */}
      <View style={styles.usageRow} testID="usage-privacy-row">
        <View style={styles.usagePill} testID="reply-usage-counter">
          {usage.plan === "pro" ? (
            <>
              <View style={[styles.usageDot, { backgroundColor: colors.lavender }]} />
              <Text style={styles.usageText}>Pro — unlimited</Text>
            </>
          ) : (
            <>
              <View style={styles.usageDot} />
              <Text style={styles.usageText}>
                {usage.daily_generation_count} of {usage.daily_limit} used today
              </Text>
            </>
          )}
        </View>
        <View style={styles.privatePill}>
          <Ionicons name="lock-closed" size={11} color={colors.violet} />
          <Text style={styles.usageText}>Private</Text>
        </View>
      </View>

      {/* PR-DA1: airier layout — Using chip removed, Customize card already
          summarizes the selections. Generate button gets generous space above. */}

      {/* Generate button */}
      <PrimaryButton
        label={generating ? "Reading the vibe…" : "Get replies"}
        onPress={onGenerate}
        loading={generating}
        testID="generate-replies-button"
      />

      {/* Results */}
      {generating && !result ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.lavender} />
          <Text style={styles.loadingText}>Reading the vibe…</Text>
        </View>
      ) : null}

      {result ? (
        <View testID="reply-results-block" style={{ gap: space.l }}>
          {/* PR-INT: situation read card (rich-mode). Guarded — if read shape
              is malformed/missing, we silently fall back to the plain view. */}
          {(() => {
            const read = safeRead(result.read);
            return read ? <ReadCard read={read} /> : null;
          })()}

          <View>
            <Text style={styles.h2}>Choose a reply</Text>
            <Text style={styles.sub}>Edit it if you want. Make it yours.</Text>
          </View>
          {result.replies.map((reply, i) => {
            // PR-INT: prefer the model's truthful label; fall back to vibe tone.
            const richLabel = Array.isArray(result.reply_labels)
              ? (result.reply_labels[i] || "").trim()
              : "";
            const label = richLabel || TONE_LABEL[vibe] || "Warm";
            return (
              <ReplyResultCard
                key={`${result.generation_id}-${i}`}
                text={reply}
                toneLabel={label}
                index={i}
                onCopy={() => onCopy(reply, i)}
                onRegenerate={onRegenerate}
                regenerating={generating}
              />
            );
          })}
        </View>
      ) : null}

      {/* Memory picker modal */}
      <MemoryPickerModal
        open={memoryPickerOpen}
        onClose={() => setMemoryPickerOpen(false)}
        cards={memoryCards}
        selectedId={memoryId}
        onPick={(id) => {
          setMemoryId(id);
          setMemoryPickerOpen(false);
        }}
      />
    </Screen>
  );
}

// --- PR-INT: Read card (situation read + temperature chip + signals/outcome ticks) ---

// Defensive parser: only returns a ReplyRead if the shape is well-formed.
// Any malformed/missing field → returns null → caller falls back to plain view.
function safeRead(value: ReplyRead | null | undefined): ReplyRead | null {
  if (!value || typeof value !== "object") return null;
  const v = value as ReplyRead;
  if (typeof v.situation !== "string" || !v.situation.trim()) return null;
  if (v.temperature !== "interested" && v.temperature !== "neutral" && v.temperature !== "cold") {
    return null;
  }
  const signals = Array.isArray(v.signals)
    ? v.signals.filter((s) => typeof s === "string" && s.trim())
    : [];
  const outcome = Array.isArray(v.outcome)
    ? v.outcome.filter((s) => typeof s === "string" && s.trim())
    : [];
  if (signals.length === 0 && outcome.length === 0 && !v.situation) return null;
  return {
    situation: v.situation,
    temperature: v.temperature,
    signals: signals.slice(0, 3),
    outcome: outcome.slice(0, 3),
  };
}

const TEMPERATURE_META: Record<
  ReplyRead["temperature"],
  { emoji: string; label: string }
> = {
  interested: { emoji: "🔥", label: "Interested" },
  neutral: { emoji: "🙂", label: "Neutral" },
  cold: { emoji: "❄", label: "Cold" },
};

const ReadCard: React.FC<{ read: ReplyRead }> = ({ read }) => {
  const temp = TEMPERATURE_META[read.temperature];
  return (
    <GlassCard padded variant="elevated" testID="read-card">
      <View style={styles.readHeader}>
        <View style={styles.readTitleRow}>
          <Ionicons name="eye-outline" size={14} color={colors.violetDeep} />
          <Text style={styles.readEyebrow}>What's going on</Text>
        </View>
        <View style={styles.tempChip} testID="read-temperature-chip">
          <Text style={styles.tempEmoji}>{temp.emoji}</Text>
          <Text style={styles.tempLabel}>{temp.label}</Text>
        </View>
      </View>

      <Text style={styles.readSituation} testID="read-situation">
        {read.situation}
      </Text>

      {read.signals.length > 0 ? (
        <View style={styles.readSection}>
          <Text style={styles.readSectionTitle}>Signals from the chat</Text>
          {read.signals.map((s, i) => (
            <View key={`sig-${i}`} style={styles.bulletRow}>
              <Ionicons name="checkmark" size={14} color={colors.violet} />
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {read.outcome.length > 0 ? (
        <View style={styles.readSection}>
          <Text style={styles.readSectionTitle}>These replies will likely…</Text>
          {read.outcome.map((s, i) => (
            <View key={`out-${i}`} style={styles.bulletRow}>
              <Ionicons name="arrow-forward" size={13} color={colors.violet} />
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
};

// --- Reply result card ---
const ReplyResultCard: React.FC<{
  text: string;
  toneLabel: string;
  index: number;
  onCopy: () => void;
  onRegenerate: () => void;
  regenerating?: boolean;
}> = ({ text, toneLabel, index, onCopy, onRegenerate, regenerating }) => {
  const [copied, setCopied] = useState(false);
  const fade = React.useRef(new Animated.Value(0)).current;
  const slide = React.useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 360,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide, index]);

  const handleCopy = async () => {
    setCopied(true);
    await onCopy();
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Animated.View
      style={[styles.replyCard, { opacity: fade, transform: [{ translateY: slide }] }]}
      testID="reply-result-card"
    >
      <View style={styles.toneRow}>
        <View style={styles.toneDot} />
        <Text style={styles.toneLabel} testID="reply-tone-label">
          {toneLabel}
        </Text>
      </View>
      <Text style={styles.replyText} testID="reply-result-text">
        {text}
      </Text>
      <View style={styles.replyActions}>
        <Pressable
          onPress={handleCopy}
          style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.85 }]}
          testID="reply-copy-button"
        >
          <Ionicons
            name={copied ? "checkmark-circle" : "copy-outline"}
            size={14}
            color={colors.ctaText}
          />
          <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
        </Pressable>
        <Pressable
          onPress={onRegenerate}
          disabled={regenerating}
          style={({ pressed }) => [styles.regenBtn, pressed && { opacity: 0.8 }]}
          testID="reply-regenerate-button"
        >
          <Ionicons name="refresh" size={14} color={colors.textSoft} />
          <Text style={styles.regenText}>Regenerate</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

// --- Memory picker modal ---
const MemoryPickerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  cards: MemoryCard[];
  selectedId: string | null;
  onPick: (id: string | null) => void;
}> = ({ open, onClose, cards, selectedId, onPick }) => {
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet} testID="memory-picker-modal">
        <View style={styles.sheetHandle} />
        <Text style={styles.modalTitle}>Personalize with memory</Text>
        <Text style={styles.modalSub}>Optional — leaves your replies more thoughtful.</Text>

        <Pressable
          onPress={() => onPick(null)}
          style={({ pressed }) => [
            styles.memoryOption,
            !selectedId && styles.memoryOptionActive,
            pressed && { opacity: 0.85 },
          ]}
          testID="memory-option-none"
        >
          <Text style={styles.memoryOptionText}>None</Text>
          {!selectedId ? <Ionicons name="checkmark" size={16} color={colors.lavender} /> : null}
        </Pressable>

        {cards.length === 0 ? (
          <Text style={styles.memoryEmpty}>
            No memories yet. You can add one on the Memory tab.
          </Text>
        ) : (
          cards.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onPick(c.id)}
              style={({ pressed }) => [
                styles.memoryOption,
                selectedId === c.id && styles.memoryOptionActive,
                pressed && { opacity: 0.85 },
              ]}
              testID={`memory-option-${c.id}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.memoryOptionText}>{c.nickname}</Text>
                {c.relationship_stage ? (
                  <Text style={styles.memoryOptionHint}>{c.relationship_stage}</Text>
                ) : null}
              </View>
              {selectedId === c.id ? (
                <Ionicons name="checkmark" size={16} color={colors.lavender} />
              ) : null}
            </Pressable>
          ))
        )}

        <SecondaryButton
          label="Close"
          onPress={onClose}
          style={{ marginTop: space.l }}
          testID="memory-picker-close"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  h1: {
    ...typography.display.h1,
    color: colors.text,
  },
  h2: {
    ...typography.display.h2,
    color: colors.text,
  },
  sub: {
    ...typography.body.base,
    color: colors.textMuted,
    marginTop: 6,
  },
  cardTitle: {
    ...typography.display.h3,
    color: colors.text,
  },
  cardSub: {
    ...typography.body.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  uploadHeader: { marginBottom: space.m },
  upload: {
    minHeight: 160,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: "dashed",
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.xl,
    backgroundColor: colors.surface,
  },
  uploadPressed: {
    borderColor: colors.violet,
    backgroundColor: colors.violetTint,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.violetTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.m,
  },
  uploadTitle: { ...typography.body.bodySemibold, color: colors.text },
  uploadHint: { ...typography.body.caption, color: colors.textMuted, marginTop: 4 },
  preview: {
    position: "relative",
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.bg,
  },
  previewImg: { width: "100%", height: 220 },
  removeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(5, 5, 9, 0.7)",
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space.m,
  },
  privacyText: { ...typography.body.caption, color: colors.textMuted },
  section: {
    ...typography.body.bodySemibold,
    color: colors.textSoft,
    marginBottom: 10,
  },
  // PR3: row that holds a section label + a small contextual icon
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  subSection: {
    ...typography.body.bodySemibold,
    color: colors.textSoft,
    fontSize: fontSize.sm,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  customHeader: { flexDirection: "row", alignItems: "center" },
  memorySelect: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
  },
  memorySelectText: { ...typography.body.bodyMedium, color: colors.text },
  memorySelectHint: { ...typography.body.caption, color: colors.textMuted, marginTop: 3 },
  usageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  usagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  privatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  usageDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.textMuted,
  },
  usageText: { ...typography.body.caption, color: colors.textSoft },
  // PR3: "Using" context chip — live read of selections shown right above the CTA.
  usingChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.violetTint,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    maxWidth: "100%",
  },
  usingPrefix: {
    ...typography.body.bodySemibold,
    color: colors.violetDeep,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  usingText: {
    ...typography.body.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  loadingBlock: {
    alignItems: "center",
    padding: space.xl,
  },
  loadingText: { ...typography.body.caption, color: colors.textMuted, marginTop: 10 },
  replyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: space.l + 2,
    shadowColor: "#14121C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  toneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toneDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.lavender,
    shadowColor: colors.lavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  toneLabel: {
    ...typography.body.caption,
    fontFamily: typography.fonts.bodySemibold,
    color: colors.lavenderSoft,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  replyText: {
    ...typography.body.large,
    color: colors.text,
    fontSize: 17,
    lineHeight: 26,
    marginTop: 10,
  },
  replyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: space.m,
    flexWrap: "wrap",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.ctaBase,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  copyText: { ...typography.body.bodySemibold, color: colors.ctaText, fontSize: fontSize.sm },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  regenText: { ...typography.body.bodySemibold, color: colors.textSoft, fontSize: fontSize.sm },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  modalSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.midnight,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: space.l,
    paddingTop: 10,
    paddingBottom: space.xl + space.l,
    gap: 8,
    maxHeight: "80%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: space.m,
  },
  modalTitle: {
    ...typography.display.h3,
    color: colors.text,
  },
  modalSub: { ...typography.body.caption, color: colors.textMuted, marginBottom: space.m },
  memoryOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: space.l,
    paddingVertical: space.m + 2,
    marginTop: 8,
  },
  memoryOptionActive: {
    borderColor: colors.lavender,
    backgroundColor: "rgba(167, 139, 250, 0.08)",
  },
  memoryOptionText: { ...typography.body.bodyMedium, color: colors.text },
  memoryOptionHint: { ...typography.body.caption, color: colors.textMuted, marginTop: 3 },
  memoryEmpty: { ...typography.body.caption, color: colors.textMuted, paddingVertical: 10 },

  // --- PR-INT: ReadCard styles ---
  readHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  readTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  readEyebrow: {
    ...typography.body.bodySemibold,
    color: colors.violetDeep,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tempChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.violetTint,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tempEmoji: { fontSize: 13 },
  tempLabel: {
    ...typography.body.bodySemibold,
    color: colors.violetDeep,
    fontSize: 12,
  },
  readSituation: {
    ...typography.body.large,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: space.m,
  },
  readSection: { marginTop: space.s + 2, gap: 6 },
  readSectionTitle: {
    ...typography.body.bodySemibold,
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 2,
  },
  bulletText: {
    ...typography.body.base,
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
