import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { KivoAgentEvent } from '../_shared/types.ts';
import { nowIso } from '../_shared/utils.ts';

export async function persistAgentEvent(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
  traceId: string;
  eventType: string;
  label: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}) {
  const event: KivoAgentEvent = {
    eventType: input.eventType,
    ts: nowIso(),
    label: input.label,
    detail: input.detail,
    details: input.metadata ?? {},
  };

  const { error } = await input.admin.from('kivo_agent_events').insert({
    user_id: input.userId,
    conversation_id: input.conversationId,
    event_type: input.eventType,
    label: input.label,
    detail: input.detail ?? null,
    metadata: { traceId: input.traceId, ...(input.metadata ?? {}) },
  });

  if (error) console.warn('Failed to persist agent event', error);
  return event;
}
