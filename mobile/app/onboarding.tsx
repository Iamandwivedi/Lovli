// Onboarding — V3 dark glass. Research §9: ONE screen, three chip rows max
// (where you text · language · how you text), then straight to Reply.
// Keeping the intent survey to three questions or fewer (Moburst benchmark).
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { Chip } from "@/src/components/Chip";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { extractErrorMessage } from "@/src/api/client";
import {
  Language,
  PlatformLabel,
  getTimezone,
  patchOnboarding,
  platformLabelToValue,
  platformValueToLabel,
} from "@/src/api/endpoints";
import { trackEvent } from "@/src/lib/memory-events";
import { colors, typography } from "@/src/theme";

const PLATFORMS: PlatformLabel[] = ["Instagram", "WhatsApp", "Dating platform"];
const LANGUAGES: Language[] = ["Hinglish", "English", "Hindi + English mixed"];
// Cold-start seed for the memory engine (weak weight, replaced by real behaviour).
const TEXT_STYLES = ["Short and casual", "Playful", "Direct", "Thoughtful"];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [platform, setPlatform] = useState<PlatformLabel>(
    platformValueToLabel(user?.preferred_platform || "instagram"),
  );
  const [language, setLanguage] = useState<Language>(
    (user?.language_preference as Language) || "Hinglish",
  );
  const [textStyle, setTextStyle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const finish = async (skip: boolean) => {
    try {
      setSaving(true);
      const body = skip
        ? { timezone: getTimezone() }
        : {
            preferred_platform: platformLabelToValue(platform),
            language_preference: language,
            timezone: getTimezone(),
          };
      const updated = await patchOnboarding(body);
      updateUser(updated);
      if (!skip && textStyle) {
        trackEvent("onboarding_pref", { question: "texting_style", answer: textStyle });
      }
      router.replace("/(tabs)/reply");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save preferences."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll={false} testID="onboarding-page">
      <Text style={styles.h1}>Three quick things</Text>
      <Text style={styles.sub}>So the first reply already sounds like you.</Text>

      <View style={styles.sections}>
        <View>
          <Text style={styles.sectionLabel}>WHERE ARE YOU TEXTING?</Text>
          <View style={styles.chips}>
            {PLATFORMS.map((p) => (
              <Chip
                key={p}
                label={p === "Dating platform" ? "Dating app" : p}
                selected={platform === p}
                onPress={() => setPlatform(p)}
                testID={`onboarding-option-${p}`}
              />
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionLabel}>REPLY LANGUAGE</Text>
          <View style={styles.chips}>
            {LANGUAGES.map((l) => (
              <Chip
                key={l}
                label={l}
                selected={language === l}
                onPress={() => setLanguage(l)}
                testID={`onboarding-option-${l}`}
              />
            ))}
          </View>
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>HOW DO YOU USUALLY TEXT?</Text>
            <Text style={styles.optional}>optional</Text>
          </View>
          <View style={styles.chips}>
            {TEXT_STYLES.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={textStyle === s}
                onPress={() => setTextStyle((cur) => (cur === s ? null : s))}
                testID={`onboarding-option-${s}`}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <PrimaryButton
        label="Continue"
        withSparkle={false}
        onPress={() => finish(false)}
        loading={saving}
        testID="onboarding-continue-button"
      />
      <Pressable
        onPress={() => finish(true)}
        disabled={saving}
        accessibilityRole="button"
        testID="onboarding-skip-button"
        style={({ pressed }) => [styles.skipRow, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.skip}>Skip for now</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontFamily: typography.fonts.displayBold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: 0,
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
  sections: { gap: 22, marginTop: 26 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.textFaint,
    marginBottom: 10,
  },
  optional: { ...typography.body.caption, fontSize: 12, color: colors.textDim, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skipRow: { alignItems: "center", paddingVertical: 12, minHeight: 44, justifyContent: "center" },
  skip: {
    ...typography.body.bodyMedium,
    fontSize: 14,
    color: colors.textFaint,
  },
});
