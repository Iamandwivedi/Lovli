// Reply tab — V3 glass flow as a phase machine:
//   home → intent → generating → results
// home:      "Kya scene hai?" + feeling check-in + compact upload/paste + ✦ Get replies
// intent:    "Got it. I read the chat." + chat preview + WHAT DO YOU WANT? / HOW SHOULD IT LAND?
// generating: staged 5-step loader timed to the real request
// results:   insight + reply cards
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
  TextInput,
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
import { PersonChip } from "@/src/components/PersonChip";
import { ChatPreview } from "@/src/components/reply/ChatPreview";
import { StagedLoader, GENERATION_STAGES } from "@/src/components/reply/StagedLoader";
import { parseChatText } from "@/src/utils/chatParse";
import { storage } from "@/src/utils/storage";
import { GOAL_KEY, PREFS_KEY } from "@/src/config/storage-keys";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { Sparkle } from "@/src/components/Sparkle";
import { flags } from "@/src/config/flags";
import { trackEvent } from "@/src/lib/memory-events";
import {
  Language,
  MemoryCard,
  PlatformLabel,
  Replies,
  ReplyInsight,
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
  { label: "Excited", color: colors.amber },
  { label: "Confused", color: colors.sky },
  { label: "Overthinking", color: colors.lavenderText },
  { label: "Falling for someone", color: colors.pink },
  { label: "Healing", color: colors.green },
  { label: "Just curious", color: colors.textFaint },
] as const;
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
// PR-V2-3: "OR MAKE IT…" tone chips — regenerate with a tone hint.
const TONES = ["Funny", "Romantic", "Confident", "Shorter", "Longer"];
// PR-M6: quick feedback chips — each one teaches the memory engine.
const FEEDBACK_CHIPS = ["Not my style", "Too much", "Too formal", "Cringe"];

