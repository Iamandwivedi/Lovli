// Typed methods that mirror the live Lovli backend.
import { api } from "./client";

export type PlatformValue = "instagram" | "dating_platform" | "whatsapp";
export type PlatformLabel = "Instagram" | "Dating platform" | "WhatsApp";
export type Language = "English" | "Hinglish" | "Hindi + English mixed";
export type Vibe = "Playful" | "Flirty" | "Sincere" | "Respectful" | "Confident";
export type Plan = "free" | "pro";

export type User = {
  id: string;
  name: string;
  email: string;
  preferred_platform?: PlatformValue | null;
  language_preference?: Language | null;
  daily_generation_count?: number;
  daily_limit?: number;
  last_generation_reset_date?: string;
  plan?: Plan;
  auth_provider?: string;
  onboarding_complete?: boolean;
};

export type AuthResponse = { access_token: string; user: User };

export type Usage = {
  daily_generation_count: number;
  daily_limit: number;
  plan: Plan;
};

export type ReplyRead = {
  situation: string;
  temperature: "interested" | "neutral" | "cold";
  signals: string[];
  outcome: string[];
};

// PR-V2-3: coach insight for the Generated surface ("HERE'S WHAT I'M NOTICING").
export type ReplyInsight = {
  temperature: "warm" | "mixed" | "cold";
  noticing: string[];
  whats_going_on: string;
  wingman_advice: string;
};

// PR-M5: present only when the memory engine personalized the response.
export type MemoryUsed = { is_personalized: boolean; signals: string[] };

export type Replies = {
  generation_id: string;
  replies: string[];
  tone_notes?: string | null;
  daily_generation_count: number;
  daily_limit: number;
  plan: Plan;
  // PR-INT additive fields. Both undefined when rich=false (server omits them).
  reply_labels?: string[] | null;
  read?: ReplyRead | null;
  // PR-V2-3 additive: present when rich=true and the read validated.
  insight?: ReplyInsight | null;
  // PR-M5 additive: undefined unless the backend personalized this response.
  memory_used?: MemoryUsed | null;
};

export type MemoryCard = {
  id: string;
  nickname: string;
  goal?: string;
  current_situation?: string;
  relationship_stage?: string;
  where_met?: string;
  likes?: string;
  dislikes?: string;
  communication_style?: string;
  inside_jokes?: string;
  important_dates?: string;
  best_approach?: string;
  notes?: string;
  boundaries?: string;
  // PR-V2-6 additive fields
  stage?: string | null;
  stage_duration?: string | null;
  platform?: string | null;
  city?: string | null;
  timeline?: TimelineEntry[] | null;
  facts?: MemoryFact[] | null;
  created_at?: string;
};

export type TimelineEntry = {
  title: string;
  date_label?: string | null;
  /** optional real date "YYYY-MM-DD" — powers local reminder notifications */
  date?: string | null;
  detail?: string | null;
  upcoming?: boolean;
};

export type MemoryFact = { text: string; kind: "like" | "avoid" | "date" };

export type MemoryCardInput = Omit<MemoryCard, "id">;

// Platform mapping (matches web app)
export const platformLabelToValue = (label: PlatformLabel): PlatformValue => {
  if (label === "Instagram") return "instagram";
  if (label === "WhatsApp") return "whatsapp";
  return "dating_platform";
};

export const platformValueToLabel = (value?: PlatformValue | null | string): PlatformLabel => {
  if (value === "whatsapp") return "WhatsApp";
  if (value === "instagram") return "Instagram";
  return "Dating platform";
};

export const getTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
};

export const getClientLocalDate = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ---------- Auth ----------
export const authLogin = async (email: string, password: string) => {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
};

export const authSignup = async (name: string, email: string, password: string) => {
  const { data } = await api.post<AuthResponse>("/auth/signup", { name, email, password });
  return data;
};

// Dev-only auto sign-in. Backend 404s unless ALLOW_TEST_LOGIN=true (never in production).
export const authTestLogin = async () => {
  const { data } = await api.post<AuthResponse>("/auth/test-login");
  return data;
};

export const authMe = async () => {
  const { data } = await api.get<User>("/auth/me");
  return data;
};

export const authGoogleConfig = async () => {
  const { data } = await api.get<{
    enabled: boolean;
    client_id: string;
    scope: string;
    allowed_redirect_uris: string[];
  }>("/auth/google/config");
  return data;
};

export const authGoogleCode = async (code: string, redirect_uri: string, state?: string) => {
  const { data } = await api.post<AuthResponse>("/auth/google/code", { code, redirect_uri, state });
  return data;
};

// ---------- Onboarding / Settings ----------
export const patchOnboarding = async (body: {
  preferred_platform?: PlatformValue;
  language_preference?: Language;
  timezone: string;
}) => {
  const { data } = await api.patch<User>("/auth/onboarding", body);
  return data;
};

export const patchSettings = async (body: {
  name?: string;
  preferred_platform?: PlatformValue;
  language_preference?: Language;
  timezone?: string;
}) => {
  const { data } = await api.patch<User>("/settings", body);
  return data;
};

