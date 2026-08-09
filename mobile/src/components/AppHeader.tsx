// Top header — V3 spark squircle, amber credits chip, profile avatar.
import React from "react";
import { Pressable, StyleSheet, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { LovliLogo } from "@/src/components/LovliLogo";
import { Sparkle } from "@/src/components/Sparkle";
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
      <LovliLogo size={32} showName={false} />
      <View style={styles.right}>
        {credits ? (
          <View
            style={[
              styles.creditsChip,
              credits.tone === "pro" && styles.creditsChipPro,
            ]}
          >
            {credits.tone !== "pro" ? <Sparkle size={10} color={colors.amber} /> : null}
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
            style={({ pressed }) => [pressed && { opacity: 0.75 }]}
            hitSlop={10}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText} allowFontScaling={false}>
                {initial}
              </Text>
            </LinearGradient>
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
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.body.bodySemibold,
    color: "#050509",
    fontSize: 14,
  },
  creditsChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(217,169,110,0.10)",
    borderColor: "rgba(217,169,110,0.28)",
    borderWidth: 1,
  },
  creditsChipPro: {
    backgroundColor: colors.violetTint,
    borderColor: "rgba(167,139,250,0.36)",
  },
  creditsText: {
    fontFamily: typography.fonts.bodySemibold,
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.amber,
  },
  creditsTextPro: {
    ...typography.body.bodySemibold,
    color: colors.lavenderText,
    fontSize: 11.5,
  },
});
