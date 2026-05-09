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
  message?: string;
  history?: Array<{
    role?: 'user' | 'assistant';
    content?: string;
  }>;
  photoAttached?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
  imageName?: string;
};

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_CHAT_MODEL = Deno.env.get('GROQ_CHAT_MODEL') ?? 'openai/gpt-oss-20b';
const DEFAULT_VISION_MODEL = Deno.env.get('GROQ_VISION_MODEL') ?? 'meta-llama/llama-4-scout-17b-16e-instruct';
const MAX_IMAGE_BASE64_CHARS = 22_000_000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
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
}) {
  const groqResponse = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
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

  return { content, status: 200 };
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
  const photoAttached = Boolean(body.photoAttached);
  const imageBase64 = cleanBase64(body.imageBase64);
  const imageMimeType = cleanMimeType(body.imageMimeType);
  const hasImage = Boolean(imageBase64);

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
      model: hasImage ? DEFAULT_VISION_MODEL : DEFAULT_CHAT_MODEL,
      usedVision: hasImage,
    });
  }

  const systemPrompt = hasImage
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
      ].join(' ')
    : [
        'You are Kivo, a premium personal AI operator inside a mobile app.',
        'Match the user language. If the user writes Finnish, answer in Finnish. If English, answer in English.',
        'Your default style is concise, calm, smart, and mobile-first.',
        'For simple questions, answer in 1-3 short sentences. Do not sound like Wikipedia or a school essay.',
        'For planning, coding, or product-building questions, give a clear next step and keep the answer practical.',
        'Do not over-explain unless the user asks for more detail.',
        'Avoid long paragraphs. Use short paragraphs that feel good in a chat UI.',
        'Use markdown only when it genuinely improves readability.',
      ].join(' ');

  const messages: VisionChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...normalizeHistory(body.history),
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

  try {
    const result = await callGroq({
      groqApiKey,
      model: hasImage ? DEFAULT_VISION_MODEL : DEFAULT_CHAT_MODEL,
      messages,
      temperature: 0.42,
      maxTokens: hasImage ? 620 : 420,
    });

    if ('error' in result) {
      return jsonResponse({ error: result.error, details: result.details }, result.status);
    }

    return jsonResponse({
      answer: result.content,
      model: hasImage ? DEFAULT_VISION_MODEL : DEFAULT_CHAT_MODEL,
      usedVision: hasImage,
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
