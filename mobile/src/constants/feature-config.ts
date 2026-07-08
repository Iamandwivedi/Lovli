// Per-feature UI config for the shared /feature/[id] screen (PR4).
// Backend contract: /app/docs/FEATURE_API_AND_PROMPTS.md — the ids here MUST
// match llm_service.FEATURE_SUFFIXES. Copy is UI-only and can be tuned freely.

export type FeatureUiConfig = {
  id: string;
  title: string;        // input-phase header
  resultTitle: string;  // result-phase header
  intro: string;        // sub copy under the header
  kicker: string;       // section label above the serif verdict
  pointsLabel: string;  // section label for the ✦ bullets
  cta: string;          // primary button label
  stages: string[];     // staged-loader lines
  pastePlaceholder: string;
  /** user-voice suffix for the "✦ Ask Lovli about this" handoff message */
  askSuffix: string;
  /** offer the chained "✦ Glow up this reply" action on reply cards */
  chainGlowUp?: boolean;
  /** glow_up: required draft field; paste/upload become optional context */
  wantsDraft?: boolean;
  /** optional labeled secondary input (fair_verdict / what_should_i_do) */
  secondary?: { label: string; placeholder: string };
  /** rose accent (red flag check) */
  rose?: boolean;
};

export const FEATURE_CONFIG: Record<string, FeatureUiConfig> = {
  red_flag_check: {
    id: "red_flag_check",
    title: "Red flag check",
    resultTitle: "The honest take",
    intro: "Tell me what they did — I'll tell you if it's normal or a 🚩. Honestly.",
    kicker: "THE VERDICT",
    pointsLabel: "WHY I'M SAYING THIS",
    cta: "Check it",
    stages: [
      "Reading what happened…",
      "Normal ya red flag — checking…",
      "Looking for the pattern…",
      "Being straight with you…",
    ],
    pastePlaceholder: "What did they do? Paste the chat or describe it…",
    askSuffix: "Is this actually a big deal, or am I overthinking it?",
    rose: true,
  },
  what_should_i_do: {
    id: "what_should_i_do",
    title: "What should I do?",
    resultTitle: "Your best move",
    intro: "Give me the situation and your goal — I'll map the move.",
    kicker: "MY CALL",
    pointsLabel: "WHAT I'M WEIGHING",
    cta: "Map my move",
    stages: [
      "Reading the situation…",
      "Holding it against your goal…",
      "Weighing the options…",
      "Picking the smart move…",
    ],
    pastePlaceholder: "What's going on? Paste the chat or describe it…",
    askSuffix: "Walk me through the first step?",
    chainGlowUp: true,
    secondary: { label: "Your goal", placeholder: "What do you want here? (e.g. a second date)" },
  },
  settle_the_fight: {
    id: "settle_the_fight",
    title: "Settle the fight",
    resultTitle: "What really happened",
    intro: "Show me the fight — I'll find what's underneath and how to fix it without losing face.",
    kicker: "THE REAL ISSUE",
    pointsLabel: "WHAT'S UNDERNEATH",
    cta: "Work it out",
    stages: [
      "Reading both sides…",
      "Finding the real trigger…",
      "Listening under the words…",
      "Working out the repair…",
    ],
    pastePlaceholder: "What was the fight about? Paste or describe it…",
    askSuffix: "How do I bring this up without starting round two?",
    chainGlowUp: true,
  },
  the_other_side: {
    id: "the_other_side",
    title: "The other side",
    resultTitle: "Their side of it",
    intro: "Let me walk you through how this probably looks from where they're standing.",
    kicker: "THEIR SIDE",
    pointsLabel: "WHY THEY MIGHT BE ACTING THIS WAY",
    cta: "Show me their side",
    stages: [
      "Reading the situation…",
      "Stepping into their shoes…",
      "Being fair to both of you…",
      "Putting it into words…",
    ],
    pastePlaceholder: "What happened? Paste the chat or describe it…",
    askSuffix: "Okay — so how do I respond, knowing this?",
  },
  fair_verdict: {
    id: "fair_verdict",
    title: "Fair verdict",
    resultTitle: "The ruling",
    intro: "Both sides, one honest call. I don't take sides — not even yours.",
    kicker: "THE RULING",
    pointsLabel: "WHAT EACH SIDE GOT RIGHT & WRONG",
    cta: "Give the verdict",
    stages: [
      "Hearing your side…",
      "Hearing their side…",
      "Weighing it fairly…",
      "Calling it honestly…",
    ],
    pastePlaceholder: "Your side — what happened? Paste or describe it…",
    askSuffix: "How do I make this right without keeping score?",
    secondary: { label: "Other person's perspective", placeholder: "What would they say happened?" },
  },
  breakup_clarity: {
    id: "breakup_clarity",
    title: "Breakup clarity",
    resultTitle: "Where things stand",
    intro: "Stay or go — I won't decide for you. I'll help you see it clearly.",
    kicker: "WHERE THINGS STAND",
    pointsLabel: "WORTH WEIGHING",
    cta: "Help me think",
    stages: [
      "Taking this in gently…",
      "Looking at the whole picture…",
      "Weighing stay and go…",
      "Finding you some clarity…",
    ],
    pastePlaceholder: "What's been going on? Take your time…",
    askSuffix:
      "Help me sit with this. I'm not trying to win them back — I just want clarity and some peace.",
  },
  glow_up_reply: {
    id: "glow_up_reply",
    title: "Glow up my reply",
    resultTitle: "The glow up",
    intro: "Paste your draft — same intent, smoother delivery. Your voice, just better.",
    kicker: "WHAT I FIXED",
    pointsLabel: "WHY THIS LANDS BETTER",
    cta: "Glow it up",
    stages: [
      "Reading your draft…",
      "Keeping your voice…",
      "Smoothing the delivery…",
      "Making it land — no cringe…",
    ],
    pastePlaceholder: "Optional: paste the chat so I get the context…",
    askSuffix: "Anything I should watch for after I send it?",
    wantsDraft: true,
  },
};
