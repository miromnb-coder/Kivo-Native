import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { KivoToolRun, KivoToolStatus } from '../_shared/types.ts';

export async function persistToolRun(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
  toolRunId: string;
  toolName: string;
  status: KivoToolStatus;
  startedAt: number;
  request?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}) {
  const latencyMs = Math.max(0, Date.now() - input.startedAt);

  const run: KivoToolRun = {
    toolRunId: input.toolRunId,
    toolName: input.toolName,
    status: input.status,
    latencyMs,
    output: input.output,
    error: input.error,
  };

  const { error } = await input.admin.from('kivo_tool_runs').insert({
    user_id: input.userId,
    conversation_id: input.conversationId,
    tool_name: input.toolName,
    status: input.status === 'failed' ? 'error' : input.status === 'not_connected' ? 'cancelled' : input.status,
    input: input.request ?? {},
    output: input.output ?? {},
    error: input.error ?? null,
    duration_ms: latencyMs,
  });

  if (error) console.warn('Failed to persist tool run', error);
  return run;
}