// ---------- Usage ----------
// ---- Ask Lovli (PR-V2-4) ----------------------------------------------------
export type AskLovliTurn = { role: "user" | "lovli"; text: string };

export const askLovli = async (
  message: string,
  history: AskLovliTurn[],
  personId?: string | null,
) => {
  const { data } = await api.post<{ reply: string }>("/ask-lovli", {
    message,
    history,
    person_id: personId ?? null,
  });
  return data;
};

export const getUsage = async (client_local_date: string) => {
  const { data } = await api.get<Usage>("/usage", { params: { client_local_date } });
  return data;
};

// ---------- Memory ----------
export const listMemoryCards = async () => {
  const { data } = await api.get<MemoryCard[]>("/memory-cards");
  return data;
};

export const createMemoryCard = async (body: MemoryCardInput) => {
  const { data } = await api.post<MemoryCard>("/memory-cards", body);
  return data;
};

export const updateMemoryCard = async (id: string, body: MemoryCardInput) => {
  const { data } = await api.patch<MemoryCard>(`/memory-cards/${id}`, body);
  return data;
};

export const deleteMemoryCard = async (id: string) => {
  await api.delete(`/memory-cards/${id}`);
};

// ---------- Generate / Feedback / Waitlist ----------
export type GenerateInput = {
  platform: PlatformValue;
  vibe: Vibe;
  language: Language;
  manual_text?: string;
  user_note?: string;
  memory_card_id?: string | null;
  image?: { uri: string; name: string; type: string } | null;
  // PR-INT: opt-in rich-mode (situation read + labeled replies).
  rich?: boolean;
  // PR-V2-3: optional emotional/intent context (folded into the prompt).
  feeling?: string | null;
  intent?: string | null;
  outcome?: string | null;
  goal?: string | null;
};

