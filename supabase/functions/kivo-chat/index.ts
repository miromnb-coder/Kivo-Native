const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
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
  history?: Array<{ role?: 'user' | 'assistant'; content?: string }>;
  memoryContext?: string;
  photoAttached?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
};

type Source = {
  title: string;
  url: string;
  domain: string;
  date?: string;
};

type GroqResult =
  | { ok: true; content: string; model: string; usedSearch: boolean; sources: Source[] }
  | { ok: false; error: string; details?: unknown; model: string };

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_CHAT_MODEL = Deno.env.get('GROQ_CHAT_MODEL') ?? 'openai/gpt-oss-20b';
const DEFAULT_SEARCH_MODEL = Deno.env.get('GROQ_SEARCH_MODEL') ?? 'groq/compound-mini';
const SEARCH_FALLBACK_MODEL = Deno.env.get('GROQ_SEARCH_FALLBACK_MODEL') ?? 'groq/compound';
const DEFAULT_VISION_MODEL = Deno.env.get('GROQ_VISION_MODEL') ?? 'meta-llama/llama-4-scout-17b-16e-instruct';
const MAX_IMAGE_BASE64_CHARS = 4_000_000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanBase64(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').replace(/\s/g, '').slice(0, MAX_IMAGE_BASE64_CHARS + 1);
}

function cleanMimeType(value: unknown) {
  if (typeof value !== 'string') return 'image/jpeg';
  const clean = value.trim().toLowerCase();
  if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(clean)) return clean === 'image/jpg' ? 'image/jpeg' : clean;
  return 'image/jpeg';
}

function cleanTitle(value: string) {
  return value
    .replace(/[\n\r]+/g, ' ')
    .replace(/^title\s*:/i, '')
    .replace(/^otsikko\s*:/i, '')
    .replace(/^[\'"`]+|[\'"`.,:;!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 44);
}

function normalizeHistory(history: KivoChatBody['history']): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-10)
    .map((item) => ({
      role: item?.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: cleanText(item?.content, 4000),
    }))
    .filter((item) => item.content.length > 0);
}

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

function normalizeUrl(value: string) {
  const clean = value.trim().replace(/[),.;\]]+$/g, '');
  return clean.startsWith('http') ? clean : `https://${clean}`;
}

function makeSource(title: string, url: string, date?: string): Source | null {
  const cleanUrl = normalizeUrl(url);
  const domain = domainFromUrl(cleanUrl);
  if (!domain) return null;
  return {
    title: title.replace(/\s+/g, ' ').replace(/^[-*•\d.)\s]+/, '').trim() || domain,
    url: cleanUrl,
    domain,
    date,
  };
}

