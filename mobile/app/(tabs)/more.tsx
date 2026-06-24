// More tab — feature hub (10 cards, 2-col grid).
// PR2: cards render correctly and route to per-feature placeholders.
// PR4+ will replace the placeholder with the real Input → Loading → Result skeleton.
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { AppHeader } from "@/src/components/AppHeader";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { MORE_FEATURES, MoreFeature } from "@/src/constants/more-features";
import { colors, radii, space, typography } from "@/src/theme";

export default function MoreScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const creditsText =
    user?.plan === "pro"
      ? "Pro"
      : `${Math.max(0, (user?.daily_limit ?? 10) - (user?.daily_generation_count ?? 0))} free left`;
  const creditsTone = user?.plan === "pro" ? ("pro" as const) : ("default" as const);

  const onCardPress = (f: MoreFeature) => {
    // PR2 stub. PR4–6 will route to the real feature flow:
    //   router.push({ pathname: "/feature/[id]", params: { id: f.id } });
    toast.show?.(`${f.title} — coming soon ✦`) ??
      toast.success(`${f.title} — coming soon ✦`);
  };

  return (
    <Screen testID="more-page" bottomTabSpacing>
      <AppHeader credits={{ text: creditsText, tone: creditsTone }} />

      <View style={{ marginTop: space.m, marginBottom: space.s }}>
        <Text style={styles.h1} testID="more-heading">
          More
        </Text>
        <Text style={styles.sub}>
          Pick a situation, Lovli handles the rest.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {MORE_FEATURES.map((f) => (
          <FeatureCard key={f.id} feature={f} onPress={() => onCardPress(f)} />
        ))}
      </ScrollView>

      <View style={styles.upsell}>
        <Pressable
          onPress={() => router.push("/paywall")}
          testID="more-pro-row"
          style={({ pressed }) => [styles.upsellRow, pressed && { opacity: 0.85 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.upsellTitle}>Get Lovli Pro</Text>
            <Text style={styles.upsellSub}>
              Unlimited generations · all 10 features · screenshot decode · Memory
            </Text>
          </View>
          <Text style={styles.upsellChevron}>›</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const FeatureCard: React.FC<{ feature: MoreFeature; onPress: () => void }> = ({
  feature,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    testID={`more-card-${feature.id}`}
    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
  >
    <View style={styles.iconTile}>
      <Text style={styles.icon}>{feature.emoji}</Text>
    </View>
    <Text style={styles.cardTitle} numberOfLines={2}>
      {feature.title}
    </Text>
    <Text style={styles.cardSub} numberOfLines={2}>
      {feature.sub}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  h1: { ...typography.display.h1, color: colors.text },
  sub: { ...typography.body.base, color: colors.textMuted, marginTop: 6 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48%",
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: space.l,
    minHeight: 140,
  },
  cardPressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(124, 92, 255, 0.10)",
    borderColor: "rgba(124, 92, 255, 0.22)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  icon: { fontSize: 20 },
  cardTitle: {
    ...typography.body.bodySemibold,
    color: colors.text,
    fontSize: 15,
  },
  cardSub: {
    ...typography.body.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  upsell: { marginTop: space.l },
  upsellRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(124, 92, 255, 0.08)",
    borderColor: "rgba(124, 92, 255, 0.30)",
    borderWidth: 1,
    borderRadius: radii.card,
    paddingHorizontal: space.l,
    paddingVertical: space.l,
  },
  upsellTitle: {
    ...typography.body.bodySemibold,
    color: colors.text,
    fontSize: 15,
  },
  upsellSub: {
    ...typography.body.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  upsellChevron: {
    color: colors.lavenderSoft,
    fontSize: 22,
    paddingHorizontal: 6,
  },
});
