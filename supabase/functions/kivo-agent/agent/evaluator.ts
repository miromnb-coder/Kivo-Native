import type { KivoAgentResponse } from '../_shared/types.ts';

export function evaluateResponse(response: KivoAgentResponse) {
  const issues: string[] = [];

  if (!response.answer.trim()) issues.push('Answer is empty.');
  if (!response.traceId) issues.push('traceId is missing.');
  if (!response.intent?.name) issues.push('intent.name is missing.');

  const claimsWebSearch = /ha(i|e)n netistä|searched|web search|lähteet/i.test(response.answer);
  const usedConnectedWebSearch = response.usedTools.some((tool) => tool.toolName === 'web_search' && tool.status === 'success');

  if (claimsWebSearch && !usedConnectedWebSearch) {
    issues.push('Answer appears to claim web search without successful web_search tool run.');
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