function dedupeSources(sources: Source[]) {
  const seen = new Set<string>();
  return sources
    .filter((source) => {
      const key = source.url || `${source.domain}:${source.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(source.title && source.domain && source.url);
    })
    .slice(0, 8);
}

function extractSourcesFromExecutedTools(executedTools: unknown): Source[] {
  if (!Array.isArray(executedTools)) return [];
  const sources: Source[] = [];

  for (const tool of executedTools) {
    const item = tool as Record<string, unknown>;
    const possibleResults = [item.search_results, item.results, item.output, item.content];

    for (const results of possibleResults) {
      if (Array.isArray(results)) {
        for (const result of results) {
          const entry = result as Record<string, unknown>;
          const url = typeof entry.url === 'string' ? entry.url : typeof entry.link === 'string' ? entry.link : '';
          const title = typeof entry.title === 'string' ? entry.title : url;
          const date = typeof entry.date === 'string' ? entry.date : typeof entry.published_date === 'string' ? entry.published_date : undefined;
          if (url) {
            const source = makeSource(title, url, date);
            if (source) sources.push(source);
          }
        }
      }

      if (typeof results === 'string') {
        sources.push(...extractSourcesFromText(results).sources);
      }
    }
  }

  return dedupeSources(sources);
}

function extractSourcesFromText(content: string): { answer: string; sources: Source[] } {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const sources: Source[] = [];
  const answerLines: string[] = [];
  let inSourcesSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const normalizedHeading = line.replace(/^#+\s*/, '').replace(/:$/, '').toLowerCase();

    if (['sources', 'source', 'lähteet', 'lahteet'].includes(normalizedHeading)) {
      inSourcesSection = true;
      continue;
    }

    const markdownLinks = [...line.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g)];
    for (const match of markdownLinks) {
      const source = makeSource(match[1], match[2]);
      if (source) sources.push(source);
    }

    const urls = [...line.matchAll(/https?:\/\/[^\s)\]]+/g)];
    for (const match of urls) {
      const alreadyInMarkdown = markdownLinks.some((link) => link[2] === match[0]);
      if (!alreadyInMarkdown) {
        const source = makeSource(line.replace(match[0], '').replace(/🔗|lue koko artikkeli:?/gi, '').trim(), match[0]);
        if (source) sources.push(source);
      }
    }

    if (inSourcesSection) continue;
    if (urls.length > 0 && /lue koko artikkeli|read full|source|lähde/i.test(line)) continue;
    if (/^[-*•]\s+.*\[\d+†L\d+/i.test(line)) continue;

    answerLines.push(rawLine);
  }

  return {
    answer: answerLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    sources: dedupeSources(sources),
  };
}

function shouldUseSmartSearch(userMessage: string) {
  const text = userMessage.toLowerCase();
  if (!text.trim()) return false;

  const explicitSearchIntent = [
    'etsi', 'hae netistä', 'hae verkosta', 'katso netistä', 'tarkista netistä',
    'uutinen', 'uutisia', 'news', 'search web', 'web search', 'google',
    'ajankohtaista tietoa', 'uusimmat tiedot', 'latest info',
  ];
  const freshnessTerms = [
    'nyt', 'tällä hetkellä', 'tänään', 'tältä päivältä', 'tämän päivän', 'uusin', 'uusimmat',
    'viimeisin', 'viimeisimmät', 'tänä vuonna', '2025', '2026', 'current', 'latest', 'newest', 'recent', 'today', 'this year',
  ];
  const marketOrAvailabilityTerms = [
    'hinta', 'maksaa', 'halvin', 'saatavilla', 'myynnissä', 'julkaistu', 'ostaa', 'kauppa', 'tilata',
    'shipping', 'price', 'pricing', 'available', 'released', 'buy', 'order',
  ];
  const externalFactTerms = [
    'groq', 'openai', 'expo', 'supabase', 'vercel', 'github', 'eas', 'app store', 'testflight',
    'dokumentaatio', 'docs', 'malli', 'model', 'api', 'ar-lasit', 'ai-lasit', 'smart glasses',
  ];

  const hasUrl = /https?:\/\/|www\./i.test(userMessage);
  const explicit = explicitSearchIntent.some((term) => text.includes(term));
  const freshness = freshnessTerms.some((term) => text.includes(term));
  const market = marketOrAvailabilityTerms.some((term) => text.includes(term));
  const external = externalFactTerms.some((term) => text.includes(term));

  return hasUrl || explicit || (external && (freshness || market)) || (freshness && market);
}

function isCompoundModel(model: string) {
  return model.startsWith('groq/compound');
}

function buildGroqPayload({ model, messages, temperature, maxTokens, stream = false }: {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  stream?: boolean;
}) {
  const payload: Record<string, unknown> = { model, messages, temperature, max_tokens: maxTokens, stream };

  if (isCompoundModel(model)) {
    payload.compound_custom = { tools: { enabled_tools: ['web_search'] } };
    payload.search_settings = { country: 'finland' };
  }

  return payload;
}

async function callGroq({ groqApiKey, model, messages, temperature = 0.42, maxTokens = 520 }: {
  groqApiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<GroqResult> {
  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
        ...(isCompoundModel(model) ? { 'Groq-Model-Version': 'latest' } : {}),
      },
      body: JSON.stringify(buildGroqPayload({ model, messages, temperature, maxTokens })),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data?.error?.message ?? 'Groq request failed.', details: data?.error ?? data, model };
    }

    const message = data?.choices?.[0]?.message;
    const rawContent = typeof message?.content === 'string' ? message.content.trim() : '';
    const textParse = extractSourcesFromText(rawContent);
    const toolSources = extractSourcesFromExecutedTools(message?.executed_tools);
    const sources = dedupeSources([...toolSources, ...textParse.sources]);

    if (!rawContent) {
      return { ok: false, error: 'Groq returned an empty answer.', details: data, model };
    }

    return {
      ok: true,
      content: textParse.answer || rawContent,
      model,
      usedSearch: Boolean(sources.length || message?.executed_tools?.length),
      sources,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown Groq error.', model };
  }
}

async function callSmartSearchGroq({ groqApiKey, messages, maxTokens }: {
  groqApiKey: string;
  messages: ChatMessage[];
  maxTokens: number;
}): Promise<GroqResult> {
  const primary = await callGroq({ groqApiKey, model: DEFAULT_SEARCH_MODEL, messages, temperature: 0.25, maxTokens });
  if (primary.ok) return primary;

  const fallback = await callGroq({ groqApiKey, model: SEARCH_FALLBACK_MODEL, messages, temperature: 0.25, maxTokens });
  if (fallback.ok) return fallback;

  const normal = await callGroq({ groqApiKey, model: DEFAULT_CHAT_MODEL, messages, temperature: 0.35, maxTokens });
  if (normal.ok) {
    return {
      ...normal,
      content: `En saanut ajankohtaista web-hakua juuri nyt varmistettua, mutta tässä paras vastaus ilman lähteitä:\n\n${normal.content}`,
      usedSearch: false,
      sources: [],
    };
  }

  return {
    ok: true,
    content: 'En saanut AI-yhteyttä juuri nyt valmiiksi. Kokeile uudestaan hetken päästä.',
    model: DEFAULT_CHAT_MODEL,
    usedSearch: false,
    sources: [],
  };
}

async function callGroqStream({ groqApiKey, model, messages, temperature = 0.42, maxTokens = 520 }: {
  groqApiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildGroqPayload({ model, messages, temperature, maxTokens, stream: true })),
  });

  if (!response.ok || !response.body) {
    const fallback = await callGroq({ groqApiKey, model, messages, temperature, maxTokens });
    return textResponse(fallback.ok ? fallback.content : 'En saanut vastausta juuri nyt. Kokeile uudestaan hetken päästä.');
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
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
              if (typeof delta === 'string' && delta.length > 0) controller.enqueue(encoder.encode(delta));
            } catch {
              // Keep streaming even if one line is malformed.
            }
          }
        }
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
  const parts = hasImage
    ? [
        'You are Kivo, a premium personal AI operator inside a mobile app.',
        'You can analyze the attached image. Match the user language.',
        'Be concise, practical, and useful. For screenshots, identify visible errors and the likely next action.',
      ]
    : [
        'You are Kivo, a premium personal AI operator inside a mobile app.',
        'Match the user language. If the user writes Finnish, answer in Finnish.',
        'Be concise, calm, smart, and mobile-first. Avoid long paragraphs.',
      ];

  if (smartSearchEnabled) {
    parts.push(
      'Use Groq Compound built-in web search for current information.',
      'Prefer recent, reputable sources.',
      'Do not put raw URLs or a Sources/Lähteet section in the answer text. Sources are handled separately by the app UI.',
    );
  }

  if (memoryContext) {
    parts.push(`Use this personal memory context when relevant, without mentioning memory directly:\n${memoryContext}`);
  }

  return parts.join('\n');
}

function buildMessages({ userMessage, imageBase64, imageMimeType, history, memoryContext, smartSearchEnabled }: {
  userMessage: string;
  imageBase64: string;
  imageMimeType: string;
  history: KivoChatBody['history'];
  memoryContext: string;
  smartSearchEnabled: boolean;
}) {
  const hasImage = Boolean(imageBase64);
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(hasImage, memoryContext, smartSearchEnabled) },
    ...normalizeHistory(history),
  ];

  if (hasImage) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userMessage || 'Analyze this image.' },
        { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
      ],
    });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  return messages;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  if (!groqApiKey) return jsonResponse({ error: 'GROQ_API_KEY is not configured in Supabase secrets.' }, 500);

  let body: KivoChatBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const userMessage = cleanText(body.message);
  const memoryContext = cleanText(body.memoryContext, 6000);
  const imageBase64 = cleanBase64(body.imageBase64);
  const imageMimeType = cleanMimeType(body.imageMimeType);
  const hasImage = Boolean(imageBase64);
  const smartSearchEnabled = !hasImage && body.mode !== 'title' && shouldUseSmartSearch(userMessage);

  if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
    return jsonResponse({ error: 'Image is too large for analysis. Try a smaller screenshot or photo.' }, 413);
  }

  if (!userMessage && !hasImage && !body.photoAttached) {
    return jsonResponse({ error: 'Message or attachment is required.' }, 400);
  }

  if (body.photoAttached && !hasImage && body.mode !== 'title') {
    return jsonResponse({ error: 'Photo was attached, but imageBase64 was missing.' }, 400);
  }

  const messages = buildMessages({
    userMessage,
    imageBase64,
    imageMimeType,
    history: body.history,
    memoryContext,
    smartSearchEnabled,
  });

  if (body.mode === 'title') {
    const titleResult = await callGroq({
      groqApiKey,
      model: hasImage ? DEFAULT_VISION_MODEL : DEFAULT_CHAT_MODEL,
      messages: [
        { role: 'system', content: 'Create a short mobile chat title. Return only the title. No quotes. 2-5 words.' },
        messages[messages.length - 1],
      ],
      temperature: 0.18,
      maxTokens: 32,
    });

    return jsonResponse({
      title: cleanTitle(titleResult.ok ? titleResult.content : userMessage || 'New conversation') || 'New conversation',
      model: titleResult.model,
      usedVision: hasImage,
      usedMemory: false,
      usedSearch: false,
    });
  }

  const model = hasImage ? DEFAULT_VISION_MODEL : smartSearchEnabled ? DEFAULT_SEARCH_MODEL : DEFAULT_CHAT_MODEL;
  const maxTokens = hasImage ? 620 : smartSearchEnabled ? 860 : memoryContext ? 560 : 460;

  if (body.stream && smartSearchEnabled) {
    const result = await callSmartSearchGroq({ groqApiKey, messages, maxTokens });
    return jsonResponse({
      answer: result.ok ? result.content : 'En saanut ajankohtaista hakua juuri nyt. Kokeile uudestaan hetken päästä.',
      model: result.model,
      usedVision: false,
      usedMemory: Boolean(memoryContext),
      usedSearch: result.ok ? result.usedSearch || result.sources.length > 0 : false,
      sources: result.ok ? result.sources : [],
    });
  }

  if (body.stream) {
    return callGroqStream({ groqApiKey, model, messages, temperature: 0.42, maxTokens });
  }

  const result = smartSearchEnabled
    ? await callSmartSearchGroq({ groqApiKey, messages, maxTokens })
    : await callGroq({ groqApiKey, model, messages, temperature: 0.42, maxTokens });

  if (!result.ok) {
    return jsonResponse({
      answer: 'En saanut AI-vastausta juuri nyt. Kokeile uudestaan hetken päästä.',
      model: result.model,
      usedVision: hasImage,
      usedMemory: Boolean(memoryContext),
      usedSearch: false,
      sources: [],
    });
  }

  return jsonResponse({
    answer: result.content,
    model: result.model,
    usedVision: hasImage,
    usedMemory: Boolean(memoryContext),
    usedSearch: smartSearchEnabled || result.usedSearch,
    sources: result.sources,
  });
});
