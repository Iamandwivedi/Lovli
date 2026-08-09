// PR-M2: the single funnel for memory-engine learning events.
// Fire-and-forget by design — a failed event must never surface in the UI or
// delay an interaction (same idiom as the postFeedback call in reply.tsx).
import { MemoryEventType, postEvent } from "../api/endpoints";

export const trackEvent = (
  type: MemoryEventType,
  payload: Record<string, unknown>,
  conversationId?: string | null,
): void => {
  postEvent(type, payload, conversationId).catch(() => {});
};
