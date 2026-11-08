// Login screen — premium, calm, safe.
import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { LovliLogo } from "@/src/components/LovliLogo";
import { Input } from "@/src/components/Input";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { GoogleSignIn } from "@/src/components/GoogleSignIn";
import { GlassCard } from "@/src/components/GlassCard";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { extractErrorMessage } from "@/src/api/client";
import { routeAfterAuth } from "@/src/navigation/route-after-auth";
import { colors, fontSize, space } from "@/src/theme/colors";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      const user = await login(email.trim(), password);
      routeAfterAuth(user, router);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not sign in. Try again."));
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <Screen testID="login-page">
      <View style={{ marginTop: space.xl, marginBottom: space.s }}>
        <LovliLogo size={36} />
      </View>

      <GlassCard padded testID="login-card">
        <Text style={styles.h1}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to keep your generations and memory cards.</Text>

        <View style={styles.privacy}>
          <Ionicons name="lock-closed-outline" size={12} color={colors.lavender} />
          <Text style={styles.privacyText}>Your chats stay yours.</Text>
        </View>

        <View style={{ gap: space.m, marginTop: space.l }}>
          <Input
            label="Email"
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            inputTestID="login-email-input"
          />
          <View style={{ gap: space.xs }}>
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              inputTestID="login-password-input"
            />
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/forgot-password",
                  params: email.trim() ? { email: email.trim() } : {},
                })
              }
              hitSlop={8}
              style={styles.forgotRow}
              testID="login-forgot-link"
            >
              <Text style={[styles.link, styles.forgotText]}>Forgot password?</Text>
            </Pressable>
          </View>
          <PrimaryButton
            label={loading ? "Signing in…" : "Sign in"}
            onPress={onSubmit}
            loading={loading}
            testID="login-submit-button"
          />
        </View>

        <GoogleSignIn testID="login-google-button" />

        <View style={styles.bottomRow}>
          <Text style={styles.muted}>New to Lovli? </Text>
          <Pressable onPress={() => router.push("/signup")} testID="login-signup-link">
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
        </View>
      </GlassCard>

      <Text style={styles.legal} testID="login-legal">
        By continuing you agree to our{" "}
        <Text style={styles.legalLink} onPress={() => openLink("https://app.lovli.in/terms")}>
          Terms
        </Text>{" "}
        and{" "}
        <Text style={styles.legalLink} onPress={() => openLink("https://app.lovli.in/privacy")}>
          Privacy
        </Text>
        .
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0,
  },
  sub: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    marginTop: 6,
    lineHeight: 20,
  },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  privacyText: {
    color: colors.textMuted,
    fontSize: 11.5,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: space.xl,
  },
  muted: { color: colors.textMuted, fontSize: fontSize.base },
  link: {
    color: colors.text,
    fontSize: fontSize.base,
    textDecorationLine: "underline",
  },
  forgotRow: { alignSelf: "flex-end" },
  forgotText: { color: colors.textMuted },
  legal: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: space.m,
  },
  legalLink: { color: colors.textSoft, textDecorationLine: "underline" },
});