export default function ReplyScreen() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>("home");
  const [image, setImage] = useState<Pick | null>(null);
  const [manual, setManual] = useState("");
  const [feeling, setFeeling] = useState<string | null>(null);
  const [intent, setIntent] = useState<string>("Reply");
  const [outcome, setOutcome] = useState<string | null>(null);
  // PR-V2-3: onboarding goal (lovli_goal) rides along with every generation.
  const [goalPref, setGoalPref] = useState<string>("");

  useEffect(() => {
    storage
      .getItem<string>(GOAL_KEY, "")
      .then((g) => setGoalPref(typeof g === "string" ? g : ""))
      .catch(() => {});
  }, []);
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
  const [vibe, setVibe] = useState<Vibe>("Playful");

  const refreshContext = useCallback(async () => {
    try {
      const raw = await storage.getItem<string>(PREFS_KEY, "");
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.default_vibe) setVibe(p.default_vibe as Vibe);
      }
    } catch {
      // keep default
    }
    try {
      const u = await getUsage(getClientLocalDate());
      setUsage(u);
    } catch {
      // silent
    }
    try {
      const cards = await listMemoryCards();
      setMemoryCards(cards || []);
      // Final PR: drop a stale selection if that person was deleted.
      setMemoryId((cur) => (cur && !(cards || []).some((c) => c.id === cur) ? null : cur));
    } catch {
      setMemoryCards([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshContext();
    }, [refreshContext]),
  );

  // Bug fix (PR-V2-3.1): on cold boot the focus effect can fire before the auth
  // token is restored → memory-cards fetch 401s and the person row stayed hidden.
  // Refetch once the user is actually loaded.
  useEffect(() => {
    if (user?.id) refreshContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
    // Per-generation language override starts from the default each time.
    // (Person selection is made on Home and carries through — reset on results→home.)
    setLanguage(defaultLanguage);
    setPhase("intent");
  };

  const startGeneration = async (toneHint?: string) => {
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
          // PR-V2-3: emotional/intent context, folded into the prompt.
          feeling,
          intent,
          outcome,
          goal: goalPref,
          // "OR MAKE IT…" chips regenerate with a tone hint.
          user_note: toneHint
            ? `Tone adjustment: make the reply ${toneHint.toLowerCase()}.`
            : undefined,
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
        // PR-M2: the richer event first so the reducer's (generation_id, index)
        // dedupe keeps the payload that carries label + text.
        trackEvent(
          "reply_copied",
          {
            generation_id: result.generation_id,
            index,
            text,
            label: (result.reply_labels?.[index] || "").trim(),
            surface: "reply",
          },
          memoryId,
        );
        postFeedback(result.generation_id, index).catch(() => {});
      }
    } catch {
      toast.error("Could not copy.");
    }
  };

  // PR-M2: user edits to AI output are the highest-value style signal.
  const onEditCommitted = (original: string, edited: string) => {
    if (!result?.generation_id || original === edited) return;
    trackEvent(
      "reply_edited",
      {
        generation_id: result.generation_id,
        variant_index: 0,
        generated_text: original,
        edited_text: edited,
        surface: "reply",
      },
      memoryId,
    );
  };

  const trackRejected = (reason: string) => {
    if (!result?.generation_id) return;
    trackEvent(
      "reply_rejected",
      {
        generation_id: result.generation_id,
        index: 0,
        label: (result.reply_labels?.[0] || "").trim(),
        reason,
        surface: "reply",
      },
      memoryId,
    );
  };

  const onToneChip = (tone: string) => {
    trackEvent(
      "tone_selected",
      { tone, generation_id: result?.generation_id, surface: "reply" },
      memoryId,
    );
    startGeneration(tone);
  };

  const onFeedbackChip = (chip: string) => {
    if (!result?.generation_id) return;
    trackEvent(
      "feedback_chip",
      {
        chip,
        generation_id: result.generation_id,
        index: 0,
        label: (result.reply_labels?.[0] || "").trim(),
        surface: "reply",
      },
      memoryId,
    );
    toast.success("Got it — Lovli will adjust.");
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
          memoryCards={memoryCards}
          memoryId={memoryId}
          onToggleMemory={(id) => setMemoryId((cur) => (cur === id ? null : id))}
          onChangeManual={setManual}
          onToggleFeeling={(f) => setFeeling((cur) => (cur === f ? null : f))}
          onSkipFeeling={() => setFeeling(null)}
          onPickImage={pickImage}
          onRemoveImage={() => setImage(null)}
          onContinue={goToIntent}
          creditsText={usage.plan === "pro" ? "Pro" : `${remaining} free left`}
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
          </ScrollView>

          <PrimaryButton
            label="Write it for me"
            onPress={() => startGeneration()}
            testID="write-it-button"
          />
        </>
      ) : null}

      {phase === "generating" ? <StagedLoader activeIndex={stage} /> : null}

      {phase === "results" && result ? (
        <>
          <BackHeader
            title="Three ways to say it"
            onBack={() => {
              // New flow starts fresh: person selection resets to "No one".
              setMemoryId(null);
              setPhase("home");
            }}
          />
          <View testID="reply-results-block" style={{ gap: space.l }}>
            {(() => {
              const insight = safeInsight(result.insight);
              if (insight) {
                // PR-V2-3 "Generated" surface.
                return (
                  <>
                    <InsightCard insight={insight} />
                    {flags.MEMORY_UI_ENABLED && result.memory_used?.is_personalized ? (
                      <SoundsLikeYouPill signals={result.memory_used.signals} />
                    ) : null}
                    <PrimaryReplyCard
                      key={result.generation_id}
                      text={result.replies[0] ?? ""}
                      toneLabel={(result.reply_labels?.[0] || "Smooth").trim()}
                      onCopy={(t) => onCopy(t, 0)}
                      onEditCommitted={onEditCommitted}
                      onRegenerate={() => {
                        trackRejected("regenerated");
                        startGeneration();
                      }}
                    />
                    {result.replies.slice(1, 3).map((reply, offset) => (
                      <ReplyResultCard
                        key={`${result.generation_id}-alt-${offset + 1}`}
                        text={reply}
                        toneLabel={(result.reply_labels?.[offset + 1] || "Smooth").trim()}
                        index={offset + 1}
                        onCopy={() => onCopy(reply, offset + 1)}
                        onRegenerate={() => startGeneration()}
                      />
                    ))}
                    {flags.MEMORY_UI_ENABLED ? (
                      <FeedbackChipsRow
                        key={`fb-${result.generation_id}`}
                        onChip={onFeedbackChip}
                      />
                    ) : null}
                    <View>
                      <Text style={styles.sectionLabel}>OR MAKE IT…</Text>
                      <View style={styles.chipsRow}>
                        {TONES.map((t) => (
                          <Chip
                            key={t}
                            label={t}
                            selected={false}
                            onPress={() => onToneChip(t)}
                            testID={`tone-${t}`}
                          />
                        ))}
                      </View>
                    </View>
                  </>
                );
              }
              // Fallback: insight missing → pre-V2-3 behavior.
              const read = safeRead(result.read);
              return (
                <>
                  {read ? <ReadCard read={read} /> : null}
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
                        onRegenerate={() => startGeneration()}
                      />
                    );
                  })}
                </>
              );
            })()}
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
  memoryCards: MemoryCard[];
  memoryId: string | null;
  onToggleMemory: (id: string) => void;
  onChangeManual: (v: string) => void;
  onToggleFeeling: (f: string) => void;
  onSkipFeeling: () => void;
  onPickImage: () => void;
  onRemoveImage: () => void;
  onContinue: () => void;
  creditsText: string;
}> = ({
  image,
  manual,
  feeling,
  memoryCards,
  memoryId,
  onToggleMemory,
  onChangeManual,
  onToggleFeeling,
  onSkipFeeling,
  onPickImage,
  onRemoveImage,
  onContinue,
  creditsText,
}) => (
  <>
    <AppHeader credits={{ text: creditsText, tone: creditsText === "Pro" ? "pro" : "default" }} />

    <View style={{ marginTop: space.s }}>
      <Text style={styles.h1} testID="reply-heading">
        Kya scene hai?
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
          <FeelingChip
            key={f.label}
            label={f.label}
            color={f.color}
            selected={feeling === f.label}
            onPress={() => onToggleFeeling(f.label)}
            testID={`feeling-${f.label}`}
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

    {/* PR-V2-3.1: optional person picker — hidden entirely when no memory cards.
        Never blocks Get replies; "No one" sends no memory_card_id. */}
    {memoryCards.length > 0 ? (
      <View testID="person-section">
        <Text style={styles.sectionLabel}>{"WHO'S THIS ABOUT?"}</Text>
        <View style={styles.chipsRow}>
          <Chip
            label="No one"
            selected={memoryId === null}
            onPress={() => memoryId !== null && onToggleMemory(memoryId)}
            testID="person-none"
          />
          {memoryCards.map((c) => (
            <PersonChip
              key={c.id}
              name={c.nickname}
              selected={memoryId === c.id}
              onPress={() => onToggleMemory(c.id)}
              testID={`person-${c.id}`}
            />
          ))}
        </View>
      </View>
    ) : null}

    <View style={{ marginTop: space.s }}>
      <PrimaryButton label="Get replies" onPress={onContinue} testID="generate-replies-button" />
    </View>
  </>
);

