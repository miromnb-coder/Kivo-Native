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
  usedMemory?: boolean;
  usedVision?: boolean;
  sources?: KivoSource[];
  model?: string;
  intent?: string;
  tracing?: boolean;
  runId?: string;
  memoryCount?: number;
};

export type KivoChatMessageInput = {
  role: 'user' | 'assistant';
  content: string;
};

export type KivoChatRequest = {
  message: string;
  photo?: RecentPhoto | null;
  history?: KivoChatMessageInput[];
  conversationId?: string | null;
};

type KivoChatFunctionResponse = {
  answer?: string;
  title?: string;
  model?: string;
  intent?: string;
  tracing?: boolean;
  runId?: string;
  memoryCount?: number;
  usedVision?: boolean;
  usedMemory?: boolean;
  usedSearch?: boolean;
  sources?: KivoSource[];
  error?: string;
  detail?: string;
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

  if (photo) {
    return 'I received the image, but the AI backend is not fully connected yet. Check the Supabase Edge Function, vision model, and GROQ_API_KEY secret.';
  }

  return 'I could not reach the AI backend yet. Check that the kivo-agent Edge Function is deployed and GROQ_API_KEY is set in Supabase secrets.';
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

async function playTypewriter(answer: string, onDelta?: (delta: string) => void) {
  if (!onDelta) return;
  for (const chunk of splitForTypewriter(answer)) {
    onDelta(chunk);
    await wait(18);
  }
}

function normalizeAnswerText(value: string) {
  return value.replace(/\\n/g, '\n').replace(/\\t/g, ' ').replace(/\r\n/g, '\n').trim();
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
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : undefined;
}

function makeSource(title: string, url: string, date?: string): KivoSource | null {
  const cleanUrl = normalizeUrl(url);
  if (!cleanUrl) return null;
  const normalizedUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
  const domain = getDomainFromUrl(normalizedUrl);
  return {
    title: title.replace(/^[-*\d.)\s]+/, '').replace(/\[[^\]]+\]\([^)]*\)/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim() || domain,
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
  }

  return {
    answer: answerLines.join('\n').trim() || normalized,
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
        intent: parsed.intent,
        tracing: parsed.tracing,
        runId: parsed.runId,
        memoryCount: parsed.memoryCount,
        usedMemory: parsed.usedMemory,
        usedVision: parsed.usedVision,
        usedSearch: Boolean(parsed.usedSearch || sources.length),
        sources,
      },
    };
  } catch {
    const sourceParseResult = parseSourcesFromText(clean);
    return {
      answer: sourceParseResult.answer || fallback,
      metadata: {
        usedSearch: sourceParseResult.sources.length > 0,
        sources: sourceParseResult.sources,
      },
    };
  }
}

async function playParsedResponseText(raw: string, fallback: string, onDelta?: (delta: string) => void, onMetadata?: (metadata: KivoAiMetadata) => void) {
  const parsed = extractAnswerFromRawResponse(raw, fallback);
  onMetadata?.(parsed.metadata);
  await playTypewriter(parsed.answer, onDelta);
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
    const memoryContext = await buildKivoMemoryContext(message, { limit: 8, markUsed: true });
    return {
      memoryContext: memoryContext.contextText || undefined,
      memoryCount: memoryContext.memories.length,
    };
  } catch (error) {
    console.warn('Failed to build Kivo memory context', error);
    return { memoryContext: undefined, memoryCount: 0 };
  }
}

async function savePossibleMemories(message: string) {
  try {
    await saveInferredMemoriesFromMessage(message, {
      metadata: { capturedBy: 'kivo-ai-client' },
    });
  } catch (error) {
    console.warn('Failed to save inferred Kivo memories', error);
  }
}

async function resolveConversationId(conversationId?: string | null) {
  if (conversationId) return conversationId;

  try {
    const { data, error } = await supabase
      .from('kivo_conversations')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Failed to resolve latest conversation id', error);
      return null;
    }

    return typeof data?.id === 'string' ? data.id : null;
  } catch (error) {
    console.warn('Failed to resolve conversation id', error);
    return null;
  }
}

async function invokeKivoAgent({ message, photo, history = [], conversationId }: KivoChatRequest) {
  if (!supabaseUrl || !supabasePublishableKey) throw new Error('Supabase URL or publishable key is missing.');

  const memoryPayload = await buildMemoryPayload(message || 'image analysis');
  const resolvedConversationId = await resolveConversationId(conversationId);
  const response = await fetch(`${supabaseUrl}/functions/v1/kivo-agent`, {
    method: 'POST',
    headers: await getFunctionHeaders(),
    body: JSON.stringify({
      message,
      history,
      conversationId: resolvedConversationId,
      stream: false,
      metadata: { client: 'kivo-native', clientPersistsMessages: true },
      ...memoryPayload,
      ...buildPhotoPayload(photo),
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    let detail = raw;
    try {
      const parsed = JSON.parse(raw) as KivoChatFunctionResponse;
      detail = parsed.detail || parsed.error || raw;
    } catch {
      // Keep raw text.
    }
    throw new Error(detail || `kivo-agent request failed with status ${response.status}`);
  }

  return raw;
}

async function invokeLegacyKivoChat({ message, photo, history = [] }: KivoChatRequest) {
  const memoryPayload = await buildMemoryPayload(message || 'image analysis');
  const { data, error } = await supabase.functions.invoke<KivoChatFunctionResponse>('kivo-chat', {
    body: {
      mode: 'chat',
      message,
      history,
      ...memoryPayload,
      ...buildPhotoPayload(photo),
    },
  });

  if (error) throw error;
  return JSON.stringify(data ?? {});
}

export async function askKivoAi({ message, photo, history = [], conversationId }: KivoChatRequest) {
  const fallback = buildFallbackAnswer(message, photo);

  try {
    const raw = await invokeKivoAgent({ message, photo, history, conversationId });
    void savePossibleMemories(message);
    return extractAnswerFromRawResponse(raw, fallback).answer;
  } catch (agentError) {
    console.warn('kivo-agent function error, falling back to kivo-chat', agentError);

    try {
      const raw = await invokeLegacyKivoChat({ message, photo, history, conversationId });
      void savePossibleMemories(message);
      return extractAnswerFromRawResponse(raw, fallback).answer;
    } catch (legacyError) {
      console.warn('kivo-chat fallback failed', legacyError);
      return fallback;
    }
  }
}

export async function askKivoAiStream({ message, photo, history = [], conversationId, onDelta, onMetadata }: KivoStreamRequest) {
  const fallback = buildFallbackAnswer(message, photo);

  if (!supabaseUrl || !supabasePublishableKey) {
    await playTypewriter(fallback, onDelta);
    return fallback;
  }

  try {
    const raw = await invokeKivoAgent({ message, photo, history, conversationId });
    const answer = await playParsedResponseText(raw, fallback, onDelta, onMetadata);
    void savePossibleMemories(message);
    return answer;
  } catch (agentError) {
    console.warn('Failed to call kivo-agent, falling back to kivo-chat', agentError);

    try {
      const raw = await invokeLegacyKivoChat({ message, photo, history, conversationId });
      const answer = await playParsedResponseText(raw, fallback, onDelta, onMetadata);
      void savePossibleMemories(message);
      return answer;
    } catch (legacyError) {
      console.warn('Failed to call kivo-chat fallback', legacyError);
      await playTypewriter(fallback, onDelta);
      return fallback;
    }
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
