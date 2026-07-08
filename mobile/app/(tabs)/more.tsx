// More · Tools — "V2 · Coach — More · Tools". 9 tools in 3 labeled sections.
// Ask Lovli is NOT in the grid (it's a tab). Decode + Read the signals use
// /decode; remaining tools keep their existing placeholder flow until PR4.
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { AppHeader } from "@/src/components/AppHeader";
import { Sparkle } from "@/src/components/Sparkle";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { colors, radii, space, typography } from "@/src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type Tool = {
  id: string;
  title: string;
  sub: string;
  icon: IoniconName | "sparkle";
  rose?: boolean;
  decode?: boolean;
  /** PR4: routes to /feature/[featureId] when set */
  featureId?: string;
};

const SECTIONS: { label: string; tools: Tool[] }[] = [
  {
    label: "MAKE SENSE OF IT",
    tools: [
      { id: "decode", title: "Decode the situation", sub: "What's really going on?", icon: "search-outline", decode: true },
      { id: "signals", title: "Read the signals", sub: "Into you, or not?", icon: "bar-chart-outline", decode: true },
      { id: "other_side", title: "The other side", sub: "How they might see it.", icon: "time-outline" },
    ],
  },
  {
    label: "MAKE A MOVE",
    tools: [
      { id: "glow_reply", title: "Glow up my reply", sub: "Make my draft land better.", icon: "sparkle" },
      { id: "what_to_do", title: "What should I do?", sub: "Your next move, mapped.", icon: "compass-outline" },
    ],
  },
  {
    label: "WORK IT OUT",
    tools: [
      { id: "settle_fight", title: "Settle the fight", sub: "Say it without the sting.", icon: "pencil-outline" },
      { id: "red_flag", title: "Red flag check", sub: "Spot it early.", icon: "flag-outline", rose: true, featureId: "red_flag_check" },
      { id: "fair_verdict", title: "Fair verdict", sub: "Who's right? Honestly.", icon: "scale-outline" },
      { id: "breakup", title: "Breakup clarity", sub: "Closure, not spiralling.", icon: "heart-dislike-outline" },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const onTool = (t: Tool) => {
    if (t.decode) {
      router.push("/decode");
      return;
    }
    if (t.featureId) {
      router.push(`/feature/${t.featureId}`);
      return;
    }
    toast.success(`${t.title} — coming soon ✦`);
  };

  return (
    <Screen testID="more-page" bottomTabSpacing>
      <AppHeader />
      <View style={{ marginTop: space.s }}>
        <Text style={styles.h1} testID="more-heading">More tools</Text>
        <Text style={styles.sub}>For when you need more than a reply.</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false}>
        {SECTIONS.map((section) => (
          <View key={section.label} style={{ marginTop: space.l }}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.grid}>
              {section.tools.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => onTool(t)}
                  testID={`more-card-${t.id}`}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                >
                  <View style={[styles.iconTile, t.rose && styles.iconTileRose]}>
                    {t.icon === "sparkle" ? (
                      <Sparkle size={15} color={colors.lavender} />
                    ) : (
                      <Ionicons
                        name={t.icon as IoniconName}
                        size={17}
                        color={t.rose ? colors.redFlag : colors.lavender}
                      />
                    )}
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>{t.title}</Text>
                  <Text style={styles.cardSub} numberOfLines={2}>{t.sub}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {user?.plan !== "pro" ? (
          <Pressable
            onPress={() => router.push("/paywall")}
            testID="more-pro-row"
            style={({ pressed }) => [styles.upsellRow, pressed && { opacity: 0.85 }]}
          >
          <View style={{ flex: 1 }}>
            <Text style={styles.upsellTitle}>Get Lovli Premium</Text>
            <Text style={styles.upsellSub}>Unlimited replies · deeper decoding · Ask Lovli anytime</Text>
          </View>
          <Text style={styles.upsellChevron}>›</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 26,
    letterSpacing: -0.4,
    color: colors.text,
  },
  sub: { ...typography.body.base, fontSize: 13.5, color: colors.textMuted, marginTop: 6 },
  sectionLabel: {
    fontFamily: typography.fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.textFaint,
    marginBottom: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    maxWidth: "48.5%",
  },
  cardPressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(167,139,250,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  iconTileRose: { backgroundColor: colors.roseTint },
  cardTitle: { ...typography.body.bodySemibold, color: colors.text, fontSize: 13.5 },
  cardSub: { ...typography.body.caption, color: colors.textFaint, fontSize: 11.5, marginTop: 3 },
  upsellRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.violetTint,
    borderColor: colors.violetTintBorder,
    borderWidth: 1,
    borderRadius: radii.card,
    paddingHorizontal: space.l,
    paddingVertical: space.l,
    marginTop: space.xl,
  },
  upsellTitle: { ...typography.body.bodySemibold, color: colors.text, fontSize: 15 },
  upsellSub: { ...typography.body.caption, color: colors.textMuted, marginTop: 4 },
  upsellChevron: { color: colors.lavenderSoft, fontSize: 22, paddingHorizontal: 6 },
});
