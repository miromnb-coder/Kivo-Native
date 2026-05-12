import type { KivoAgentResponse, KivoAgentEvent, KivoIntent, KivoMemoryHit, KivoToolRun, KivoUsage } from '../_shared/types.ts';
import { DEFAULT_CHAT_MODEL } from '../_shared/constants.ts';

export function buildAgentResponse(input: {
  answer: string;
  intent: KivoIntent;
  conversationId: string | null;
  model?: string;
  usedMemory: KivoMemoryHit[];
  toolRuns: KivoToolRun[];
  events: KivoAgentEvent[];
  suggestedActions: KivoAgentResponse['suggestedActions'];
  usage: KivoUsage;
  traceId: string;
  error?: KivoAgentResponse['error'];
}): KivoAgentResponse {
  return {
    answer: input.answer,
    intent: input.intent,
    conversationId: input.conversationId,
    model: input.model ?? DEFAULT_CHAT_MODEL,
    usedMemory: input.usedMemory,
    usedTools: input.toolRuns.map((run) => ({
      toolName: run.toolName,
      toolRunId: run.toolRunId,
      status: run.status,
    })),
    events: input.events,
    toolRuns: input.toolRuns,
    suggestedActions: input.suggestedActions,
    usage: input.usage,
    traceId: input.traceId,
    error: input.error ?? null,
  };
}

export function buildSafeFallbackAnswer(input: { intentName: string; safetyReason?: string }) {
  if (input.safetyReason) {
    return 'En voi auttaa tuossa pyynnössä. Voin kuitenkin auttaa turvallisella vaihtoehdolla tai selittää asian yleisellä tasolla.';
  }

  if (input.intentName === 'web_search_needed') {
    return 'Tämä vaatisi ajankohtaista hakua. Web search ei ole vielä yhdistetty tähän agenttiversioon, joten en väitä hakeneeni netistä.';
  }

  return 'En saanut agenttiajoa valmiiksi. Kokeile uudelleen hetken päästä.';
}
