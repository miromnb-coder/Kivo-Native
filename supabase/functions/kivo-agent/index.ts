import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { CREDIT_COSTS } from './_shared/constants.ts';
import { assertMessageOrImage, parseKivoAgentRequest } from './_shared/schemas.ts';
import type { KivoAgentContext, KivoAgentEvent, KivoToolRun } from './_shared/types.ts';
import { cleanBase64, cleanMimeType, jsonResponse, makeId } from './_shared/utils.ts';

import { buildContext } from './agent/context-builder.ts';
import { evaluateResponse } from './agent/evaluator.ts';
import { executePlan } from './agent/executor.ts';
import { buildAgentResponse, buildSafeFallbackAnswer } from './agent/generator.ts';
import { createPlan } from './agent/planner.ts';
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const traceId = crypto.randomUUID();
  const startedAt = Date.now();
  let ctx: KivoAgentContext | null = null;
  const events: KivoAgentEvent[] = [];
  const toolRuns: KivoToolRun[] = [];

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase environment is not configured.' }, 500);
    }

    const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user?.id) {
      return jsonResponse({ error: 'AUTH_REQUIRED', detail: 'Sign in before using kivo-agent.' }, 401);
    }

    const rawBody = await request.json();
    const body = parseKivoAgentRequest(rawBody);
    const imageBase64 = cleanBase64(body.imageBase64);
    const imageMimeType = cleanMimeType(body.imageMimeType);
    const hasImage = Boolean(imageBase64);

    assertMessageOrImage({ message: body.message, imageBase64, photoAttached: body.photoAttached });

    const userId = authData.user.id;
    const conversationId = await getOrCreateConversation({
      admin,
      userId,
      conversationId: body.conversationId ?? null,
      message: body.message || 'Image analysis',
    });

    ctx = {
      userId,
      conversationId,
      traceId,
      message: body.message || 'Analyze this image.',
      hasImage,
      startedAt,
    };

    await startTrace({
      traceId,
      name: 'kivo-agent',
      inputs: { message: ctx.message, conversationId, hasImage },
      metadata: { userId, conversationId, source: 'kivo-native' },
    });

    await ensureUsageRow({ admin, userId });

    events.push(await persistAgentEvent({
      admin,
      userId,
      conversationId,
      traceId,
      eventType: 'message_received',
      label: 'Message received',
      detail: hasImage ? 'Text + image request' : 'Text request',
    }));

    if (body.metadata?.clientPersistsMessages !== true) {
      await saveKivoMessage({
        admin,
        userId,
        conversationId,
        role: 'user',
        content: ctx.message,
        metadata: { traceId, hasImage },
      });
    }

    const intent = routeIntent(ctx.message, hasImage);
    events.push(await persistAgentEvent({
      admin,
      userId,
      conversationId,
      traceId,
      eventType: 'intent_classified',
      label: 'Intent classified',
      detail: intent.name,
      metadata: { confidence: intent.confidence, reason: intent.reason },
    }));

    const builtContext = await buildContext({ admin, userId, conversationId, request: body });
    const memoryToolRunId = makeId('memory_search');
    toolRuns.push(await persistToolRun({
      admin,
      userId,
      conversationId,
      toolRunId: memoryToolRunId,
      toolName: 'memory_search',
      status: 'success',
      startedAt,
      request: { query: ctx.message, limit: 8 },
      output: { memoryCount: builtContext.memories.length },
    }));

    events.push(await persistAgentEvent({
      admin,
      userId,
      conversationId,
      traceId,
      eventType: 'context_built',
      label: 'Context built',
      detail: `${builtContext.memories.length} memories found`,
      metadata: { memoryCount: builtContext.memories.length },
    }));

    const plan = createPlan({ intent, hasImage, memoryCount: builtContext.memories.length });
    events.push(await persistAgentEvent({
      admin,
      userId,
      conversationId,
      traceId,
      eventType: 'plan_created',
      label: 'Plan created',
      detail: `${plan.steps.length} steps`,
      metadata: { steps: plan.steps },
    }));

    const safety = checkSafety({ message: ctx.message, intent, plan });
    if (!safety.allowed) {
      const answer = buildSafeFallbackAnswer({ intentName: intent.name, safetyReason: safety.reason });
      const response = buildAgentResponse({
        answer,
        intent: { ...intent, name: 'unsafe_or_restricted', confidence: 0.95 },
        conversationId,
        usedMemory: builtContext.memories,
        toolRuns,
        events,
        suggestedActions: [],
        usage: { creditsSpent: 0, tokensIn: 0, tokensOut: 0, toolCredits: 0 },
        traceId,
        error: null,
      });
      await finishTrace({ traceId, outputs: response });
      return jsonResponse(response);
    }

    const execution = await executePlan({ admin, ctx, plan, memoryCount: builtContext.memories.length, hasImage });
    toolRuns.push(...execution.toolRuns);

    const systemPrompt = buildKivoSystemPrompt({
      intent: intent.name,
      memoryContext: builtContext.memoryContext,
      hasImage,
    });

    const groqStartedAt = Date.now();
    const groqToolRunId = makeId(hasImage ? 'image_analysis' : 'groq_chat');
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...builtContext.recentMessages,
      ...((body.history ?? []).map((item) => ({ role: item.role === 'assistant' ? 'assistant' as const : 'user' as const, content: item.content ?? '' }))),
      hasImage
        ? {
            role: 'user' as const,
            content: [
              { type: 'text' as const, text: ctx.message },
              { type: 'image_url' as const, image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
            ],
          }
        : { role: 'user' as const, content: ctx.message },
    ];

    const groq = await runGroqChat({ messages, hasImage });
    toolRuns.push(await persistToolRun({
      admin,
      userId,
      conversationId,
      toolRunId: groqToolRunId,
      toolName: hasImage ? 'image_analysis' : 'groq_chat',
      status: 'success',
      startedAt: groqStartedAt,
      request: { messageCount: messages.length, hasImage },
      output: { model: groq.model, answerLength: groq.answer.length },
    }));

    if (body.metadata?.clientPersistsMessages !== true) {
      await saveKivoMessage({
        admin,
        userId,
        conversationId,
        role: 'assistant',
        content: groq.answer,
        metadata: { traceId, intent: intent.name, model: groq.model },
      });
    }

    const creditsSpent = hasImage ? CREDIT_COSTS.vision : CREDIT_COSTS.normalChat;
    await incrementUsage({ admin, userId, creditsSpent });
    await touchConversation({ admin, userId, conversationId });

    events.push(await persistAgentEvent({
      admin,
      userId,
      conversationId,
      traceId,
      eventType: 'response_generated',
      label: 'Response generated',
      detail: groq.model,
      metadata: { durationMs: Date.now() - startedAt },
    }));

    const response = buildAgentResponse({
      answer: groq.answer,
      intent,
      conversationId,
      model: groq.model,
      usedMemory: builtContext.memories,
      toolRuns,
      events,
      suggestedActions: plan.suggestedActions,
      usage: { creditsSpent, tokensIn: 0, tokensOut: 0, toolCredits: 0 },
      traceId,
      error: null,
    });

    const evaluation = evaluateResponse(response);
    if (!evaluation.ok) {
      events.push(await persistAgentEvent({
        admin,
        userId,
        conversationId,
        traceId,
        eventType: 'response_validated_with_issues',
        label: 'Response validation warning',
        detail: evaluation.issues.join(', '),
      }));
    }

    await finishTrace({ traceId, outputs: response });
    return jsonResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown kivo-agent error.';
    console.error('kivo-agent failed', error);

    if (ctx) {
      await finishTrace({ traceId, error: message, outputs: { conversationId: ctx.conversationId } });
    }

    return jsonResponse({
      answer: 'En saanut agenttiajoa valmiiksi. Kokeile uudelleen hetken päästä.',
      intent: { name: 'normal_chat', confidence: 0.2 },
      conversationId: ctx?.conversationId ?? null,
      model: 'unknown',
      usedMemory: [],
      usedTools: [],
      events,
      toolRuns,
      suggestedActions: [],
      usage: { creditsSpent: 0, tokensIn: 0, tokensOut: 0, toolCredits: 0 },
      traceId,
      error: { code: 'KIVO_AGENT_FAILED', message, recoverable: true },
      tracing: tracingEnabled(),
    }, 500);
  }
});
