// Play-first onboarding (research §9): the sample chat runs through the REAL
// loader and result screen with a cached result — no network, no sign-in.
// Reachable before auth (Welcome) and from the Reply home empty state.
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { ChatPreview } from "@/src/components/reply/ChatPreview";
import { InsightCard } from "@/src/components/reply/InsightCard";
import { ReplyCard, REPLY_LABEL_FALLBACK } from "@/src/components/reply/ReplyCard";
import { StagedLoader, STAGE_MS, buildGenerationStages } from "@/src/components/reply/StagedLoader";
import { SAMPLE_MESSAGES, SAMPLE_PERSON, SAMPLE_RESULT } from "@/src/constants/sample-result";
import { useAuth } from "@/src/context/AuthContext";
import { colors, space, typography } from "@/src/theme";

const STAGES = buildGenerationStages(SAMPLE_PERSON);

export default function SampleScreen() {
  const router = useRouter();
  const { isAuthed } = useAuth();
  const [phase, setPhase] = useState<"generating" | "results">("generating");
  const [stage, setStage] = useState(0);

  // Same cadence as a real generation; the cached result lands after the
  // fourth stage has been readable for a beat.
  useEffect(() => {
    if (phase !== "generating") return;
    const tick = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), STAGE_MS);
    const done = setTimeout(() => setPhase("results"), STAGE_MS * STAGES.length + 300);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [phase]);

  const insight = SAMPLE_RESULT.insight!;
  const finish = () => (isAuthed ? router.back() : router.push("/login"));

  return (
    <Screen scroll={false} testID="sample-page">
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
          testID="sample-back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{phase === "generating" ? "A sample chat" : "Three ways to say it"}</Text>
        <View style={styles.samplePill}>
          <Text style={styles.samplePillText}>SAMPLE</Text>
        </View>
      </View>

      {phase === "generating" ? (
        <StagedLoader activeIndex={stage} stages={STAGES} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: space.l, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <ChatPreview messages={SAMPLE_MESSAGES} />
          <InsightCard insight={insight} />
          {SAMPLE_RESULT.replies.map((reply, i) => (
            <ReplyCard
              key={i}
              text={reply}
              label={SAMPLE_RESULT.reply_labels?.[i] || REPLY_LABEL_FALLBACK[i]}
              index={i}
              emphasized={i === 1}
              onCopy={(t) => Clipboard.setStringAsync(t).catch(() => {})}
            />
          ))}
          <Text style={styles.honesty}>
            {"That's a sample. Yours will be about your chat. And I might be wrong, you know them better."}
          </Text>
          <PrimaryButton
            label={isAuthed ? "Now read mine" : "Let's go, read my chat"}
            onPress={finish}
            testID="sample-cta"
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: space.s },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -11 },
  title: {
    fontFamily: typography.fonts.displayBold,
    fontSize: 20,
    letterSpacing: 0,
    color: colors.text,
    flex: 1,
  },
  samplePill: {
    backgroundColor: "rgba(217,169,110,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,169,110,0.32)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  samplePillText: { fontFamily: typography.fonts.bodyBold, fontSize: 10.5, letterSpacing: 1, color: colors.amber },
  honesty: {
    ...typography.body.caption,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textFaint,
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
