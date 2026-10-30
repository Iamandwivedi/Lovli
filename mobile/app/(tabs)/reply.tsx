// Reply tab — V3 glass flow as a phase machine:
//   home → intent → generating → results
// home:       "Kya scene hai?" + person picker + continuity strip + three equal
//             capture targets (Paste · Screenshot · Camera) + situation chips +
//             always-visible note + feeling check-in + ✦ Get replies
// intent:     "Got it. I read the chat." + chat preview + WHAT DO YOU WANT? /
//             HOW SHOULD IT LAND? / REPLY LANGUAGE (last intent per person recalled)
// generating: four truthful stages timed to the real request (StagedLoader)
// results:    the read FIRST, then three labelled cards (middle emphasised),
//             "Noted" fact proposal, Ask / Save / Report actions, tone chips.
// Research doc: "Lovli UI/UX Research — What to Build", §5, §7, §11, §12.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { AppHeader } from "@/src/components/AppHeader";
import { GlassCard } from "@/src/components/GlassCard";
import { Chip } from "@/src/components/Chip";
import { Input } from "@/src/components/Input";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { PersonChip } from "@/src/components/PersonChip";
import { PrivacySheet } from "@/src/components/PrivacySheet";
import { Sparkle } from "@/src/components/Sparkle";
import { ChatPreview } from "@/src/components/reply/ChatPreview";
import { ContinuityStrip } from "@/src/components/reply/ContinuityStrip";
import { InsightCard } from "@/src/components/reply/InsightCard";
import { NotedCard } from "@/src/components/reply/NotedCard";
import { ReplyCard, REPLY_LABEL_FALLBACK } from "@/src/components/reply/ReplyCard";
import { ResultActions } from "@/src/components/reply/ResultActions";
import { SituationSection, buildUserNote } from "@/src/components/reply/SituationChips";
import { StagedLoader, STAGE_MS, buildGenerationStages } from "@/src/components/reply/StagedLoader";
import { parseChatText } from "@/src/utils/chatParse";
import { storage } from "@/src/utils/storage";
import { ASK_PENDING_KEY, GOAL_KEY, LAST_INTENT_KEY, PREFS_KEY, PRIVACY_SEEN_KEY } from "@/src/config/storage-keys";
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
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const privacySeen = useRef<boolean | null>(null);
  const afterPrivacy = useRef<(() => void) | null>(null);

  useEffect(() => {
    storage
      .getItem<string>(GOAL_KEY, "")
      .then((g) => setGoalPref(typeof g === "string" ? g : ""))
      .catch(() => {});
    storage
      .getItem<boolean>(PRIVACY_SEEN_KEY, false)
      .then((v) => {
        privacySeen.current = v === true;
      })
      .catch(() => {
        privacySeen.current = false;
      });
  }, []);

  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Replies | null>(null);
  const [lastCopied, setLastCopied] = useState<string | null>(null);
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

  // --- Privacy gate: the summary sheet shows once, before the first upload ---
  const withPrivacyGate = (action: () => void) => {
    if (privacySeen.current) {
      action();
      return;
    }
    afterPrivacy.current = action;
    setPrivacyOpen(true);
  };
  const acceptPrivacy = () => {
    privacySeen.current = true;
    storage.setItem(PRIVACY_SEEN_KEY, true).catch(() => {});
    setPrivacyOpen(false);
    const next = afterPrivacy.current;
    afterPrivacy.current = null;
    // Let the modal finish dismissing before the system picker presents.
    if (next) setTimeout(next, 350);
  };

  const acceptAsset = (asset: Pick) => {
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      toast.error("This image is too large.");
      return;
    }
    setImage(asset);
  };

  const pickImage = () =>
    withPrivacyGate(async () => {
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
    });

  const takePhoto = () =>
    withPrivacyGate(async () => {
      try {
        const req = await ImagePicker.requestCameraPermissionsAsync();
        if (req.status !== "granted") {
          toast.error(req.canAskAgain ? "I need the camera for that." : "Enable Camera in Settings to use it.");
          return;
        }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.85, exif: false });
        if (res.canceled) return;
        acceptAsset(res.assets[0]);
      } catch {
        toast.error("Could not open the camera.");
      }
    });

  // Explicit paste on tap only — the clipboard is never auto-read.
  const pasteFromClipboard = async () => {
    try {
      const text = (await Clipboard.getStringAsync()).trim();
      if (!text) {
        toast.error("Nothing to paste yet — copy their message first.");
        return;
      }
      haptic.success();
      setManual((cur) => (cur.trim() ? `${cur.trim()}\n${text}` : text));
    } catch {
      toast.error("Could not read the clipboard.");
    }
  };

  const goToIntent = async () => {
    if (!image && !manual.trim()) {
      toast.error("Show me the conversation first — screenshot or paste.");
      return;
    }
    if (usage.plan !== "pro" && remaining <= 0) {
      haptic.warning();
      toast.error("That's today's free replies — back tomorrow, or go Pro.");
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
    startGeneration(`closer to the ${label.toLowerCase()} option — "${text}"`);
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
      `Lovli, about this chat — ${lead}you suggested: "${result.replies[0] || ""}". ` +
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
    setSituation(null);
    setNote("");
    setIntentRecalled(false);
    setPhase("home");
  };

  const creditsText =
    usage.plan === "pro" ? "Pro" : remaining <= 0 ? "Back tomorrow, or go Pro" : `${remaining} left today`;

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
          situation={situation}
          note={note}
          memoryCards={memoryCards}
          memoryId={memoryId}
          person={person}
          onToggleMemory={(id) => setMemoryId((cur) => (cur === id ? null : id))}
          onOpenPerson={(id) => router.push(`/memory/${id}`)}
          onChangeManual={setManual}
          onToggleFeeling={(f) => setFeeling((cur) => (cur === f ? null : f))}
          onSkipFeeling={() => setFeeling(null)}
          onSituation={setSituation}
          onNote={setNote}
          onPickImage={pickImage}
          onTakePhoto={takePhoto}
          onPaste={pasteFromClipboard}
          onRemoveImage={() => setImage(null)}
          onTrySample={() => router.push("/sample")}
          onContinue={goToIntent}
          creditsText={creditsText}
          outOfCredits={usage.plan !== "pro" && remaining <= 0}
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

      <PrivacySheet
        visible={privacyOpen}
        onClose={() => {
          afterPrivacy.current = null;
          setPrivacyOpen(false);
        }}
        primaryLabel="Got it — pick a screenshot"
        onPrimary={acceptPrivacy}
      />
    </Screen>
  );
}

