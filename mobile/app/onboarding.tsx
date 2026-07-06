// Onboarding — V2 dark, 3 steps: Goal → Platform → Language.
// Template per "V2 · Coach — Onboarding · Goal": back chevron + gradient progress
// track + "N of 3", serif H1, radio option list, white Continue CTA (no ✦).
// Goal is stored locally (lovli_goal) and fed into generation prompts in a later PR.
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/src/components/Screen";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { extractErrorMessage } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import {
  Language,
  PlatformLabel,
  getTimezone,
  patchOnboarding,
  platformLabelToValue,
  platformValueToLabel,
} from "@/src/api/endpoints";
import { colors, gradients, typography } from "@/src/theme";

const GOALS = [
  "Find a relationship",
  "Fix things with someone",
  "Get better at dating apps",
  "Survive the talking stage",
  "Heading toward marriage",
  "Recover after a breakup",
];
const PLATFORMS: PlatformLabel[] = ["Instagram", "Dating platform", "WhatsApp"];
const LANGUAGES: Language[] = ["English", "Hinglish", "Hindi + English mixed"];

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(0); // 0-indexed
  const [goal, setGoal] = useState<string | null>(null);
  const [platform, setPlatform] = useState<PlatformLabel>(
    platformValueToLabel(user?.preferred_platform || "instagram"),
  );
  const [language, setLanguage] = useState<Language>(
    (user?.language_preference as Language) || "Hinglish",
  );
  const [saving, setSaving] = useState(false);

  const steps = [
    {
      title: "What brings you here?",
      sub: "I'll shape my advice around it.",
      options: GOALS,
      value: goal,
      onSelect: (v: string) => setGoal(v),
    },
    {
      title: "Where do you mostly chat?",
      sub: "I'll match the tone of the app you're on.",
      options: PLATFORMS as string[],
      value: platform as string,
      onSelect: (v: string) => setPlatform(v as PlatformLabel),
    },
    {
      title: "How do you like to text?",
      sub: "I'll write replies the way you actually talk.",
      options: LANGUAGES as string[],
      value: language as string,
      onSelect: (v: string) => setLanguage(v as Language),
    },
  ];
  const current = steps[step];
  const canContinue = !!current.value;

  const finish = async (skip: boolean) => {
    try {
      setSaving(true);
      if (!skip && goal) {
        await storage.setItem("lovli_goal", goal);
      }
      const body = skip
        ? { timezone: getTimezone() }
        : {
            preferred_platform: platformLabelToValue(platform),
            language_preference: language,
            timezone: getTimezone(),
          };
      const updated = await patchOnboarding(body);
      updateUser(updated);
      router.replace("/(tabs)/reply");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save preferences."));
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      finish(false);
    }
  };

  return (
    <Screen scroll={false} testID="onboarding-page">
      {/* Progress row */}
      <View style={styles.progressRow}>
        <Pressable
          onPress={() => step > 0 && setStep(step - 1)}
          hitSlop={12}
          disabled={step === 0}
          style={{ opacity: step === 0 ? 0 : 1 }}
          testID="onboarding-back-button"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.track}>
          <LinearGradient
            colors={gradients.progress}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.trackFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]}
          />
        </View>
        <Text style={styles.stepLabel}>{`${step + 1} of ${TOTAL_STEPS}`}</Text>
      </View>

      {/* Heading */}
      <Text style={styles.h1}>{current.title}</Text>
      <Text style={styles.sub}>{current.sub}</Text>

      {/* Option list */}
      <View style={styles.options}>
        {current.options.map((option) => {
          const selected = current.value === option;
          return (
            <Pressable
              key={option}
              onPress={() => current.onSelect(option)}
              testID={`onboarding-option-${option}`}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option}
              </Text>
              {selected ? (
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={13} color="#050509" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <PrimaryButton
        label="Continue"
        withSparkle={false}
        onPress={handleContinue}
        disabled={!canContinue}
        loading={saving && step === TOTAL_STEPS - 1}
        testID="onboarding-continue-button"
      />
      <Pressable
        onPress={() => finish(true)}
        disabled={saving}
        testID="onboarding-skip-button"
        style={({ pressed }) => [styles.skipRow, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.skip}>Skip for now</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairline,
    overflow: "hidden",
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  stepLabel: {
    ...typography.body.bodySemibold,
    fontSize: 12.5,
    color: colors.textFaint,
  },
  h1: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.6,
    color: colors.text,
    marginTop: 22,
    paddingHorizontal: 4,
  },
  sub: {
    ...typography.body.base,
    fontSize: 14.5,
    color: colors.textMuted,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  options: { gap: 10, marginTop: 22 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 17,
  },
  optionSelected: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.lavender,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 4,
  },
  optionText: {
    ...typography.body.bodySemibold,
    fontSize: 14.5,
    color: colors.textSoft,
  },
  optionTextSelected: {
    ...typography.body.bodyBold,
    fontSize: 14.5,
    color: colors.text,
  },
  check: {
    width: 21,
    height: 21,
    borderRadius: 999,
    backgroundColor: colors.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  skipRow: { alignItems: "center", paddingVertical: 12 },
  skip: {
    ...typography.body.bodyMedium,
    fontSize: 14,
    color: colors.textFaint,
  },
});