const FeelingChip: React.FC<{
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}> = ({ label, color, selected, onPress, testID }) => (
  <Pressable
    onPress={onPress}
    testID={testID}
    style={({ pressed }) => [
      styles.feelingChip,
      selected && styles.feelingChipSelected,
      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
    ]}
  >
    <View style={[styles.feelingDot, { backgroundColor: color }]} />
    <Text style={[styles.feelingText, selected && styles.feelingTextSelected]}>
      {label}
    </Text>
  </Pressable>
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

// --- PR-V2-3 "Generated" surface -------------------------------------------

function safeInsight(value: ReplyInsight | null | undefined): ReplyInsight | null {
  const v = value as ReplyInsight | null | undefined;
  if (!v || typeof v !== "object") return null;
  if (v.temperature !== "warm" && v.temperature !== "mixed" && v.temperature !== "cold") {
    return null;
  }
  if (typeof v.whats_going_on !== "string" || !v.whats_going_on.trim()) return null;
  if (typeof v.wingman_advice !== "string" || !v.wingman_advice.trim()) return null;
  const noticing = Array.isArray(v.noticing)
    ? v.noticing.filter((s) => typeof s === "string" && s.trim()).slice(0, 3)
    : [];
  return { ...v, noticing };
}

// Spec: dot-pills, not emoji. Warm = amber #FFB259.
const INSIGHT_TEMP: Record<ReplyInsight["temperature"], { label: string; color: string }> = {
  warm: { label: "Leaning interested", color: colors.amber },
  mixed: { label: "Mixed signals", color: colors.lavenderText },
  cold: { label: "Not into it", color: colors.sky },
};

const InsightCard: React.FC<{ insight: ReplyInsight }> = ({ insight }) => {
  const temp = INSIGHT_TEMP[insight.temperature];
  return (
    <GlassCard padded variant="elevated" testID="insight-card">
      <View style={styles.insightHeader}>
        <Text style={styles.readEyebrow}>{"WHAT'S GOING ON"}</Text>
        <View style={[styles.tempPill, { backgroundColor: `${temp.color}1F`, borderColor: `${temp.color}55` }]} testID="insight-temp-pill">
          <View style={[styles.tempDot, { backgroundColor: temp.color }]} />
          <Text style={[styles.tempPillText, { color: temp.color }]}>{temp.label}</Text>
        </View>
      </View>
      {insight.noticing.map((n, i) => (
        <View key={i} style={styles.noticeRow}>
          <Sparkle size={12} color={colors.lavender} />
          <Text style={styles.noticeText}>{n}</Text>
        </View>
      ))}
      <Text style={styles.insightLine}>
        <Text style={styles.insightLabel}>{"What's really going on: "}</Text>
        {insight.whats_going_on}
      </Text>
      <Text style={styles.insightLine}>
        <Text style={styles.insightLabel}>{"If I were your wingman: "}</Text>
        {insight.wingman_advice}
      </Text>
    </GlassCard>
  );
};

const PrimaryReplyCard: React.FC<{
  text: string;
  toneLabel: string;
  onCopy: (text: string) => void;
  onEditCommitted?: (original: string, edited: string) => void;
  onRegenerate: () => void;
}> = ({ text, toneLabel, onCopy, onEditCommitted, onRegenerate }) => {
  const [value, setValue] = useState(text);
  const [editing, setEditing] = useState(false);
  // PR-M2: commit an edit at most once per distinct edited value.
  const lastCommitted = useRef(text);

  const commitEdit = () => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      onEditCommitted?.(text, value);
    }
  };

  return (
    <View>
      <View style={styles.primaryCard} testID="primary-reply-card">
        <View style={styles.toneRow}>
          <View style={[styles.toneDot, { backgroundColor: colors.pink }]} />
          <Text style={[styles.toneLabel, { color: colors.pink }]} testID="primary-tone-label">
            {toneLabel || "Smooth"}
          </Text>
        </View>
        {editing ? (
          <TextInput
            value={value}
            onChangeText={setValue}
            multiline
            autoFocus
            style={[styles.primaryText, styles.primaryInput]}
            testID="primary-reply-edit-input"
          />
        ) : (
          <Text style={styles.primaryText} testID="primary-reply-text">
            {value}
          </Text>
        )}
        <View style={styles.primaryActions}>
          <Pressable
            style={styles.primaryAction}
            onPress={() => {
              commitEdit();
              onCopy(value);
            }}
            hitSlop={6}
            testID="primary-copy"
          >
            <Ionicons name="copy-outline" size={15} color={colors.lavenderText} />
            <Text style={styles.primaryActionText}>Copy</Text>
          </Pressable>
          <Pressable
            style={styles.primaryAction}
            onPress={() =>
              setEditing((e) => {
                if (e) commitEdit(); // "Done" pressed — the edit is final.
                return !e;
              })
            }
            hitSlop={6}
            testID="primary-edit"
          >
            <Ionicons name={editing ? "checkmark" : "pencil-outline"} size={15} color={colors.lavenderText} />
            <Text style={styles.primaryActionText}>{editing ? "Done" : "Edit"}</Text>
          </Pressable>
          <Pressable style={styles.primaryAction} onPress={onRegenerate} hitSlop={6} testID="primary-regenerate">
            <Ionicons name="refresh-outline" size={15} color={colors.lavenderText} />
            <Text style={styles.primaryActionText}>Regenerate</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

// PR-M6: "Sounds like you" pill — tap to see the honest signals behind it.
const SoundsLikeYouPill: React.FC<{ signals: string[] }> = ({ signals }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <View testID="sounds-like-you">
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={({ pressed }) => [styles.memoryPill, pressed && { opacity: 0.85 }]}
        hitSlop={6}
        testID="sounds-like-you-pill"
      >
        <Sparkle size={11} color={colors.lavender} />
        <Text style={styles.memoryPillText}>Sounds like you</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={12} color={colors.lavenderText} />
      </Pressable>
      {expanded && signals.length > 0 ? (
        <Text style={styles.memoryPillDetail} testID="sounds-like-you-signals">
          Tuned to: {signals.join(" · ")}
        </Text>
      ) : null}
    </View>
  );
};

