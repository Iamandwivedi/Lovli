export interface GeneratePayload {
  platform: string;
  vibe: string;
  language: string;
  client_local_date: string;   // YYYY-MM-DD
  timezone: string;            // IANA e.g. "Asia/Kolkata"
  image?: File | Blob;
  manual_text?: string;
  user_note?: string;
  memory_card_id?: string;
}

export interface Reply {
  text: string;
  tone?: string;
}

export interface GenerationResult {
  generation_id: string;
  replies: Reply[];
  tone_notes?: string;
  daily_generation_count: number;
  daily_limit: number;
  plan: 'free' | 'pro';
}

export interface UsageResult {
  daily_generation_count: number;
  daily_limit: number;
  plan: 'free' | 'pro';
}

export interface FeedbackPayload {
  generation_id: string;
  copied_reply_index?: number;
  feedback?: string;
}

export type InputMode = 'screenshot' | 'paste';
