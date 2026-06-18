import { apiFetch } from './api';
import { API_ENDPOINTS } from '@/constants/api';
import { MemoryCard, MemoryCardPayload } from '@/types/memory';

export async function getMemoryCards(): Promise<MemoryCard[]> {
  return apiFetch<MemoryCard[]>(API_ENDPOINTS.memoryCards);
}

export async function createMemoryCard(payload: MemoryCardPayload): Promise<MemoryCard> {
  return apiFetch<MemoryCard>(API_ENDPOINTS.memoryCards, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMemoryCard(id: string, payload: Partial<MemoryCardPayload>): Promise<MemoryCard> {
  return apiFetch<MemoryCard>(`${API_ENDPOINTS.memoryCards}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteMemoryCard(id: string): Promise<void> {
  await apiFetch(`${API_ENDPOINTS.memoryCards}/${id}`, { method: 'DELETE' });
}
