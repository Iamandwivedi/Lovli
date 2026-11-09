// Reply tab — V3 glass flow as a phase machine:
//   home → intent → generating → results
// home:       "Hey Aman / What's going on?" greeting + subline, a flexible
//             spacer, then the utility zone pinned low: PersonCard (sample
//             chat / who are we texting / selected person), the Composer
//             (text field, paste + screenshot buttons, send) and the centred
//             "Private" line. No scroll on an iPhone 16 class screen.
// intent:     "Got it. I read the chat." + chat preview + HOW ARE YOU FEELING? /
//             ANYTHING LOVLI SHOULD KNOW? / WHAT DO YOU WANT? / HOW SHOULD IT
//             LAND? / REPLY LANGUAGE (last intent per person recalled)
// generating: four truthful stages timed to the real request (StagedLoader)
// results:    the read FIRST, then three labelled cards (middle emphasised),
//             "Noted" fact proposal, Ask / Save / Report actions, tone chips.
// Research doc: "Lovli UI/UX Research — What to Build", §5, §7, §11, §12.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { AppHeader } from "@/src/components/AppHeader";
import { GlassCard } from "@/src/components/GlassCard";
import { Chip } from "@/src/components/Chip";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { PrivacySheet } from "@/src/components/PrivacySheet";
import { Bullet } from "@/src/components/Bullet";
import { ChatPreview } from "@/src/components/reply/ChatPreview";
import { Composer } from "@/src/components/reply/Composer";
import { Greeting } from "@/src/components/reply/Greeting";
import { InsightCard } from "@/src/components/reply/InsightCard";
import { NotedCard } from "@/src/components/reply/NotedCard";
import { PersonCard } from "@/src/components/reply/PersonCard";
import { ReplyCard, REPLY_LABEL_FALLBACK } from "@/src/components/reply/ReplyCard";
import { ResultActions } from "@/src/components/reply/ResultActions";
import { SituationSection, buildUserNote } from "@/src/components/reply/SituationChips";
import { StagedLoader, STAGE_MS, buildGenerationStages } from "@/src/components/reply/StagedLoader";
import { parseChatText } from "@/src/utils/chatParse";
import { storage } from "@/src/utils/storage";
import { ASK_PENDING_KEY, GOAL_KEY, LAST_INTENT_KEY, PREFS_KEY } from "@/src/config/storage-keys";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { haptic } from "@/src/lib/haptics";
import { compressForUpload } from "@/src/lib/image-compress";
import { trackEvent } from "@/src/lib/memory-events";
import {
  Language,
  MemoryCard,
  MemoryFact,
  PlatformLabel,
  Replies,
  ReplyRead,
  Vibe,
  generateReplies,
  getUsage,
  getClientLocalDate,
  listMemoryCards,
  patchMemoryCard,
  platformLabelToValue,
  platformValueToLabel,
  postFeedback,
} from "@/src/api/endpoints";
import { extractErrorMessage } from "@/src/api/client";
import { colors, radii, space, typography } from "@/src/theme";

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
// "OR MAKE IT…" tone chips — regenerate with a tone hint.
const TONES = ["Funny", "Romantic", "Confident", "Shorter", "Longer"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const niceToday = () =>
  new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function ReplyScreen() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("home");
  const [image, setImage] = useState<Pick | null>(null);
  const [manual, setManual] = useState("");
  const [feeling, setFeeling] = useState<string | null>(null);
  const [situation, setSituation] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [intent, setIntent] = useState<string>("Reply");
  const [intentRecalled, setIntentRecalled] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [goalPref, setGoalPref] = useState<string>("");
  // Research §11, as Aman wants it: no sheet before the first upload — a quiet
  // "Private" line under the input instead, with the full sheet one tap away.
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    storage
      .getItem<string>(GOAL_KEY, "")
      .then((g) => setGoalPref(typeof g === "string" ? g : ""))
      .catch(() => {});
  }, []);

  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Replies | null>(null);
  const [lastCopied, setLastCopied] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(
    (user?.language_preference as Language) || "Hinglish",
  );
  const [memoryId, setMemoryId] = useState<string | null>(null);
  // "Skip" on the person card: nobody selected on purpose. Resets with memoryId.
  const [personSkipped, setPersonSkipped] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [usage, setUsage] = useState({
    daily_generation_count: user?.daily_generation_count ?? 0,
    daily_limit: user?.daily_limit ?? 8,
    plan: user?.plan ?? "free",
  });

  const defaultLanguage: Language = (user?.language_preference as Language) || "Hinglish";
  const platform: PlatformLabel = platformValueToLabel(user?.preferred_platform || "instagram");
  const [vibe, setVibe] = useState<Vibe>("Playful");

  const person = useMemo(
    () => (memoryId ? memoryCards.find((c) => c.id === memoryId) || null : null),
    [memoryId, memoryCards],
  );

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

  useEffect(() => {
    if (user?.id) refreshContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Staged loader: advance every STAGE_MS, hold on the last stage until the
  // real request resolves.
  const stages = useMemo(() => buildGenerationStages(person?.nickname), [person?.nickname]);
  useEffect(() => {
    if (phase !== "generating") return;
    setStage(0);
    const id = setInterval(() => {
      setStage((s) => Math.min(s + 1, stages.length - 1));
    }, STAGE_MS);
    return () => clearInterval(id);
  }, [phase, stages.length]);

  const remaining = useMemo(() => {
    if (usage.plan === "pro") return Infinity;
    return Math.max(0, (usage.daily_limit ?? 8) - (usage.daily_generation_count ?? 0));
  }, [usage]);

  const parsedMessages = useMemo(
    () => (manual.trim() ? parseChatText(manual) : []),
    [manual],
  );

  const acceptAsset = (asset: Pick) => {
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      toast.error("This image is too large.");
      return;
    }
    setImage(asset);
  };

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
        acceptAsset(res.assets[0]);
      } catch {
        toast.error("Could not open your photos.");
      }
  };

  // Explicit paste on tap only — the clipboard is never auto-read.
  const pasteFromClipboard = async () => {
    try {
      const text = (await Clipboard.getStringAsync()).trim();
      if (!text) {
        toast.error("Nothing to paste yet. Copy their message first.");
        return;
      }
      haptic.success();
      setManual((cur) => (cur.trim() ? `${cur.trim()}\n${text}` : text));
    } catch {
      toast.error("Could not read the clipboard.");
    }
  };

  const goToIntent = async () => {
    // The send button is disabled without a screenshot or text; this is only a guard.
    if (!image && !manual.trim()) return;
    if (usage.plan !== "pro" && remaining <= 0) {
      haptic.warning();
      router.push("/paywall");
      return;
    }
    setLanguage(defaultLanguage);
    // Research §5: remember the last-used intent per person and pre-select it.
    try {
      const raw = await storage.getItem<string>(LAST_INTENT_KEY, "");
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      const last = map[memoryId || "none"];
      if (last && INTENTS.includes(last)) {
        setIntent(last);
        setIntentRecalled(true);
      } else {
        setIntent("Reply");
        setIntentRecalled(false);
      }
    } catch {
      setIntentRecalled(false);
    }
    setPhase("intent");
  };

  const rememberIntent = async () => {
    try {
      const raw = await storage.getItem<string>(LAST_INTENT_KEY, "");
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      map[memoryId || "none"] = intent;
      await storage.setItem(LAST_INTENT_KEY, JSON.stringify(map));
    } catch {
      // best-effort
    }
  };

  const startGeneration = async (toneHint?: string) => {
    setPhase("generating");
    setResult(null);
    setLastCopied(null);
    rememberIntent();
    // Four stages × STAGE_MS: the labels are readable even on a fast response,
    // and never pad beyond real latency by more than one stage.
    const minWait = new Promise((r) => setTimeout(r, STAGE_MS * stages.length));
    try {
      const [data] = await Promise.all([
        (async () => {
          const upload = image ? await compressForUpload(image) : null;
          return generateReplies({
            platform: platformLabelToValue(platform),
            vibe,
            language,
            manual_text: manual,
            memory_card_id: memoryId,
            rich: true,
            feeling,
            intent,
            outcome,
            goal: goalPref,
            user_note: buildUserNote(situation, note, toneHint),
            image: upload,
          });
        })(),
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
      setLastCopied(text);
      if (result?.generation_id) {
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

  // User edits to AI output are the highest-value style signal.
  const onEditCommitted = (index: number) => (original: string, edited: string) => {
    if (!result?.generation_id || original === edited) return;
    trackEvent(
      "reply_edited",
      {
        generation_id: result.generation_id,
        variant_index: index,
        generated_text: original,
        edited_text: edited,
        surface: "reply",
      },
      memoryId,
    );
  };

  const onMoreLikeThis = (index: number, label: string, text: string) => {
    trackEvent(
      "tone_selected",
      { tone: `more like ${label}`, index, generation_id: result?.generation_id, surface: "reply" },
      memoryId,
    );
    startGeneration(`closer to the ${label.toLowerCase()} option: "${text}"`);
  };

  const onToneChip = (tone: string) => {
    trackEvent(
      "tone_selected",
      { tone, generation_id: result?.generation_id, surface: "reply" },
      memoryId,
    );
    startGeneration(tone);
  };

  const onReportBadRead = (reason: string) => {
    if (!result?.generation_id) return;
    trackEvent(
      "feedback_chip",
      { chip: reason, generation_id: result.generation_id, index: 0, surface: "reply", target: "read" },
      memoryId,
    );
  };

  const onAskLovli = async () => {
    if (!result) return;
    const insight = safeInsight(result.insight);
    const lead = insight ? `${insight.whats_going_on} ` : "";
    const text =
      `Lovli, about this chat. ${lead}You suggested: "${result.replies[0] || ""}". ` +
      "What should I keep in mind before I send?";
    await storage.setItem(ASK_PENDING_KEY, JSON.stringify({ text, personId: memoryId }));
    router.push("/(tabs)/ask-lovli");
  };

  const onSaveToMemory = async () => {
    if (!person || !lastCopied) return;
    try {
      const updated = await patchMemoryCard(person.id, {
        timeline: [
          ...(person.timeline || []),
          {
            title: "You sent a reply",
            date_label: niceToday(),
            date: getClientLocalDate(),
            detail: lastCopied,
            upcoming: false,
          },
        ],
      });
      setMemoryCards((cur) => cur.map((c) => (c.id === updated.id ? updated : c)));
      haptic.success();
      toast.success(`Saved to ${person.nickname}'s story.`);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save that."));
    }
  };

  const onKeepFact = async (fact: MemoryFact) => {
    if (!person) return;
    try {
      const updated = await patchMemoryCard(person.id, {
        facts: [...(person.facts || []), fact],
      });
      setMemoryCards((cur) => cur.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save that."));
      throw err;
    }
  };

  const resetFlow = () => {
    setMemoryId(null);
    setPersonSkipped(false);
    setSituation(null);
    setNote("");
    setIntentRecalled(false);
    setPhase("home");
  };

  const outOfCredits = usage.plan !== "pro" && remaining <= 0;
  const creditsText =
    usage.plan === "pro" ? "Pro" : remaining <= 0 ? "Back tomorrow, or go Pro" : `${remaining} left today`;
  const firstName = (user?.name || "").trim().split(/\s+/)[0] || null;
  const subline = outOfCredits
    ? `You've used today's ${usage.daily_limit} reads. Back at midnight, or go Pro now.`
    : memoryCards.length === 0
      ? "Paste a chat or try a sample. I'll read it with you."
      : "Paste their last text. I'll read it with you.";

  return (
    <Screen testID="reply-page" bottomTabSpacing scroll={phase === "results"}>
      {phase === "home" ? (
        <HomePhase
          image={image}
          manual={manual}
          memoryCards={memoryCards}
          person={person}
          personSkipped={personSkipped}
          firstName={firstName}
          subline={subline}
          sublineColor={outOfCredits ? colors.amber : undefined}
          onSelectPerson={(id) => {
            setMemoryId(id);
            setPersonSkipped(false);
          }}
          onSkipPerson={() => {
            setMemoryId(null);
            setPersonSkipped(true);
          }}
          onOpenPicker={() => setPickerOpen(true)}
          onChangeManual={setManual}
          onPickImage={pickImage}
          onPaste={pasteFromClipboard}
          onOpenPrivacy={() => setPrivacyOpen(true)}
          onRemoveImage={() => setImage(null)}
          onTrySample={() => router.push("/sample")}
          onContinue={goToIntent}
          creditsText={creditsText}
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

            {/* Emotional check-in: optional, single-select toggle */}
            <View testID="feeling-section">
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>HOW ARE YOU FEELING?</Text>
                <Pressable
                  onPress={() => setFeeling(null)}
                  hitSlop={10}
                  testID="feeling-skip"
                  accessibilityRole="button"
                >
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
              </View>
              <View style={styles.chipsRow}>
                {FEELINGS.map((f) => (
                  <Chip
                    key={f.label}
                    label={f.label}
                    selected={feeling === f.label}
                    onPress={() => setFeeling((cur) => (cur === f.label ? null : f.label))}
                    leading={<View style={[styles.feelingDot, { backgroundColor: f.color }]} />}
                    testID={`feeling-${f.label}`}
                  />
                ))}
              </View>
            </View>

            <SituationSection situation={situation} onSituation={setSituation} note={note} onNote={setNote} />

            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>WHAT DO YOU WANT?</Text>
                {intentRecalled ? (
                  <Text style={styles.sectionCaption} testID="intent-recalled">
                    same as last time
                  </Text>
                ) : null}
              </View>
              <View style={styles.chipsRow}>
                {INTENTS.map((it) => (
                  <Chip
                    key={it}
                    label={it}
                    selected={intent === it}
                    onPress={() => {
                      setIntent(it);
                      setIntentRecalled(false);
                    }}
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

      {phase === "generating" ? <StagedLoader activeIndex={stage} stages={stages} /> : null}

      {phase === "results" && result ? (
        <>
          <BackHeader title="Three ways to say it" onBack={resetFlow} />
          <View testID="reply-results-block" style={{ gap: space.l }}>
            {(() => {
              const insight = safeInsight(result.insight);
              const labels = result.replies.map((_, i) =>
                (result.reply_labels?.[i] || "").trim() || REPLY_LABEL_FALLBACK[Math.min(i, 2)],
              );
              const styleSignals = result.memory_used?.is_personalized
                ? result.memory_used.signals
                : null;
              const suggestions = (result.suggested_facts || []).filter(
                (f) => f && typeof f.text === "string" && f.text.trim(),
              );
              const read = insight ? null : safeRead(result.read);
              return (
                <>
                  {insight ? <InsightCard insight={insight} /> : read ? <ReadCard read={read} /> : null}
                  {person ? (
                    <RememberedChip person={person} onEdit={() => router.push(`/memory/${person.id}`)} />
                  ) : null}
                  {result.replies.slice(0, 3).map((reply, i) => (
                    <ReplyCard
                      key={`${result.generation_id}-${i}`}
                      text={reply}
                      label={labels[i]}
                      index={i}
                      emphasized={i === 1}
                      styleSignals={styleSignals}
                      onCopy={(t) => onCopy(t, i)}
                      onEditCommitted={onEditCommitted(i)}
                      onMoreLikeThis={() => onMoreLikeThis(i, labels[i], reply)}
                    />
                  ))}
                  {person && suggestions.length > 0 ? (
                    <NotedCard
                      key={`noted-${result.generation_id}`}
                      personName={person.nickname}
                      suggestions={suggestions}
                      onKeep={onKeepFact}
                    />
                  ) : null}
                  <ResultActions
                    key={`actions-${result.generation_id}`}
                    personName={person?.nickname}
                    canSave={!!lastCopied}
                    onAskLovli={onAskLovli}
                    onSave={onSaveToMemory}
                    onReport={onReportBadRead}
                  />
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
            })()}
          </View>
        </>
      ) : null}

      <PrivacySheet visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </Screen>
  );
}

// --- Home phase ---
// Greeting at the top, a flexible spacer, then the utility zone (person card,
// composer, privacy line) pinned toward the bottom. The ScrollView's content
// grows to fill the viewport so nothing scrolls on an iPhone 16 class screen;
// on a smaller phone or with large Dynamic Type it scrolls instead of clipping.
const HomePhase: React.FC<{
  image: Pick | null;
  manual: string;
  memoryCards: MemoryCard[];
  person: MemoryCard | null;
  personSkipped: boolean;
  firstName: string | null;
  subline: string;
  sublineColor?: string;
  onSelectPerson: (id: string) => void;
  onSkipPerson: () => void;
  onOpenPicker: () => void;
  onChangeManual: (v: string) => void;
  onPickImage: () => void;
  onPaste: () => void;
  onOpenPrivacy: () => void;
  onRemoveImage: () => void;
  onTrySample: () => void;
  onContinue: () => void;
  creditsText: string;
}> = ({
  image,
  manual,
  memoryCards,
  person,
  personSkipped,
  firstName,
  subline,
  sublineColor,
  onSelectPerson,
  onSkipPerson,
  onOpenPicker,
  onChangeManual,
  onPickImage,
  onPaste,
  onOpenPrivacy,
  onRemoveImage,
  onTrySample,
  onContinue,
  creditsText,
}) => (
  <>
    <AppHeader credits={{ text: creditsText, tone: creditsText === "Pro" ? "pro" : "default" }} />

    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.homeContent}
      keyboardShouldPersistTaps="handled"
      alwaysBounceVertical={false}
      showsVerticalScrollIndicator={false}
      testID="home-phase"
    >
      <View style={{ marginTop: space.s }}>
        <Greeting firstName={firstName} subline={subline} sublineColor={sublineColor} />
      </View>

      {/* Flexible spacer: pins the utility zone low, collapses when space is short */}
      <View style={styles.homeSpacer} />

      <View style={styles.utilityZone}>
        <PersonCard
          cards={memoryCards}
          person={person}
          skipped={personSkipped}
          onSelect={onSelectPerson}
          onSkip={onSkipPerson}
          onOpenPicker={onOpenPicker}
          onTrySample={onTrySample}
        />

        <Composer
          value={manual}
          onChangeText={onChangeManual}
          imageUri={image?.uri ?? null}
          canSend={!!image || manual.trim().length > 0}
          onPaste={onPaste}
          onPickImage={onPickImage}
          onRemoveImage={onRemoveImage}
          onSend={onContinue}
        />

        {/* Quiet privacy line: the full six-card sheet is one tap away */}
        <Pressable
          onPress={() => {
            haptic.selection();
            onOpenPrivacy();
          }}
          accessibilityRole="button"
          accessibilityLabel="Private. Your screenshot is read once and never saved. Opens how Lovli handles your chats."
          testID="privacy-line"
          style={({ pressed }) => [styles.privacyLine, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="lock-closed" size={11} color={colors.textFaint} />
          <Text style={styles.privacyText} numberOfLines={1}>
            <Text style={styles.privacyLabel}>PRIVATE</Text>
            {"  Read once, never saved. "}
            <Text style={styles.privacyLink}>How it works</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  </>
);

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// "Remembered" chip (research §5 / §7): shows memory being used — the facts
// that were in context for this generation. Tappable to correct.
const RememberedChip: React.FC<{ person: MemoryCard; onEdit: () => void }> = ({ person, onEdit }) => {
  const [open, setOpen] = useState(false);
  const facts = (person.facts || []).slice(0, 3);
  return (
    <View testID="remembered-chip">
      <Pressable
        onPress={() => {
          haptic.selection();
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Remembered ${person.nickname}. Shows what Lovli used.`}
        style={({ pressed }) => [styles.memoryPill, pressed && { opacity: 0.85 }]}
        hitSlop={6}
      >
        <Text style={styles.memoryPillText}>Remembered · {person.nickname}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={12} color={colors.lavenderText} />
      </Pressable>
      {open ? (
        <View style={styles.memoryDetail}>
          <Text style={styles.memoryDetailText} testID="remembered-detail">
            {facts.length > 0
              ? `Used: ${facts.map((f) => f.text).join(" · ")}`
              : "Used what you've saved about them so far."}
          </Text>
          <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" testID="remembered-edit">
            <Text style={styles.memoryEdit}>Fix something</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

// --- Back header (recurring sub-screen pattern) ---
const BackHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <View style={styles.backHeader}>
    <Pressable
      onPress={onBack}
      hitSlop={12}
      testID="reply-back-button"
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={styles.backBtn}
    >
      <Ionicons name="chevron-back" size={22} color={colors.text} />
    </Pressable>
    <Text style={styles.backTitle}>{title}</Text>
  </View>
);

// --- Defensive parsers (unchanged contract) ---
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

export function safeInsight(value: Replies["insight"]): NonNullable<Replies["insight"]> | null {
  const v = value;
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

const TEMPERATURE_META: Record<ReplyRead["temperature"], { icon: IoniconName; label: string; color: string }> = {
  interested: { icon: "flame-outline", label: "Warm", color: colors.amber },
  neutral: { icon: "pulse-outline", label: "Mixed", color: colors.lavenderText },
  cold: { icon: "snow-outline", label: "Cold", color: colors.sky },
};

// Legacy read (rich=true without an insight) — same word + icon rule.
const ReadCard: React.FC<{ read: ReplyRead }> = ({ read }) => {
  const temp = TEMPERATURE_META[read.temperature];
  return (
    <GlassCard padded variant="elevated" testID="read-card">
      <View style={styles.readHeader}>
        <Text style={styles.readEyebrow}>THE READ</Text>
        <View
          style={[styles.tempChip, { backgroundColor: `${temp.color}1F`, borderColor: `${temp.color}66` }]}
          testID="read-temperature-chip"
          accessibilityLabel={`Temperature: ${temp.label}`}
        >
          <Ionicons name={temp.icon} size={13} color={temp.color} />
          <Text style={[styles.tempLabel, { color: temp.color }]}>{temp.label}</Text>
        </View>
      </View>
      <Text style={styles.readSituation} testID="read-situation">
        {read.situation}
      </Text>
      {read.signals.length > 0 ? (
        <View style={styles.readSection}>
          {read.signals.map((s, i) => (
            <View key={`sig-${i}`} style={styles.bulletRow}>
              <Bullet color={colors.lavender} lineHeight={20} />
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

const styles = StyleSheet.create({
  homeContent: { flexGrow: 1 },
  homeSpacer: { flex: 1, minHeight: space.xl },
  utilityZone: { gap: space.l },
  sectionLabel: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.textFaint,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionCaption: {
    ...typography.body.caption,
    fontSize: 12,
    color: colors.lavenderText,
    marginBottom: 10,
  },
  skipText: {
    fontFamily: typography.fonts.bodySemibold,
    fontSize: 12,
    color: colors.textFaint,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feelingDot: { width: 6, height: 6, borderRadius: 999 },
  // Centred, 12pt under the composer (the zone gap is 16, so pull up 4).
  privacyLine: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 6,
    marginTop: -4,
    paddingHorizontal: 4,
  },
  privacyText: { ...typography.body.caption, fontSize: 12, color: colors.textFaint, flexShrink: 1 },
  privacyLabel: { fontFamily: typography.fonts.bodyBold, fontSize: 10.5, letterSpacing: 1.1, color: colors.textFaint },
  privacyLink: { fontFamily: typography.fonts.bodySemibold, fontSize: 12, color: colors.lavenderText },
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: space.s,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -11 },
  backTitle: {
    fontFamily: typography.fonts.displayBold,
    fontSize: 20,
    letterSpacing: 0,
    color: colors.text,
  },
  // "Remembered" pill
  memoryPill: {
    minHeight: 36,
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
  memoryPillText: { ...typography.body.bodySemibold, fontSize: 12, color: colors.lavenderText },
  memoryDetail: { marginTop: 8, gap: 4 },
  memoryDetailText: { ...typography.body.base, fontSize: 12.5, lineHeight: 17, color: colors.textMuted },
  memoryEdit: { ...typography.body.bodySemibold, fontSize: 12.5, color: colors.lavenderText, paddingVertical: 6 },
  // --- legacy ReadCard ---
  readHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
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
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  tempLabel: { fontFamily: typography.fonts.displaySemibold, fontSize: 13 },
  readSituation: {
    fontFamily: typography.fonts.displayMedium,
    color: colors.text,
    fontSize: 18,
    lineHeight: 25,
    marginBottom: space.s,
  },
  readSection: { marginTop: space.s, gap: 6 },
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
