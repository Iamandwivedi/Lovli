// Splash / loading — decides where to send the user.
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { LovliLogo } from "@/src/components/LovliLogo";
import { useAuth } from "@/src/context/AuthContext";
import { colors, space } from "@/src/theme/colors";

export default function Splash() {
  const { isChecking, isAuthed, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isChecking) return;
    if (!isAuthed) {
      router.replace("/welcome");
      return;
    }
    // Authed — decide onboarding vs main
    const hasDefaults =
      !!user?.preferred_platform || !!user?.onboarding_complete;
    if (!hasDefaults) {
      router.replace("/onboarding");
    } else {
      router.replace("/(tabs)/reply");
    }
  }, [isChecking, isAuthed, user, router]);

  return (
    <View style={styles.root} testID="splash-screen">
      <LovliLogo size={56} />
      <ActivityIndicator color={colors.lavender} style={{ marginTop: space.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
