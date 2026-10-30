// Privacy summary sheet (research §11): six cards, one line each. Opened from
// the "Private · How it works" line on Reply home and from Settings — never
// forced before an upload. Every line here must stay true to the backend — if the retention
// rule changes, change this copy in the same PR.
import React from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { haptic } from "@/src/lib/haptics";
import { colors, radii, typography } from "@/src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export const PRIVACY_CARDS: { icon: IoniconName; title: string; line: string }[] = [
  {
    icon: "image-outline",
    title: "Your screenshot",
    line: "Sent to our server once so Lovli can read it. The image itself is not saved.",
  },
  {
    icon: "person-outline",
    title: "Their name and facts",
    line: "Stored only when you tap Keep or add them yourself. Edit or delete any time.",
  },
  {
    icon: "color-wand-outline",
    title: "Your style",
    line: "Lovli learns from what you copy and edit so replies sound like you. Pause or wipe it in Settings.",
  },
  {
    icon: "mail-outline",
    title: "Login",
    line: "Your email, nothing else. No contacts, no phone book.",
  },
  {
    icon: "time-outline",
    title: "Saved results",
    line: "Replies and pasted text are kept so Recent works. One tap in Settings wipes them.",
  },
  {
    icon: "trash-outline",
    title: "Delete everything",
    line: "Settings → Delete my memories removes every person, result and learned preference.",
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  /** First-upload variant: the CTA continues into the picker. */
  primaryLabel?: string;
  onPrimary?: () => void;
};

export const PrivacySheet: React.FC<Props> = ({ visible, onClose, primaryLabel = "Got it", onPrimary }) => {
  const insets = useSafeAreaInsets();
  const Surface = Platform.OS === "ios" ? BlurView : View;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <Surface
        {...(Platform.OS === "ios" ? { tint: "dark" as const, intensity: 70 } : {})}
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}
        testID="privacy-sheet"
      >
        <View style={styles.grabber} />
        <Text style={styles.title}>What happens to your screenshot</Text>
        <Text style={styles.sub}>Plain language, no fine print. You can reread this in Settings.</Text>
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {PRIVACY_CARDS.map((c) => (
            <View key={c.title} style={styles.card}>
              <View style={styles.iconTile}>
                <Ionicons name={c.icon} size={16} color={colors.lavender} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardLine}>{c.line}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <PrimaryButton
          label={primaryLabel}
          withSparkle={false}
          onPress={() => {
            haptic.selection();
            (onPrimary || onClose)();
          }}
          style={{ marginTop: 14 }}
          testID="privacy-sheet-cta"
        />
      </Surface>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: Platform.OS === "ios" ? "rgba(17,18,28,0.72)" : colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.glassStrokeStrong,
    paddingHorizontal: 20,
    paddingTop: 10,
    overflow: "hidden",
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 14,
  },
  title: {
    fontFamily: typography.fonts.displayBold,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: 0,
    color: colors.text,
  },
  sub: { ...typography.body.base, fontSize: 13.5, color: colors.textMuted, marginTop: 6, marginBottom: 14 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.violetTint,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { ...typography.body.bodySemibold, fontSize: 14, color: colors.text },
  cardLine: { ...typography.body.base, fontSize: 13, lineHeight: 18.5, color: colors.textMuted, marginTop: 2 },
});
