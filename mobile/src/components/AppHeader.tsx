// Top header — Lovli wordmark + sparkle on left, settings cog on right.
// CreditsChip ("3 free left" / "Pro") slots between wordmark and cog.
// Light variant per PR2.1.
import React from "react";
import { Pressable, StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LovliLogo } from "@/src/components/LovliLogo";
import { colors, radii, space, typography } from "@/src/theme";

type Props = {
  showSettings?: boolean;
  rightElement?: React.ReactNode;
  /** Optional credits indicator e.g. "3 free left" — shown next to settings cog. */
  credits?: { text: string; tone?: "default" | "pro" };
};

export const AppHeader: React.FC<Props> = ({ showSettings = true, rightElement, credits }) => {
  const router = useRouter();
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
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            hitSlop={10}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderColor: colors.hairline,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
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
