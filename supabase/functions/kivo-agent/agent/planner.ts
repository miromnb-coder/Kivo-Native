import type { KivoAnswerStyle, KivoIntent, KivoResponseMode, KivoRiskLevel, KivoToolRun } from '../_shared/types.ts';
import type { KivoToolName } from '../tools/registry.ts';
import { getTool } from '../tools/registry.ts';

export type KivoPlanStep = {
  id: string;
  title: string;
  detail?: string;
  toolName?: KivoToolName;
  riskLevel: KivoRiskLevel;
  requiresConfirmation: boolean;
  connected: boolean;
  visibleToUser: boolean;
};

export type KivoPlan = {
  shouldUseTools: boolean;
  needsMemory: boolean;
  needsConfirmation: boolean;
  riskLevel: KivoRiskLevel;
  responseMode: KivoResponseMode;
  answerStyle: KivoAnswerStyle;
  steps: KivoPlanStep[];
  suggestedActions: Array<{ id: string; label: string; actionType: string; payload?: Record<string, unknown> }>;
  plannerNotes: string[];
};

const fallbackAnswerStyle: KivoAnswerStyle = {
  useDividers: false,
  useCopyBlocks: false,
  useBullets: true,
  useNumberedSteps: false,
  compact: true,
  avoidTables: true,
  maxSections: 3,
  languageMode: 'match_user',
};

function riskRank(level: KivoRiskLevel) {
  if (level === 'high') return 3;
  if (level === 'medium') return 2;
  return 1;
}

function maxRisk(a: KivoRiskLevel, b: KivoRiskLevel): KivoRiskLevel {
  return riskRank(a) >= riskRank(b) ? a : b;
}

function connectedToolStep(input: {
  id: string;
  title: string;
  detail?: string;
  toolName: KivoToolName;
  riskLevel?: KivoRiskLevel;
  visibleToUser?: boolean;
}): KivoPlanStep {
  const tool = getTool(input.toolName);
  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    toolName: input.toolName,
    riskLevel: input.riskLevel ?? (tool.permission === 'write' ? 'high' : tool.permission === 'external' ? 'medium' : 'low'),
    requiresConfirmation: tool.requiresConfirmation,
    connected: tool.connected,
    visibleToUser: input.visibleToUser ?? true,
  };
}

function normalStep(input: {
  id: string;
  title: string;
  detail?: string;
  riskLevel?: KivoRiskLevel;
  requiresConfirmation?: boolean;
  visibleToUser?: boolean;
}): KivoPlanStep {
  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    riskLevel: input.riskLevel ?? 'low',
    requiresConfirmation: input.requiresConfirmation ?? false,
    connected: true,
    visibleToUser: input.visibleToUser ?? true,
  };
}

function shouldUseMemory(input: { intent: KivoIntent; memoryCount: number }) {
  if (input.intent.needsMemory) return true;
  if (input.memoryCount > 0) return true;
  return ['planning', 'task_help', 'coding_help', 'app_design_help', 'calendar_needed', 'email_summary_needed', 'finance_scan_needed', 'memory_query'].includes(input.intent.name);
}

function modeForIntent(intent: KivoIntent): KivoResponseMode {
  if (intent.responseMode) return intent.responseMode;

  switch (intent.name) {
    case 'coding_help':
      return 'technical';
    case 'app_design_help':
      return 'design';
    case 'planning':
    case 'calendar_needed':
      return 'planner';
    case 'clarification_needed':
      return 'clarifying';
    case 'unsafe_or_restricted':
      return 'safe_refusal';
    default:
      return 'structured';
  }
}

function styleForIntent(intent: KivoIntent): KivoAnswerStyle {
  return {
    ...fallbackAnswerStyle,
    ...(intent.answerStyle ?? {}),
    avoidTables: true,
    languageMode: 'match_user',
  };
}

function makeSuggestedActions(intent: KivoIntent, plan: Pick<KivoPlan, 'riskLevel' | 'responseMode'>): KivoPlan['suggestedActions'] {
  if (intent.name === 'memory_save_candidate') {
    return [
      { id: 'confirm_memory_save', label: 'Tallenna tämä muistiksi', actionType: 'memory_save' },
      { id: 'not_now', label: 'Älä tallenna vielä', actionType: 'dismiss' },
    ];
  }

  if (intent.name === 'planning') {
    return [
      { id: 'make_first_step', label: 'Aloita ensimmäisestä vaiheesta', actionType: 'continue_planning', payload: { mode: plan.responseMode } },
      { id: 'turn_into_checklist', label: 'Muuta tämä checklistiksi', actionType: 'format_as_checklist' },
    ];
  }

  if (intent.name === 'coding_help') {
    return [
      { id: 'show_exact_files', label: 'Näytä tarkat tiedostot', actionType: 'show_files' },
      { id: 'make_patch_plan', label: 'Tee korjaussuunnitelma', actionType: 'patch_plan' },
    ];
  }

  if (intent.name === 'app_design_help') {
    return [
      { id: 'make_visual_spec', label: 'Tee tästä UI-speksi', actionType: 'visual_spec' },
      { id: 'compare_options', label: 'Vertaa vaihtoehdot', actionType: 'compare_options' },
    ];
  }

  if (intent.name.endsWith('_needed')) {
    return [
      { id: 'connect_later', label: 'Yhdistä tämä palvelu myöhemmin', actionType: 'open_integrations' },
    ];
  }

  if (intent.name === 'task_help') {
    return [{ id: 'continue_task', label: 'Jatka tästä', actionType: 'continue_task' }];
  }

  return [];
}

