// Product constants — source: docs/PROJECT_OVERVIEW.md
// Never invent copy; everything comes from here or the design handoff.

export const PLATFORMS = ['Instagram', 'Dating platform', 'WhatsApp'] as const;
export type Platform = typeof PLATFORMS[number];

export const LANGUAGES = ['English', 'Hinglish', 'Hindi + English mixed'] as const;
export type Language = typeof LANGUAGES[number];

export const VIBES = ['Playful', 'Flirty', 'Sincere', 'Respectful', 'Confident'] as const;
export type Vibe = typeof VIBES[number];

// Tone label shown on reply cards — caps-only
export const TONE_LABELS: Record<string, string> = {
  Playful: 'PLAYFUL',
  Flirty: 'SMOOTH',
  Sincere: 'SINCERE',
  Respectful: 'RESPECTFUL',
  Confident: 'CONFIDENT',
  fallback: 'WARM',
};

export function getToneLabel(vibe: string): string {
  return TONE_LABELS[vibe] ?? TONE_LABELS.fallback;
}

// Memory soft labels — source: PROJECT_OVERVIEW.md
export const MEMORY_LABELS: Record<string, string> = {
  likes: 'Good to remember',
  dislikes: 'Things to avoid',
  communication_style: 'How they usually talk',
  inside_jokes: 'Inside jokes',
  important_dates: 'Important moments',
  best_approach: 'What feels right',
  notes: 'Your notes',
};

export const FREE_DAILY_LIMIT = 8;

// Canned example chat for first-run / "Try an example"
export const EXAMPLE_CHAT = 'Movie kab dekh rahe ho phir? 😏';

// Trust phrases — use verbatim
export const TRUST_PHRASES = {
  screenshotNeverStored: 'Screenshots are never stored',
  privateByDesign: 'Private by design',
  yourChats: 'Your chats stay yours.',
} as const;

// Bottom tabs (exactly 3; Settings is NEVER a tab)
export const BOTTOM_TABS = ['Reply', 'Pro', 'Memory'] as const;
export type BottomTab = typeof BOTTOM_TABS[number];