// PR-M6: one-tap style feedback — teaches the engine, thanks the user, done.
const FeedbackChipsRow: React.FC<{ onChip: (chip: string) => void }> = ({ onChip }) => {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <View testID="feedback-chips">
      <Text style={styles.sectionLabel}>NOT QUITE RIGHT?</Text>
      <View style={styles.chipsRow}>
        {FEEDBACK_CHIPS.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={picked === c}
            onPress={() => {
              if (picked) return; // one signal per generation is plenty
              setPicked(c);
              onChip(c);
            }}
            testID={`feedback-chip-${c}`}
          />
        ))}
      </View>
    </View>
  );
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
    fontFamily: typography.fonts.displayBold,
    fontSize: 33,
    lineHeight: 37,
    letterSpacing: 0,
    color: colors.text,
  },
  sub: {
    ...typography.body.base,
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 8,
    maxWidth: 290,
  },
  // Recurring V3 section label.
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
    fontSize: 12,
    color: colors.textDim,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feelingChip: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: colors.surfaceSoft,
  },
  feelingChipSelected: {
    backgroundColor: "rgba(167,139,250,0.11)",
    borderColor: "rgba(167,139,250,0.36)",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  feelingDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  feelingText: {
    fontFamily: typography.fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  feelingTextSelected: {
    fontFamily: typography.fonts.bodyBold,
    color: colors.lavenderText,
  },
  // Compact dashed upload row
  upload: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
    borderWidth: 1.5,
    borderColor: "rgba(167,139,250,0.4)",
    borderStyle: "dashed",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: colors.surfaceSoft,
  },
  uploadPressed: {
    borderColor: colors.lavender,
    backgroundColor: colors.violetTint,
  },
  uploadIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
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
    fontFamily: typography.fonts.displayBold,
    fontSize: 20,
    letterSpacing: 0,
    color: colors.text,
  },
  // --- results (interim until PR-V2-3) ---
  replyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: 24,
    padding: space.l + 2,
  },
  toneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toneDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.pink,
    shadowColor: colors.pink,
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
    fontFamily: typography.fonts.displaySemibold,
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
  // --- PR-V2-3 "Generated" surface ---
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  tempPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tempDot: { width: 7, height: 7, borderRadius: 4 },
  tempPillText: {
    ...typography.body.bodySemibold,
    fontSize: 11.5,
    letterSpacing: 0.4,
  },
  noticeRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 3 },
  noticeText: { ...typography.body.base, fontSize: 13.5, lineHeight: 19, color: colors.textSoft, flex: 1 },
  insightLine: {
    ...typography.body.base,
    fontSize: 13.5,
    lineHeight: 19.5,
    color: colors.textMuted,
    marginTop: 8,
  },
  insightLabel: { ...typography.body.bodySemibold, color: colors.text },
  primaryCard: {
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 44,
    elevation: 8,
  },
  primaryText: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0,
    color: colors.text,
    marginTop: 12,
  },
  primaryInput: { padding: 0, minHeight: 48, textAlignVertical: "top" },
  primaryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    marginTop: 16,
  },
  primaryAction: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  primaryActionText: { ...typography.body.bodySemibold, fontSize: 13, color: colors.lavenderText },
  // PR-M6: "Sounds like you" personalization pill
  memoryPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: colors.violetTint,
    borderWidth: 1,
    borderColor: colors.violetTintBorder,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  memoryPillText: {
    ...typography.body.bodySemibold,
    fontSize: 12,
    color: colors.lavenderText,
  },
  memoryPillDetail: {
    ...typography.body.base,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 6,
  },
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
