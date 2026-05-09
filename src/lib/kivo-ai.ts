import { supabase } from './supabase';
import type { RecentPhoto } from '../components/KivoPlusSheet';

export type KivoChatMessageInput = {
  role: 'user' | 'assistant';
  content: string;
};

export type KivoChatRequest = {
  message: string;
  photo?: RecentPhoto | null;
  history?: KivoChatMessageInput[];
};

type KivoChatFunctionResponse = {
  answer?: string;
  title?: string;
  model?: string;
  usedVision?: boolean;
  error?: string;
};

type KivoStreamRequest = KivoChatRequest & {
  onDelta?: (delta: string) => void;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function hasUsableImageData(photo?: RecentPhoto | null) {
  return Boolean(photo?.base64);
}

function buildFallbackAnswer(message: string, photo?: RecentPhoto | null) {
  if (photo && !hasUsableImageData(photo)) {
    return 'Kuva valittiin, mutta en saanut siitä vielä analysoitavaa dataa. Valitse kuva uudelleen plus-valikosta ja kokeile “Mitä kuvassa näkyy?”.';
  }

  if (photo && message.trim()) {
    return 'I received the image and your message, but the AI backend is not fully connected yet. Check the Supabase Edge Function, vision model, and GROQ_API_KEY secret.';
  }

  if (photo) {
    return 'I received the image, but the AI backend is not fully connected yet. Check the Supabase Edge Function, vision model, and GROQ_API_KEY secret.';
  }

  return 'I could not reach the AI backend yet. Check that the kivo-chat Edge Function is deployed and GROQ_API_KEY is set in Supabase secrets.';
}

function fallbackTitle(message: string, photo?: RecentPhoto | null) {
  const clean = message.replace(/\s+/g, ' ').trim();

  if (!clean && photo) return 'Image analysis';
  if (!clean) return 'New conversation';

  return clean.length > 44 ? `${clean.slice(0, 44).trim()}...` : clean;
}

function cleanConversationTitle(value: string) {
  return value
    .replace(/[\n\r]+/g, ' ')
    .replace(/^title\s*:/i, '')
    .replace(/^otsikko\s*:/i, '')
    .replace(/^['"`]+|['"`.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 44);
}

function buildPhotoPayload(photo?: RecentPhoto | null) {
  if (!photo) return {};

  return {
    photoAttached: true,
    imageBase64: photo.base64 ?? undefined,
    imageMimeType: photo.mimeType ?? 'image/jpeg',
    imageName: photo.name ?? 'image.jpg',
  };
}

function splitForTypewriter(answer: string) {
  const chunks = answer.match(/.{1,10}(\s|$)|.{1,10}/g);
  return chunks?.filter(Boolean) ?? [answer];
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playFallbackTypewriter(answer: string, onDelta?: (delta: string) => void) {
  if (!onDelta) return;

  for (const chunk of splitForTypewriter(answer)) {
    onDelta(chunk);
    await wait(18);
  }
}

async function getFunctionHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? supabasePublishableKey;

  return {
    apikey: supabasePublishableKey ?? '',
    Authorization: `Bearer ${accessToken ?? ''}`,
    'Content-Type': 'application/json',
    Accept: 'text/plain',
  };
}

export async function askKivoAi({ message, photo, history = [] }: KivoChatRequest) {
  try {
    const { data, error } = await supabase.functions.invoke<KivoChatFunctionResponse>('kivo-chat', {
      body: {
        mode: 'chat',
        message,
        history,
        ...buildPhotoPayload(photo),
      },
    });

    if (error) {
      console.warn('kivo-chat function error', error);
      return buildFallbackAnswer(message, photo);
    }

    const answer = data?.answer?.trim();
    if (!answer) {
      return buildFallbackAnswer(message, photo);
    }

    return answer;
  } catch (error) {
    console.warn('Failed to call kivo-chat function', error);
    return buildFallbackAnswer(message, photo);
  }
}

export async function askKivoAiStream({ message, photo, history = [], onDelta }: KivoStreamRequest) {
  if (!supabaseUrl || !supabasePublishableKey) {
    const answer = buildFallbackAnswer(message, photo);
    await playFallbackTypewriter(answer, onDelta);
    return answer;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/kivo-chat`, {
      method: 'POST',
      headers: await getFunctionHeaders(),
      body: JSON.stringify({
        mode: 'chat',
        stream: true,
        message,
        history,
        ...buildPhotoPayload(photo),
      }),
    });

    if (!response.ok) {
      const answer = await askKivoAi({ message, photo, history });
      await playFallbackTypewriter(answer, onDelta);
      return answer;
    }

    const reader = response.body?.getReader?.();

    if (!reader) {
      const answer = await response.text();
      const cleanAnswer = answer.trim() || buildFallbackAnswer(message, photo);
      await playFallbackTypewriter(cleanAnswer, onDelta);
      return cleanAnswer;
    }

    const decoder = new TextDecoder();
    let finalAnswer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;

      finalAnswer += chunk;
      onDelta?.(chunk);
    }

    const tail = decoder.decode();
    if (tail) {
      finalAnswer += tail;
      onDelta?.(tail);
    }

    const cleanAnswer = finalAnswer.trim();

    if (!cleanAnswer) {
      const fallback = buildFallbackAnswer(message, photo);
      await playFallbackTypewriter(fallback, onDelta);
      return fallback;
    }

    return cleanAnswer;
  } catch (error) {
    console.warn('Failed to stream Kivo answer', error);
    const answer = await askKivoAi({ message, photo, history });
    await playFallbackTypewriter(answer, onDelta);
    return answer;
  }
}

export async function generateKivoConversationTitle({ message, photo }: Pick<KivoChatRequest, 'message' | 'photo'>) {
  try {
    const { data, error } = await supabase.functions.invoke<KivoChatFunctionResponse>('kivo-chat', {
      body: {
        mode: 'title',
        message,
        ...buildPhotoPayload(photo),
      },
    });

    if (error) {
      console.warn('kivo-title function error', error);
      return fallbackTitle(message, photo);
    }

    const title = cleanConversationTitle(data?.title ?? '');
    return title || fallbackTitle(message, photo);
  } catch (error) {
    console.warn('Failed to generate Kivo conversation title', error);
    return fallbackTitle(message, photo);
  }
}
