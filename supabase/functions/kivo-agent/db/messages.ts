import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function saveKivoMessage(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await input.admin
    .from('kivo_messages')
    .insert({
      user_id: input.userId,
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single();

  if (error) console.warn('Failed to save kivo message', error);
  return data?.id as string | undefined;
}

export async function loadRecentMessages(input: {
  admin: SupabaseClient;
  conversationId: string | null;
  limit?: number;
}) {
  if (!input.conversationId) return [];

  const { data, error } = await input.admin
    .from('kivo_messages')
    .select('role,content,created_at')
    .eq('conversation_id', input.conversationId)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 10);

  if (error || !Array.isArray(data)) return [];

  return data.reverse().map((item) => ({
    role: item.role === 'assistant' ? 'assistant' as const : 'user' as const,
    content: String(item.content ?? ''),
  })).filter((item) => item.content.trim().length > 0);
}
