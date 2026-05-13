import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { CREDIT_COSTS } from './_shared/constants.ts';
import { assertMessageOrImage, parseKivoAgentRequest } from './_shared/schemas.ts';
import type {
  KivoAgentContext,
  KivoAgentEvent,
  KivoAgentRequest,
  KivoIntent,
  KivoToolRun,
  KivoUsage,
} from './_shared/types.ts';
import { cleanBase64, cleanMimeType, makeId } from './_shared/utils.ts';

import { buildContext } from './agent/context-builder.ts';
import { evaluateResponse } from './agent/evaluator.ts';
import { executePlan } from './agent/executor.ts';
import { buildAgentResponse } from './agent/generator.ts';
import { createPlan, type KivoPlan } from './agent/planner.ts';
import { routeIntent } from './agent/router.ts';
import { checkSafety } from './agent/safety.ts';

import { persistAgentEvent } from './db/agent-events.ts';
import { getOrCreateConversation, touchConversation } from './db/conversations.ts';
import { saveKivoMessage } from './db/messages.ts';
import { persistToolRun } from './db/tool-runs.ts';
import { ensureUsageRow, incrementUsage } from './db/usage.ts';

import { finishTrace, startTrace, tracingEnabled } from './tracing/langsmith.ts';
import { runGroqChat } from './tools/groq-chat.ts';
import { buildKivoSystemPrompt } from './prompts/system.ts';

const CORE_VERSION = 'core-v2-orchestration';
const MAX_HISTORY_MESSAGES = 18;
const MAX_HISTORY_CONTENT_CHARS = 5000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SupabaseEnv = {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

type GroqMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function getSupabaseEnv(): SupabaseEnv {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Supabase environment is not configured.');
  }

  return { supabaseUrl, anonKey, serviceRoleKey };
}

function createSupabaseClients(env: SupabaseEnv, authHeader: string) {
  return {
    userClient: createClient(env.supabaseUrl, env.anonKey, {
      global: { headers: { Authorization: authHeader } },
    }),
    admin: createClient(env.supabaseUrl, env.serviceRoleKey),
  };
}

async function resolveAuthenticatedUserId(userClient: SupabaseClient) {
  const { data, error } = await userClient.auth.getUser();

  if (error || !data.user?.id) {
    return null;
  }

  return data.user.id;
}

function isClientPersistingMessages(body: KivoAgentRequest) {
  return body.metadata?.clientPersistsMessages === true;
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown kivo-agent error.';
}

function isLikelyFinnish(message?: string | null) {
  if (!message) return false;

  return /\b(mitä|miksi|miten|kuinka|voinko|haluan|tee|korjaa|suunnittele|tämä|tuo|minun|sinun|jatketaan|seuraavaksi)\b/i
    .test(message);
}

function buildLocalizedFailureAnswer(message?: string | null) {
  if (isLikelyFinnish(message)) {
    return 'En saanut agenttiajoa valmiiksi. Kokeile uudelleen hetken päästä.';
  }

  return 'I could not complete the agent run. Try again in a moment.';
}

function buildLocalizedSafetyAnswer(message?: string | null) {
  if (isLikelyFinnish(message)) {
    return 'En voi auttaa tuossa pyynnössä. Voin kuitenkin auttaa turvallisella vaihtoehdolla tai selittää aiheen yleisellä tasolla.';
  }

  return 'I can’t help with that request. I can still help with a safer alternative or explain the topic at a general level.';
}

function buildDisconnectedImageNote(message: string) {
  return [
    message,
    '',
    'Note: The user attached an image, but image analysis is not connected in Kivo Agent Core v1.',
    'Do not describe or analyze the image.',
    'If the image is relevant, explain this limitation briefly in the user’s language.',
  ].join('\n');
}

function truncateContent(content: string, maxChars = MAX_HISTORY_CONTENT_CHARS) {
  const clean = content.replace(/\s+/g, ' ').trim();

  if (clean.length <= maxChars) return clean;

  return `${clean.slice(0, maxChars).trim()}…`;
}

