const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ChatRole = 'system' | 'user' | 'assistant';

type TextChatMessage = {
  role: ChatRole;
  content: string;
};

type VisionChatMessage = {
  role: ChatRole;
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
};

type KivoChatBody = {
  mode?: 'chat' | 'title';
  stream?: boolean;
  message?: string;
  history?: Array<{
    role?: 'user' | 'assistant';
    content?: string;
  }>;
  memoryContext?: string;
  memoryCount?: number;
  photoAttached?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
  imageName?: string;
};

type GroqCallResult =
  | { content: string; model: string; status: 200; usedSearch?: boolean }
  | { error: string; details: unknown; status: number };

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_CHAT_MODEL = Deno.env.get('GROQ_CHAT_MODEL') ?? 'openai/gpt-oss-20b';
const DEFAULT_SEARCH_MODEL = Deno.env.get('GROQ_SEARCH_MODEL') ?? 'groq/compound-mini';
const SEARCH_FALLBACK_MODEL = Deno.env.get('GROQ_SEARCH_FALLBACK_MODEL') ?? 'groq/compound';
const DEFAULT_VISION_MODEL = Deno.env.get('GROQ_VISION_MODEL') ?? 'meta-llama/llama-4-scout-17b-16e-instruct';
const MAX_IMAGE_BASE64_CHARS = 4_000_000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function textResponse(text: string, status = 200) {
  return new Response(text, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

function cleanText(value: unknown, maxLength = 12000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function cleanBase64(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').replace(/\s/g, '').slice(0, MAX_IMAGE_BASE64_CHARS + 1);
}

function cleanTitle(value: unknown) {
  if (typeof value !== 'string') return '';

  return value
    .replace(/[\n\r]+/g, ' ')
    .replace(/^title\s*:/i, '')
    .replace(/^otsikko\s*:/i, '')
    .replace(/^[\'"`]+|[\'"`.,:;!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 44);
}

function cleanMimeType(value: unknown) {
  if (typeof value !== 'string') return 'image/jpeg';
  const clean = value.trim().toLowerCase();

  if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(clean)) {
    return clean === 'image/jpg' ? 'image/jpeg' : clean;
  }

  return 'image/jpeg';
}

function normalizeHistory(history: KivoChatBody['history']): TextChatMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-10)
    .map((item) => {
      const role = item?.role === 'assistant' ? 'assistant' : 'user';
      const content = cleanText(item?.content, 4000);
      return { role, content } satisfies TextChatMessage;
    })
    .filter((item) => item.content.length > 0);
}

function buildImageDataUrl(base64: string, mimeType: string) {
  return `data:${mimeType};base64,${base64}`;
}

function isCompoundModel(model: string) {
  return model.startsWith('groq/compound');
}

function makeGroqPayload({
  model,
  messages,
  temperature = 0.42,
  maxTokens = 420,
  stream = false,
}: {
  model: string;
  messages: VisionChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}) {
  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream,
  };

  if (isCompoundModel(model)) {
    payload.compound_custom = {
      tools: {
        enabled_tools: ['web_search'],
      },
    };
    payload.search_settings = {
      country: 'finland',
    };
  }

  return payload;
}

function shouldUseSmartSearch(userMessage: string) {
  const text = userMessage.toLowerCase();
  if (!text.trim()) return false;

  const explicitSearchIntent = [
    'etsi',
    'hae netistä',
    'hae verkosta',
    'katso netistä',
    'tarkista netistä',
    'search web',
    'web search',
    'google',
    'ajankohtaista tietoa',
    'uusimmat tiedot',
    'latest info',
  ];

  const freshnessTerms = [
    'nyt',
    'tällä hetkellä',
    'uusin',
    'uusimmat',
    'viimeisin',
    'viimeisimmät',
    'tänään',
    'tänä vuonna',
    '2025',
    '2026',
    'current',
    'latest',
    'newest',
    'recent',
    'today',
    'this year',
  ];

  const marketOrAvailabilityTerms = [
    'hinta',
    'maksaa',
    'halvin',
    'saatavilla',
    'myynnissä',
    'julkaistu',
    'ostaa',
    'kauppa',
    'tilata',
    'shipping',
    'price',
    'pricing',
    'available',
    'released',
    'buy',
    'order',
  ];

  const externalFactTerms = [
    'groq',
    'openai',
    'expo',
    'supabase',
    'vercel',
    'github',
    'eas',
    'app store',
    'testflight',
    'dokumentaatio',
    'docs',
    'malli',
    'model',
    'api',
    'ar-lasit',
    'ai-lasit',
    'smart glasses',
  ];

  const hasUrl = /https?:\/\/|www\./i.test(userMessage);
  const explicit = explicitSearchIntent.some((term) => text.includes(term));
  const freshness = freshnessTerms.some((term) => text.includes(term));
  const market = marketOrAvailabilityTerms.some((term) => text.includes(term));
  const external = externalFactTerms.some((term) => text.includes(term));

  return hasUrl || explicit || (external && (freshness || market)) || (freshness && market);
}

async function callGroq({
  groqApiKey,
  model,
  messages,
  temperature = 0.42,
  maxTokens = 420,
}: {
  groqApiKey: string;
  model: string;
  messages: VisionChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<GroqCallResult> {
  const groqResponse = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
      ...(isCompoundModel(model) ? { 'Groq-Model-Version': 'latest' } : {}),
    },
    body: JSON.stringify(makeGroqPayload({ model, messages, temperature, maxTokens })),
  });

  const groqData = await groqResponse.json();

  if (!groqResponse.ok) {
    return {
      error: groqData?.error?.message ?? 'Groq request failed.',
      details: groqData?.error ?? groqData ?? null,
      status: 502,
    };
  }

  const content = groqData?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return {
      error: 'Groq returned an empty answer.',
      details: groqData ?? null,
      status: 502,
    };
  }

  return {
    content,
    model,
    status: 200,
    usedSearch: Boolean(groqData?.choices?.[0]?.message?.executed_tools?.length),
  };
}

