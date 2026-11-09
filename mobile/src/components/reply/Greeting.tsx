// Greeting (Reply home V4): two display.hero lines, "Hey Aman" with the name
// in lavender and "What's going on?" beneath. If the first line would wrap at
// hero size both lines drop to display.h1; that is measured with onTextLayout,
// never guessed from the name's length. With the keyboard open the greeting
// collapses to one display.h2 line, "What's going on, Aman?".
import React, { useEffect, useState } from "react";
import {
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextLayoutEventData,
  View,
} from "react-native";
import { colors, typography } from "@/src/theme";

type Props = {
  /** First whitespace separated token of the user's name, or null. */
  firstName: string | null;
  /** Keyboard open: one h2 line, no subline. */
  compact?: boolean;
  subline?: string | null;
  sublineColor?: string;
};

const QUESTION = "What's going on?";

export const Greeting: React.FC<Props> = ({ firstName, compact = false, subline, sublineColor }) => {
  const [size, setSize] = useState<"hero" | "h1">("hero");
  const [measured, setMeasured] = useState(false);

  // A new name re-measures from hero size.
  useEffect(() => {
    setSize("hero");
    setMeasured(false);
  }, [firstName]);

  const onLine1Layout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const wrapped = e.nativeEvent.lines.length > 1;
    if (wrapped && size === "hero") {
      setSize("h1");
      return;
    }
    setMeasured(true);
  };

  if (compact) {
    return (
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={firstName ? `What's going on, ${firstName}?` : QUESTION}
        testID="reply-greeting"
      >
        <Text style={styles.compact} numberOfLines={1}>
          {firstName ? (
            <>
              {"What's going on, "}
              <Text style={styles.name}>{firstName}</Text>
              {"?"}
            </>
          ) : (
            QUESTION
          )}
        </Text>
      </View>
    );
  }

  const lineStyle = size === "hero" ? styles.hero : styles.h1;
  const line1Plain = firstName ? `Hey ${firstName}` : "Hey there";

  return (
    <View>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${line1Plain}. ${QUESTION}`}
        testID="reply-greeting"
        style={{ opacity: measured ? 1 : 0 }}
      >
        <Text style={lineStyle} onTextLayout={onLine1Layout} testID="reply-greeting-line1">
          {firstName ? (
            <>
              {"Hey "}
              <Text style={styles.name}>{firstName}</Text>
            </>
          ) : (
            "Hey there"
          )}
        </Text>
        <Text style={lineStyle}>{QUESTION}</Text>
      </View>
      {subline ? (
        <Text style={[styles.subline, sublineColor ? { color: sublineColor } : null]} testID="reply-subline">
          {subline}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { ...typography.display.hero, color: colors.text },
  h1: { ...typography.display.h1, color: colors.text },
  compact: { ...typography.display.h2, color: colors.text },
  name: { color: colors.lavenderText },
  subline: { ...typography.body.base, color: colors.textMuted, marginTop: 8 },
});
