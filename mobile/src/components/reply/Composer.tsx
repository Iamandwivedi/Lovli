// Composer (Reply home V4): one raised glass container holding the text
// field, an optional screenshot thumbnail, and a 44pt toolbar with paste and
// screenshot buttons on the left and the send button on the right. Send is
// disabled until there is a screenshot or some text, so the old "show me the
// conversation first" toast can no longer fire.
import React from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptic } from "@/src/lib/haptics";
import { colors, radii, space, typography } from "@/src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  imageUri: string | null;
  canSend: boolean;
  onPaste: () => void;
  onPickImage: () => void;
  onRemoveImage: () => void;
  onSend: () => void;
};

const LINE = typography.body.large.lineHeight ?? 24;

export const Composer: React.FC<Props> = ({
  value,
  onChangeText,
  imageUri,
  canSend,
  onPaste,
  onPickImage,
  onRemoveImage,
  onSend,
}) => (
  <View style={styles.shell} testID="composer">
    {imageUri ? (
      <View style={styles.thumbRow}>
        <View style={styles.thumbWrap} testID="upload-preview">
          <View style={styles.thumbClip}>
            <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
          </View>
          <Pressable
            onPress={onRemoveImage}
            testID="upload-remove-button"
            accessibilityRole="button"
            accessibilityLabel="Remove screenshot"
            hitSlop={12}
            style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="close" size={13} color={colors.ctaText} />
          </Pressable>
        </View>
      </View>
    ) : null}

    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={imageUri ? "Add a note (optional)" : "Paste their last text, or type what they said"}
      placeholderTextColor={colors.textFaint}
      cursorColor={colors.violet}
      selectionColor={colors.violet}
      multiline
      scrollEnabled
      textAlignVertical="top"
      style={styles.input}
      testID="manual-text-input"
      accessibilityLabel="Their last text"
    />

    <View style={styles.toolbar}>
      <View style={styles.toolsLeft}>
        <IconButton icon="clipboard-outline" label="Paste from clipboard" onPress={onPaste} testID="capture-paste" />
        <IconButton icon="image-outline" label="Choose a screenshot" onPress={onPickImage} testID="upload-area" />
      </View>
      <Pressable
        onPress={() => {
          haptic.medium();
          onSend();
        }}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Get replies"
        accessibilityState={{ disabled: !canSend }}
        testID="generate-replies-button"
        style={({ pressed }) => [
          styles.send,
          canSend ? styles.sendOn : styles.sendOff,
          pressed && canSend && { transform: [{ scale: 0.96 }] },
        ]}
      >
        <Ionicons name="arrow-up" size={22} color={canSend ? colors.ctaText : colors.textDisabled} />
      </Pressable>
    </View>
  </View>
);

const IconButton: React.FC<{ icon: IoniconName; label: string; onPress: () => void; testID: string }> = ({
  icon,
  label,
  onPress,
  testID,
}) => (
  <Pressable
    onPress={() => {
      haptic.selection();
      onPress();
    }}
    accessibilityRole="button"
    accessibilityLabel={label}
    testID={testID}
    style={styles.iconHit}
  >
    {({ pressed }) => (
      <View style={[styles.iconCircle, pressed && styles.iconPressed]}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  shell: {
    minHeight: 116,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.glassStroke,
    borderWidth: 1,
    borderRadius: radii.input,
    paddingTop: 14,
    paddingHorizontal: space.l,
    paddingBottom: 10,
    shadowColor: colors.shadowCard,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 6,
  },
  input: {
    ...typography.body.large,
    color: colors.textPrimary,
    minHeight: LINE * 2,
    maxHeight: LINE * 4,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  thumbRow: { flexDirection: "row", marginBottom: 14 },
  thumbWrap: { width: 56, height: 56 },
  thumbClip: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    overflow: "hidden",
    backgroundColor: colors.glassFillLow,
  },
  thumb: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ctaBg,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbar: {
    height: 44,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toolsLeft: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: -2 },
  iconHit: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassFill,
    borderColor: colors.glassStroke,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPressed: { backgroundColor: colors.surfaceRaised },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOn: {
    backgroundColor: colors.ctaBg,
    shadowColor: colors.ctaShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  sendOff: { backgroundColor: colors.glassFill },
});
