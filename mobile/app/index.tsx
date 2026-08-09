// Splash / loading — decides where to send the user.
import React, { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AmbientGlow } from "@/src/components/AmbientGlow";
import { useAuth } from "@/src/context/AuthContext";
import { colors, gradients, space, typography } from "@/src/theme";

export default function Splash() {
  const { isChecking, isAuthed, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isChecking) return;
    if (!isAuthed) {
      router.replace("/welcome");
      return;
    }
    // Authed — decide onboarding vs main.
    // Dev auto-login bypasses onboarding entirely so the tester lands on Reply.
    const devAutoLogin = process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN === "true";
    const hasDefaults =
      !!user?.preferred_platform || !!user?.onboarding_complete;
    if (!hasDefaults && !devAutoLogin) {
      router.replace("/onboarding");
    } else {
      router.replace("/(tabs)/reply");
    }
  }, [isChecking, isAuthed, user, router]);

  return (
    <LinearGradient colors={gradients.hero} style={styles.root} testID="splash-screen">
      <AmbientGlow size={420} style={styles.glow} />
      <Image source={require("../assets/images/icon.png")} style={styles.icon} />
      <Text style={styles.tagline}>Never fumble the text that matters.</Text>
      <ActivityIndicator color={colors.lavender} style={{ marginTop: space.xl }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    alignSelf: "center",
  },
  icon: {
    width: 108,
    height: 108,
    borderRadius: 26,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 34 },
    shadowOpacity: 0.9,
    shadowRadius: 70,
  },
  tagline: {
    ...typography.body.base,
    color: colors.textMuted,
    fontSize: 14.5,
    marginTop: 30,
  },
});
