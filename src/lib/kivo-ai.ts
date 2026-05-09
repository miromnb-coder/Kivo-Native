import { supabase } from './supabase';
import type { RecentPhoto } from '@/components/KivoPlusSheet';

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
  model?: string;
  error?: string;
};

function buildFallbackAnswer(message: string, photo?: RecentPhoto | null) {
  if (photo && message.trim()) {
    return 'I received the image and your message, but the AI backend is not fully connected yet. Check the Supabase Edge Function and GROQ_API_KEY secret.';
  }

  if (photo) {
    return 'I received the image, but the AI backend is not fully connected yet. Check the Supabase Edge Function and GROQ_API_KEY secret.';
  }

  return 'I could not reach the AI backend yet. Check that the kivo-chat Edge Function is deployed and GROQ_API_KEY is set in Supabase secrets.';
}

export async function askKivoAi({ message, photo, history = [] }: KivoChatRequest) {
  try {
    const { data, error } = await supabase.functions.invoke<KivoChatFunctionResponse>('kivo-chat', {
      body: {
        message,
        history,
        photoAttached: Boolean(photo),
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
