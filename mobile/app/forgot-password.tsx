// Forgot password: one screen, two steps. Step 1 asks for the email and
// requests a 6 digit code. Step 2 takes the code plus a new password and signs
// the user in through the same session path as every other sign in.
import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { isAxiosError } from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { LovliLogo } from "@/src/components/LovliLogo";
import { Input } from "@/src/components/Input";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { GlassCard } from "@/src/components/GlassCard";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { extractErrorMessage } from "@/src/api/client";
import { requestPasswordReset } from "@/src/api/endpoints";
import { routeAfterAuth } from "@/src/navigation/route-after-auth";
import { colors, space, typography } from "@/src/theme";

const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;
const MIN_PASSWORD = 6;

type Step = "email" | "code";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { completePasswordReset } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Resend countdown. Ticks once a second while above zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/login");
  };

  const sendCode = useCallback(async () => {
    const cleaned = email.trim().toLowerCase();
    if (!cleaned) {
      toast.error("Tell me the email you signed up with.");
      return;
    }
    setSending(true);
    try {
      await requestPasswordReset(cleaned);
    } catch (err) {
      // The endpoint is designed to always answer 200, so any response at all
      // (even a 4xx or 5xx) is treated the same and the flow moves on. Only a
      // request that never reached the server keeps the user on this step.
      if (!isAxiosError(err) || !err.response) {
        toast.error("Check your connection and try again.");
        setSending(false);
        return;
      }
    }
    setSending(false);
    setEmail(cleaned);
    setStep("code");
    setCooldown(RESEND_SECONDS);
  }, [email, toast]);

  const submit = async () => {
    if (code.length !== CODE_LENGTH) {
      toast.error("Enter the 6 digit code from your email.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      toast.error("Your new password needs at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Those passwords do not match.");
      return;
    }
    try {
      setSubmitting(true);
      const user = await completePasswordReset(email, code, password);
      toast.success("Done. You are signed in.");
      routeAfterAuth(user, router);
    } catch (err) {
      toast.error(extractErrorMessage(err, "That did not work. Try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const changeEmail = () => {
    setCode("");
    setStep("email");
  };

  return (
    <Screen testID="forgot-password-page">
      <View style={styles.topRow}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          testID="forgot-back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <LovliLogo size={32} />
        <View style={styles.topSpacer} />
      </View>

      <GlassCard padded testID="forgot-card">
        {step === "email" ? (
          <>
            <Text style={styles.h1}>Reset your password</Text>
            <Text style={styles.sub}>
              Tell me the email you signed up with and I will send you a 6 digit code.
            </Text>

            <View style={styles.form}>
              <Input
                label="Email"
                placeholder="you@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={sendCode}
                returnKeyType="send"
                inputTestID="forgot-email-input"
              />
              <PrimaryButton
                label={sending ? "Sending…" : "Send code"}
                onPress={sendCode}
                loading={sending}
                testID="forgot-send-button"
              />
            </View>

            <Text style={styles.note}>
              Signed up with Google? Go back and tap Continue with Google.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.h1}>Check your email</Text>
            <Text style={styles.sub}>
              If that email has a Lovli account, a code is on its way to {email}. It works for
              15 minutes.{" "}
              {cooldown > 0 ? (
                <Text style={styles.resendWaiting} testID="forgot-resend-button">
                  Resend in {cooldown}s
                </Text>
              ) : (
                <Text
                  style={styles.resendLink}
                  onPress={sending ? undefined : sendCode}
                  accessibilityRole="button"
                  testID="forgot-resend-button"
                >
                  Resend code
                </Text>
              )}
            </Text>

            <View style={styles.form}>
              <Input
                label="Code"
                placeholder="000000"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
                maxLength={CODE_LENGTH}
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH))}
                style={styles.codeInput}
                inputTestID="forgot-code-input"
              />
              <Input
                label="New password"
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                helper="At least 6 characters."
                value={password}
                onChangeText={setPassword}
                inputTestID="forgot-password-input"
              />
              <Input
                label="Confirm password"
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                value={confirm}
                onChangeText={setConfirm}
                onSubmitEditing={submit}
                returnKeyType="done"
                inputTestID="forgot-confirm-input"
              />
              <PrimaryButton
                label={submitting ? "Saving…" : "Set new password"}
                onPress={submit}
                loading={submitting}
                testID="forgot-submit-button"
              />
            </View>

            <View style={styles.bottomRow}>
              <Pressable onPress={changeEmail} hitSlop={8} testID="forgot-change-email-link">
                <Text style={styles.link}>Use a different email</Text>
              </Pressable>
            </View>
          </>
        )}
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.m,
    marginBottom: space.s,
  },
  topSpacer: { width: 22 },
  h1: {
    ...typography.display.h2,
    color: colors.text,
  },
  sub: {
    ...typography.body.base,
    color: colors.textMuted,
    marginTop: 6,
  },
  form: { gap: space.m, marginTop: space.l },
  codeInput: {
    ...typography.body.bodySemibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 8,
    textAlign: "center",
  },
  note: {
    ...typography.body.small,
    color: colors.textMuted,
    marginTop: space.l,
    textAlign: "center",
  },
  resendWaiting: {
    ...typography.body.base,
    color: colors.textFaint,
  },
  resendLink: {
    ...typography.body.base,
    color: colors.text,
    textDecorationLine: "underline",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: space.l,
  },
  link: {
    ...typography.body.base,
    color: colors.text,
    textDecorationLine: "underline",
  },
});
