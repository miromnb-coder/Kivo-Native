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

  const systemPrompt = [
    'You are Kivo, a premium personal AI operator inside a mobile app.',
    'Respond naturally, clearly, and directly.',
    'Keep replies concise unless the user asks for detail.',
    'Do not wrap your response in markdown unless it is useful.',
    'The app will render your answer as direct assistant text, not inside a box.',
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
    const groqResponse = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.55,
        max_tokens: 700,
      }),
    });

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      return jsonResponse(
        {
          error: groqData?.error?.message ?? 'Groq request failed.',
          details: groqData?.error ?? null,
        },
        502,
      );
    }

    const answer = groqData?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return jsonResponse({ error: 'Groq returned an empty answer.' }, 502);
    }

    return jsonResponse({
      answer,
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
