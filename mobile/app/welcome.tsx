// Welcome — V3 glass hero. First thing unauthenticated users see.
// Research §9: one line of positioning in Lovli's voice and ONE primary CTA,
// "Try with a sample chat" — play-first beats explain-first. No carousel.
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AmbientGlow } from "@/src/components/AmbientGlow";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { haptic } from "@/src/lib/haptics";
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
          <Image source={require("../assets/images/icon.png")} style={styles.icon} />
          <Text style={styles.headline}>{"Overthinking their text? I read it with you."}</Text>
          <Text style={styles.sub}>
            {"Paste any chat. I'll tell you what's really going on and give you three replies that sound like you, Hinglish included."}
          </Text>
          <View style={styles.tags}>
            <Text style={[styles.tag, styles.tagSky]}>Instagram</Text>
            <Text style={[styles.tag, styles.tagGreen]}>WhatsApp</Text>
            <Text style={[styles.tag, styles.tagPink]}>Dating apps</Text>
          </View>
        </View>

        <View>
          <PrimaryButton
            label="Try with a sample chat"
            onPress={() => router.push("/sample")}
            testID="welcome-try-sample"
          />
          <Pressable
            onPress={() => {
              haptic.selection();
              router.push("/login");
            }}
            accessibilityRole="button"
            testID="welcome-get-started"
            style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.secondaryText}>I already have an account</Text>
          </Pressable>
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed" size={13} color={colors.textFaint} />
            <Text style={styles.privacy}>Your chats stay yours. Read once, never stored.</Text>
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
  icon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.85,
    shadowRadius: 50,
  },
  headline: {
    fontFamily: typography.fonts.displayBold,
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: 0,
    color: colors.text,
    textAlign: "center",
    marginTop: 32,
    maxWidth: 310,
  },
  sub: {
    ...typography.body.base,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 16,
    maxWidth: 290,
  },
  tags: {
    flexDirection: "row",
    gap: 8,
    marginTop: 22,
  },
  tag: {
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 7,
    fontFamily: typography.fonts.bodySemibold,
    fontSize: 12,
  },
  tagSky: {
    backgroundColor: "rgba(110,160,195,0.10)",
    borderColor: "rgba(110,160,195,0.28)",
    color: colors.sky,
  },
  tagGreen: {
    backgroundColor: "rgba(134,200,157,0.10)",
    borderColor: "rgba(134,200,157,0.26)",
    color: colors.green,
  },
  tagPink: {
    backgroundColor: "rgba(214,166,176,0.10)",
    borderColor: "rgba(214,166,176,0.28)",
    color: colors.pink,
  },
  secondary: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 6 },
  secondaryText: { ...typography.body.bodySemibold, fontSize: 14, color: colors.lavenderText },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  privacy: {
    ...typography.body.caption,
    fontSize: 12.5,
    color: colors.textFaint,
  },
});
