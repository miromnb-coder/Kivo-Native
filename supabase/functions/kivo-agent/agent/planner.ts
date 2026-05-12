import type { KivoIntent, KivoToolRun } from '../_shared/types.ts';
import type { KivoToolName } from '../tools/registry.ts';

export type KivoPlanStep = {
  id: string;
  title: string;
  toolName?: KivoToolName;
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
  connected: boolean;
};

export type KivoPlan = {
  shouldUseTools: boolean;
  steps: KivoPlanStep[];
  suggestedActions: Array<{ id: string; label: string; actionType: string; payload?: Record<string, unknown> }>;
};

export function createPlan(input: { intent: KivoIntent; hasImage: boolean; memoryCount: number }): KivoPlan {
  const steps: KivoPlanStep[] = [
    { id: 'understand', title: 'Understand request', riskLevel: 'low', requiresConfirmation: false, connected: true },
  ];

  // Core v1 connected tool: memory_search.
  steps.push({
    id: 'memory',
    title: input.memoryCount > 0 ? 'Use relevant memory' : 'Check memory context',
    toolName: 'memory_search',
    riskLevel: 'low',
    requiresConfirmation: false,
    connected: true,
  });

  // Core v1 does not enable image analysis yet. Keep it visible as planned, not connected.
  if (input.hasImage) {
    steps.push({
      id: 'image-planned',
      title: 'Image analysis is planned but not connected in Core v1',
      toolName: 'image_analysis',
      riskLevel: 'low',
      requiresConfirmation: false,
      connected: false,
    });
  }

  // Core v1 does not enable live web search yet.
  if (input.intent.name === 'web_search_needed') {
    steps.push({
      id: 'web-search-planned',
      title: 'Live web search is planned but not connected in Core v1',
      toolName: 'web_search',
      riskLevel: 'medium',
      requiresConfirmation: false,
      connected: false,
    });
  }

  // Core v1 connected tool: groq_chat.
  steps.push({
    id: 'generate',
    title: 'Generate final answer',
    toolName: 'groq_chat',
    riskLevel: 'low',
    requiresConfirmation: false,
    connected: true,
  });

  return {
    shouldUseTools: steps.some((step) => Boolean(step.toolName && step.connected)),
    steps,
    suggestedActions: makeSuggestedActions(input.intent),
  };
}

function makeSuggestedActions(intent: KivoIntent): KivoPlan['suggestedActions'] {
  if (intent.name === 'memory_save_candidate') {
    return [{ id: 'confirm_memory_save', label: 'Tallenna tämä myöhemmin muistiksi', actionType: 'memory_save' }];
  }

  if (intent.name === 'planning' || intent.name === 'task_help') {
    return [{ id: 'make_next_step', label: 'Jatka tästä seuraavaan askeleeseen', actionType: 'continue_planning' }];
  }

  return [];
}

export function planToToolRuns(plan: KivoPlan): Pick<KivoToolRun, 'toolRunId' | 'toolName' | 'status'>[] {
  return plan.steps
    .filter((step) => step.toolName)
    .map((step) => ({
      toolRunId: step.id,
      toolName: step.toolName!,
      status: step.connected ? 'success' : 'not_connected',
    }));
}
