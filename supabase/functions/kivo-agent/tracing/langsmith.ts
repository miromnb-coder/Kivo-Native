import { DEFAULT_LANGSMITH_ENDPOINT, DEFAULT_LANGSMITH_PROJECT } from '../_shared/constants.ts';
import { nowIso } from '../_shared/utils.ts';

function isLangSmithEnabled() {
  return Deno.env.get('LANGSMITH_TRACING') === 'true' && Boolean(Deno.env.get('LANGSMITH_API_KEY'));
}

function langSmithEndpoint() {
  return (Deno.env.get('LANGSMITH_ENDPOINT') ?? DEFAULT_LANGSMITH_ENDPOINT).replace(/\/+$/, '');
}

async function langSmithRequest(method: 'POST' | 'PATCH', path: string, body: Record<string, unknown>) {
  if (!isLangSmithEnabled()) return;

  const apiKey = Deno.env.get('LANGSMITH_API_KEY')!;
  const endpoint = langSmithEndpoint();
  const headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey };
  const urls = [`${endpoint}${path}`, `${endpoint}/api/v1${path}`];

  for (const url of urls) {
    try {
      const response = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (response.ok) return;
      if (![404, 405].includes(response.status)) {
        console.warn('LangSmith request failed', response.status, await response.text());
        return;
      }
    } catch (error) {
      console.warn('LangSmith request error', error);
      return;
    }
  }
}

export async function startTrace(input: {
  traceId: string;
  name: string;
  inputs: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  await langSmithRequest('POST', '/runs', {
    id: input.traceId,
    name: input.name,
    run_type: 'chain',
    inputs: input.inputs,
    start_time: nowIso(),
    session_name: Deno.env.get('LANGSMITH_PROJECT') ?? DEFAULT_LANGSMITH_PROJECT,
    extra: { metadata: input.metadata ?? {} },
  });
}

export async function finishTrace(input: { traceId: string; outputs?: Record<string, unknown>; error?: string }) {
  await langSmithRequest('PATCH', `/runs/${input.traceId}`, {
    outputs: input.outputs ?? {},
    error: input.error,
    end_time: nowIso(),
  });
}

export function tracingEnabled() {
  return isLangSmithEnabled();
}
