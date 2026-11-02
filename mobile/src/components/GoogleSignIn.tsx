// "Continue with Google" plus its divider. Used on login and signup. Renders
// nothing until GET /auth/google/config says Google is enabled and the bundle
// carries a client ID, so a misconfigured build simply shows the email form.
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { isAxiosError } from "axios";
import { SecondaryButton } from "@/src/components/SecondaryButton";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { authGoogleConfig } from "@/src/api/endpoints";
import { isGoogleConfigured, signInWithGoogle } from "@/src/auth/google";
import { routeAfterAuth } from "@/src/navigation/route-after-auth";
import { colors, space } from "@/src/theme/colors";

type Props = {
  testID: string;
  /** Where the divider sits relative to the button. Login puts the email form first. */
  dividerPosition?: "above" | "below";
};

export const GoogleSignIn: React.FC<Props> = ({ testID, dividerPosition = "above" }) => {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isGoogleConfigured()) return;
    let mounted = true;
    authGoogleConfig()
      .then((cfg) => {
        if (mounted) setEnabled(!!cfg?.enabled);
      })
      .catch(() => {
        if (mounted) setEnabled(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!enabled) return null;

  const onPress = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const idToken = await signInWithGoogle();
      if (!idToken) return; // user dismissed the sheet, say nothing
      const user = await loginWithGoogle(idToken);
      routeAfterAuth(user, router);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 503) {
        toast.error("Google sign in is not available right now.");
      } else {
        toast.error("Could not sign you in with Google. Try again or use your email.");
      }
    } finally {
      setLoading(false);
    }
  };

  const divider = (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>OR</Text>
      <View style={styles.dividerLine} />
    </View>
  );

  return (
    <View>
      {dividerPosition === "above" ? divider : null}
      <SecondaryButton
        label={loading ? "Signing in…" : "Continue with Google"}
        onPress={onPress}
        loading={loading}
        iconLeft={<Ionicons name="logo-google" size={16} color={colors.textSoft} />}
        testID={testID}
      />
      {dividerPosition === "below" ? divider : null}
    </View>
  );
};

const styles = StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
    marginVertical: space.l,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.6,
  },
});
