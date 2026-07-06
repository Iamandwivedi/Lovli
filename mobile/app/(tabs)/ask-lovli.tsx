// Ask Lovli — V2 tab. STATIC SHELL ONLY in PR-V2-1 (goes live with
// POST /api/ask-lovli in PR-V2-4): greeting bubble + starter chips visible,
// input non-focusable, send button dimmed. No "coming soon" copy by design.
import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { Sparkle } from "@/src/components/Sparkle";
import { colors, radii, typography } from "@/src/theme";

const GREETING =
  "Hey — what's on your mind? Tell me the situation, or ask me anything. No judgement, promise.";

const STARTERS = [
  "Help me respond to a message",
  "Is this a red flag?",
  "How do I restart a dead convo?",
];

export default function AskLovliScreen() {
  return (
    <Screen scroll={false} bottomTabSpacing testID="ask-lovli-page">
      {/* Header */}
      <View style={styles.header}>
        <Sparkle size={19} color={colors.lavender} glow />
        <Text style={styles.headerTitle}>Ask Lovli</Text>
      </View>

      {/* Greeting bubble */}
      <View style={styles.lovliRow}>
        <View style={styles.lovliAvatar}>
          <Sparkle size={13} color={colors.lavender} />
        </View>
        <View style={styles.lovliBubble}>
          <Text style={styles.lovliBubbleText}>{GREETING}</Text>
        </View>
      </View>

      {/* Starter chips */}
      <View style={styles.starters}>
        {STARTERS.map((s) => (
          <View key={s} style={styles.starterChip}>
            <Text style={styles.starterText}>{s}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      {/* Input bar — disabled shell until PR-V2-4 */}
      <View style={styles.inputBar}>
        <TextInput
          editable={false}
          focusable={false}
          placeholder="Message Lovli…"
          placeholderTextColor={colors.textFaint}
          style={styles.inputField}
          testID="ask-lovli-input"
        />
        <View style={styles.sendButton} testID="ask-lovli-send">
          <Ionicons name="arrow-up" size={20} color="#050509" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  headerTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 26,
    letterSpacing: -0.4,
    color: colors.text,
  },
  lovliRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  lovliAvatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.35)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  lovliBubble: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 5,
    paddingVertical: 14,
    paddingHorizontal: 17,
    maxWidth: "82%",
  },
  lovliBubbleText: {
    ...typography.body.base,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textSoft,
  },
  starters: {
    marginTop: 12,
    marginLeft: 40,
    alignItems: "flex-start",
    gap: 8,
  },
  starterChip: {
    backgroundColor: "rgba(167,139,250,0.1)",
    borderWidth: 1,
    borderColor: colors.violetTintBorder,
    borderRadius: radii.pill,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  starterText: {
    ...typography.body.bodyMedium,
    fontSize: 13,
    color: colors.lavenderText,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputField: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 19,
    ...typography.body.base,
    fontSize: 14.5,
    color: colors.text,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.4,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
});
