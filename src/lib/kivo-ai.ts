import { supabase } from './supabase';
import { buildKivoMemoryContext, saveInferredMemoriesFromMessage } from './kivo-memory';
import type { RecentPhoto } from '../components/KivoPlusSheet';

export type KivoSource = {
  title: string;
  url: string;
  domain: string;
  faviconUrl?: string;
  date?: string;
};

export type KivoAiMetadata = {
  usedSearch?: boolean;
  sources?: KivoSource[];
  model?: string;
};

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
  usedMemory?: boolean;
  usedSearch?: boolean;
  sources?: KivoSource[];
  error?: string;
};

type KivoParsedAnswer = {
  answer: string;
  metadata: KivoAiMetadata;
};

type KivoStreamRequest = KivoChatRequest & {
  onDelta?: (delta: string) => void;
  onMetadata?: (metadata: KivoAiMetadata) => void;
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

function normalizeAnswerText(value: string) {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}

function normalizeUrl(value: string) {
  return value.trim().replace(/[),.;\]]+$/g, '');
}

function getDomainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

function faviconForDomain(domain: string) {
  if (!domain) return undefined;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

function makeSource(title: string, url: string, date?: string): KivoSource | null {
  const cleanUrl = normalizeUrl(url);
  if (!cleanUrl) return null;

  const normalizedUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
  const domain = getDomainFromUrl(normalizedUrl);
  const cleanTitle = title
    .replace(/^[-*\d.)\s]+/, '')
    .replace(/\[[^\]]+\]\([^)]*\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title: cleanTitle || domain,
    url: normalizedUrl,
    domain,
    faviconUrl: faviconForDomain(domain),
    date,
  };
}

function dedupeSources(sources: KivoSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = source.url || `${source.domain}:${source.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(source.title && source.domain);
  }).slice(0, 8);
}

function parseSourcesFromText(rawAnswer: string) {
  const normalized = normalizeAnswerText(rawAnswer);
  const lines = normalized.split('\n');
  const sources: KivoSource[] = [];
  let sourcesStartIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const clean = lines[index].trim().replace(/^#+\s*/, '').replace(/:$/, '').toLowerCase();
    if (['sources', 'source', 'lähteet', 'lahteet'].includes(clean)) {
      sourcesStartIndex = index;
      break;
    }
  }

  const sourceLines = sourcesStartIndex >= 0 ? lines.slice(sourcesStartIndex + 1) : lines;
  const answerLines = sourcesStartIndex >= 0 ? lines.slice(0, sourcesStartIndex) : lines;

  for (const line of sourceLines) {
    const markdownLinks = [...line.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g)];
    for (const match of markdownLinks) {
      const source = makeSource(match[1], match[2]);
      if (source) sources.push(source);
    }

    const plainUrls = [...line.matchAll(/https?:\/\/[^\s)\]]+/g)];
    for (const match of plainUrls) {
      if (markdownLinks.some((link) => link[2] === match[0])) continue;
      const source = makeSource(line, match[0]);
      if (source) sources.push(source);
    }

    if (!markdownLinks.length && !plainUrls.length) {
      const domainMatch = line.match(/((?:[a-z0-9-]+\.)+[a-z]{2,})(?:\s*[-–—:]\s*(.+))?/i);
      if (domainMatch) {
        const source = makeSource(domainMatch[2] || line, domainMatch[1]);
        if (source) sources.push(source);
      }
    }
  }

  const answer = answerLines.join('\n').trim() || normalized;
  return {
    answer,
    sources: dedupeSources(sources),
  };
}

function normalizeSources(value: unknown) {
  if (!Array.isArray(value)) return [];

  return dedupeSources(value.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const source = item as Partial<KivoSource>;
    if (!source.url && !source.domain) return null;
    const url = source.url || `https://${source.domain}`;
    return makeSource(source.title || source.domain || url, url, source.date);
  }).filter((source): source is KivoSource => Boolean(source)));
}

function extractAnswerFromRawResponse(raw: string, fallback: string): KivoParsedAnswer {
  const clean = raw.trim();
  if (!clean) return { answer: fallback, metadata: {} };

  try {
    const parsed = JSON.parse(clean) as KivoChatFunctionResponse;
    const parsedSources = normalizeSources(parsed.sources);
    const answer = normalizeAnswerText(parsed.answer?.trim() || fallback);
    const sourceParseResult = parseSourcesFromText(answer);
    const sources = parsedSources.length ? parsedSources : sourceParseResult.sources;

    return {
      answer: sourceParseResult.answer || answer,
      metadata: {
        model: parsed.model,
        usedSearch: Boolean(parsed.usedSearch || sources.length),
        sources,
      },
    };
  } catch {
    // Not JSON. Use text as-is.
  }

  const sourceParseResult = parseSourcesFromText(clean);
  return {
    answer: sourceParseResult.answer || fallback,
    metadata: {
      usedSearch: sourceParseResult.sources.length > 0,
      sources: sourceParseResult.sources,
    },
  };
}

