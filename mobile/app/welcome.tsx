// Welcome — V2 · Coach hero screen. First thing unauthenticated users see.
// Hero gradient bg + pulsing ambient glow, big ✦, serif headline, white CTA.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AmbientGlow } from "@/src/components/AmbientGlow";
import { Sparkle } from "@/src/components/Sparkle";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { colors, gradients, typography } from "@/src/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={gradients.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
      testID="welcome-screen"
    >
      <AmbientGlow size={400} style={styles.glow} />
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <View style={styles.center}>
          <Sparkle size={58} color={colors.lavender} glow animated />
          <Text style={styles.wordmark}>Lovli</Text>
          <Text style={styles.headline}>
            Your wingman for every text, talk & situationship.
          </Text>
          <Text style={styles.sub}>Hinglish-first advice that actually gets you.</Text>
        </View>

        <View>
          <PrimaryButton
            label="Get started"
            onPress={() => router.push("/login")}
            testID="welcome-get-started"
          />
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed" size={13} color={colors.textFaint} />
            <Text style={styles.privacy}>Private by default — your chats stay yours.</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glow: {
    position: "absolute",
    top: -40,
    alignSelf: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 26,
    color: colors.text,
    marginTop: 22,
    letterSpacing: -0.4,
  },
  headline: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 33,
    lineHeight: 37,
    letterSpacing: -0.7,
    color: colors.text,
    textAlign: "center",
    marginTop: 30,
    maxWidth: 330,
  },
  sub: {
    ...typography.body.base,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 14,
    maxWidth: 280,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  privacy: {
    ...typography.body.caption,
    fontSize: 12.5,
    color: colors.textFaint,
  },
});
