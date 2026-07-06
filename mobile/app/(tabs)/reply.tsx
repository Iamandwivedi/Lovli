// Reply tab — V2 "Coach" flow as a phase machine:
//   home → intent → generating → results
// home:      "What's happening?" + feeling check-in + compact upload/paste + ✦ Get replies
// intent:    "Got it. I read the chat." + chat preview + WHAT DO YOU WANT? / HOW SHOULD IT LAND?
// generating: staged 5-step loader timed to the real request
// results:   insight + reply cards (full "Generated" restyle lands in PR-V2-3)
// NOTE (PR-V2-2): feeling/intent/outcome are stored client-side ONLY — they are
// sent to the backend (with the onboarding goal from AsyncStorage `lovli_goal`)
// in PR-V2-3. Language/platform/vibe defaults are sent unchanged.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { AppHeader } from "@/src/components/AppHeader";
import { GlassCard } from "@/src/components/GlassCard";
import { Chip } from "@/src/components/Chip";
import { Input } from "@/src/components/Input";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ChatPreview } from "@/src/components/reply/ChatPreview";
import { StagedLoader, GENERATION_STAGES } from "@/src/components/reply/StagedLoader";
import { parseChatText } from "@/src/utils/chatParse";
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

type Phase = "home" | "intent" | "generating" | "results";
type Pick = ImagePicker.ImagePickerAsset;

const FEELINGS = [
  "😊 Excited",
  "😔 Confused",
  "😰 Overthinking",
  "❤️ Falling for someone",
  "💔 Healing",
  "😎 Just curious",
];
const INTENTS = ["Reply", "Understand", "Flirt", "Set boundaries", "End it", "Save the vibe"];
const OUTCOMES = [
  "Make them smile",
  "Keep the mystery",
  "Sound confident",
  "Don't look desperate",
  "Be funny",
  "Stay casual",
  "Be mature",
];
const LANGUAGES: Language[] = ["English", "Hinglish", "Hindi + English mixed"];

