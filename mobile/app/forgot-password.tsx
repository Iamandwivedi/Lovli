// Forgot password: one screen, two steps. Step 1 asks for the email and
// requests a 6 digit code. Step 2 takes the code plus a new password and signs
// the user in through the same session path as every other sign in.
import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { LovliLogo } from "@/src/components/LovliLogo";
import { Input } from "@/src/components/Input";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { SecondaryButton } from "@/src/components/SecondaryButton";
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
    } catch {
      // The endpoint always answers 200. A network failure must not reveal
      // anything either, so the flow carries on and the user can resend.
    } finally {
      setSending(false);
    }
    setEmail(cleaned);
    setStep("code");
    setCooldown(RESEND_SECONDS);
    toast.show("If that email has a Lovli account, the code is on its way.");
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
                withSparkle={false}
                testID="forgot-send-button"
              />
            </View>

            <Text style={styles.note}>
              Signed up with Google? There is no password to reset. Go back and tap Continue
              with Google.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.h1}>Check your email</Text>
            <Text style={styles.sub}>
              I sent a code to {email}. It works for 15 minutes.
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

            <SecondaryButton
              variant="ghost"
              label={cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              onPress={sendCode}
              disabled={cooldown > 0 || sending}
              loading={sending}
              style={styles.resend}
              testID="forgot-resend-button"
            />

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
  resend: { marginTop: space.s },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: space.s,
  },
  link: {
    ...typography.body.base,
    color: colors.text,
    textDecorationLine: "underline",
  },
});
