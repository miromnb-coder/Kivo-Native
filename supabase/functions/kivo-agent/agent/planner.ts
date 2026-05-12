import type { KivoIntent, KivoToolRun } from '../_shared/types.ts';
import type { KivoToolName } from '../tools/registry.ts';

export type KivoPlanStep = {
  id: string;
  title: string;
  toolName?: KivoToolName;
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
};

export type KivoPlan = {
  shouldUseTools: boolean;
  steps: KivoPlanStep[];
  suggestedActions: Array<{ id: string; label: string; actionType: string; payload?: Record<string, unknown> }>;
};

export function createPlan(input: { intent: KivoIntent; hasImage: boolean; memoryCount: number }): KivoPlan {
  const steps: KivoPlanStep[] = [
    { id: 'understand', title: 'Understand request', riskLevel: 'low', requiresConfirmation: false },
  ];

  if (input.memoryCount > 0 || input.intent.name.includes('memory')) {
    steps.push({ id: 'memory', title: 'Use relevant memory', toolName: 'memory_search', riskLevel: 'low', requiresConfirmation: false });
  }

  if (input.hasImage) {
    steps.push({ id: 'image', title: 'Analyze image', toolName: 'image_analysis', riskLevel: 'low', requiresConfirmation: false });
  }

  if (input.intent.name === 'web_search_needed') {
    steps.push({ id: 'web-search', title: 'Search the web', toolName: 'web_search', riskLevel: 'medium', requiresConfirmation: false });
  }

  steps.push({ id: 'generate', title: 'Generate final answer', toolName: 'groq_chat', riskLevel: 'low', requiresConfirmation: false });

  return {
    shouldUseTools: steps.some((step) => Boolean(step.toolName)),
    steps,
    suggestedActions: makeSuggestedActions(input.intent),
  };
}

function makeSuggestedActions(intent: KivoIntent): KivoPlan['suggestedActions'] {
  if (intent.name === 'memory_save_candidate') {
    return [{ id: 'confirm_memory_save', label: 'Tallenna tämä muistiksi', actionType: 'memory_save' }];
  }

  if (intent.name === 'planning' || intent.name === 'task_help') {
    return [{ id: 'make_next_step', label: 'Tee tästä seuraava askel', actionType: 'app_action' }];
  }

  return [];
}

export function planToToolRuns(plan: KivoPlan): Pick<KivoToolRun, 'toolRunId' | 'toolName' | 'status'>[] {
  return plan.steps
    .filter((step) => step.toolName)
    .map((step) => ({ toolRunId: step.id, toolName: step.toolName!, status: 'not_connected' }));
}
