// Reduce Motion (research §12): springs become 150 ms fades, pulses stop.
// Reanimated reads the OS setting; we re-export so screens have one import.
import { useReducedMotion } from "react-native-reanimated";

export const useReduceMotion = (): boolean => useReducedMotion();

/** Shared spring for card reveal, sheet open and chip select. */
export const SPRING = { damping: 18, stiffness: 180 } as const;
export const REDUCED_FADE_MS = 150;
