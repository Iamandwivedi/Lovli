// Haptics — one place, one rule per gesture (research §12):
//   selection  → every chip / tab change
//   light      → card press-in
//   success    → copy, Keep (fact saved)
//   warning    → daily limit only. Never on errors (double punishment).
// Web and simulators have no engine; every call is fire-and-forget.
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const supported = Platform.OS !== "web";

export const haptic = {
  selection: () => {
    if (supported) Haptics.selectionAsync().catch(() => {});
  },
  light: () => {
    if (supported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium: () => {
    if (supported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success: () => {
    if (supported) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  },
  warning: () => {
    if (supported) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  },
};
