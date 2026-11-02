// Safety net for AI generated text. Lovli copy never uses em or en dashes,
// and the model occasionally emits them anyway. Every response that carries
// generated text passes through cleanDashesDeep in the API layer, so screens
// never have to think about it.

const SPACED_DASH = /\s[\u2014\u2013]\s/g;
const ANY_DASH = /[\u2014\u2013]/g;
const DOUBLE_COMMA = /,\s*,/g;
const COMMA_BEFORE_STOP = /,\s*([.!?])/g;

export const cleanDashes = (text: string): string => {
  if (!text) return text;
  return text
    .replace(SPACED_DASH, ", ")
    .replace(ANY_DASH, ", ")
    .replace(DOUBLE_COMMA, ",")
    .replace(COMMA_BEFORE_STOP, "$1");
};

// Walks any JSON-shaped value and cleans every string in it. Arrays and plain
// objects are rebuilt; everything else (numbers, booleans, null) passes through.
export const cleanDashesDeep = <T>(value: T): T => {
  if (typeof value === "string") return cleanDashes(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => cleanDashesDeep(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = cleanDashesDeep(v);
    }
    return out as T;
  }
  return value;
};
