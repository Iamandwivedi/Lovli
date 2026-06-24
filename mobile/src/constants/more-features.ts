// Lovli "More" tab feature catalogue.
// Stable `id` values are the contract that backend PR4's `/api/feature` will accept.
// Display title / sub / emoji are UI-only and can be tuned freely.

export type MoreFeatureId =
  | "decode_situation"
  | "red_flag_check"
  | "what_should_i_do"
  | "read_signals"
  | "settle_the_fight"
  | "the_other_side"
  | "fair_verdict"
  | "breakup_clarity"
  | "glow_up_reply"
  | "ask_lovli";

export type MoreFeature = {
  id: MoreFeatureId;
  title: string;
  sub: string;
  emoji: string;
};

export const MORE_FEATURES: readonly MoreFeature[] = [
  { id: "decode_situation",  title: "Decode the situation", sub: "What's really going on",        emoji: "🧠" },
  { id: "red_flag_check",    title: "Red flag check",       sub: "Normal ya 🚩? Honest take",     emoji: "🚩" },
  { id: "what_should_i_do",  title: "What should I do?",    sub: "Best move for your goal",       emoji: "🧭" },
  { id: "read_signals",      title: "Read the signals",     sub: "Do they actually like you?",    emoji: "👀" },
  { id: "settle_the_fight",  title: "Settle the fight",     sub: "Why it happened + how to fix",  emoji: "🤝" },
  { id: "the_other_side",    title: "The other side",       sub: "See it from their POV",         emoji: "↔️" },
  { id: "fair_verdict",      title: "Fair verdict",         sub: "Unbiased — who's right",        emoji: "⚖️" },
  { id: "breakup_clarity",   title: "Breakup clarity",      sub: "Stay or go? Think it through",  emoji: "💔" },
  { id: "glow_up_reply",     title: "Glow up my reply",     sub: "Make your draft 10x smoother",  emoji: "✨" },
  { id: "ask_lovli",         title: "Ask Lovli anything",   sub: "Any dating Q, no judgement",    emoji: "🔮" },
] as const;
