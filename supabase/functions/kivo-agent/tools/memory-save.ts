import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function runMemorySave(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
  content: string;
  type?: string;
  importance?: number;
  confidence?: number;
}) {
  const cleanContent = input.content.replace(/\s+/g, ' ').trim().slice(0, 4000);
  if (!cleanContent) throw new Error('Memory content is empty.');

  const { data, error } = await input.admin
    .from('kivo_memories')
    .insert({
      user_id: input.userId,
      source_conversation_id: input.conversationId,
      type: input.type ?? 'note',
      content: cleanContent,
      importance: Math.min(5, Math.max(1, input.importance ?? 3)),
      confidence: input.confidence ?? 0.75,
      source: 'kivo-agent',
      status: 'active',
      tags: ['agent-saved'],
    })
    .select('id')
    .single();

  if (error || !data?.id) throw new Error(error?.message ?? 'Failed to save memory.');
  return { memoryId: data.id as string, saved: true };
}
