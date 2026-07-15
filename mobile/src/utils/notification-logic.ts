// Pure reminder-selection logic — dependency-free (type-only import) so it can
// be unit-tested without loading react-native.
import type { MemoryCard } from "@/src/api/endpoints";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Upcoming timeline entries with a REAL future date (date_label is never parsed). */
export function upcomingWithDates(cards: MemoryCard[], now: Date = new Date()) {
  const out: { nickname: string; title: string; fireAt: Date }[] = [];
  for (const card of cards) {
    for (const e of card.timeline || []) {
      if (!e.upcoming || !e.date || !DATE_RE.test(e.date)) continue;
      const [y, m, d] = e.date.split("-").map(Number);
      const fireAt = new Date(y, m - 1, d, 9, 0, 0); // 9:00 AM local
      if (fireAt.getTime() > now.getTime()) {
        out.push({ nickname: card.nickname, title: e.title, fireAt });
      }
    }
  }
  return out;
}
