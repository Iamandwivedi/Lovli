// Pro screen — calm, premium, AI-focused. Early access only.
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { AppHeader } from "@/src/components/AppHeader";
import { GlassCard } from "@/src/components/GlassCard";
import { Input } from "@/src/components/Input";
import { Chip } from "@/src/components/Chip";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { extractErrorMessage } from "@/src/api/client";
import { joinWaitlist } from "@/src/api/endpoints";
import { colors, fontSize, radii, space } from "@/src/theme/colors";

const REASONS = [
  "Unlimited replies",
  "Advanced memory",
  "More reply styles",
  "Early AI features",
  "Not sure yet",
];

export default function ProScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState(user?.email || "");
  const [reason, setReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [joined, setJoined] = useState(false);

  const onJoin = async () => {
    if (!email.trim()) {
      toast.error("Add your email to join the early-access list.");
      return;
    }
    try {
      setSaving(true);
      await joinWaitlist(email.trim(), "pro-tab", reason || undefined);
      setJoined(true);
      toast.success("You're on the Pro early access list.");
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save right now. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen testID="pro-page" bottomTabSpacing>
      <AppHeader />

      <View style={{ marginTop: space.m }}>
        <View style={styles.titleRow}>
          <Text style={styles.h1}>Lovli Pro</Text>
          <View style={styles.comingPill}>
            <Text style={styles.comingText}>Coming soon</Text>
          </View>
        </View>
        <Text style={styles.sub}>More replies. Smarter personalization.</Text>
        <Text style={styles.subSmall}>
          For users who want unlimited generations, better memory, and early access to new AI
          features.
        </Text>
      </View>

      <View style={{ gap: space.m }}>
        <PlanCard
          name="Free"
          tagline="For trying Lovli."
          features={[
            "8 generations/day",
            "3 replies each time",
            "Basic vibes",
            "Standard memory",
          ]}
        />
        <PlanCard
          name="Pro"
          tagline="For users who want more."
          accent
          features={[
            "Unlimited generations",
            "Advanced memory",
            "More reply styles",
            "Early access to new AI features",
          ]}
        />
      </View>

      <GlassCard padded variant="solid">
        {joined ? (
          <View testID="pro-joined-block">
            <Text style={styles.thanksTitle}>You're on the list ✦</Text>
            <Text style={styles.sub}>
              We'll email you when Pro opens.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.cardTitle}>Get Early Access</Text>
            <Text style={styles.cardSub}>Tell us what you want most.</Text>

            <View style={{ marginTop: space.l, gap: space.m }}>
              <Input
                label="Email"
                placeholder="you@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                inputTestID="pro-email-input"
              />
              <Text style={styles.subSection}>What do you want most from Pro?</Text>
              <View style={styles.chipsRow}>
                {REASONS.map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    selected={reason === r}
                    onPress={() => setReason(r)}
                    testID={`pro-reason-${r}`}
                  />
                ))}
              </View>
              <PrimaryButton
                label={saving ? "Saving…" : "Get Early Access"}
                onPress={onJoin}
                loading={saving}
                testID="pro-early-access-button"
              />
            </View>
          </>
        )}
      </GlassCard>
    </Screen>
  );
}

const PlanCard: React.FC<{
  name: string;
  tagline: string;
  features: string[];
  accent?: boolean;
}> = ({ name, tagline, features, accent }) => {
  return (
    <View style={[styles.planCard, accent && styles.planAccent]}>
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{name}</Text>
        {accent ? (
          <View style={styles.planPill}>
            <Text style={styles.planPillText}>Coming soon</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.planTagline}>{tagline}</Text>
      <View style={{ marginTop: space.m, gap: 8 }}>
        {features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons
              name="checkmark"
              size={14}
              color={accent ? colors.lavender : colors.textSoft}
            />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  h1: { color: colors.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  comingPill: {
    backgroundColor: "rgba(167, 139, 250, 0.12)",
    borderColor: "rgba(167, 139, 250, 0.4)",
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  comingText: {
    color: colors.lavenderSoft,
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sub: { color: colors.textSoft, fontSize: fontSize.md, marginTop: 8 },
  subSmall: { color: colors.textMuted, fontSize: fontSize.base, marginTop: 6, lineHeight: 20 },
  planCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: space.l + 2,
  },
  planAccent: {
    borderColor: colors.lavender,
    backgroundColor: "rgba(167, 139, 250, 0.06)",
    shadowColor: colors.lavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  planName: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700" },
  planPill: {
    backgroundColor: "rgba(167, 139, 250, 0.16)",
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  planPillText: {
    color: colors.lavenderSoft,
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  planTagline: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { color: colors.textSoft, fontSize: fontSize.base },
  cardTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "600" },
  cardSub: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 },
  subSection: { color: colors.textSoft, fontSize: fontSize.sm, fontWeight: "600" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thanksTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
});
