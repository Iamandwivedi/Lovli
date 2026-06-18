import { apiMultipart, apiFetch } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { GenerationResult, UsageResult, FeedbackPayload } from '@/types/generation';

interface GenerateOptions {
  platform: string;
  vibe: string;
  language: string;
  timezone: string;
  client_local_date: string;
  imageUri?: string;       // local file URI (screenshot)
  manual_text?: string;    // paste mode
  user_note?: string;
  memory_card_id?: string;
}

export async function generateReplies(opts: GenerateOptions): Promise<GenerationResult> {
  const form = new FormData();
  form.append('platform', opts.platform);
  form.append('vibe', opts.vibe);
  form.append('language', opts.language);
  form.append('timezone', opts.timezone);
  form.append('client_local_date', opts.client_local_date);
  if (opts.user_note) form.append('user_note', opts.user_note);
  if (opts.memory_card_id) form.append('memory_card_id', opts.memory_card_id);

  if (opts.imageUri) {
    // React Native / Expo FormData accepts { uri, name, type }
    form.append('image', {
      uri: opts.imageUri,
      name: 'chat.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  } else if (opts.manual_text) {
    form.append('manual_text', opts.manual_text);
  }

  return apiMultipart<GenerationResult>(API_ENDPOINTS.generateReplies, form);
}

export async function getUsage(clientLocalDate: string): Promise<UsageResult> {
  return apiFetch<UsageResult>(
    `${API_ENDPOINTS.usage}?client_local_date=${clientLocalDate}`,
  );
}

export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  await apiFetch(API_ENDPOINTS.feedback, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