function normalizeClientHistory(history?: KivoAgentRequest['history']): GroqMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .map((item) => {
      const role = item.role === 'assistant' ? 'assistant' : 'user';
      const content = truncateContent(item.content ?? '');

      if (!content) return null;

      return { role, content } satisfies GroqMessage;
    })
    .filter((item): item is GroqMessage => Boolean(item))
    .slice(-MAX_HISTORY_MESSAGES);
}

function dedupeConsecutiveMessages(messages: GroqMessage[]) {
  const output: GroqMessage[] = [];

  for (const message of messages) {
    const previous = output[output.length - 1];

    if (previous?.role === message.role && previous.content === message.content) {
      continue;
    }

    output.push(message);
  }

  return output;
}

function buildGroqMessages(input: {
  systemPrompt: string;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  clientHistory?: KivoAgentRequest['history'];
  userText: string;
}): GroqMessage[] {
  const recentMessages = input.recentMessages.map((item) => ({
    role: item.role,
    content: truncateContent(item.content),
  }));

  const clientHistory = normalizeClientHistory(input.clientHistory);

  return dedupeConsecutiveMessages([
    { role: 'system', content: input.systemPrompt },
    ...recentMessages,
    ...clientHistory,
    { role: 'user', content: input.userText },
  ]);
}

function fallbackIntent(): KivoIntent {
  return {
    name: 'normal_chat',
    confidence: 0.2,
    reason: 'Fallback after kivo-agent failure.',
    signals: ['agent_failed'],
    needsMemory: false,
    needsTool: false,
    riskLevel: 'low',
    responseMode: 'direct',
    answerStyle: {
      useDividers: false,
      useCopyBlocks: false,
      useBullets: false,
      useNumberedSteps: false,
      compact: true,
      avoidTables: true,
      maxSections: 1,
      languageMode: 'match_user',
    },
  };
}

function emptyUsage(): KivoUsage {
  return {
    creditsSpent: 0,
    tokensIn: 0,
    tokensOut: 0,
    toolCredits: 0,
  };
}

async function safeStartTrace(input: {
  traceId: string;
  message: string;
  conversationId: string | null;
  hasImage: boolean;
  userId: string;
}) {
  try {
    await startTrace({
      traceId: input.traceId,
      name: 'kivo-agent-core-v2',
      inputs: {
        message: input.message,
        conversationId: input.conversationId,
        hasImage: input.hasImage,
      },
      metadata: {
        userId: input.userId,
        conversationId: input.conversationId,
        source: 'kivo-native',
        scope: CORE_VERSION,
      },
    });
  } catch (error) {
    console.warn('Failed to start LangSmith trace', error);
  }
}

async function safeFinishTrace(input: {
  traceId: string;
  outputs?: unknown;
  error?: string;
  conversationId?: string | null;
}) {
  try {
    await finishTrace({
      traceId: input.traceId,
      outputs: input.outputs ?? (input.conversationId ? { conversationId: input.conversationId } : undefined),
      error: input.error,
    });
  } catch (traceError) {
    console.warn('Failed to finish LangSmith trace', traceError);
  }
}

async function recordEvent(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
  traceId: string;
  events: KivoAgentEvent[];
  eventType: string;
  label: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const event = await persistAgentEvent({
      admin: input.admin,
      userId: input.userId,
      conversationId: input.conversationId,
      traceId: input.traceId,
      eventType: input.eventType,
      label: input.label,
      detail: input.detail,
      metadata: input.metadata,
    });

    input.events.push(event);
    return event;
  } catch (error) {
    const fallbackEvent: KivoAgentEvent = {
      eventType: input.eventType,
      ts: new Date().toISOString(),
      label: input.label,
      detail: input.detail,
      details: {
        ...(input.metadata ?? {}),
        loggingFailed: true,
        loggingError: safeErrorMessage(error),
      },
    };

    input.events.push(fallbackEvent);
    console.warn('Failed to persist agent event', error);

    return fallbackEvent;
  }
}