function addDisconnectedServiceStep(steps: KivoPlanStep[], input: {
  id: string;
  title: string;
  detail: string;
  toolName?: KivoToolName;
  riskLevel?: KivoRiskLevel;
}) {
  if (input.toolName) {
    steps.push(connectedToolStep({
      id: input.id,
      title: input.title,
      detail: input.detail,
      toolName: input.toolName,
      riskLevel: input.riskLevel ?? 'medium',
    }));
    return;
  }

  steps.push(normalStep({
    id: input.id,
    title: input.title,
    detail: input.detail,
    riskLevel: input.riskLevel ?? 'medium',
    visibleToUser: true,
  }));
}

export function createPlan(input: { intent: KivoIntent; hasImage: boolean; memoryCount: number }): KivoPlan {
  const steps: KivoPlanStep[] = [];
  const plannerNotes: string[] = [];
  const needsMemory = shouldUseMemory({ intent: input.intent, memoryCount: input.memoryCount });
  const responseMode = modeForIntent(input.intent);
  const answerStyle = styleForIntent(input.intent);
  let riskLevel: KivoRiskLevel = input.intent.riskLevel ?? 'low';

  steps.push(normalStep({
    id: 'understand',
    title: 'Understand request',
    detail: input.intent.reason ?? 'Classify the user request and choose the right response path.',
    riskLevel: 'low',
  }));

  if (needsMemory) {
    steps.push(connectedToolStep({
      id: 'memory',
      title: input.memoryCount > 0 ? 'Use relevant memory' : 'Check memory context',
      detail: input.memoryCount > 0 ? `${input.memoryCount} memory items are available.` : 'No strong memory items found, but memory was considered.',
      toolName: 'memory_search',
      riskLevel: 'low',
    }));
  } else {
    plannerNotes.push('Memory not required for this request.');
  }

  if (input.hasImage || input.intent.name === 'image_analysis') {
    addDisconnectedServiceStep(steps, {
      id: 'image-analysis-planned',
      title: 'Image analysis requested',
      detail: 'Image analysis is planned but not connected in Core v1. Do not describe the image as if it was analyzed.',
      toolName: 'image_analysis',
      riskLevel: 'low',
    });
  }

  if (input.intent.name === 'web_search_needed') {
    addDisconnectedServiceStep(steps, {
      id: 'web-search-planned',
      title: 'Current information needed',
      detail: 'Live web search is planned but not connected in Core v1. Do not claim external lookup.',
      toolName: 'web_search',
      riskLevel: 'medium',
    });
  }

  if (input.intent.name === 'calendar_needed') {
    addDisconnectedServiceStep(steps, {
      id: 'calendar-planned',
      title: 'Calendar context needed',
      detail: 'Calendar is not connected in Core v1. Ask for details or explain the limitation.',
      riskLevel: 'medium',
    });
  }

  if (input.intent.name === 'email_summary_needed') {
    addDisconnectedServiceStep(steps, {
      id: 'email-planned',
      title: 'Email context needed',
      detail: 'Email access is not connected in Core v1. Do not invent inbox content.',
      riskLevel: 'medium',
    });
  }

  if (input.intent.name === 'finance_scan_needed') {
    addDisconnectedServiceStep(steps, {
      id: 'finance-planned',
      title: 'Financial context requested',
      detail: 'Finance tools are not connected in Core v1. Keep advice general and safe.',
      riskLevel: 'high',
    });
  }

  if (input.intent.name === 'memory_save_candidate') {
    steps.push(connectedToolStep({
      id: 'memory-save-planned',
      title: 'Memory save requires confirmation',
      detail: 'Do not save long-term memory silently. Ask or suggest confirmation.',
      toolName: 'memory_save',
      riskLevel: 'medium',
    }));
  }

  if (input.intent.name === 'app_action_needed') {
    steps.push(normalStep({
      id: 'app-action-confirmation',
      title: 'App action requires confirmation',
      detail: 'Write actions are not enabled in Core v1. Do not claim completion.',
      riskLevel: 'high',
      requiresConfirmation: true,
    }));
  }

  if (responseMode === 'technical') {
    steps.push(normalStep({
      id: 'technical-structure',
      title: 'Prepare technical response structure',
      detail: 'Use exact file paths, copy blocks when useful, and small safe changes.',
      riskLevel: 'low',
      visibleToUser: false,
    }));
  }

  if (responseMode === 'design') {
    steps.push(normalStep({
      id: 'design-structure',
      title: 'Prepare design response structure',
      detail: 'Use concrete UI decisions, options, and premium mobile guidance.',
      riskLevel: 'low',
      visibleToUser: false,
    }));
  }

  if (responseMode === 'clarifying') {
    steps.push(normalStep({
      id: 'ask-clarification',
      title: 'Ask minimal clarification',
      detail: 'Ask only one focused follow-up question.',
      riskLevel: 'low',
    }));
  } else {
    steps.push(connectedToolStep({
      id: 'generate',
      title: 'Generate final answer',
      detail: 'Produce a concise, mobile-friendly answer using the selected response style.',
      toolName: 'groq_chat',
      riskLevel: 'low',
    }));
  }

  riskLevel = steps.reduce((current, step) => maxRisk(current, step.riskLevel), riskLevel);
  const needsConfirmation = steps.some((step) => step.requiresConfirmation || step.riskLevel === 'high');
  const shouldUseTools = steps.some((step) => Boolean(step.toolName && step.connected));
  const partialPlan = { riskLevel, responseMode };

  return {
    shouldUseTools,
    needsMemory,
    needsConfirmation,
    riskLevel,
    responseMode,
    answerStyle,
    steps,
    suggestedActions: makeSuggestedActions(input.intent, partialPlan),
    plannerNotes,
  };
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