async function playParsedResponseText(raw: string, fallback: string, onDelta?: (delta: string) => void, onMetadata?: (metadata: KivoAiMetadata) => void) {
  const parsed = extractAnswerFromRawResponse(raw, fallback);
  onMetadata?.(parsed.metadata);
  await playFallbackTypewriter(parsed.answer, onDelta);
  return parsed.answer;
}

async function getFunctionHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? supabasePublishableKey;

  return {
    apikey: supabasePublishableKey ?? '',
    Authorization: `Bearer ${accessToken ?? ''}`,
    'Content-Type': 'application/json',
    Accept: 'text/plain, application/json',
  };
}

async function buildMemoryPayload(message: string) {
  try {
    const memoryContext = await buildKivoMemoryContext(message, {
      limit: 8,
      markUsed: true,
    });

    return {
      memoryContext: memoryContext.contextText || undefined,
      memoryCount: memoryContext.memories.length,
    };
  } catch (error) {
    console.warn('Failed to build Kivo memory context', error);
    return {
      memoryContext: undefined,
      memoryCount: 0,
    };
  }
}

async function savePossibleMemories(message: string) {
  try {
    await saveInferredMemoriesFromMessage(message, {
      metadata: {
        capturedBy: 'kivo-ai-client',
      },
    });
  } catch (error) {
    console.warn('Failed to save inferred Kivo memories', error);
  }
}

export async function askKivoAi({ message, photo, history = [] }: KivoChatRequest) {
  try {
    const memoryPayload = await buildMemoryPayload(message);

    const { data, error } = await supabase.functions.invoke<KivoChatFunctionResponse>('kivo-chat', {
      body: {
        mode: 'chat',
        message,
        history,
        ...memoryPayload,
        ...buildPhotoPayload(photo),
      },
    });

    void savePossibleMemories(message);

    if (error) {
      console.warn('kivo-chat function error', error);
      return buildFallbackAnswer(message, photo);
    }

    const answer = data?.answer?.trim();
    if (!answer) {
      return buildFallbackAnswer(message, photo);
    }

    return extractAnswerFromRawResponse(JSON.stringify(data), answer).answer;
  } catch (error) {
    console.warn('Failed to call kivo-chat function', error);
    return buildFallbackAnswer(message, photo);
  }
}

export async function askKivoAiStream({ message, photo, history = [], onDelta, onMetadata }: KivoStreamRequest) {
  if (!supabaseUrl || !supabasePublishableKey) {
    const answer = buildFallbackAnswer(message, photo);
    await playFallbackTypewriter(answer, onDelta);
    return answer;
  }

  const fallback = buildFallbackAnswer(message, photo);

  try {
    const memoryPayload = await buildMemoryPayload(message);

    const response = await fetch(`${supabaseUrl}/functions/v1/kivo-chat`, {
      method: 'POST',
      headers: await getFunctionHeaders(),
      body: JSON.stringify({
        mode: 'chat',
        stream: true,
        message,
        history,
        ...memoryPayload,
        ...buildPhotoPayload(photo),
      }),
    });

    if (!response.ok) {
      const answer = await askKivoAi({ message, photo, history });
      await playFallbackTypewriter(answer, onDelta);
      return answer;
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

    if (contentType.includes('application/json')) {
      const raw = await response.text();
      const answer = await playParsedResponseText(raw, fallback, onDelta, onMetadata);
      void savePossibleMemories(message);
      return answer;
    }

    const reader = response.body?.getReader?.();

    if (!reader) {
      const raw = await response.text();
      const answer = await playParsedResponseText(raw, fallback, onDelta, onMetadata);
      void savePossibleMemories(message);
      return answer;
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

    const parsed = extractAnswerFromRawResponse(finalAnswer, fallback);
    const cleanAnswer = parsed.answer;
    onMetadata?.(parsed.metadata);

    if (!cleanAnswer) {
      await playFallbackTypewriter(fallback, onDelta);
      return fallback;
    }

    void savePossibleMemories(message);
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
