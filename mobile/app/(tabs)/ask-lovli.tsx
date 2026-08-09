// Ask Lovli — V3 glass chat tab.
// Lovli bubbles left (✦ avatar w/ glow), user bubbles right (lavender tint).
// Starter chips send as user messages and hide once the thread starts.
// Typing indicator while waiting; failed sends get a retry affordance.
// Thread persists locally (AsyncStorage) — no thread-reset UI in this PR.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { Screen } from "@/src/components/Screen";
import { Sparkle } from "@/src/components/Sparkle";
import { useToast } from "@/src/context/ToastContext";
import { askLovli, AskLovliTurn } from "@/src/api/endpoints";
import { extractErrorMessage } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { ASK_PENDING_KEY, ASK_THREAD_KEY } from "@/src/config/storage-keys";
import { colors, radii, typography } from "@/src/theme";

const GREETING =
  "Hey — what's on your mind? Tell me the situation, or ask me anything. No judgement, promise.";

const STARTERS = [
  "Help me respond to a message",
  "Is this a red flag?",
  "How do I restart a dead convo?",
];

const THREAD_KEY = ASK_THREAD_KEY;

type Msg = {
  id: string;
  role: "user" | "lovli";
  text: string;
  failed?: boolean;
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function AskLovliScreen() {
  const toast = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Restore thread
  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem<string>(THREAD_KEY, "");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setMessages(parsed);
        }
      } catch {
        // start fresh
      }
      setLoaded(true);
    })();
  }, []);

  // Persist thread
  useEffect(() => {
    if (!loaded) return;
    storage.setItem(THREAD_KEY, JSON.stringify(messages.slice(-60))).catch(() => {});
  }, [messages, loaded]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, typing, scrollToEnd]);

  const deliver = useCallback(
    async (
      userMsgId: string,
      text: string,
      priorHistory: AskLovliTurn[],
      personId: string | null = null,
    ) => {
      setTyping(true);
      try {
        const { reply } = await askLovli(text, priorHistory, personId);
        setMessages((cur) => [
          ...cur,
          { id: makeId(), role: "lovli", text: reply },
        ]);
      } catch (err) {
        setMessages((cur) =>
          cur.map((m) => (m.id === userMsgId ? { ...m, failed: true } : m)),
        );
        toast.error(extractErrorMessage(err, "Message didn't send. Tap it to retry."));
      } finally {
        setTyping(false);
      }
    },
    [toast],
  );

  const send = useCallback(
    (raw: string, personId: string | null = null) => {
      const text = raw.trim();
      if (!text || typing) return;
      const id = makeId();
      // History Lovli sees = successful turns so far (greeting is display-only).
      const priorHistory: AskLovliTurn[] = messages
        .filter((m) => !m.failed)
        .map((m) => ({ role: m.role, text: m.text }));
      setMessages((cur) => [...cur, { id, role: "user", text }]);
      setInput("");
      deliver(id, text, priorHistory, personId);
    },
    [messages, typing, deliver],
  );

  // PR-V2-5: consume pending context handed off from Decode ("Ask Lovli about this").
  useFocusEffect(
    useCallback(() => {
      if (!loaded) return;
      (async () => {
        try {
          const raw = await storage.getItem<string>(ASK_PENDING_KEY, "");
          if (!raw) return;
          await storage.removeItem(ASK_PENDING_KEY);
          const pending = JSON.parse(raw);
          if (pending?.text) send(String(pending.text), pending.personId ?? null);
        } catch {
          // drop malformed pending payloads
        }
      })();
    }, [loaded, send]),
  );

  const retry = useCallback(
    (msg: Msg) => {
      if (typing) return;
      const priorHistory: AskLovliTurn[] = messages
        .filter((m) => !m.failed && m.id !== msg.id)
        .map((m) => ({ role: m.role, text: m.text }));
      setMessages((cur) =>
        cur.map((m) => (m.id === msg.id ? { ...m, failed: false } : m)),
      );
      deliver(msg.id, msg.text, priorHistory);
    },
    [messages, typing, deliver],
  );

  const threadStarted = messages.length > 0;

  return (
    <Screen scroll={false} bottomTabSpacing keyboardAvoiding testID="ask-lovli-page">
      {/* Header */}
      <View style={styles.header}>
        <Sparkle size={19} color={colors.lavender} glow />
        <Text style={styles.headerTitle}>Ask Lovli</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.thread}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Greeting — always first, display-only */}
        <LovliBubble text={GREETING} />

        {/* Starter chips — until the conversation starts */}
        {!threadStarted ? (
          <View style={styles.starters}>
            {STARTERS.map((s) => (
              <Pressable
                key={s}
                onPress={() => send(s)}
                testID={`starter-${s}`}
                style={({ pressed }) => [styles.starterChip, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.starterText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {messages.map((m) =>
          m.role === "lovli" ? (
            <LovliBubble key={m.id} text={m.text} />
          ) : (
            <View key={m.id} style={styles.userWrap}>
              <Pressable
                onPress={() => m.failed && retry(m)}
                disabled={!m.failed}
                testID={m.failed ? "failed-message" : undefined}
                style={[styles.userBubble, m.failed && styles.userBubbleFailed]}
              >
                <Text style={styles.userText}>{m.text}</Text>
              </Pressable>
              {m.failed ? (
                <Pressable
                  onPress={() => retry(m)}
                  style={styles.retryRow}
                  testID="retry-send"
                  hitSlop={8}
                >
                  <Ionicons name="refresh" size={12} color={colors.pink} />
                  <Text style={styles.retryText}>{"Didn't send — tap to retry"}</Text>
                </Pressable>
              ) : null}
            </View>
          ),
        )}

        {typing ? <TypingBubble /> : null}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Message Lovli…"
          placeholderTextColor={colors.textFaint}
          style={styles.inputField}
          returnKeyType="send"
          onSubmitEditing={() => send(input)}
          blurOnSubmit={false}
          testID="ask-lovli-input"
        />
        <Pressable
          onPress={() => send(input)}
          disabled={!input.trim() || typing}
          testID="ask-lovli-send"
          style={({ pressed }) => [
            styles.sendButton,
            (!input.trim() || typing) && { opacity: 0.4 },
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
        >
          <Ionicons name="arrow-up" size={20} color="#050509" />
        </Pressable>
      </View>
    </Screen>
  );
}

const LovliBubble: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.lovliRow}>
    <View style={styles.lovliAvatar}>
      <Sparkle size={13} color={colors.lavender} />
    </View>
    <View style={styles.lovliBubble}>
      <Text style={styles.lovliBubbleText}>{text}</Text>
    </View>
  </View>
);

const TypingBubble: React.FC = () => {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 550, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.lovliRow} testID="typing-indicator">
      <Animated.View style={[styles.lovliAvatar, { opacity: pulse }]}>
        <Sparkle size={13} color={colors.lavender} />
      </Animated.View>
      <View style={[styles.lovliBubble, styles.typingBubble]}>
        <Animated.Text style={[styles.typingDots, { opacity: pulse }]}>…</Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: typography.fonts.displayBold,
    fontSize: 26,
    letterSpacing: 0,
    color: colors.text,
  },
  thread: {
    gap: 12,
    paddingBottom: 16,
    paddingTop: 4,
  },
  lovliRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  lovliAvatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
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
    backgroundColor: colors.surfaceSoft,
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
  typingBubble: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  typingDots: {
    fontSize: 20,
    lineHeight: 22,
    color: colors.lavenderText,
    letterSpacing: 2,
  },
  userWrap: {
    alignItems: "flex-end",
  },
  userBubble: {
    backgroundColor: "rgba(167,139,250,0.16)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: "82%",
  },
  userBubbleFailed: {
    borderWidth: 1,
    borderColor: "rgba(224,102,122,0.5)",
  },
  userText: {
    ...typography.body.base,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.text,
  },
  retryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    paddingRight: 4,
  },
  retryText: {
    ...typography.body.caption,
    fontSize: 11.5,
    color: colors.pink,
  },
  starters: {
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
    paddingTop: 10,
  },
  inputField: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
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
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
});