export const generateReplies = async (input: GenerateInput) => {
  const form = new FormData();
  form.append("platform", input.platform);
  form.append("vibe", input.vibe);
  form.append("language", input.language);
  form.append("client_local_date", getClientLocalDate());
  form.append("timezone", getTimezone());
  if (input.manual_text && input.manual_text.trim()) form.append("manual_text", input.manual_text.trim());
  if (input.user_note && input.user_note.trim()) form.append("user_note", input.user_note.trim());
  if (input.memory_card_id) form.append("memory_card_id", input.memory_card_id);
  if (input.rich) form.append("rich", "true");
  if (input.feeling && input.feeling.trim()) form.append("feeling", input.feeling.trim());
  if (input.intent && input.intent.trim()) form.append("intent", input.intent.trim());
  if (input.outcome && input.outcome.trim()) form.append("outcome", input.outcome.trim());
  if (input.goal && input.goal.trim()) form.append("goal", input.goal.trim());
  if (input.image) {
    // React Native FormData: pass an object with uri/name/type
    form.append("image", input.image as unknown as Blob);
  }
  const { data } = await api.post<Replies>("/generate-replies", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// ---- Decode (PR-V2-5) --------------------------------------------------------
export type DecodeResult = {
  vibe_label: "Not into it" | "Mixed signals" | "Leaning interested";
  vibe_headline: string;
  positive_signs: string[];
  watch_outs: string[];
  whats_really_going_on: string;
  next_move: { wingman: string; likely_outcome: string };
};

export const decodeSituation = async (input: {
  manual_text?: string;
  feeling?: string | null;
  memory_card_id?: string | null;
  language?: Language;
  image?: { uri: string; name: string; type: string } | null;
}) => {
  const form = new FormData();
  form.append("client_local_date", getClientLocalDate());
  if (input.manual_text && input.manual_text.trim()) form.append("manual_text", input.manual_text.trim());
  if (input.feeling) form.append("feeling", input.feeling);
  if (input.memory_card_id) form.append("memory_card_id", input.memory_card_id);
  if (input.language) form.append("language", input.language);
  if (input.image) form.append("image", input.image as unknown as Blob);
  const { data } = await api.post<DecodeResult>("/decode", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const patchMemoryCard = async (id: string, body: Partial<MemoryCardInput>) => {
  const { data } = await api.patch<MemoryCard>(`/memory-cards/${id}`, body);
  return data;
};

// ---- Feature engine (PR4) — ONE route for the More-grid tools ---------------
export type FeaturePointTone = "positive" | "warning" | "neutral";

export type FeatureResult = {
  generation_id: string;
  feature_id: string;
  verdict: string;
  points: { text: string; tone: FeaturePointTone }[];
  actions: string[];
  replies: string[];
};

export const runFeature = async (input: {
  feature_id: string;
  manual_text?: string;
  text_secondary?: string;
  draft_text?: string;
  feeling?: string | null;
  memory_card_id?: string | null;
  language?: Language;
  image?: { uri: string; name: string; type: string } | null;
}) => {
  const form = new FormData();
  form.append("feature_id", input.feature_id);
  form.append("client_local_date", getClientLocalDate());
  if (input.manual_text && input.manual_text.trim()) form.append("manual_text", input.manual_text.trim());
  if (input.text_secondary && input.text_secondary.trim()) form.append("text_secondary", input.text_secondary.trim());
  if (input.draft_text && input.draft_text.trim()) form.append("draft_text", input.draft_text.trim());
  if (input.feeling) form.append("feeling", input.feeling);
  if (input.memory_card_id) form.append("memory_card_id", input.memory_card_id);
  if (input.language) form.append("language", input.language);
  if (input.image) form.append("image", input.image as unknown as Blob);
  const { data } = await api.post<FeatureResult>("/feature", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// ---- Recent results (PR4c) ---------------------------------------------------
export type RecentResult = {
  generation_id: string;
  feature_id: string; // "decode" or a feature id
  verdict: string;
  created_at: string;
};

export const listRecentResults = async (limit = 5) => {
  const { data } = await api.get<RecentResult[]>(`/recent-results?limit=${limit}`);
  return data;
};

export type StoredGeneration = {
  id: string;
  feature_id: string | null;
  memory_card_id: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
};

export const getGeneration = async (genId: string) => {
  const { data } = await api.get<StoredGeneration>(`/generations/${genId}`);
  return data;
};

export const deleteAllGenerations = async () => {
  await api.delete("/generations");
};

export const postFeedback = async (generation_id: string, copied_reply_index: number) => {
  await api.post("/feedback", { generation_id, copied_reply_index });
};

// ---- Memory engine (PR-M1..M6) ----------------------------------------------
// Behavioral learning events. Fire-and-forget from the UI via trackEvent()
// (src/lib/memory-events.ts) — never await these on a user interaction path.
export type MemoryEventType =
  | "reply_copied"
  | "reply_edited"
  | "reply_rejected"
  | "reply_rated"
  | "tone_selected"
  | "phrase_disliked"
  | "boundary_added"
  | "feedback_chip"
  | "onboarding_pref"
  | "preference_removed";

export const postEvent = async (
  type: MemoryEventType,
  payload: Record<string, unknown>,
  conversation_id?: string | null,
) => {
  await api.post("/events", {
    type,
    payload,
    conversation_id: conversation_id ?? null,
    client_ts: new Date().toISOString(),
  });
};

export type LearnedItem = {
  id: string;
  domain: string;
  key: string;
  label: string;
  confidence: number;
  support_count: number;
};

export type MemorySummary = {
  is_cold_start: boolean;
  event_count: number;
  paused: boolean;
  texting_style: string[];
  tone_preferences: string[];
  phrase_rules: string[];
  boundaries: string[];
  learned: LearnedItem[];
};

export const getMemorySummary = async () => {
  const { data } = await api.get<MemorySummary>("/memory/summary");
  return data;
};

/** Wipes ALL learned memory (events + derived) for the signed-in user. */
export const deleteLearnedMemory = async () => {
  await api.delete("/memory");
};

export const removeLearnedPreference = async (atomId: string) => {
  await api.delete(`/memory/preferences/${atomId}`);
};

export const pauseLearnedMemory = async (paused: boolean) => {
  await api.post("/memory/pause", { paused });
};

// ---- Cloud-backed user state (PR-DB) ----------------------------------------
// These used to live only in device storage, so they were lost on reinstall or
// a new phone. They are now keyed to the account and restored at sign-in.
export type UserPreferences = {
  user_id: string;
  goal?: string | null;
  default_vibe: Vibe;
  dating?: string | null;
  language_preference: Language;
  preferred_platform?: PlatformValue | null;
  notif_reminders: boolean;
  notif_checkin: boolean;
  notif_details: boolean;
  app_lock: boolean;
  updated_at?: string;
};

export type UserPreferencesUpdate = Partial<
  Omit<UserPreferences, "user_id" | "updated_at">
>;

export const getPreferences = async () => {
  const { data } = await api.get<UserPreferences>("/preferences");
  return data;
};

export const patchPreferences = async (body: UserPreferencesUpdate) => {
  const { data } = await api.patch<UserPreferences>("/preferences", body);
  return data;
};

export const getAskThread = async () => {
  const { data } = await api.get<{ turns: AskLovliTurn[]; updated_at?: string }>(
    "/ask-thread",
  );
  return data;
};

export const putAskThread = async (turns: AskLovliTurn[]) => {
  await api.put("/ask-thread", { turns });
};

export const deleteAskThread = async () => {
  await api.delete("/ask-thread");
};

/** Everything the app needs after sign-in, in one round trip. */
export type Bootstrap = {
  user: User;
  preferences: UserPreferences;
  usage: Usage;
  memory_cards: MemoryCard[];
  recent_results: RecentResult[];
  ask_thread: AskLovliTurn[];
  memory_summary?: { signal_count: number; style_summary: Record<string, string> } | null;
  server?: { schema_version: number; memory_engine_enabled: boolean };
};

export const getBootstrap = async () => {
  const { data } = await api.get<Bootstrap>("/bootstrap", {
    params: { client_local_date: getClientLocalDate() },
  });
  return data;
};

export const joinWaitlist = async (email: string, source: string, what_you_want?: string) => {
  await api.post("/waitlist", { email, type: "pro", source, what_you_want });
};
