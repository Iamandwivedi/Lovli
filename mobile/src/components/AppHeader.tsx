// Top header — Lovli wordmark + sparkle on left, profile avatar on right.
// CreditsChip ("3 free left" / "Pro") slots between wordmark and avatar.
// PR-DA1: replaces the settings gear with a round user-initial avatar.
import React from "react";
import { Pressable, StyleSheet, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { LovliLogo } from "@/src/components/LovliLogo";
import { useAuth } from "@/src/context/AuthContext";
import { colors, radii, space, typography } from "@/src/theme";

type Props = {
  showSettings?: boolean;
  rightElement?: React.ReactNode;
  /** Optional credits indicator e.g. "3 free left" — shown next to the avatar. */
  credits?: { text: string; tone?: "default" | "pro" };
};

function initialOf(name?: string | null, email?: string | null): string {
  const seed = (name || email || "Y").trim();
  return seed.charAt(0).toUpperCase();
}

export const AppHeader: React.FC<Props> = ({ showSettings = true, rightElement, credits }) => {
  const router = useRouter();
  const { user } = useAuth();
  const initial = initialOf(user?.name, user?.email);
  return (
    <View style={styles.row} testID="app-header">
      <LovliLogo size={32} />
      <View style={styles.right}>
        {credits ? (
          <View
            style={[
              styles.creditsChip,
              credits.tone === "pro" && styles.creditsChipPro,
            ]}
          >
            <Text
              style={[
                styles.creditsText,
                credits.tone === "pro" && styles.creditsTextPro,
              ]}
              numberOfLines={1}
            >
              {credits.text}
            </Text>
          </View>
        ) : null}
        {rightElement}
        {showSettings ? (
          <Pressable
            onPress={() => router.push("/settings")}
            testID="open-settings-button"
            accessibilityLabel="Open settings"
            style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.75 }]}
            hitSlop={10}
          >
            <Text style={styles.avatarText} allowFontScaling={false}>
              {initial}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.s,
  },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.violetTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.body.bodySemibold,
    color: colors.violetDeep,
    fontSize: 15,
  },
  creditsChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
  },
  creditsChipPro: {
    backgroundColor: colors.violetTint,
    borderColor: colors.violet,
  },
  creditsText: {
    ...typography.body.caption,
    color: colors.textSecondary,
  },
  creditsTextPro: {
    ...typography.body.bodySemibold,
    color: colors.violetDeep,
    fontSize: 12,
  },
});
