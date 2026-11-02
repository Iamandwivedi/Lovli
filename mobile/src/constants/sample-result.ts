// Play-first onboarding (research §9): the sample chat runs through the real
// loader and result screen with this cached result — no network, no sign-in.
// It is the aha moment and must land inside the first session.
// The conversation matches assets/images/sample-chat.png (Aanya).
import type { Replies } from "@/src/api/endpoints";
import type { ParsedMessage } from "@/src/utils/chatParse";

export const SAMPLE_PERSON = "Aanya";

export const SAMPLE_MESSAGES: ParsedMessage[] = [
  { side: "them", text: "Heyy! finally got time to reply :)" },
  { side: "them", text: "your bio said you love indie cafes haha same" },
  { side: "me", text: "i live in indiranagar btw, you?" },
  { side: "them", text: "koramangala! you free this saturday for chai?" },
  { side: "them", text: "okay also tell me 🎧 playlist person ya audiobook person??" },
];

export const SAMPLE_RESULT: Replies = {
  generation_id: "sample",
  replies: [
    "saturday chai works! koramangala it is ☕ and playlist person, 100%. audiobooks put me to sleep lol",
    "chai on saturday with you? say less 😄 also playlist person, obviously. i'll make you one for the ride to koramangala",
    "saturday's a yes. you pick the cafe, i pick the playlist, deal? audiobooks are for people who don't trust their own taste 😌",
  ],
  reply_labels: ["Safe", "Flirty", "Bold"],
  insight: {
    temperature: "warm",
    noticing: [
      "She sent two messages in a row before you'd answered",
      "She's the one suggesting a day and a place",
      "The 'okay also' question keeps the thread alive on purpose",
    ],
    whats_going_on: "She's asking you out, lightly. Saying yes with a plan beats a joke here.",
    wingman_advice:
      "Lock the Saturday plan first, then play with the playlist question. Don't leave the chai line hanging while you're being funny.",
  },
  daily_generation_count: 0,
  daily_limit: 10,
  plan: "free",
  memory_used: null,
};
