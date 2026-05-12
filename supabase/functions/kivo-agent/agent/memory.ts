import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { KivoMemoryHit } from '../_shared/types.ts';
import { formatMemoryContext, runMemorySearch } from '../tools/memory-search.ts';
import { runMemorySave } from '../tools/memory-save.ts';

export async function retrieveMemory(input: {
  admin: SupabaseClient;
  userId: string;
  query: string;
  clientMemoryContext?: string;
}) {
  const memories = await runMemorySearch({
    admin: input.admin,
    userId: input.userId,
    query: input.query || 'general context',
  });

  const parts = [formatMemoryContext(memories), input.clientMemoryContext?.trim()].filter(Boolean);

  return {
    memories,
    contextText: parts.join('\n'),
  };
}

export async function saveMemoryCandidate(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
  content: string;
  approved: boolean;
}) {
  if (!input.approved) {
    return { saved: false, reason: 'Memory save requires explicit approval.' };
  }

  return runMemorySave({
    admin: input.admin,
    userId: input.userId,
    conversationId: input.conversationId,
    content: input.content,
    type: 'note',
    importance: 3,
    confidence: 0.75,
  });
}

export function summarizeMemoryForResponse(memories: KivoMemoryHit[]) {
  return memories.map((memory) => ({
    memoryId: memory.memoryId,
    type: memory.type,
    score: memory.score,
    snippet: memory.snippet,
  }));
}
