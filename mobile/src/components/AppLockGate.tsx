// App lock (Face ID / device passcode) behind the Settings "Lock with Face ID"
// toggle. Gate arms on cold launch and background→active. `inactive`→active is
// deliberately NOT a lock trigger — the biometric prompt itself makes the app
// inactive on iOS and would loop.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Sparkle } from "@/src/components/Sparkle";
import { storage } from "@/src/utils/storage";
import { PREFS_KEY } from "@/src/config/storage-keys";
import { shouldLock, LockTransition } from "@/src/utils/lock-logic";
import { colors, radii, typography } from "@/src/theme";

export type { LockTransition } from "@/src/utils/lock-logic";

const readFaceIdPref = async (): Promise<boolean> => {
  try {
    const raw = await storage.getItem<string>(PREFS_KEY, "");
    return raw ? JSON.parse(raw)?.face_id === true : false;
  } catch {
    return false;
  }
};

export const AppLockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locked, setLocked] = useState(false);
  const [authing, setAuthing] = useState(false);
  const prevState = useRef<AppStateStatus>(AppState.currentState);

  const unlock = useCallback(async () => {
    if (authing) return;
    setAuthing(true);
    try {
      const LocalAuthentication = await import("expo-local-authentication");
      // disableDeviceFallback stays false → graceful passcode fallback.
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Lovli",
        cancelLabel: "Cancel",
      });
      if (res.success) setLocked(false);
    } catch {
      // keep the overlay — user can retry
    } finally {
      setAuthing(false);
    }
  }, [authing]);

  const arm = useCallback(
    async (transition: LockTransition) => {
      const pref = await readFaceIdPref();
      if (shouldLock(pref, Platform.OS, transition)) {
        setLocked(true);
        unlock();
      }
    },
    [unlock],
  );

  useEffect(() => {
    arm("launch");
    const sub = AppState.addEventListener("change", (next) => {
      const prev = prevState.current;
      prevState.current = next;
      if (prev === "background" && next === "active") arm("background-to-active");
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked ? (
        <View style={styles.overlay} testID="app-lock-overlay">
          <Sparkle size={26} color={colors.lavender} glow />
          <Text style={styles.title}>Lovli is locked</Text>
          <Text style={styles.sub}>Your chats stay yours.</Text>
          <Pressable onPress={unlock} style={styles.cta} testID="app-lock-unlock">
            <Text style={styles.ctaText}>{authing ? "Unlocking…" : "Unlock"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    zIndex: 999,
  },
  title: { fontFamily: typography.fonts.displaySemibold, fontSize: 22, color: colors.text, marginTop: 8 },
  sub: { ...typography.body.base, fontSize: 13.5, color: colors.textMuted },
  cta: {
    marginTop: 18,
    backgroundColor: colors.ctaBg,
    borderRadius: radii.pill,
    paddingHorizontal: 34,
    paddingVertical: 13,
  },
  ctaText: { ...typography.body.bodyBold, fontSize: 15, color: colors.ctaText },
});
