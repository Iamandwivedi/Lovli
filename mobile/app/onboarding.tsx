// Onboarding — keep it very short.
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { LovliLogo } from "@/src/components/LovliLogo";
import { Chip } from "@/src/components/Chip";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { GlassCard } from "@/src/components/GlassCard";
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
import { colors, fontSize, space } from "@/src/theme/colors";

const PLATFORMS: PlatformLabel[] = ["Instagram", "Dating platform", "WhatsApp"];
const LANGUAGES: Language[] = ["English", "Hinglish", "Hindi + English mixed"];

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
  const [saving, setSaving] = useState(false);

  const handleContinue = async (skip: boolean) => {
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
      router.replace("/(tabs)/reply");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save preferences."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen testID="onboarding-page">
      <View style={{ marginTop: space.xl, marginBottom: space.m }}>
        <LovliLogo size={32} />
      </View>

      <GlassCard padded>
        <Text style={styles.h1}>A few quick basics</Text>
        <Text style={styles.sub}>
          Helps Lovli start with your defaults. You can change these anytime.
        </Text>

        <Text style={styles.section}>Where do you mostly chat?</Text>
        <View style={styles.chipsRow}>
          {PLATFORMS.map((p) => (
            <Chip
              key={p}
              label={p}
              selected={platform === p}
              onPress={() => setPlatform(p)}
              testID={`onboarding-platform-${p}`}
            />
          ))}
        </View>

        <Text style={styles.section}>Default reply language</Text>
        <View style={styles.chipsRow}>
          {LANGUAGES.map((l) => (
            <Chip
              key={l}
              label={l}
              selected={language === l}
              onPress={() => setLanguage(l)}
              testID={`onboarding-language-${l}`}
            />
          ))}
        </View>

        <Text style={styles.helper}>
          Language is only a default. You can change it every time you generate.
        </Text>

        <View style={{ marginTop: space.xl, gap: space.m }}>
          <PrimaryButton
            label={saving ? "Saving…" : "Continue"}
            onPress={() => handleContinue(false)}
            loading={saving}
            testID="onboarding-continue-button"
          />
          <Pressable
            onPress={() => handleContinue(true)}
            disabled={saving}
            testID="onboarding-skip-button"
            style={({ pressed }) => [styles.skipRow, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.skip}>Skip for now</Text>
          </Pressable>
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  sub: { color: colors.textMuted, fontSize: fontSize.base, marginTop: 6, lineHeight: 20 },
  section: {
    color: colors.textSoft,
    fontSize: fontSize.base,
    fontWeight: "600",
    marginTop: space.xl,
    marginBottom: space.m,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  helper: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: space.m },
  skipRow: { alignItems: "center", paddingVertical: 8 },
  skip: { color: colors.textMuted, fontSize: fontSize.base, fontWeight: "500" },
});
