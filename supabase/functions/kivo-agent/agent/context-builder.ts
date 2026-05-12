import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { KivoAgentRequest } from '../_shared/types.ts';
import { retrieveMemory } from './memory.ts';
import { loadRecentMessages } from '../db/messages.ts';

export type BuiltKivoContext = {
  profile: Record<string, unknown> | null;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  memories: Awaited<ReturnType<typeof retrieveMemory>>['memories'];
  memoryContext: string;
};

export async function buildContext(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
  request: KivoAgentRequest;
}) : Promise<BuiltKivoContext> {
  const [profileResult, recentMessages, memoryResult] = await Promise.all([
    input.admin
      .from('kivo_profiles')
      .select('preferred_name,language,timezone,current_focus,response_style,agent_settings')
      .eq('user_id', input.userId)
      .maybeSingle(),
    loadRecentMessages({ admin: input.admin, conversationId: input.conversationId, limit: 10 }),
    retrieveMemory({
      admin: input.admin,
      userId: input.userId,
      query: input.request.message || 'image analysis',
      clientMemoryContext: input.request.memoryContext,
    }),
  ]);

  return {
    profile: profileResult.data ?? null,
    recentMessages,
    memories: memoryResult.memories,
    memoryContext: memoryResult.contextText,
  };
}