// --- Home phase ---
const HomePhase: React.FC<{
  image: Pick | null;
  manual: string;
  feeling: string | null;
  situation: string | null;
  note: string;
  memoryCards: MemoryCard[];
  memoryId: string | null;
  person: MemoryCard | null;
  onToggleMemory: (id: string) => void;
  onOpenPerson: (id: string) => void;
  onChangeManual: (v: string) => void;
  onToggleFeeling: (f: string) => void;
  onSkipFeeling: () => void;
  onSituation: (s: string | null) => void;
  onNote: (v: string) => void;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onPaste: () => void;
  onRemoveImage: () => void;
  onTrySample: () => void;
  onContinue: () => void;
  creditsText: string;
  outOfCredits: boolean;
}> = ({
  image,
  manual,
  feeling,
  situation,
  note,
  memoryCards,
  memoryId,
  person,
  onToggleMemory,
  onOpenPerson,
  onChangeManual,
  onToggleFeeling,
  onSkipFeeling,
  onSituation,
  onNote,
  onPickImage,
  onTakePhoto,
  onPaste,
  onRemoveImage,
  onTrySample,
  onContinue,
  creditsText,
  outOfCredits,
}) => (
  <>
    <AppHeader credits={{ text: creditsText, tone: creditsText === "Pro" ? "pro" : "default" }} />

    <View style={{ marginTop: space.s }}>
      <Text style={styles.h1} testID="reply-heading">
        Kya scene hai?
      </Text>
      <Text style={styles.sub}>Overthinking their last text? Paste it — I'll read it with you.</Text>
    </View>

    {/* Person picker — hidden entirely when no memory cards. Never blocks. */}
    {memoryCards.length > 0 ? (
      <View testID="person-section" style={{ gap: 10 }}>
        <View>
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
                onPress={() => {
                  haptic.selection();
                  onToggleMemory(c.id);
                }}
                testID={`person-${c.id}`}
              />
            ))}
          </View>
        </View>
        {person ? <ContinuityStrip card={person} onPress={() => onOpenPerson(person.id)} /> : null}
      </View>
    ) : null}

    {/* Hero input: three equal capture targets, 56 pt, no dropdown */}
    {image ? (
      <View style={styles.preview} testID="upload-preview">
        <Image source={{ uri: image.uri }} style={styles.previewImg} resizeMode="cover" />
        <Pressable
          onPress={onRemoveImage}
          testID="upload-remove-button"
          accessibilityRole="button"
          accessibilityLabel="Remove screenshot"
          style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.8 }]}
          hitSlop={10}
        >
          <Ionicons name="close" size={18} color={colors.text} />
        </Pressable>
      </View>
    ) : (
      <View style={styles.targets} testID="capture-targets">
        <CaptureTarget icon="clipboard-outline" label="Paste text" onPress={onPaste} testID="capture-paste" />
        <CaptureTarget icon="images-outline" label="Screenshot" onPress={onPickImage} testID="upload-area" primary />
        {Platform.OS !== "web" ? (
          <CaptureTarget icon="camera-outline" label="Camera" onPress={onTakePhoto} testID="capture-camera" />
        ) : null}
      </View>
    )}

    {/* Paste field — always visible so a tapped Paste has somewhere to land */}
    <Input
      placeholder="Or type what they said…"
      multiline
      numberOfLines={2}
      value={manual}
      onChangeText={onChangeManual}
      inputTestID="manual-text-input"
      style={{ minHeight: 52 }}
    />

    {/* Empty state: play-first beats explain-first */}
    {!image && !manual.trim() && memoryCards.length === 0 ? (
      <Pressable
        onPress={() => {
          haptic.selection();
          onTrySample();
        }}
        accessibilityRole="button"
        testID="try-sample-chip"
        style={({ pressed }) => [styles.sampleChip, pressed && { opacity: 0.85 }]}
      >
        <Sparkle size={11} color={colors.lavender} />
        <Text style={styles.sampleChipText}>Not sure yet? Try with a sample chat</Text>
      </Pressable>
    ) : null}

    <SituationSection situation={situation} onSituation={onSituation} note={note} onNote={onNote} />

    {/* Emotional check-in — optional, single-select toggle */}
    <View testID="feeling-section">
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>HOW ARE YOU FEELING?</Text>
        <Pressable onPress={onSkipFeeling} hitSlop={10} testID="feeling-skip" accessibilityRole="button">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
      <View style={styles.chipsRow}>
        {FEELINGS.map((f) => (
          <Chip
            key={f.label}
            label={f.label}
            selected={feeling === f.label}
            onPress={() => onToggleFeeling(f.label)}
            leading={<View style={[styles.feelingDot, { backgroundColor: f.color }]} />}
            testID={`feeling-${f.label}`}
          />
        ))}
      </View>
    </View>

    <View style={{ marginTop: space.s, gap: 8 }}>
      <PrimaryButton label="Get replies" onPress={onContinue} testID="generate-replies-button" />
      {outOfCredits ? (
        <Text style={styles.creditsHint} testID="credits-hint">
          Free replies reset at midnight. Pro has no limit.
        </Text>
      ) : null}
    </View>
  </>
);

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const CaptureTarget: React.FC<{
  icon: IoniconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
  testID?: string;
}> = ({ icon, label, onPress, primary, testID }) => (
  <Pressable
    onPress={() => {
      haptic.selection();
      onPress();
    }}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [styles.target, primary && styles.targetPrimary, pressed && styles.targetPressed]}
  >
    <Ionicons name={icon} size={20} color={colors.lavender} />
    <Text style={styles.targetLabel} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

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
        <Sparkle size={11} color={colors.lavender} />
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
              <Sparkle size={11} color={colors.lavender} />
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
    maxWidth: 300,
  },
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
    color: colors.textDim,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feelingDot: { width: 6, height: 6, borderRadius: 999 },
  // Three equal capture targets
  targets: { flexDirection: "row", gap: 8 },
  target: {
    flex: 1,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.28)",
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 8,
  },
  targetPrimary: {
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "rgba(167,139,250,0.45)",
    backgroundColor: colors.violetTint,
  },
  targetPressed: { backgroundColor: "rgba(255,255,255,0.12)", borderColor: colors.lavender },
  targetLabel: { ...typography.body.bodySemibold, fontSize: 13, color: colors.text, flexShrink: 1 },
  sampleChip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    alignSelf: "center",
    paddingHorizontal: 14,
  },
  sampleChipText: { ...typography.body.bodySemibold, fontSize: 13, color: colors.lavenderText },
  creditsHint: { ...typography.body.caption, fontSize: 12, color: colors.textFaint, textAlign: "center" },
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
    width: 36,
    height: 36,
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
