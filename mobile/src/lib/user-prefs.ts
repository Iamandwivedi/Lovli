// Preferences: cloud-durable, locally cached.
//
// Local AsyncStorage stays the fast read path (notifications, AppLockGate and
// the Reply tab all read it synchronously at startup), but the cloud copy is
// the source of truth: it is written on every change and replayed into local
// storage at sign-in, so a reinstall or a new phone restores the same app.
import {
  Language,
  PlatformValue,
  UserPreferences,
  UserPreferencesUpdate,
  Vibe,
  patchPreferences,
} from "../api/endpoints";
import { GOAL_KEY, PREFS_KEY } from "../config/storage-keys";
import { storage } from "../utils/storage";

/** Shape held in AsyncStorage under PREFS_KEY. Unchanged for compatibility. */
export type LocalPrefs = {
  default_vibe: Vibe;
  dating: string;
  notif_reminders: boolean;
  notif_checkin: boolean;
  notif_details: boolean;
  face_id: boolean;
};

export const DEFAULT_PREFS: LocalPrefs = {
  default_vibe: "Playful",
  dating: "Women",
  notif_reminders: true,
  notif_checkin: false,
  notif_details: false,
  face_id: false,
};

export const readLocalPrefs = async (): Promise<LocalPrefs> => {
  try {
    const raw = await storage.getItem<string>(PREFS_KEY, "");
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

export const writeLocalPrefs = async (next: LocalPrefs): Promise<void> => {
  await storage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
};

// `face_id` is the on-device name for the same setting the server calls
// `app_lock`; everything else maps one-to-one.
const toCloudPatch = (p: Partial<LocalPrefs>): UserPreferencesUpdate => {
  const patch: UserPreferencesUpdate = {};
  if (p.default_vibe !== undefined) patch.default_vibe = p.default_vibe;
  if (p.dating !== undefined) patch.dating = p.dating;
  if (p.notif_reminders !== undefined) patch.notif_reminders = p.notif_reminders;
  if (p.notif_checkin !== undefined) patch.notif_checkin = p.notif_checkin;
  if (p.notif_details !== undefined) patch.notif_details = p.notif_details;
  if (p.face_id !== undefined) patch.app_lock = p.face_id;
  return patch;
};

/**
 * Persist a preference change: local immediately (so the UI and the native
 * notification/lock readers see it at once), cloud in the background.
 */
export const savePrefs = async (next: LocalPrefs, changed?: Partial<LocalPrefs>): Promise<void> => {
  await writeLocalPrefs(next);
  const patch = toCloudPatch(changed ?? next);
  if (Object.keys(patch).length > 0) {
    patchPreferences(patch).catch(() => {});
  }
};

/** Persist the onboarding goal to both device and account. */
export const saveGoal = async (goal: string): Promise<void> => {
  await storage.setItem(GOAL_KEY, goal).catch(() => {});
  patchPreferences({ goal }).catch(() => {});
};

/**
 * Replay the account's stored preferences into local storage at sign-in.
 * This is what makes a fresh install look like the user's old phone.
 */
export const hydrateFromCloud = async (cloud: UserPreferences): Promise<LocalPrefs> => {
  const local: LocalPrefs = {
    default_vibe: cloud.default_vibe ?? DEFAULT_PREFS.default_vibe,
    dating: cloud.dating ?? DEFAULT_PREFS.dating,
    notif_reminders: cloud.notif_reminders ?? DEFAULT_PREFS.notif_reminders,
    notif_checkin: cloud.notif_checkin ?? DEFAULT_PREFS.notif_checkin,
    notif_details: cloud.notif_details ?? DEFAULT_PREFS.notif_details,
    face_id: cloud.app_lock ?? DEFAULT_PREFS.face_id,
  };
  await writeLocalPrefs(local);
  if (cloud.goal) {
    await storage.setItem(GOAL_KEY, cloud.goal).catch(() => {});
  }
  return local;
};

export type { Language, PlatformValue, UserPreferences };
