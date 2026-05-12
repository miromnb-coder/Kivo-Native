import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { KivoAgentContext, KivoToolRun } from '../_shared/types.ts';
import { makeId } from '../_shared/utils.ts';
import { persistToolRun } from '../db/tool-runs.ts';
import type { KivoPlan } from './planner.ts';
import { getTool } from '../tools/registry.ts';
import { runWebSearch } from '../tools/web-search.ts';

type ExecutorInput = {
  admin: SupabaseClient;
  ctx: KivoAgentContext;
  plan: KivoPlan;
  memoryCount: number;
  hasImage: boolean;
};

export async function executePlan(input: ExecutorInput) {
  const toolRuns: KivoToolRun[] = [];

  for (const step of input.plan.steps) {
    if (!step.toolName || step.toolName === 'groq_chat' || step.toolName === 'image_analysis' || step.toolName === 'memory_search') continue;

    const tool = getTool(step.toolName);
    const toolRunId = makeId(step.toolName);
    const startedAt = Date.now();

    if (!tool.connected) {
      const run = await persistToolRun({
        admin: input.admin,
        userId: input.ctx.userId,
        conversationId: input.ctx.conversationId,
        toolRunId,
        toolName: step.toolName,
        status: 'not_connected',
        startedAt,
        request: { stepId: step.id, message: input.ctx.message },
        output: { connected: false, reason: 'Tool is planned but not connected yet.' },
      });
      toolRuns.push(run);
      continue;
    }

    if (step.toolName === 'web_search') {
      const output = await runWebSearch({ query: input.ctx.message });
      const run = await persistToolRun({
        admin: input.admin,
        userId: input.ctx.userId,
        conversationId: input.ctx.conversationId,
        toolRunId,
        toolName: step.toolName,
        status: output.connected ? 'success' : 'not_connected',
        startedAt,
        request: { query: input.ctx.message },
        output,
      });
      toolRuns.push(run);
    }
  }

  return { toolRuns };
}
