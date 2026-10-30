// App-switcher / recents protection (research §11). Someone glancing at the
// multitasking view should not see her messages.
//   iOS     → expo-screen-capture blurs the snapshot the system takes for the
//             app switcher (enableAppSwitcherProtectionAsync).
//   Android → FLAG_SECURE via preventScreenCaptureAsync: recents shows a blank
//             surface (it also blocks screenshots of Lovli itself).
// Preference-driven (Settings → "Hide chats in app switcher"), default ON.
import { Platform } from "react-native";

const KEY = "lovli-app-switcher";

export async function applyAppSwitcherProtection(enabled: boolean): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const ScreenCapture = await import("expo-screen-capture");
    if (Platform.OS === "ios") {
      if (enabled) await ScreenCapture.enableAppSwitcherProtectionAsync();
      else await ScreenCapture.disableAppSwitcherProtectionAsync();
      return;
    }
    if (enabled) await ScreenCapture.preventScreenCaptureAsync(KEY);
    else await ScreenCapture.allowScreenCaptureAsync(KEY);
  } catch {
    // Module missing in this build (e.g. Expo Go) — nothing to protect with.
  }
}
