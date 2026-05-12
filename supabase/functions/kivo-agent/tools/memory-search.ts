import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { KivoMemoryHit } from '../_shared/types.ts';
import { MEMORY_SEARCH_LIMIT } from '../_shared/constants.ts';

export async function runMemorySearch(input: {
  admin: SupabaseClient;
  userId: string;
  query: string;
  limit?: number;
}): Promise<KivoMemoryHit[]> {
  const limit = Math.min(Math.max(input.limit ?? MEMORY_SEARCH_LIMIT, 1), 12);

  try {
    const { data, error } = await input.admin.rpc('search_kivo_memories', {
      query_text: input.query,
      match_count: limit,
    });

    if (!error && Array.isArray(data)) {
      return data.slice(0, limit).map((item: any) => ({
        memoryId: String(item.id),
        type: String(item.type ?? 'note'),
        score: Number(item.rank ?? item.score ?? 0.5),
        snippet: String(item.summary ?? item.content ?? '').slice(0, 240),
      }));
    }
  } catch {
    // Fallback below.
  }

  const { data, error } = await input.admin
    .from('kivo_memories')
    .select('id,type,content,summary,importance')
    .eq('user_id', input.userId)
    .eq('status', 'active')
    .order('importance', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) return [];

  return data.map((item: any) => ({
    memoryId: String(item.id),
    type: String(item.type ?? 'note'),
    score: Number(item.importance ?? 3) / 5,
    snippet: String(item.summary ?? item.content ?? '').slice(0, 240),
  }));
}

export function formatMemoryContext(memories: KivoMemoryHit[]) {
  if (memories.length === 0) return '';
  return memories
    .map((memory) => `- ${memory.type} (${Math.round(memory.score * 100)}%): ${memory.snippet}`)
    .join('\n');
}
