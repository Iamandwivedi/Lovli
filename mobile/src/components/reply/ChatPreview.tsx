// Chat preview card — "V2 · Coach — Reply · Intent".
// Renders parsed conversation bubbles: theirs left (#171827), user's right (lavender tint).
// Falls back to the screenshot thumbnail when only an image was provided.
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { ParsedMessage } from "@/src/utils/chatParse";
import { colors, typography } from "@/src/theme";

type Props = {
  messages: ParsedMessage[];
  imageUri?: string | null;
};

export const ChatPreview: React.FC<Props> = ({ messages, imageUri }) => {
  return (
    <View style={styles.card} testID="intent-chat-preview">
      {messages.length > 0 ? (
        messages.map((msg, i) =>
          msg.side === "me" ? (
            <View key={i} style={[styles.bubble, styles.me]}>
              <Text style={styles.meText}>{msg.text}</Text>
            </View>
          ) : (
            <View key={i} style={[styles.bubble, styles.them]}>
              <Text style={styles.themText}>{msg.text}</Text>
            </View>
          ),
        )
      ) : imageUri ? (
        <>
          <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
          <Text style={styles.thumbCaption}>
            Your screenshot — I'll read every line while I write.
          </Text>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  bubble: {
    maxWidth: "78%",
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  them: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 4,
  },
  themText: {
    ...typography.body.small,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  me: {
    alignSelf: "flex-end",
    backgroundColor: colors.violetTint,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 14,
  },
  meText: {
    ...typography.body.small,
    fontSize: 13,
    lineHeight: 18,
    color: colors.lavenderText,
  },
  thumb: {
    width: "100%",
    height: 170,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  thumbCaption: {
    ...typography.body.caption,
    color: colors.textFaint,
    textAlign: "center",
    marginTop: 2,
  },
});
