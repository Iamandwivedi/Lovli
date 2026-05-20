// Lightweight in-app toast. Avoids extra dependencies.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radii, space } from "@/src/theme/colors";

type ToastKind = "default" | "success" | "error";
type ToastState = { id: number; message: string; kind: ToastKind };

type ToastContextValue = {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const idRef = useRef(0);

  const show = useCallback(
    (message: string, kind: ToastKind = "default") => {
      idRef.current += 1;
      const id = idRef.current;
      setToast({ id, message, kind });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, 2800);
    return () => clearTimeout(t);
  }, [toast, opacity, translateY]);

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { opacity, transform: [{ translateY }] }]}
        >
          <View
            style={[
              styles.toast,
              toast.kind === "success" && styles.success,
              toast.kind === "error" && styles.error,
            ]}
          >
            <Text style={styles.text} testID="toast-message">
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: space.l,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: colors.cardGlass,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  text: {
    color: colors.text,
    fontSize: fontSize.base,
    textAlign: "center",
  },
  success: { borderColor: colors.lavender + "55" },
  error: { borderColor: colors.danger + "55" },
});
