// Signup screen.
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { LovliLogo } from "@/src/components/LovliLogo";
import { Input } from "@/src/components/Input";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { GlassCard } from "@/src/components/GlassCard";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { extractErrorMessage } from "@/src/api/client";
import { colors, fontSize, space } from "@/src/theme/colors";

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!name.trim()) {
      toast.error("Tell us your name.");
      return;
    }
    if (!email.trim() || !password) {
      toast.error("Add your email and a password.");
      return;
    }
    if (password.length < 6) {
      toast.error("Use at least 6 characters in your password.");
      return;
    }
    try {
      setLoading(true);
      await signup(name.trim(), email.trim(), password);
      router.replace("/onboarding");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not create your account."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen testID="signup-page">
      <View style={{ marginTop: space.xl, marginBottom: space.s }}>
        <LovliLogo size={36} />
      </View>

      <GlassCard padded>
        <Text style={styles.h1}>Create your account</Text>
        <Text style={styles.sub}>A clean place to keep your replies and memory cards.</Text>

        <View style={{ gap: space.m, marginTop: space.l }}>
          <Input
            label="Name"
            placeholder="Your name"
            autoCapitalize="words"
            autoComplete="name"
            value={name}
            onChangeText={setName}
            inputTestID="signup-name-input"
          />
          <Input
            label="Email"
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            inputTestID="signup-email-input"
          />
          <Input
            label="Password"
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            inputTestID="signup-password-input"
          />
          <PrimaryButton
            label={loading ? "Creating account…" : "Create account"}
            onPress={onSubmit}
            loading={loading}
            testID="signup-submit-button"
          />
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.muted}>Already have an account? </Text>
          <Pressable onPress={() => router.replace("/login")} testID="signup-login-link">
            <Text style={styles.link}>Sign in</Text>
          </Pressable>
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 24, fontWeight: "700", letterSpacing: 0 },
  sub: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    marginTop: 6,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: space.xl,
  },
  muted: { color: colors.textMuted, fontSize: fontSize.base },
  link: { color: colors.text, fontSize: fontSize.base, textDecorationLine: "underline" },
});
