// Heuristic parser: pasted chat text → left/right bubbles for the Intent preview.
// Best-effort only — the backend does the real parsing during generation.
export type ParsedMessage = { side: "me" | "them"; text: string };

const ME_PREFIX = /^(me|i|myself|mai|main)$/i;

export function parseChatText(raw: string, max = 4): ParsedMessage[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const messages: ParsedMessage[] = [];
  for (const line of lines) {
    // "Name: message" style
    const m = line.match(/^([^:]{1,20}):\s*(.+)$/);
    if (m && m[2]) {
      const side = ME_PREFIX.test(m[1].trim()) ? "me" : "them";
      messages.push({ side, text: m[2].trim() });
    } else {
      // No sender prefix — assume it's their message (that's what users paste most)
      messages.push({ side: "them", text: line });
    }
  }
  return messages.slice(-max);
}
