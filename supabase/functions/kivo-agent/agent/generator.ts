import type {
  KivoAgentResponse,
  KivoAgentEvent,
  KivoIntent,
  KivoMemoryHit,
  KivoToolRun,
  KivoUsage,
} from '../_shared/types.ts';
import { DEFAULT_CHAT_MODEL } from '../_shared/constants.ts';

type SafeFallbackInput = {
  intentName: string;
  safetyReason?: string;
  languageHint?: string;
  userMessage?: string;
  localizedCopy?: Partial<Record<'safety' | 'notConnected' | 'generic', string>>;
};

const MAX_SUGGESTED_ACTIONS = 6;

function isMarkdownTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isMarkdownTableRow(line: string) {
  if (!line.includes('|')) return false;
  if (/https?:\/\//i.test(line) && !/^\s*\|/.test(line)) return false;

  return line
    .split('|')
    .filter((cell) => cell.trim().length > 0)
    .length >= 2;
}

function cleanMarkdownCell(value: string) {
  return value
    .replace(/\\\|/g, '|')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^`([^`]+)`$/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitMarkdownTableRow(line: string) {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cleanMarkdownCell(cell));
}

function convertMarkdownTableBlock(tableLines: string[]) {
  const rows = tableLines
    .filter((line) => !isMarkdownTableDivider(line))
    .map(splitMarkdownTableRow)
    .filter((row) => row.length >= 2 && row.some(Boolean));

  if (rows.length < 2) {
    return tableLines
      .filter((line) => !isMarkdownTableDivider(line))
      .map((line) => line.replace(/\s*\|\s*/g, ' — ').trim())
      .join('\n');
  }

  const [header, ...bodyRows] = rows;
  const twoColumns = header.length === 2;

  return bodyRows
    .map((row) => {
      const title = row[0] || header[0] || 'Item';

      const details = header
        .slice(1)
        .map((label, index) => {
          const value = row[index + 1];
          if (!value) return null;
          if (twoColumns) return value;
          return `${label}: ${value}`;
        })
        .filter((detail): detail is string => Boolean(detail));

      if (!details.length) return title;

      return `${title}\n${details.join('\n')}`;
    })
    .join('\n\n');
}

function convertMarkdownTablesToMobileText(value: string) {
  const lines = value.split('\n');
  const output: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const current = lines[index].trim();

    if (!isMarkdownTableRow(current)) {
      output.push(lines[index]);
      index += 1;
      continue;
    }

    const tableLines: string[] = [];
    let hasDivider = false;

    while (index < lines.length) {
      const line = lines[index].trim();

      if (isMarkdownTableDivider(line)) {
        hasDivider = true;
        tableLines.push(line);
        index += 1;
        continue;
      }

      if (!isMarkdownTableRow(line)) break;

      tableLines.push(line);
      index += 1;
    }

    if (hasDivider || tableLines.length >= 2) {
      output.push(convertMarkdownTableBlock(tableLines));
    } else {
      output.push(tableLines.join('\n'));
    }
  }

  return output.join('\n');
}

function normalizeAnswerText(answer: string) {
  const decoded = answer
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ');

  return convertMarkdownTablesToMobileText(decoded)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeModel(model?: string) {
  return model?.trim() || DEFAULT_CHAT_MODEL;
}

function normalizeUsage(usage: KivoUsage): KivoUsage {
  return {
    creditsSpent: Math.max(0, usage.creditsSpent || 0),
    tokensIn: Math.max(0, usage.tokensIn || 0),
    tokensOut: Math.max(0, usage.tokensOut || 0),
    toolCredits: Math.max(0, usage.toolCredits || 0),
  };
}

function normalizeEvents(events: KivoAgentEvent[]) {
  const now = new Date().toISOString();

  return events.map((event) => ({
    ...event,
    eventType: event.eventType || 'agent_event',
    ts: event.ts || now,
  }));
}

function normalizeToolRuns(toolRuns: KivoToolRun[]) {
  const seen = new Set<string>();

  return toolRuns.filter((run) => {
    const key = `${run.toolRunId}:${run.toolName}`;
    if (seen.has(key)) return false;

    seen.add(key);
    return Boolean(run.toolRunId && run.toolName && run.status);
  });
}

function normalizeSuggestedActions(actions: KivoAgentResponse['suggestedActions']) {
  const seen = new Set<string>();

  return actions
    .filter((action) => {
      const key = action.id || `${action.actionType}:${action.label}`;
      if (!action.label || !action.actionType) return false;
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .slice(0, MAX_SUGGESTED_ACTIONS);
}

function normalizeMemoryHits(memories: KivoMemoryHit[]) {
  const seen = new Set<string>();

  return memories.filter((memory) => {
    const key = memory.memoryId || `${memory.type}:${memory.snippet}`;
    if (seen.has(key)) return false;

    seen.add(key);
    return Boolean(memory.type && memory.snippet);
  });
}

function likelyFinnish(input?: string) {
  if (!input) return false;

  return /\b(mitä|miksi|miten|kuinka|voinko|haluan|tee|korjaa|suunnittele|tämä|tuo|minun|sinun)\b/i.test(input);
}

function resolveFallbackLocale(input: SafeFallbackInput) {
  const hint = input.languageHint?.toLowerCase().trim();

  if (hint?.startsWith('fi')) return 'fi';
  if (hint?.startsWith('en')) return 'en';

  if (likelyFinnish(input.userMessage)) return 'fi';

  return 'en';
}

function serviceNameForIntent(intentName: string) {
  switch (intentName) {
    case 'web_search_needed':
      return {
        en: 'live web search',
        fi: 'ajankohtainen verkkohaku',
      };

    case 'calendar_needed':
      return {
        en: 'calendar access',
        fi: 'kalenteriyhteys',
      };

    case 'email_summary_needed':
      return {
        en: 'email access',
        fi: 'sähköpostiyhteys',
      };

    case 'finance_scan_needed':
      return {
        en: 'finance scanning',
        fi: 'taloustietojen tarkistus',
      };

    case 'image_analysis':
      return {
        en: 'image analysis',
        fi: 'kuva-analyysi',
      };

    case 'app_action_needed':
      return {
        en: 'app actions',
        fi: 'sovelluksen kirjoittavat toiminnot',
      };

    default:
      return {
        en: 'that tool',
        fi: 'tuo työkalu',
      };
  }
}

function buildNotConnectedFallback(input: SafeFallbackInput) {
  if (input.localizedCopy?.notConnected) return input.localizedCopy.notConnected;

  const locale = resolveFallbackLocale(input);
  const service = serviceNameForIntent(input.intentName);

  if (locale === 'fi') {
    return `${service.fi} ei ole vielä yhdistetty tähän agenttiversioon, joten en väitä käyttäneeni sitä. Voin silti auttaa parhaalla mahdollisella tavalla niiden tietojen perusteella, jotka annoit.`;
  }

  return `${service.en} is not connected in this agent version yet, so I will not pretend I used it. I can still help using the information you provided.`;
}

function buildGenericFallback(input: SafeFallbackInput) {
  if (input.localizedCopy?.generic) return input.localizedCopy.generic;

  const locale = resolveFallbackLocale(input);

  if (locale === 'fi') {
    return 'En saanut agenttiajoa valmiiksi. Kokeile uudelleen hetken päästä.';
  }

  return 'I could not complete the agent run. Try again in a moment.';
}

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
  const answer = normalizeAnswerText(input.answer) || buildGenericFallback({
    intentName: input.intent.name,
  });

  const toolRuns = normalizeToolRuns(input.toolRuns);
  const usedMemory = normalizeMemoryHits(input.usedMemory);

  return {
    answer,
    intent: input.intent,
    conversationId: input.conversationId,
    model: normalizeModel(input.model),
    usedMemory,
    usedTools: toolRuns.map((run) => ({
      toolName: run.toolName,
      toolRunId: run.toolRunId,
      status: run.status,
    })),
    events: normalizeEvents(input.events),
    toolRuns,
    suggestedActions: normalizeSuggestedActions(input.suggestedActions),
    usage: normalizeUsage(input.usage),
    traceId: input.traceId,
    error: input.error ?? null,
  };
}

export function buildSafeFallbackAnswer(input: SafeFallbackInput) {
  if (input.safetyReason) {
    if (input.localizedCopy?.safety) return input.localizedCopy.safety;

    const locale = resolveFallbackLocale(input);

    if (locale === 'fi') {
      return 'En voi auttaa tuossa pyynnössä. Voin kuitenkin auttaa turvallisella vaihtoehdolla tai selittää aiheen yleisellä tasolla.';
    }

    return 'I can’t help with that request. I can still help with a safer alternative or explain the topic at a general level.';
  }

  if (
    input.intentName === 'web_search_needed' ||
    input.intentName === 'calendar_needed' ||
    input.intentName === 'email_summary_needed' ||
    input.intentName === 'finance_scan_needed' ||
    input.intentName === 'image_analysis' ||
    input.intentName === 'app_action_needed'
  ) {
    return buildNotConnectedFallback(input);
  }

  return buildGenericFallback(input);
}