export default function ReplyScreen() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>("home");
  const [image, setImage] = useState<Pick | null>(null);
  const [manual, setManual] = useState("");
  const [feeling, setFeeling] = useState<string | null>(null);
  const [intent, setIntent] = useState<string>("Reply");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Replies | null>(null);
  // PR-V2-3.1: per-generation overrides — reset to defaults on each new flow.
  const [language, setLanguage] = useState<Language>(
    (user?.language_preference as Language) || "Hinglish",
  );
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [usage, setUsage] = useState({
    daily_generation_count: user?.daily_generation_count ?? 0,
    daily_limit: user?.daily_limit ?? 8,
    plan: user?.plan ?? "free",
  });

  // Settings defaults — sent unchanged unless overridden on the Intent screen.
  const defaultLanguage: Language = (user?.language_preference as Language) || "Hinglish";
  const platform: PlatformLabel = platformValueToLabel(user?.preferred_platform || "instagram");
  const vibe: Vibe = "Playful";

  const refreshContext = useCallback(async () => {
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

  useFocusEffect(
    useCallback(() => {
      refreshContext();
    }, [refreshContext]),
  );

  // Staged loader: advance sequentially (~650ms per stage), hold on the last
  // until the real request resolves.
  useEffect(() => {
    if (phase !== "generating") return;
    setStage(0);
    const id = setInterval(() => {
      setStage((s) => Math.min(s + 1, GENERATION_STAGES.length - 1));
    }, 650);
    return () => clearInterval(id);
  }, [phase]);

  const remaining = useMemo(() => {
    if (usage.plan === "pro") return Infinity;
    return Math.max(0, (usage.daily_limit ?? 8) - (usage.daily_generation_count ?? 0));
  }, [usage]);

  const parsedMessages = useMemo(
    () => (manual.trim() ? parseChatText(manual) : []),
    [manual],
  );

  const pickImage = async () => {
    try {
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
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.85,
        exif: false,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
        toast.error("This image is too large.");
        return;
      }
      setImage(asset);
    } catch {
      toast.error("Could not open your photos.");
    }
  };

  const goToIntent = () => {
    if (!image && !manual.trim()) {
      toast.error("Show me the conversation first — screenshot or paste.");
      return;
    }
    if (usage.plan !== "pro" && remaining <= 0) {
      toast.error("You've used today's free generations.");
      return;
    }
    // Per-generation overrides start from defaults each time.
    setLanguage(defaultLanguage);
    setMemoryId(null);
    setPhase("intent");
  };

  const startGeneration = async () => {
    setPhase("generating");
    setResult(null);
    // Keep the staged loader readable even on fast responses.
    const minWait = new Promise((r) => setTimeout(r, 2200));
    try {
      const [data] = await Promise.all([
        generateReplies({
          platform: platformLabelToValue(platform),
          vibe,
          language,
          manual_text: manual,
          memory_card_id: memoryId,
          rich: true,
          image: image
            ? {
                uri: image.uri,
                name:
                  image.fileName ||
                  `chat.${(image.mimeType || "image/jpeg").split("/").pop()}`,
                type: image.mimeType || "image/jpeg",
              }
            : null,
        }),
        minWait,
      ]);
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
      setPhase("results");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Something went wrong. Try again."));
      setPhase("intent");
    }
  };

  const onCopy = async (text: string, index: number) => {
    try {
      await Clipboard.setStringAsync(text);
      toast.success("Copied — go get 'em.");
      if (result?.generation_id) {
        postFeedback(result.generation_id, index).catch(() => {});
      }
    } catch {
      toast.error("Could not copy.");
    }
  };

  return (
    <Screen
      testID="reply-page"
      bottomTabSpacing
      scroll={phase === "home" || phase === "results"}
    >
      {phase === "home" ? (
        <HomePhase
          image={image}
          manual={manual}
          feeling={feeling}
          onChangeManual={setManual}
          onToggleFeeling={(f) => setFeeling((cur) => (cur === f ? null : f))}
          onSkipFeeling={() => setFeeling(null)}
          onPickImage={pickImage}
          onRemoveImage={() => setImage(null)}
          onContinue={goToIntent}
        />
      ) : null}

      {phase === "intent" ? (
        <>
          <BackHeader title="Got it. I read the chat." onBack={() => setPhase("home")} />
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: space.l, paddingBottom: space.l }}
            showsVerticalScrollIndicator={false}
          >
            <ChatPreview messages={parsedMessages} imageUri={image?.uri} />

            <View>
              <Text style={styles.sectionLabel}>WHAT DO YOU WANT?</Text>
              <View style={styles.chipsRow}>
                {INTENTS.map((it) => (
                  <Chip
                    key={it}
                    label={it}
                    selected={intent === it}
                    onPress={() => setIntent(it)}
                    testID={`intent-${it}`}
                  />
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.sectionLabel}>HOW SHOULD IT LAND?</Text>
              <View style={styles.chipsRow}>
                {OUTCOMES.map((o) => (
                  <Chip
                    key={o}
                    label={o}
                    selected={outcome === o}
                    onPress={() => setOutcome((cur) => (cur === o ? null : o))}
                    testID={`outcome-${o}`}
                  />
                ))}
              </View>
            </View>

            {/* PR-V2-3.1: per-generation language override (doesn't change the saved default) */}
            <View>
              <Text style={styles.sectionLabel}>REPLY LANGUAGE</Text>
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

            {/* PR-V2-3.1: optional person picker — hidden entirely when no memory cards */}
            {memoryCards.length > 0 ? (
              <View testID="person-section">
                <Text style={styles.sectionLabel}>{"WHO'S THIS ABOUT?"}</Text>
                <View style={styles.chipsRow}>
                  <Chip
                    label="No one"
                    selected={memoryId === null}
                    onPress={() => setMemoryId(null)}
                    testID="person-none"
                  />
                  {memoryCards.map((c) => (
                    <PersonChip
                      key={c.id}
                      name={c.nickname}
                      selected={memoryId === c.id}
                      onPress={() => setMemoryId((cur) => (cur === c.id ? null : c.id))}
                      testID={`person-${c.id}`}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <PrimaryButton
            label="Write it for me"
            onPress={startGeneration}
            testID="write-it-button"
          />
        </>
      ) : null}

      {phase === "generating" ? <StagedLoader activeIndex={stage} /> : null}

      {phase === "results" && result ? (
        <>
          <BackHeader title="Your reply" onBack={() => setPhase("home")} />
          <View testID="reply-results-block" style={{ gap: space.l }}>
            {(() => {
              const read = safeRead(result.read);
              return read ? <ReadCard read={read} /> : null;
            })()}
            {result.replies.map((reply, i) => {
              const richLabel = Array.isArray(result.reply_labels)
                ? (result.reply_labels[i] || "").trim()
                : "";
              return (
                <ReplyResultCard
                  key={`${result.generation_id}-${i}`}
                  text={reply}
                  toneLabel={richLabel || "Warm"}
                  index={i}
                  onCopy={() => onCopy(reply, i)}
                  onRegenerate={startGeneration}
                />
              );
            })}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

// --- Home phase ---
const HomePhase: React.FC<{
  image: Pick | null;
  manual: string;
  feeling: string | null;
  onChangeManual: (v: string) => void;
  onToggleFeeling: (f: string) => void;
  onSkipFeeling: () => void;
  onPickImage: () => void;
  onRemoveImage: () => void;
  onContinue: () => void;
}> = ({
  image,
  manual,
  feeling,
  onChangeManual,
  onToggleFeeling,
  onSkipFeeling,
  onPickImage,
  onRemoveImage,
  onContinue,
}) => (
  <>
    <AppHeader />

    <View style={{ marginTop: space.s }}>
      <Text style={styles.h1} testID="reply-heading">
        {"What's happening?"}
      </Text>
      <Text style={styles.sub}>
        Tell me what happened — or just show me the conversation.
      </Text>
    </View>

    {/* Emotional check-in — optional, single-select toggle */}
    <View testID="feeling-section">
      <View style={styles.feelingHeader}>
        <Text style={styles.sectionLabel}>HOW ARE YOU FEELING?</Text>
        <Pressable onPress={onSkipFeeling} hitSlop={10} testID="feeling-skip">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
      <View style={styles.chipsRow}>
        {FEELINGS.map((f) => (
          <Chip
            key={f}
            label={f}
            selected={feeling === f}
            onPress={() => onToggleFeeling(f)}
            testID={`feeling-${f.split(" ").slice(1).join(" ")}`}
          />
        ))}
      </View>
    </View>

    {/* Upload row */}
    {image ? (
      <View style={styles.preview} testID="upload-preview">
        <Image source={{ uri: image.uri }} style={styles.previewImg} resizeMode="cover" />
        <Pressable
          onPress={onRemoveImage}
          testID="upload-remove-button"
          style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.8 }]}
          hitSlop={10}
        >
          <Ionicons name="close" size={16} color={colors.text} />
        </Pressable>
      </View>
    ) : (
      <Pressable
        onPress={onPickImage}
        testID="upload-area"
        style={({ pressed }) => [styles.upload, pressed && styles.uploadPressed]}
      >
        <View style={styles.uploadIcon}>
          <Ionicons name="arrow-up" size={20} color={colors.lavender} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.uploadTitle}>Show me the conversation</Text>
          <Text style={styles.uploadHint}>Screenshot from any chat app</Text>
        </View>
      </Pressable>
    )}

    {/* Paste field */}
    <Input
      placeholder="Or paste the chat here…"
      multiline
      numberOfLines={2}
      value={manual}
      onChangeText={onChangeManual}
      inputTestID="manual-text-input"
      style={{ minHeight: 52 }}
    />

    <View style={{ marginTop: space.s }}>
      <PrimaryButton label="Get replies" onPress={onContinue} testID="generate-replies-button" />
    </View>
  </>
);

// --- Back header (recurring sub-screen pattern) ---
const BackHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <View style={styles.backHeader}>
    <Pressable onPress={onBack} hitSlop={12} testID="reply-back-button">
      <Ionicons name="chevron-back" size={22} color={colors.text} />
    </Pressable>
    <Text style={styles.backTitle}>{title}</Text>
  </View>
);

// --- PR-V2-3.1: person chip with mini gradient avatar ---
const PersonChip: React.FC<{
  name: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}> = ({ name, selected, onPress, testID }) => (
  <Pressable
    onPress={onPress}
    testID={testID}
    style={({ pressed }) => [
      styles.personChip,
      selected ? styles.personChipSelected : styles.personChipUnselected,
      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
    ]}
  >
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.personAvatar}
    >
      <Text style={styles.personAvatarText} allowFontScaling={false}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
    <Text style={[styles.personName, selected && styles.personNameSelected]} numberOfLines={1}>
      {name}
    </Text>
  </Pressable>
);

// --- PR-INT: defensive read parser (unchanged) ---
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

const TEMPERATURE_META: Record<ReplyRead["temperature"], { emoji: string; label: string }> = {
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
          <Ionicons name="eye-outline" size={14} color={colors.lavender} />
          <Text style={styles.readEyebrow}>{"What's going on"}</Text>
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

// --- Reply result card (restyle lands in PR-V2-3) ---
const ReplyResultCard: React.FC<{
  text: string;
  toneLabel: string;
  index: number;
  onCopy: () => void;
  onRegenerate: () => void;
}> = ({ text, toneLabel, index, onCopy, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 320, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 360, delay: index * 80, useNativeDriver: true }),
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

const styles = StyleSheet.create({
  h1: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.7,
    color: colors.text,
  },
  sub: {
    ...typography.body.base,
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 8,
    maxWidth: 290,
  },
  // Recurring V2 section label: 12px 700 .1em uppercase #71717A
  sectionLabel: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.textFaint,
    marginBottom: 10,
  },
  feelingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skipText: {
    fontFamily: typography.fonts.bodySemibold,
    fontSize: 12.5,
    color: colors.textDim,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  // PR-V2-3.1: person chip — same chip tokens + 18px mini gradient avatar
  personChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: space.l - 2,
    paddingVertical: space.s - 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    maxWidth: 220,
  },
  personChipUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
  },
  personChipSelected: {
    backgroundColor: colors.lavender,
    borderColor: colors.lavender,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  personAvatar: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  personAvatarText: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 10,
    color: "#050509",
  },
  personName: {
    ...typography.body.bodySemibold,
    color: colors.textSecondary,
    fontSize: 13,
    flexShrink: 1,
  },
  personNameSelected: {
    ...typography.body.bodyBold,
    color: "#050509",
    fontSize: 13,
  },
  // Compact dashed upload row
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
  uploadPressed: {
    borderColor: colors.lavender,
    backgroundColor: colors.violetTint,
  },
  uploadIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.violetTint,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    ...typography.body.bodySemibold,
    fontSize: 14.5,
    color: colors.text,
  },
  uploadHint: {
    ...typography.body.caption,
    fontSize: 12.5,
    color: colors.textFaint,
    marginTop: 3,
  },
  preview: {
    position: "relative",
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.bg,
  },
  previewImg: { width: "100%", height: 200 },
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
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: space.s,
  },
  backTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.text,
  },
  // --- results (interim until PR-V2-3) ---
  replyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: space.l + 2,
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
    fontFamily: typography.fonts.displayMedium,
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
    backgroundColor: colors.ctaBg,
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
  // --- ReadCard ---
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
    color: colors.lavenderText,
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
    color: colors.lavenderText,
    fontSize: 12,
  },
  readSituation: {
    fontFamily: typography.fonts.displayMedium,
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
    color: colors.textSoft,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
