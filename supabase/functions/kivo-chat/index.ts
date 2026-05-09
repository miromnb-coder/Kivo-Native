const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type KivoChatBody = {
  mode?: 'chat' | 'title';
  message?: string;
  history?: Array<{
    role?: 'user' | 'assistant';
    content?: string;
  }>;
  photoAttached?: boolean;
};

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function cleanText(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 8000);
}

function cleanTitle(value: unknown) {
  if (typeof value !== 'string') return '';

  return value
    .replace(/[\n\r]+/g, ' ')
    .replace(/^title\s*:/i, '')
    .replace(/^otsikko\s*:/i, '')
    .replace(/^['"`]+|['"`.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 44);
}

function normalizeHistory(history: KivoChatBody['history']): ChatMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-10)
    .map((item) => {
      const role = item?.role === 'assistant' ? 'assistant' : 'user';
      const content = cleanText(item?.content);
      return { role, content } satisfies ChatMessage;
    })
    .filter((item) => item.content.length > 0);
}

async function callGroq(groqApiKey: string, messages: ChatMessage[], options?: { temperature?: number; maxTokens?: number }) {
  const groqResponse = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature: options?.temperature ?? 0.42,
      max_tokens: options?.maxTokens ?? 360,
    }),
  });

  const groqData = await groqResponse.json();

  if (!groqResponse.ok) {
    return {
      error: groqData?.error?.message ?? 'Groq request failed.',
      details: groqData?.error ?? null,
      status: 502,
    };
  }

  const content = groqData?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return {
      error: 'Groq returned an empty answer.',
      details: null,
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

  if (!userMessage && !photoAttached) {
    return jsonResponse({ error: 'Message or attachment is required.' }, 400);
  }

  if (body.mode === 'title') {
    const titlePrompt = [
      'You create short premium conversation titles for a mobile AI chat history.',
      'Return only the title. No quotes. No markdown. No punctuation at the end.',
      'Use the same language as the user message.',
      'The title must be 2-5 words and under 36 characters when possible.',
      'Make it specific and useful for finding the chat later.',
      'If the user attached an image and the message is vague, use a short image-related title.',
    ].join(' ');

    const result = await callGroq(
      groqApiKey,
      [
        { role: 'system', content: titlePrompt },
        {
          role: 'user',
          content: photoAttached
            ? `${userMessage || 'The user attached an image.'}\n\nPhoto attached: yes`
            : userMessage,
        },
      ],
      { temperature: 0.18, maxTokens: 32 },
    );

    if ('error' in result) {
      return jsonResponse({ error: result.error, details: result.details }, result.status);
    }

    const title = cleanTitle(result.content);

    if (!title) {
      return jsonResponse({ error: 'Groq returned an empty title.' }, 502);
    }

    return jsonResponse({
      title,
      model: DEFAULT_MODEL,
    });
  }

  const systemPrompt = [
    'You are Kivo, a premium personal AI operator inside a mobile app.',
    'Match the user language. If the user writes Finnish, answer in Finnish. If the user writes English, answer in English.',
    'Your default style is concise, calm, smart, and mobile-first.',
    'For simple questions, answer in 1-3 short sentences. Do not sound like Wikipedia or a school essay.',
    'For planning, coding, or product-building questions, give a clear next step and keep the answer practical.',
    'Do not over-explain unless the user asks for more detail.',
    'Avoid long paragraphs. Use short paragraphs that feel good in a chat UI.',
    'Do not wrap your response in markdown unless bullets or code are truly useful.',
    'The app renders your answer as direct assistant text, not inside a box.',
    'If the user attached an image, acknowledge it, but do not claim you can see image details yet because vision upload is not connected in this first version.',
  ].join(' ');

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...normalizeHistory(body.history),
    {
      role: 'user',
      content: photoAttached
        ? `${userMessage || 'The user attached an image.'}\n\nNote: The user attached an image, but this first backend version has not uploaded the image bytes to vision yet.`
        : userMessage,
    },
  ];

  try {
    const result = await callGroq(groqApiKey, messages, { temperature: 0.42, maxTokens: 360 });

    if ('error' in result) {
      return jsonResponse({ error: result.error, details: result.details }, result.status);
    }

    return jsonResponse({
      answer: result.content,
      model: DEFAULT_MODEL,
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
