// Premium — "V2 · Coach — Premium". VISUAL ONLY (PAYMENTS_ENABLED=false):
// CTA joins the pro waitlist via POST /api/waitlist {type:'pro', source:'premium_v2'}.
// Modal screen — no tab bar.
import React, { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AmbientGlow } from "@/src/components/AmbientGlow";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Sparkle } from "@/src/components/Sparkle";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { joinWaitlist } from "@/src/api/endpoints";
import { extractErrorMessage } from "@/src/api/client";
import { colors, gradients, radii, typography } from "@/src/theme";

const OUTCOMES = [
  "Unlimited replies, any situation",
  "Relationship memory for everyone you're talking to",
  "Deeper message decoding",
  "Ask Lovli anytime — no limits",
  "Priority AI — faster, sharper answers",
];

export default function PremiumScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [plan, setPlan] = useState<"yearly" | "monthly">("yearly");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  const onCta = async () => {
    if (joined) return;
    try {
      setBusy(true);
      await joinWaitlist(user?.email || "", "premium_v2", plan);
      setJoined(true);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not save that. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={gradients.hero} style={{ flex: 1 }} testID="paywall-page">
      <AmbientGlow size={420} style={styles.glow} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.closeCircle} hitSlop={10} testID="paywall-close">
            <Ionicons name="close" size={17} color={colors.textMuted} />
          </Pressable>
          <View style={styles.brandRow}>
            <Sparkle size={13} color={colors.lavender} />
            <Text style={styles.brand}>LOVLI PREMIUM</Text>
          </View>
        </View>

        {/* Before / after */}
        <Text style={styles.strike}>Overthinking every text.</Text>
        <Text style={styles.h1} testID="paywall-headline">Always know{"\n"}what to say.</Text>

        {/* Outcome checklist */}
        <View style={styles.checklist}>
          {OUTCOMES.map((o) => (
            <View key={o} style={styles.checkRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={15} color={colors.lavender} />
              </View>
              <Text style={styles.checkText}>{o}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <Pressable
          onPress={() => setPlan("yearly")}
          style={[styles.plan, plan === "yearly" ? styles.planSelected : styles.planFlat]}
          testID="plan-yearly"
        >
          <View style={styles.bestValue}><Text style={styles.bestValueText}>BEST VALUE</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>Yearly</Text>
            <Text style={styles.planPerk}>2 months free</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.planPrice}>₹291<Text style={styles.planPer}>/mo</Text></Text>
            <Text style={styles.planNote}>₹3,499 billed yearly</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setPlan("monthly")}
          style={[styles.plan, plan === "monthly" ? styles.planSelected : styles.planFlat, { marginTop: 10 }]}
          testID="plan-monthly"
        >
          <Text style={[styles.planName, { flex: 1 }]}>Monthly</Text>
          <Text style={styles.planPrice}>₹399<Text style={styles.planPer}>/mo</Text></Text>
        </Pressable>

        {/* CTA / confirmation */}
        {joined ? (
          <View style={styles.confirm} testID="paywall-confirmation">
            <Sparkle size={16} color={colors.lavender} glow />
            <Text style={styles.confirmTitle}>{"You're on the list."}</Text>
            <Text style={styles.confirmSub}>
              {"I'll ping you the moment Premium opens up — you're near the front."}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 22 }}>
            <PrimaryButton
              label="Start 7 days free"
              onPress={onCta}
              loading={busy}
              testID="paywall-cta"
            />
            <View style={styles.footerLinks}>
              <Text style={styles.footerText}>Then ₹3,499/year</Text>
              <Text style={styles.footerSep}>·</Text>
              <Pressable onPress={() => toast.success("Nothing to restore yet — payments open soon.")} hitSlop={8} testID="paywall-restore">
                <Text style={styles.footerText}>Restore</Text>
              </Pressable>
              <Text style={styles.footerSep}>·</Text>
              <Pressable onPress={() => openLink("https://app.lovli.in/terms")} hitSlop={8}>
                <Text style={styles.footerText}>Terms</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute", top: -120, alignSelf: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeCircle: {
    width: 32, height: 32, borderRadius: 999, backgroundColor: "rgba(248,250,252,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  brand: { fontFamily: typography.fonts.bodyBold, fontSize: 13, letterSpacing: 0.5, color: colors.lavenderText },
  strike: {
    ...typography.body.base, fontSize: 15, color: colors.textFaint, marginTop: 34,
    textDecorationLine: "line-through", textDecorationColor: "rgba(224,102,122,0.6)",
  },
  h1: {
    fontFamily: typography.fonts.displaySemibold, fontSize: 34, lineHeight: 39,
    letterSpacing: -0.7, color: colors.text, marginTop: 8,
  },
  checklist: { gap: 14, marginTop: 26 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkCircle: {
    width: 28, height: 28, borderRadius: 999, backgroundColor: colors.violetTint,
    alignItems: "center", justifyContent: "center",
  },
  checkText: { ...typography.body.bodyMedium, fontSize: 15, color: colors.textSoft, flex: 1 },
  plan: {
    flexDirection: "row", alignItems: "center", borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 16, marginTop: 28,
  },
  planSelected: {
    backgroundColor: colors.surfaceRaised, borderWidth: 1.5, borderColor: colors.lavender,
    shadowColor: "#A78BFA", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25,
    shadowRadius: 24, elevation: 6,
  },
  planFlat: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
  bestValue: {
    position: "absolute", top: -10, right: 14, backgroundColor: colors.lavender,
    borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3,
    shadowColor: "#A78BFA", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10,
  },
  bestValueText: { fontFamily: typography.fonts.bodyBold, fontSize: 10.5, color: "#050509" },
  planName: { ...typography.body.bodyBold, fontSize: 15, color: colors.text },
  planPerk: { ...typography.body.bodySemibold, fontSize: 12.5, color: colors.lavenderText, marginTop: 3 },
  planPrice: { ...typography.body.bodyBold, fontSize: 17, color: colors.text },
  planPer: { ...typography.body.base, fontSize: 13, color: colors.textFaint },
  planNote: { ...typography.body.caption, fontSize: 12, color: colors.textFaint, marginTop: 2 },
  confirm: { alignItems: "center", gap: 8, marginTop: 30, paddingHorizontal: 16 },
  confirmTitle: { fontFamily: typography.fonts.displaySemibold, fontSize: 22, color: colors.text },
  confirmSub: { ...typography.body.base, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  footerLinks: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14 },
  footerText: { ...typography.body.caption, fontSize: 12, color: colors.textFaint },
  footerSep: { color: colors.textDim, fontSize: 12 },
});
