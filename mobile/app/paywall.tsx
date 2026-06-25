// Lovli Pro — paywall sheet.
// PR2 ships this with PAYMENTS_ENABLED = false: visible, polished, BUT the
// purchase button is disabled and shows "Coming soon". No RevenueCat / IAP init.
// A later PR will flip the flag and wire actual purchases.
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { GlassCard } from "@/src/components/GlassCard";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { Sparkle } from "@/src/components/Sparkle";
import { flags } from "@/src/config/flags";
import { colors, radii, space, typography } from "@/src/theme";

type Plan = "weekly" | "monthly";

const BENEFITS = [
  "Unlimited replies",
  "All 10 More features",
  "Screenshot decode",
  "Lovli Memory",
];

export default function PaywallScreen() {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Plan>("monthly");

  const onSubscribe = () => {
    // PAYMENTS_ENABLED=false → purchase button shows "Coming soon" and is non-interactive.
    // Function intentionally left blank for PR2. PR9 / a later flip will wire RevenueCat.
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <Screen testID="paywall-page">
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="paywall-close">
          <Ionicons name="close" size={26} color={colors.textSoft} />
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>

      <View style={styles.hero}>
        <Sparkle size={28} glow />
        <Text style={styles.h1} testID="paywall-headline">
          Unlimited help with every situation.
        </Text>
        <Text style={styles.sub}>
          For users who want unlimited generations, all 10 features, and early access to
          new AI tools.
        </Text>
      </View>

      <GlassCard padded variant="solid">
        <View style={{ gap: 10 }}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefitRow}>
              <View style={styles.benefitTick}>
                <Ionicons name="checkmark" size={14} color={colors.text} />
              </View>
              <Text style={styles.benefit}>{b}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      <ScrollView
        horizontal={false}
        scrollEnabled={false}
        contentContainerStyle={{ gap: 12, marginTop: space.l }}
      >
        <PlanRow
          label="Weekly"
          price="₹149"
          cadence="/week"
          selected={selected === "weekly"}
          onPress={() => setSelected("weekly")}
          testID="plan-weekly"
        />
        <PlanRow
          label="Monthly"
          price="₹499"
          cadence="/month"
          badge="Most popular"
          selected={selected === "monthly"}
          onPress={() => setSelected("monthly")}
          testID="plan-monthly"
        />
      </ScrollView>

      <Text style={styles.cancel}>No commitment, cancel anytime.</Text>

      <View style={{ marginTop: space.l, gap: 8 }}>
        <PrimaryButton
          label={flags.PAYMENTS_ENABLED ? "Subscribe" : "Coming soon"}
          onPress={onSubscribe}
          disabled={!flags.PAYMENTS_ENABLED}
          testID="paywall-cta"
          withSparkle={flags.PAYMENTS_ENABLED}
        />
        <View style={styles.footerLinks}>
          <Pressable onPress={() => { /* placeholder until PR9 */ }} hitSlop={8}>
            <Text style={styles.footerLink}>Restore</Text>
          </Pressable>
          <Text style={styles.footerSep}>·</Text>
          <Pressable onPress={() => openLink("https://app.lovli.in/terms")} hitSlop={8}>
            <Text style={styles.footerLink}>Terms</Text>
          </Pressable>
          <Text style={styles.footerSep}>·</Text>
          <Pressable onPress={() => openLink("https://app.lovli.in/privacy")} hitSlop={8}>
            <Text style={styles.footerLink}>Privacy</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const PlanRow: React.FC<{
  label: string;
  price: string;
  cadence: string;
  badge?: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}> = ({ label, price, cadence, badge, selected, onPress, testID }) => (
  <Pressable
    onPress={onPress}
    testID={testID}
    style={({ pressed }) => [
      styles.plan,
      selected && styles.planSelected,
      pressed && { opacity: 0.92 },
    ]}
  >
    <View style={{ flex: 1 }}>
      <View style={styles.planTopRow}>
        <Text style={styles.planLabel}>{label}</Text>
        {badge ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.planPrice}>
        <Text style={styles.planPriceMain}>{price}</Text>
        <Text style={styles.planPriceCadence}>{cadence}</Text>
      </Text>
    </View>
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: space.s,
  },
  hero: { alignItems: "center", gap: 12, marginTop: space.m, marginBottom: space.l },
  h1: {
    ...typography.display.h1,
    color: colors.text,
    textAlign: "center",
    paddingHorizontal: space.m,
  },
  sub: {
    ...typography.body.base,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: space.l,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitTick: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.sparkle,
    alignItems: "center",
    justifyContent: "center",
  },
  benefit: { ...typography.body.bodyMedium, color: colors.text, fontSize: 15 },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radii.card,
    paddingHorizontal: space.l,
    paddingVertical: space.m + 2,
  },
  planSelected: {
    borderColor: colors.sparkle,
    backgroundColor: "rgba(124, 92, 255, 0.06)",
  },
  planTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planLabel: { ...typography.body.bodySemibold, color: colors.text, fontSize: 15 },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.violetTint,
    borderColor: colors.violet,
    borderWidth: 1,
  },
  planBadgeText: {
    ...typography.body.caption,
    color: colors.violetDeep,
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  planPrice: { marginTop: 4 },
  planPriceMain: {
    ...typography.display.h2,
    color: colors.text,
    fontSize: 22,
  },
  planPriceCadence: {
    ...typography.body.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.sparkle },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.sparkle,
  },
  cancel: {
    ...typography.body.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: space.m,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: space.s,
  },
  footerLink: { ...typography.body.caption, color: colors.textMuted },
  footerSep: { color: colors.textFaint, fontSize: 12 },
});
