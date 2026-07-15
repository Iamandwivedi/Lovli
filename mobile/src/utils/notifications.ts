// Local notification scheduling (final PR). 100% local — no push server.
// DISCREET BY DEFAULT: lock-screen copy never names a person or event unless
// the user opts in via the "Show details in notifications" toggle.
import { Platform } from "react-native";
import { MemoryCard, listMemoryCards } from "@/src/api/endpoints";
import { storage } from "@/src/utils/storage";
import { PREFS_KEY } from "@/src/config/storage-keys";
import { upcomingWithDates } from "@/src/utils/notification-logic";

export type NotifPrefs = { reminders: boolean; checkin: boolean; details: boolean };

const isSupported = Platform.OS !== "web";

/** Foreground display behaviour — call once on app start (no-op on web). */
export async function initNotifications() {
  if (!isSupported) return;
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Contextual permission ask (on toggle ON). Returns the resulting state. */
export async function ensureNotifPermission(): Promise<"granted" | "denied" | "blocked"> {
  if (!isSupported) return "denied";
  const Notifications = await import("expo-notifications");
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return "granted";
  if (!cur.canAskAgain) return "blocked";
  const req = await Notifications.requestPermissionsAsync();
  if (req.granted) return "granted";
  return req.canAskAgain ? "denied" : "blocked";
}

/** Cancel-all-and-reschedule (idempotent). Silently no-ops on web / no permission. */
export async function syncNotifications(prefs: NotifPrefs, cards: MemoryCard[]) {
  if (!isSupported) return;
  const Notifications = await import("expo-notifications");
  await Notifications.cancelAllScheduledNotificationsAsync();
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Lovli",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  if (prefs.reminders) {
    for (const u of upcomingWithDates(cards)) {
      await Notifications.scheduleNotificationAsync({
        content: prefs.details
          ? { title: `${u.title} — ${u.nickname} ✦`, body: "Today. You've got this." }
          : { title: "You've got something today ✦", body: "Open Lovli to see what's coming up." },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: u.fireAt,
        },
      });
    }
  }
  if (prefs.checkin) {
    await Notifications.scheduleNotificationAsync({
      // Already-discreet copy — keep as approved.
      content: { title: "Lovli here — quick check-in?", body: "Two minutes. How's it going?" },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour: 18,
        minute: 0,
      },
    });
  }
}

/** Read prefs + cards and resync. Safe to fire-and-forget from any flow. */
export async function resyncNotificationsFromStorage() {
  if (!isSupported) return;
  try {
    const raw = await storage.getItem<string>(PREFS_KEY, "");
    const p = raw ? JSON.parse(raw) : {};
    const prefs: NotifPrefs = {
      reminders: p?.notif_reminders !== false, // default true (matches Settings)
      checkin: p?.notif_checkin === true,
      details: p?.notif_details === true, // default OFF — discreet
    };
    const cards = prefs.reminders ? await listMemoryCards().catch(() => []) : [];
    await syncNotifications(prefs, cards);
  } catch {
    // never block a user flow on notification scheduling
  }
}

export async function cancelAllNotifications() {
  if (!isSupported) return;
  const Notifications = await import("expo-notifications");
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
