import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { RecentPhoto } from '@/components/KivoPlusSheet';

export type KivoConversationSummary = {
  id: string;
  title: string;
  updatedAt?: string | null;
  createdAt?: string | null;
  isLocal?: boolean;
};

export type KivoStoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  photo?: RecentPhoto | null;
  createdAt?: string | null;
};

type LocalStore = {
  conversations: KivoConversationSummary[];
  messagesByConversationId: Record<string, KivoStoredMessage[]>;
};

type KivoConversationRow = {
  id: string;
  title?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type KivoMessageRow = {
  id: string;
  role?: string | null;
  content?: string | null;
  text?: string | null;
  attachments?: unknown;
  created_at?: string | null;
};

const LOCAL_HISTORY_KEY = 'kivo.native.history.v1';
const LOCAL_ID_PREFIX = 'local-';

function nowIso() {
  return new Date().toISOString();
}

function normalizeTitle(value: string) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (!clean) return 'New conversation';
  return clean.length > 44 ? `${clean.slice(0, 44).trim()}...` : clean;
}

export function createConversationTitle(message: string, hasPhoto = false) {
  if (message.trim()) return normalizeTitle(message);
  return hasPhoto ? 'Image conversation' : 'New conversation';
}

function getPhotoFromAttachments(attachments: unknown): RecentPhoto | null {
  if (!Array.isArray(attachments)) return null;
  const firstImage = attachments.find((item) => {
    return typeof item === 'object' && item !== null && 'uri' in item;
  }) as { uri?: string; id?: string; width?: number; height?: number; mediaType?: string } | undefined;

  if (!firstImage?.uri) return null;

  return {
    id: firstImage.id ?? firstImage.uri,
    uri: firstImage.uri,
    width: firstImage.width,
    height: firstImage.height,
    mediaType: firstImage.mediaType,
  };
}

function messageFromRow(row: KivoMessageRow): KivoStoredMessage | null {
  const role = row.role === 'assistant' ? 'assistant' : row.role === 'user' ? 'user' : null;
  if (!role) return null;

  return {
    id: row.id,
    role,
    text: row.content ?? row.text ?? '',
    photo: getPhotoFromAttachments(row.attachments),
    createdAt: row.created_at ?? null,
  };
}

async function readLocalStore(): Promise<LocalStore> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_HISTORY_KEY);
    if (!raw) return { conversations: [], messagesByConversationId: {} };

    const parsed = JSON.parse(raw) as Partial<LocalStore>;
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      messagesByConversationId: parsed.messagesByConversationId && typeof parsed.messagesByConversationId === 'object'
        ? parsed.messagesByConversationId
        : {},
    };
  } catch {
    return { conversations: [], messagesByConversationId: {} };
  }
}

async function writeLocalStore(store: LocalStore) {
  await AsyncStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(store));
}

async function getOrCreateKivoUserId() {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) return data.session.user.id;

  try {
    const anonymousResult = await supabase.auth.signInAnonymously();
    if (anonymousResult.error) return null;
    return anonymousResult.data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function listLocalConversations() {
  const store = await readLocalStore();
  return store.conversations
    .slice()
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    .slice(0, 24);
}

async function createLocalConversation(title: string) {
  const store = await readLocalStore();
  const timestamp = nowIso();
  const conversation: KivoConversationSummary = {
    id: `${LOCAL_ID_PREFIX}${Date.now()}`,
    title: normalizeTitle(title),
    createdAt: timestamp,
    updatedAt: timestamp,
    isLocal: true,
  };

  store.conversations = [conversation, ...store.conversations.filter((item) => item.id !== conversation.id)].slice(0, 50);
  store.messagesByConversationId[conversation.id] = [];
  await writeLocalStore(store);
  return conversation;
}

async function saveLocalMessage(conversationId: string, message: KivoStoredMessage) {
  const store = await readLocalStore();
  const timestamp = nowIso();
  const existingConversation = store.conversations.find((item) => item.id === conversationId);
  const conversation = existingConversation ?? {
    id: conversationId,
    title: createConversationTitle(message.text, Boolean(message.photo)),
    createdAt: timestamp,
    isLocal: true,
  };

  conversation.updatedAt = timestamp;
  store.conversations = [conversation, ...store.conversations.filter((item) => item.id !== conversationId)].slice(0, 50);
  store.messagesByConversationId[conversationId] = [
    ...(store.messagesByConversationId[conversationId] ?? []),
    { ...message, createdAt: message.createdAt ?? timestamp },
  ];

  await writeLocalStore(store);
}

export async function listKivoConversations(): Promise<KivoConversationSummary[]> {
  const userId = await getOrCreateKivoUserId();

  if (!userId) return listLocalConversations();

  const { data, error } = await supabase
    .from('kivo_conversations')
    .select('id,title,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(24);

  if (error || !Array.isArray(data)) {
    console.warn('Failed to load Supabase conversations, using local history', error);
    return listLocalConversations();
  }

  return (data as KivoConversationRow[]).map((item) => ({
    id: item.id,
    title: item.title || 'New conversation',
    createdAt: item.created_at ?? null,
    updatedAt: item.updated_at ?? null,
  }));
}

export async function createKivoConversation(title: string): Promise<KivoConversationSummary> {
  const userId = await getOrCreateKivoUserId();
  const normalizedTitle = normalizeTitle(title);

  if (!userId) return createLocalConversation(normalizedTitle);

  const { data, error } = await supabase
    .from('kivo_conversations')
    .insert({
      user_id: userId,
      title: normalizedTitle,
    })
    .select('id,title,created_at,updated_at')
    .single();

  if (error || !data) {
    console.warn('Failed to create Supabase conversation, using local history', error);
    return createLocalConversation(normalizedTitle);
  }

  const row = data as KivoConversationRow;
  return {
    id: row.id,
    title: row.title || normalizedTitle,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export async function loadKivoConversationMessages(conversationId: string): Promise<KivoStoredMessage[]> {
  if (conversationId.startsWith(LOCAL_ID_PREFIX)) {
    const store = await readLocalStore();
    return store.messagesByConversationId[conversationId] ?? [];
  }

  const { data, error } = await supabase
    .from('kivo_messages')
    .select('id,role,content,attachments,created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !Array.isArray(data)) {
    console.warn('Failed to load Supabase messages', error);
    return [];
  }

  return (data as KivoMessageRow[])
    .map(messageFromRow)
    .filter((message): message is KivoStoredMessage => Boolean(message));
}

export async function saveKivoMessage(conversationId: string, message: KivoStoredMessage) {
  if (conversationId.startsWith(LOCAL_ID_PREFIX)) {
    await saveLocalMessage(conversationId, message);
    return;
  }

  const attachments = message.photo ? [{ type: 'image', uri: message.photo.uri, width: message.photo.width, height: message.photo.height, mediaType: message.photo.mediaType }] : [];
  const { error } = await supabase.from('kivo_messages').insert({
    conversation_id: conversationId,
    role: message.role,
    content: message.text,
    attachments,
  });

  if (error) {
    console.warn('Failed to save Supabase message', error);
    await saveLocalMessage(conversationId, message);
    return;
  }

  await supabase
    .from('kivo_conversations')
    .update({ updated_at: nowIso() })
    .eq('id', conversationId);
}
