import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { nowIso } from '../_shared/utils.ts';

function makeConversationTitle(message: string) {
  const clean = message.replace(/\s+/g, ' ').trim();
  if (!clean) return 'New conversation';
  return clean.length > 44 ? `${clean.slice(0, 44).trim()}...` : clean;
}

export async function getOrCreateConversation(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
  message: string;
}) {
  if (input.conversationId) {
    const { data } = await input.admin
      .from('kivo_conversations')
      .select('id')
      .eq('id', input.conversationId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (data?.id) return data.id as string;
  }

  const { data, error } = await input.admin
    .from('kivo_conversations')
    .insert({ user_id: input.userId, title: makeConversationTitle(input.message), updated_at: nowIso() })
    .select('id')
    .single();

  if (error || !data?.id) throw new Error(error?.message ?? 'Failed to create conversation.');
  return data.id as string;
}

export async function touchConversation(input: { admin: SupabaseClient; userId: string; conversationId: string | null }) {
  if (!input.conversationId) return;
  await input.admin
    .from('kivo_conversations')
    .update({ updated_at: nowIso() })
    .eq('id', input.conversationId)
    .eq('user_id', input.userId);
}
