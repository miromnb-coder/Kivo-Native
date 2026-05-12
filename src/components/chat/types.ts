import type { KivoSource } from '../../lib/kivo-ai';
import type { RecentPhoto } from '../KivoPlusSheet';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  photo?: RecentPhoto | null;
  sources?: KivoSource[];
  usedSearch?: boolean;
};
