// Settings — accessed from top-right icon. Not a bottom tab.
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { GlassCard } from "@/src/components/GlassCard";
import { Input } from "@/src/components/Input";
import { Chip } from "@/src/components/Chip";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SecondaryButton } from "@/src/components/SecondaryButton";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { extractErrorMessage } from "@/src/api/client";
import {
  Language,
  PlatformLabel,
  getTimezone,
  patchSettings,
  platformLabelToValue,
  platformValueToLabel,
} from "@/src/api/endpoints";
import { colors, fontSize, radii, space } from "@/src/theme/colors";

const PLATFORMS: PlatformLabel[] = ["Instagram", "Dating platform", "WhatsApp"];
const LANGUAGES: Language[] = ["English", "Hinglish", "Hindi + English mixed"];

const formatProvider = (p?: string) => {
  if (!p) return "Email";
  if (p === "google") return "Google";
  if (p === "email") return "Email";
  return p[0].toUpperCase() + p.slice(1);
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name || "");
  const [platform, setPlatform] = useState<PlatformLabel>(
    platformValueToLabel(user?.preferred_platform || "instagram"),
  );
  const [language, setLanguage] = useState<Language>(
    (user?.language_preference as Language) || "Hinglish",
  );
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    try {
      setSaving(true);
      const updated = await patchSettings({
        name: name.trim(),
        preferred_platform: platformLabelToValue(platform),
        language_preference: language,
        timezone: getTimezone(),
      });
      updateUser(updated);
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save."));
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const usageText =
    user?.plan === "pro"
      ? "Pro — unlimited generations"
      : `${user?.daily_generation_count ?? 0} of ${user?.daily_limit ?? 8} used today`;

  return (
    <Screen testID="settings-page">
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="settings-back">
          <Ionicons name="chevron-back" size={24} color={colors.textSoft} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.sub}>Manage your account, preferences, and privacy.</Text>

      {/* Account */}
      <GlassCard padded variant="solid">
        <Text style={styles.section}>Account</Text>
        <View style={{ gap: space.m, marginTop: space.m }}>
          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCapitalize="words"
            inputTestID="settings-name-input"
          />
          <View style={styles.staticRow} testID="settings-email">
            <Text style={styles.staticLabel}>Email</Text>
            <Text style={styles.staticValue}>{user?.email || ""}</Text>
          </View>
          <View style={styles.staticRow} testID="settings-login-method">
            <Text style={styles.staticLabel}>Login method</Text>
            <Text style={styles.staticValue}>{formatProvider(user?.auth_provider)}</Text>
          </View>
        </View>
      </GlassCard>

      {/* Preferences */}
      <GlassCard padded variant="solid">
        <Text style={styles.section}>Preferences</Text>
        <View style={{ gap: space.m, marginTop: space.m }}>
          <View>
            <Text style={styles.label}>Default language</Text>
            <View style={styles.chipsRow}>
              {LANGUAGES.map((l) => (
                <Chip
                  key={l}
                  label={l}
                  size="sm"
                  selected={language === l}
                  onPress={() => setLanguage(l)}
                  testID={`settings-language-${l}`}
                />
              ))}
            </View>
            <Text style={styles.helper}>
              Used as your default. You can still choose a different language before every
              generation.
            </Text>
          </View>
          <View>
            <Text style={styles.label}>Default platform</Text>
            <View style={styles.chipsRow}>
              {PLATFORMS.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  size="sm"
                  selected={platform === p}
                  onPress={() => setPlatform(p)}
                  testID={`settings-platform-${p}`}
                />
              ))}
            </View>
            <Text style={styles.helper}>Used as your default. You can change platform on each reply.</Text>
          </View>
        </View>
      </GlassCard>

      {/* Plan */}
      <GlassCard padded variant="solid">
        <Text style={styles.section}>Plan</Text>
        <View style={{ marginTop: space.m, gap: 6 }}>
          <View style={styles.staticRow}>
            <Text style={styles.staticLabel}>Current plan</Text>
            <Text style={styles.staticValue}>{user?.plan === "pro" ? "Pro" : "Free"}</Text>
          </View>
          <View style={styles.staticRow}>
            <Text style={styles.staticLabel}>Daily usage</Text>
            <Text style={styles.staticValue}>{usageText}</Text>
          </View>
        </View>
        <SecondaryButton
          label="Get Early Access"
          onPress={() => router.push("/(tabs)/pro")}
          style={{ marginTop: space.m }}
          testID="settings-early-access-button"
        />
      </GlassCard>

      {/* Privacy */}
      <GlassCard padded variant="solid">
        <Text style={styles.section}>Privacy</Text>
        <View style={styles.privacy}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.lavender} />
          <Text style={styles.privacyText}>Private by design. You control what gets saved.</Text>
        </View>
      </GlassCard>

      <View style={{ gap: space.m, marginBottom: space.xl }}>
        <PrimaryButton
          label={saving ? "Saving…" : "Save changes"}
          loading={saving}
          onPress={onSave}
          testID="settings-save-button"
        />
        <SecondaryButton
          label="Log out"
          onPress={onLogout}
          variant="ghost"
          testID="settings-logout-button"
          iconLeft={<Ionicons name="log-out-outline" size={16} color={colors.textSoft} />}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.s,
  },
  title: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: fontSize.base, lineHeight: 20 },
  section: { color: colors.text, fontSize: fontSize.lg, fontWeight: "600" },
  label: { color: colors.textSoft, fontSize: fontSize.sm, fontWeight: "500", marginBottom: 8 },
  helper: { color: colors.textMuted, fontSize: 11.5, marginTop: 8, lineHeight: 16 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  staticRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: space.l,
    paddingVertical: 10,
  },
  staticLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  staticValue: { color: colors.text, fontSize: fontSize.base, fontWeight: "500" },
  privacy: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: space.m },
  privacyText: { color: colors.textSoft, fontSize: fontSize.sm, lineHeight: 18, flex: 1 },
});