async function callSmartSearchGroq({
  groqApiKey,
  messages,
  maxTokens,
}: {
  groqApiKey: string;
  messages: VisionChatMessage[];
  maxTokens: number;
}): Promise<GroqCallResult> {
  const primary = await callGroq({
    groqApiKey,
    model: DEFAULT_SEARCH_MODEL,
    messages,
    temperature: 0.25,
    maxTokens,
  });

  if (!('error' in primary)) return primary;

  const fallback = await callGroq({
    groqApiKey,
    model: SEARCH_FALLBACK_MODEL,
    messages,
    temperature: 0.25,
    maxTokens,
  });

  if (!('error' in fallback)) return fallback;

  return primary;
}

async function callGroqStream({
  groqApiKey,
  model,
  messages,
  temperature = 0.42,
  maxTokens = 420,
}: {
  groqApiKey: string;
  model: string;
  messages: VisionChatMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const groqResponse = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(makeGroqPayload({ model, messages, temperature, maxTokens, stream: true })),
  });

  if (!groqResponse.ok || !groqResponse.body) {
    let details: unknown = null;
    try {
      details = await groqResponse.json();
    } catch {
      details = await groqResponse.text();
    }

    return jsonResponse(
      {
        error: typeof details === 'object' && details !== null && 'error' in details
          ? (details as { error?: { message?: string } }).error?.message ?? 'Groq stream request failed.'
          : 'Groq stream request failed.',
        details,
      },
      502,
    );
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqResponse.body!.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith('data:')) continue;

            const payload = line.replace(/^data:\s*/, '');
            if (!payload || payload === '[DONE]') continue;

            try {
              const parsed = JSON.parse(payload);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === 'string' && delta.length > 0) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // Ignore malformed stream lines and continue reading.
            }
          }
        }
      } catch {
        controller.enqueue(encoder.encode('\n\nKivo stream ended unexpectedly.'));
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

function buildSystemPrompt(hasImage: boolean, memoryContext: string, smartSearchEnabled: boolean) {
  const basePrompt = hasImage
    ? [
        'You are Kivo, a premium personal AI operator inside a mobile app.',
        'You can analyze the attached image.',
        'Match the user language. If the user writes Finnish, answer in Finnish. If English, answer in English.',
        'Be concise, practical, and useful.',
        'Start with what is clearly visible in the image.',
        'Then answer the user request directly.',
        'For screenshots, identify the app/page, visible errors, buttons, and the likely next action.',
        'If something is uncertain, say it briefly instead of guessing too hard.',
        'Use short paragraphs or bullets. Tables are allowed only when they help.',
      ]
    : [
        'You are Kivo, a premium personal AI operator inside a mobile app.',
        'Match the user language. If the user writes Finnish, answer in Finnish. If English, answer in English.',
        'Your default style is concise, calm, smart, and mobile-first.',
        'For simple questions, answer in 1-3 short sentences. Do not sound like Wikipedia or a school essay.',
        'For planning, coding, or product-building questions, give a clear next step and keep the answer practical.',
        'Do not over-explain unless the user asks for more detail.',
        'Avoid long paragraphs. Use short paragraphs that feel good in a chat UI.',
        'Use markdown only when it genuinely improves readability.',
      ];

  const promptParts = [...basePrompt];

  if (smartSearchEnabled) {
    promptParts.push(
      'You are running on Groq Compound with built-in web search available.',
      'Use web search for current prices, availability, docs, model names, release status, recent news, and other time-sensitive external facts.',
      'Prefer official documentation, product pages, changelogs, and reputable sources.',
      'When web search affects the answer, include a short Sources section at the end. Keep the answer concise.',
    );
  }

  if (memoryContext) {
    promptParts.push(
      'Use the personal memory context below when it is relevant. Do not mention memory directly unless the user asks.',
      'Prefer specific, context-aware advice over generic answers.',
      'If memory conflicts with the current user message, trust the current message.',
      `Personal memory context:\n${memoryContext}`,
    );
  }

  return promptParts.join('\n');
}

function buildMessages({
  userMessage,
  imageBase64,
  imageMimeType,
  history,
  memoryContext,
  smartSearchEnabled,
}: {
  userMessage: string;
  imageBase64: string;
  imageMimeType: string;
  history: KivoChatBody['history'];
  memoryContext: string;
  smartSearchEnabled: boolean;
}) {
  const hasImage = Boolean(imageBase64);
  const systemPrompt = buildSystemPrompt(hasImage, memoryContext, smartSearchEnabled);

  const messages: VisionChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...normalizeHistory(history),
  ];

  if (hasImage) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: userMessage || 'Analyze this image.',
        },
        {
          type: 'image_url',
          image_url: { url: buildImageDataUrl(imageBase64, imageMimeType) },
        },
      ],
    });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  return messages;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const groqApiKey = Deno.env.get('GROQ_API_KEY');

  if (!groqApiKey) {
    return jsonResponse({ error: 'GROQ_API_KEY is not configured in Supabase secrets.' }, 500);
  }

  let body: KivoChatBody;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const userMessage = cleanText(body.message);
  const memoryContext = cleanText(body.memoryContext, 6000);
  const photoAttached = Boolean(body.photoAttached);
  const imageBase64 = cleanBase64(body.imageBase64);
  const imageMimeType = cleanMimeType(body.imageMimeType);
  const hasImage = Boolean(imageBase64);
  const smartSearchEnabled = !hasImage && body.mode !== 'title' && shouldUseSmartSearch(userMessage);

  if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
    return jsonResponse({ error: 'Image is too large for analysis. Try a smaller screenshot or photo.' }, 413);
  }

  if (!userMessage && !hasImage && !photoAttached) {
    return jsonResponse({ error: 'Message or attachment is required.' }, 400);
  }

  if (photoAttached && !hasImage && body.mode !== 'title') {
    return jsonResponse({ error: 'Photo was attached, but imageBase64 was missing.' }, 400);
  }

  if (body.mode === 'title') {
    const titlePrompt = [
      'You create short premium conversation titles for a mobile AI chat history.',
      'Return only the title. No quotes. No markdown. No punctuation at the end.',
      'Use the same language as the user message when possible.',
      'The title must be 2-5 words and under 36 characters when possible.',
      'Make it specific and useful for finding the chat later.',
      'If there is an image, use the image context intelligently.',
    ].join(' ');

    const titleMessages: VisionChatMessage[] = hasImage
      ? [
          { role: 'system', content: titlePrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userMessage || 'Create a short title for this image conversation.',
              },
              {
                type: 'image_url',
                image_url: { url: buildImageDataUrl(imageBase64, imageMimeType) },
              },
            ],
          },
        ]
      : [
          { role: 'system', content: titlePrompt },
          { role: 'user', content: userMessage || 'Untitled chat' },
        ];

    const titleResult = await callGroq({
      groqApiKey,
      model: hasImage ? DEFAULT_VISION_MODEL : DEFAULT_CHAT_MODEL,
      messages: titleMessages,
      temperature: 0.18,
      maxTokens: 32,
    });

    if ('error' in titleResult) {
      return jsonResponse({ error: titleResult.error, details: titleResult.details }, titleResult.status);
    }

    const title = cleanTitle(titleResult.content);

    if (!title) {
      return jsonResponse({ error: 'Groq returned an empty title.' }, 502);
    }

    return jsonResponse({
      title,
      model: titleResult.model,
      usedVision: hasImage,
      usedMemory: false,
      usedSearch: false,
    });
  }

  const messages = buildMessages({
    userMessage,
    imageBase64,
    imageMimeType,
    history: body.history,
    memoryContext,
    smartSearchEnabled,
  });
  const model = hasImage ? DEFAULT_VISION_MODEL : smartSearchEnabled ? DEFAULT_SEARCH_MODEL : DEFAULT_CHAT_MODEL;
  const maxTokens = hasImage ? 620 : smartSearchEnabled ? 760 : memoryContext ? 520 : 420;

  if (body.stream && smartSearchEnabled) {
    const result = await callSmartSearchGroq({
      groqApiKey,
      messages,
      maxTokens,
    });

    if ('error' in result) {
      return jsonResponse({ error: result.error, details: result.details }, result.status);
    }

    return textResponse(result.content);
  }

  if (body.stream) {
    return callGroqStream({
      groqApiKey,
      model,
      messages,
      temperature: 0.42,
      maxTokens,
    });
  }

  try {
    const result = smartSearchEnabled
      ? await callSmartSearchGroq({ groqApiKey, messages, maxTokens })
      : await callGroq({
          groqApiKey,
          model,
          messages,
          temperature: 0.42,
          maxTokens,
        });

    if ('error' in result) {
      return jsonResponse({ error: result.error, details: result.details }, result.status);
    }

    return jsonResponse({
      answer: result.content,
      model: result.model,
      usedVision: hasImage,
      usedMemory: Boolean(memoryContext),
      usedSearch: smartSearchEnabled || Boolean(result.usedSearch),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unknown AI backend error.',
      },
      500,
    );
  }
});
