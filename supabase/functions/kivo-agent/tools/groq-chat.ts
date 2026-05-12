import { DEFAULT_CHAT_MODEL, DEFAULT_VISION_MODEL, GROQ_CHAT_URL } from '../_shared/constants.ts';

type GroqMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
};

export async function runGroqChat(input: {
  messages: GroqMessage[];
  hasImage?: boolean;
  maxTokens?: number;
}) {
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  if (!groqApiKey) throw new Error('GROQ_API_KEY is not configured in Supabase secrets.');

  const model = input.hasImage
    ? Deno.env.get('GROQ_VISION_MODEL') ?? DEFAULT_VISION_MODEL
    : Deno.env.get('GROQ_CHAT_MODEL') ?? DEFAULT_CHAT_MODEL;

  const response = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: input.messages,
      temperature: 0.42,
      max_tokens: input.maxTokens ?? (input.hasImage ? 760 : 720),
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? 'Groq request failed.');

  const answer = typeof data?.choices?.[0]?.message?.content === 'string'
    ? data.choices[0].message.content.trim()
    : '';

  if (!answer) throw new Error('Groq returned an empty answer.');
  return { answer, model: data?.model ?? model };
}
