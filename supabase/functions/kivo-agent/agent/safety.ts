import type { KivoIntent } from '../_shared/types.ts';
import type { KivoPlan } from './planner.ts';

export type SafetyDecision = {
  allowed: boolean;
  needsConfirmation: boolean;
  reason?: string;
};

export function checkSafety(input: { message: string; intent: KivoIntent; plan: KivoPlan }): SafetyDecision {
  const lower = input.message.toLowerCase();

  const unsafeHints = [
    'how to hurt myself',
    'kill myself',
    'itsemurha',
    'vahingoittaa itseäni',
    'pommi',
    'ase',
    'huume',
  ];

  if (unsafeHints.some((hint) => lower.includes(hint))) {
    return {
      allowed: false,
      needsConfirmation: false,
      reason: 'Request appears unsafe or restricted.',
    };
  }

  const needsConfirmation = input.plan.steps.some((step) => step.requiresConfirmation || step.riskLevel === 'high');

  return {
    allowed: true,
    needsConfirmation,
    reason: needsConfirmation ? 'Some actions require confirmation.' : undefined,
  };
}
