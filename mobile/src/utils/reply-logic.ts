// Pure reply-flow logic — dependency-free so scripts/test-pure-logic.js can
// load it without React Native.
import type { MemoryCard, TimelineEntry } from "@/src/api/endpoints";

/** Folds situation chip + note + tone hint into the single `user_note` field. */
export function buildUserNote(
  situation: string | null,
  note: string,
  toneHint?: string | null,
): string | undefined {
  const parts: string[] = [];
  if (situation) parts.push(`Situation: ${situation.toLowerCase()}.`);
  if (note.trim()) parts.push(`Note from me: ${note.trim()}`);
  if (toneHint) parts.push(`Tone adjustment: make the reply ${toneHint.toLowerCase()}.`);
  return parts.length ? parts.join(" ") : undefined;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export const relativeDays = (iso: string, now = new Date()): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today.getTime() - then.getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff === -1) return "tomorrow";
  if (diff < 0) return `in ${-diff} days`;
  if (diff < 30) return `${diff} days ago`;
  const months = Math.round(diff / 30);
  return months <= 1 ? "a month ago" : `${months} months ago`;
};

/** The continuity strip's line for a person (research §5): upcoming plan first,
 *  then the latest past moment, then a remembered fact, then card meta. */
export function continuityLine(card: MemoryCard, now = new Date()): string {
  const timeline: TimelineEntry[] = card.timeline || [];
  const upcoming = timeline.find((e) => e.upcoming);
  if (upcoming) {
    const when = upcoming.date && ISO_RE.test(upcoming.date)
      ? relativeDays(upcoming.date, now)
      : upcoming.date_label || "";
    return [`coming up: ${upcoming.title}`, when].filter(Boolean).join(" · ");
  }
  const past = [...timeline].reverse().find((e) => !e.upcoming);
  if (past) {
    const when = past.date && ISO_RE.test(past.date)
      ? relativeDays(past.date, now)
      : past.date_label || "";
    return [`last time: ${past.title}`, when].filter(Boolean).join(" · ");
  }
  const fact = (card.facts || []).find((f) => f.kind !== "avoid");
  if (fact) return `I remember: ${fact.text}`;
  const bits = [card.platform, card.stage || card.relationship_stage].filter(Boolean);
  return bits.length ? bits.join(" · ") : "nothing saved yet — tap to add";
}