async function recordToolRun(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
  toolRuns: KivoToolRun[];
  toolRunId: string;
  toolName: string;
  status: KivoToolRun['status'];
  startedAt: number;
  request?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}) {
  try {
    const run = await persistToolRun({
      admin: input.admin,
      userId: input.userId,
      conversationId: input.conversationId,
      toolRunId: input.toolRunId,
      toolName: input.toolName,
      status: input.status,
      startedAt: input.startedAt,
      request: input.request,
      output: input.output,
      error: input.error,
    });

    input.toolRuns.push(run);
    return run;
  } catch (error) {
    const fallbackRun: KivoToolRun = {
      toolRunId: input.toolRunId,
      toolName: input.toolName,
      status: input.status,
      latencyMs: Date.now() - input.startedAt,
      output: {
        ...(input.output ?? {}),
        loggingFailed: true,
      },
      error: input.error ?? safeErrorMessage(error),
    };

    input.toolRuns.push(fallbackRun);
    console.warn('Failed to persist tool run', error);

    return fallbackRun;
  }
}

async function safeSaveMessage(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.conversationId) return;

  try {
    await saveKivoMessage({
      admin: input.admin,
      userId: input.userId,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata,
    });
  } catch (error) {
    console.warn(`Failed to save ${input.role} message`, error);
  }
}

async function safeEnsureUsageRow(input: {
  admin: SupabaseClient;
  userId: string;
}) {
  try {
    await ensureUsageRow(input);
  } catch (error) {
    console.warn('Failed to ensure usage row', error);
  }
}

async function safeIncrementUsage(input: {
  admin: SupabaseClient;
  userId: string;
  creditsSpent: number;
}) {
  try {
    await incrementUsage(input);
  } catch (error) {
    console.warn('Failed to increment usage', error);
  }
}

async function safeTouchConversation(input: {
  admin: SupabaseClient;
  userId: string;
  conversationId: string | null;
}) {
  if (!input.conversationId) return;

  try {
    await touchConversation(input);
  } catch (error) {
    console.warn('Failed to touch conversation', error);
  }
}

