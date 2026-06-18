export interface MemoryCard {
  id: string;
  user_id: string;
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
  created_at?: string;
  updated_at?: string;
}

export type MemoryCardPayload = Omit<MemoryCard, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
