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