async function handleKivoAgentRequest(request: Request) {
  const traceId = crypto.randomUUID();
  const startedAt = Date.now();
  const events: KivoAgentEvent[] = [];
  const toolRuns: KivoToolRun[] = [];

  let ctx: KivoAgentContext | null = null;
  let latestUserMessage: string | null = null;

  try {
    const env = getSupabaseEnv();
    const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization') ?? '';
    const { userClient, admin } = createSupabaseClients(env, authHeader);

    const userId = await resolveAuthenticatedUserId(userClient);
    if (!userId) {
      return jsonResponse(
        {
          error: 'AUTH_REQUIRED',
          detail: 'Sign in before using kivo-agent.',
        },
        401,
      );
    }

    const rawBody = await request.json();
    const body = parseKivoAgentRequest(rawBody);

    const imageBase64 = cleanBase64(body.imageBase64);
    const imageMimeType = cleanMimeType(body.imageMimeType);
    const hasImagePayload = Boolean(imageBase64);
    const hasImageAttachment = Boolean(imageBase64 || body.photoAttached);
    const message = body.message?.trim() || 'Image request';

    latestUserMessage = message;

    assertMessageOrImage({
      message: body.message,
      imageBase64,
      photoAttached: body.photoAttached,
    });

    const conversationId = await getOrCreateConversation({
      admin,
      userId,
      conversationId: body.conversationId ?? null,
      message,
    });

    ctx = {
      userId,
      conversationId,
      traceId,
      message,
      hasImage: hasImageAttachment,
      startedAt,
    };

    await safeStartTrace({
      traceId,
      message,
      conversationId,
      hasImage: hasImageAttachment,
      userId,
    });

    await safeEnsureUsageRow({ admin, userId });

    await recordEvent({
      admin,
      userId,
      conversationId,
      traceId,
      events,
      eventType: 'message_received',
      label: 'Message received',
      detail: hasImageAttachment ? 'Text + image request' : 'Text request',
      metadata: {
        coreVersion: CORE_VERSION,
        hasImagePayload,
        hasImageAttachment,
        imageMimeType,
        clientPersistsMessages: isClientPersistingMessages(body),
      },
    });

    if (!isClientPersistingMessages(body)) {
      await safeSaveMessage({
        admin,
        userId,
        conversationId,
        role: 'user',
        content: message,
        metadata: {
          traceId,
          hasImage: hasImageAttachment,
          hasImagePayload,
        },
      });
    }

    const intent = routeIntent(message, hasImageAttachment);

    await recordEvent({
      admin,
      userId,
      conversationId,
      traceId,
      events,
      eventType: 'intent_classified',
      label: 'Intent classified',
      detail: intent.name,
      metadata: {
        confidence: intent.confidence,
        reason: intent.reason,
        signals: intent.signals,
        needsMemory: intent.needsMemory,
        needsTool: intent.needsTool,
        riskLevel: intent.riskLevel,
        responseMode: intent.responseMode,
        answerStyle: intent.answerStyle,
      },
    });

    const contextStartedAt = Date.now();
    const builtContext = await buildContext({
      admin,
      userId,
      conversationId,
      request: body,
    });

    await recordToolRun({
      admin,
      userId,
      conversationId,
      toolRuns,
      toolRunId: makeId('memory_search'),
      toolName: 'memory_search',
      status: 'success',
      startedAt: contextStartedAt,
      request: {
        query: message,
        limit: 8,
      },
      output: {
        memoryCount: builtContext.memories.length,
        memoryContextLength: builtContext.memoryContext.length,
      },
    });

    await recordEvent({
      admin,
      userId,
      conversationId,
      traceId,
      events,
      eventType: 'context_built',
      label: 'Context built',
      detail: `${builtContext.memories.length} memories found`,
      metadata: {
        memoryCount: builtContext.memories.length,
        recentMessageCount: builtContext.recentMessages.length,
        memoryContextLength: builtContext.memoryContext.length,
      },
    });

    const plan = createPlan({
      intent,
      hasImage: hasImageAttachment,
      memoryCount: builtContext.memories.length,
    });

    await recordEvent({
      admin,
      userId,
      conversationId,
      traceId,
      events,
      eventType: 'plan_created',
      label: 'Plan created',
      detail: `${plan.steps.length} steps`,
      metadata: {
        steps: plan.steps,
        needsMemory: plan.needsMemory,
        needsConfirmation: plan.needsConfirmation,
        riskLevel: plan.riskLevel,
        responseMode: plan.responseMode,
        answerStyle: plan.answerStyle,
        plannerNotes: plan.plannerNotes,
      },
    });

    const safety = checkSafety({ message, intent, plan });

    if (!safety.allowed) {
      await recordEvent({
        admin,
        userId,
        conversationId,
        traceId,
        events,
        eventType: 'safety_blocked',
        label: 'Safety blocked',
        detail: safety.reason ?? 'Request was blocked by safety layer.',
        metadata: {
          intent: intent.name,
          riskLevel: plan.riskLevel,
          needsConfirmation: safety.needsConfirmation,
        },
      });

      const response = buildAgentResponse({
        answer: buildLocalizedSafetyAnswer(message),
        intent: {
          ...intent,
          name: 'unsafe_or_restricted',
          confidence: Math.max(intent.confidence, 0.95),
          riskLevel: 'high',
          responseMode: 'safe_refusal',
        },
        conversationId,
        usedMemory: builtContext.memories,
        toolRuns,
        events,
        suggestedActions: [],
        usage: emptyUsage(),
        traceId,
        error: null,
      });

      await safeFinishTrace({ traceId, outputs: response, conversationId });
      return jsonResponse(response);
    }

    if (safety.needsConfirmation) {
      await recordEvent({
        admin,
        userId,
        conversationId,
        traceId,
        events,
        eventType: 'confirmation_required',
        label: 'Confirmation required',
        detail: safety.reason ?? 'Some planned actions require confirmation.',
        metadata: {
          riskLevel: plan.riskLevel,
          responseMode: plan.responseMode,
        },
      });
    }

    const execution = await executePlan({
      admin,
      ctx,
      plan,
      memoryCount: builtContext.memories.length,
      hasImage: hasImageAttachment,
    });

    toolRuns.push(...execution.toolRuns);

    const systemPrompt = buildKivoSystemPrompt({
      intent: intent.name,
      memoryContext: builtContext.memoryContext,
      hasImage: hasImagePayload,
      responseMode: plan.responseMode,
      answerStyle: plan.answerStyle,
    });

    const userText = hasImageAttachment && !hasImagePayload
      ? buildDisconnectedImageNote(message)
      : message;

    const messages = buildGroqMessages({
      systemPrompt,
      recentMessages: builtContext.recentMessages,
      clientHistory: body.history,
      userText,
    });

    const groqStartedAt = Date.now();
    const groqToolRunId = makeId('groq_chat');
    const groq = await runGroqChat({
      messages,
      hasImage: false,
    });

    await recordToolRun({
      admin,
      userId,
      conversationId,
      toolRuns,
      toolRunId: groqToolRunId,
      toolName: 'groq_chat',
      status: 'success',
      startedAt: groqStartedAt,
      request: {
        messageCount: messages.length,
        hasImageIgnoredInCoreV1: hasImageAttachment,
        hasImagePayload,
        responseMode: plan.responseMode,
        answerStyle: plan.answerStyle,
      },
      output: {
        model: groq.model,
        answerLength: groq.answer.length,
      },
    });

    const creditsSpent = CREDIT_COSTS.normalChat;

    await safeIncrementUsage({ admin, userId, creditsSpent });
    await safeTouchConversation({ admin, userId, conversationId });

    await recordEvent({
      admin,
      userId,
      conversationId,
      traceId,
      events,
      eventType: 'response_generated',
      label: 'Response generated',
      detail: groq.model,
      metadata: {
        durationMs: Date.now() - startedAt,
        coreVersion: CORE_VERSION,
        responseMode: plan.responseMode,
        answerLength: groq.answer.length,
      },
    });

    const draftResponse = buildAgentResponse({
      answer: groq.answer,
      intent,
      conversationId,
      model: groq.model,
      usedMemory: builtContext.memories,
      toolRuns,
      events,
      suggestedActions: plan.suggestedActions,
      usage: {
        creditsSpent,
        tokensIn: 0,
        tokensOut: 0,
        toolCredits: 0,
      },
      traceId,
      error: null,
    });

    const evaluation = evaluateResponse(draftResponse);

    if (!evaluation.ok) {
      await recordEvent({
        admin,
        userId,
        conversationId,
        traceId,
        events,
        eventType: 'response_validated_with_issues',
        label: 'Response validation warning',
        detail: evaluation.issues.join(', '),
        metadata: {
          issueCount: evaluation.issues.length,
          issues: evaluation.issues,
        },
      });
    } else {
      await recordEvent({
        admin,
        userId,
        conversationId,
        traceId,
        events,
        eventType: 'response_validated',
        label: 'Response validated',
        detail: 'Response passed basic evaluation.',
      });
    }

    const response = buildAgentResponse({
      answer: groq.answer,
      intent,
      conversationId,
      model: groq.model,
      usedMemory: builtContext.memories,
      toolRuns,
      events,
      suggestedActions: plan.suggestedActions,
      usage: {
        creditsSpent,
        tokensIn: 0,
        tokensOut: 0,
        toolCredits: 0,
      },
      traceId,
      error: null,
    });

    if (!isClientPersistingMessages(body)) {
      await safeSaveMessage({
        admin,
        userId,
        conversationId,
        role: 'assistant',
        content: response.answer,
        metadata: {
          traceId,
          intent: intent.name,
          model: response.model,
          responseMode: plan.responseMode,
          evaluationOk: evaluation.ok,
        },
      });
    }

    await safeFinishTrace({ traceId, outputs: response, conversationId });
    return jsonResponse(response);
  } catch (error) {
    const message = safeErrorMessage(error);
    console.error('kivo-agent failed', error);

    const response = buildAgentResponse({
      answer: buildLocalizedFailureAnswer(latestUserMessage ?? ctx?.message),
      intent: fallbackIntent(),
      conversationId: ctx?.conversationId ?? null,
      model: 'unknown',
      usedMemory: [],
      toolRuns,
      events,
      suggestedActions: [],
      usage: emptyUsage(),
      traceId,
      error: {
        code: 'KIVO_AGENT_FAILED',
        message,
        recoverable: true,
      },
    });

    await safeFinishTrace({
      traceId,
      error: message,
      outputs: response,
      conversationId: ctx?.conversationId ?? null,
    });

    return jsonResponse(
      {
        ...response,
        tracing: tracingEnabled(),
      },
      500,
    );
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  return handleKivoAgentRequest(request);
});
