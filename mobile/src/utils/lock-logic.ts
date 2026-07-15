// Pure app-lock gate logic — dependency-free so it can be unit-tested
// (device verification of the actual biometric flow is a RELEASE_CHECKLIST item).
export type LockTransition = "launch" | "background-to-active" | "other";

/**
 * Lock only on cold launch and background→active. `inactive`→active is
 * deliberately NOT a trigger — the biometric prompt itself makes the app
 * inactive on iOS and would loop. Web never locks.
 */
export const shouldLock = (
  faceIdPref: boolean,
  platform: string,
  transition: LockTransition,
): boolean =>
  faceIdPref &&
  platform !== "web" &&
  (transition === "launch" || transition === "background-to-active");
