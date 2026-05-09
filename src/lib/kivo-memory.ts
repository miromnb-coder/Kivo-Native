import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type KivoMemoryType =
  | 'preference'
  | 'project'
  | 'goal'
  | 'fact'
  | 'decision'
  | 'person'
  | 'tool'
  | 'style'
  | 'open_loop'
  | 'note';

export type KivoMemoryScope = 'long_term' | 'project' | 'tool' | 'conversation_summary';
export type KivoMemoryStatus = 'active' | 'needs_review' | 'superseded' | 'archived';
export type KivoMemoryVisibility = 'private' | 'system' | 'hidden';

export type KivoUserProfile = {
  id: string;
  userId: string;
  displayName?: string | null;
  preferredName?: string | null;
  language?: string | null;
  timezone?: string | null;
  bio?: string | null;
  currentFocus?: string | null;
  workingStyle?: string | null;
  responseStyle?: string | null;
  preferences: Record<string, unknown>;
  agentSettings: Record<string, unknown>;
  onboardingCompleted: boolean;
  lastSeenAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  isLocal?: boolean;
};

export type KivoMemory = {
  id: string;
  userId?: string;
  type: KivoMemoryType | string;
  title?: string | null;
  content: string;
  summary?: string | null;
  memoryKey?: string | null;
  memoryScope?: KivoMemoryScope | string | null;
  status?: KivoMemoryStatus | string | null;
  importance: number;
  confidence?: number | null;
  tags: string[];
  entities: Record<string, unknown>;
  metadata: Record<string, unknown>;
  visibility?: KivoMemoryVisibility | string | null;
  source?: string | null;
  sourceConversationId?: string | null;
  sourceMessageId?: string | null;
  supersedesMemoryId?: string | null;
  lastUsedAt?: string | null;
  useCount?: number;
  expiresAt?: string | null;
  relevanceHint?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  rank?: number | null;
  isLocal?: boolean;
};

export type KivoMemoryInput = {
  type?: KivoMemoryType | string;
  title?: string | null;
  content: string;
  summary?: string | null;
  memoryKey?: string | null;
  memoryScope?: KivoMemoryScope | string;
  importance?: number;
  confidence?: number | null;
  tags?: string[];
  entities?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  visibility?: KivoMemoryVisibility | string;
  source?: string | null;
  sourceConversationId?: string | null;
  sourceMessageId?: string | null;
  expiresAt?: string | null;
  relevanceHint?: string | null;
};

export type KivoMemorySearchOptions = {
  limit?: number;
  markUsed?: boolean;
};

export type KivoMemoryContext = {
  profile: KivoUserProfile | null;
  memories: KivoMemory[];
  contextText: string;
};

type KivoProfileRow = {
  id: string;
  user_id: string;
  display_name?: string | null;
  preferred_name?: string | null;
  language?: string | null;
  timezone?: string | null;
  bio?: string | null;
  current_focus?: string | null;
  working_style?: string | null;
  response_style?: string | null;
  preferences?: Record<string, unknown> | null;
  agent_settings?: Record<string, unknown> | null;
  onboarding_completed?: boolean | null;
  last_seen_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type KivoMemoryRow = {
  id: string;
  user_id?: string | null;
  type?: string | null;
  title?: string | null;
  content?: string | null;
  summary?: string | null;
  memory_key?: string | null;
  memory_scope?: string | null;
  status?: string | null;
  importance?: number | null;
  confidence?: number | string | null;
  tags?: string[] | null;
  entities?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  visibility?: string | null;
  source?: string | null;
  source_conversation_id?: string | null;
  source_message_id?: string | null;
  supersedes_memory_id?: string | null;
  last_used_at?: string | null;
  use_count?: number | null;
  expires_at?: string | null;
  relevance_hint?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  rank?: number | null;
};

type LocalMemoryStore = {
  profile: KivoUserProfile | null;
  memories: KivoMemory[];
};

const LOCAL_MEMORY_KEY = 'kivo.native.memory.v1';
const LOCAL_ID_PREFIX = 'local-memory-';

function nowIso() {
  return new Date().toISOString();
}

function clampImportance(value?: number) {
  if (!Number.isFinite(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value ?? 3)));
}

function cleanText(value: unknown, maxLength = 4000) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanTags(tags?: string[]) {
  if (!Array.isArray(tags)) return [];

  return Array.from(
    new Set(
      tags
        .map((tag) => cleanText(tag, 32).toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 12);
}

function makeMemoryKey(input: KivoMemoryInput) {
  if (input.memoryKey) return cleanText(input.memoryKey, 120).toLowerCase();

  const type = cleanText(input.type ?? 'note', 40).toLowerCase();
  const title = cleanText(input.title || input.content, 80).toLowerCase();

  if (!title) return null;

  return `${type}:${title}`
    .replace(/[^a-z0-9åäö:_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function profileFromRow(row: KivoProfileRow): KivoUserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name ?? null,
    preferredName: row.preferred_name ?? null,
    language: row.language ?? 'fi',
    timezone: row.timezone ?? 'Europe/Helsinki',
    bio: row.bio ?? null,
    currentFocus: row.current_focus ?? null,
    workingStyle: row.working_style ?? null,
    responseStyle: row.response_style ?? 'concise_premium',
    preferences: row.preferences ?? {},
    agentSettings: row.agent_settings ?? {},
    onboardingCompleted: Boolean(row.onboarding_completed),
    lastSeenAt: row.last_seen_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function memoryFromRow(row: KivoMemoryRow): KivoMemory {
  const confidence = typeof row.confidence === 'string' ? Number(row.confidence) : row.confidence;

  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    type: row.type || 'note',
    title: row.title ?? null,
    content: row.content ?? '',
    summary: row.summary ?? null,
    memoryKey: row.memory_key ?? null,
    memoryScope: row.memory_scope ?? 'long_term',
    status: row.status ?? 'active',
    importance: clampImportance(row.importance ?? 3),
    confidence: Number.isFinite(confidence) ? Number(confidence) : null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    entities: row.entities ?? {},
    metadata: row.metadata ?? {},
    visibility: row.visibility ?? 'private',
    source: row.source ?? null,
    sourceConversationId: row.source_conversation_id ?? null,
    sourceMessageId: row.source_message_id ?? null,
    supersedesMemoryId: row.supersedes_memory_id ?? null,
    lastUsedAt: row.last_used_at ?? null,
    useCount: row.use_count ?? 0,
    expiresAt: row.expires_at ?? null,
    relevanceHint: row.relevance_hint ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    rank: row.rank ?? null,
  };
}

async function getOrCreateKivoMemoryUserId() {
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

async function readLocalStore(): Promise<LocalMemoryStore> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_MEMORY_KEY);
    if (!raw) return { profile: null, memories: [] };

    const parsed = JSON.parse(raw) as Partial<LocalMemoryStore>;
    return {
      profile: parsed.profile ?? null,
      memories: Array.isArray(parsed.memories) ? parsed.memories : [],
    };
  } catch {
    return { profile: null, memories: [] };
  }
}

async function writeLocalStore(store: LocalMemoryStore) {
  await AsyncStorage.setItem(LOCAL_MEMORY_KEY, JSON.stringify(store));
}

function buildLocalProfile(): KivoUserProfile {
  const timestamp = nowIso();

  return {
    id: 'local-profile',
    userId: 'local-user',
    language: 'fi',
    timezone: 'Europe/Helsinki',
    responseStyle: 'concise_premium',
    preferences: {},
    agentSettings: { memory: true, proactive: true, briefings: true },
    onboardingCompleted: false,
    lastSeenAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    isLocal: true,
  };
}

async function getLocalProfile() {
  const store = await readLocalStore();

  if (store.profile) return store.profile;

  const profile = buildLocalProfile();
  await writeLocalStore({ ...store, profile });
  return profile;
}

async function saveLocalMemory(input: KivoMemoryInput): Promise<KivoMemory> {
  const store = await readLocalStore();
  const timestamp = nowIso();
  const memoryKey = makeMemoryKey(input);
  const existingIndex = memoryKey ? store.memories.findIndex((item) => item.memoryKey === memoryKey) : -1;
  const memory: KivoMemory = {
    id: existingIndex >= 0 ? store.memories[existingIndex].id : `${LOCAL_ID_PREFIX}${Date.now()}`,
    userId: 'local-user',
    type: input.type ?? 'note',
    title: input.title ?? null,
    content: cleanText(input.content, 4000),
    summary: input.summary ?? null,
    memoryKey,
    memoryScope: input.memoryScope ?? 'long_term',
    status: 'active',
    importance: clampImportance(input.importance),
    confidence: input.confidence ?? 0.72,
    tags: cleanTags(input.tags),
    entities: input.entities ?? {},
    metadata: input.metadata ?? {},
    visibility: input.visibility ?? 'private',
    source: input.source ?? 'local',
    sourceConversationId: input.sourceConversationId ?? null,
    sourceMessageId: input.sourceMessageId ?? null,
    useCount: existingIndex >= 0 ? store.memories[existingIndex].useCount ?? 0 : 0,
    createdAt: existingIndex >= 0 ? store.memories[existingIndex].createdAt : timestamp,
    updatedAt: timestamp,
    isLocal: true,
  };

  if (existingIndex >= 0) {
    store.memories[existingIndex] = memory;
  } else {
    store.memories.unshift(memory);
  }

  store.memories = store.memories.slice(0, 200);
  await writeLocalStore(store);
  return memory;
}

async function searchLocalMemories(query: string, limit: number) {
  const store = await readLocalStore();
  const terms = cleanText(query, 240).toLowerCase().split(' ').filter(Boolean);

  return store.memories
    .filter((memory) => memory.status !== 'archived')
    .map((memory) => {
      const haystack = [memory.title, memory.content, memory.summary, memory.tags.join(' ')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const hits = terms.length === 0 ? 1 : terms.filter((term) => haystack.includes(term)).length;
      const score = hits + memory.importance * 0.15 + (memory.useCount ?? 0) * 0.04;
      return { ...memory, rank: score };
    })
    .filter((memory) => terms.length === 0 || Number(memory.rank) > 0)
    .sort((a, b) => Number(b.rank ?? 0) - Number(a.rank ?? 0))
    .slice(0, limit);
}

export async function getKivoMemoryProfile(): Promise<KivoUserProfile | null> {
  const userId = await getOrCreateKivoMemoryUserId();

  if (!userId) return getLocalProfile();

  const { data, error } = await supabase
    .from('kivo_profiles')
    .select('id,user_id,display_name,preferred_name,language,timezone,bio,current_focus,working_style,response_style,preferences,agent_settings,onboarding_completed,last_seen_at,created_at,updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Failed to load Kivo profile, using local profile', error);
    return getLocalProfile();
  }

  if (data) return profileFromRow(data as KivoProfileRow);

  const { data: created, error: createError } = await supabase
    .from('kivo_profiles')
    .insert({
      user_id: userId,
      language: 'fi',
      timezone: 'Europe/Helsinki',
      response_style: 'concise_premium',
      preferences: {},
      agent_settings: { memory: true, proactive: true, briefings: true },
      last_seen_at: nowIso(),
    })
    .select('id,user_id,display_name,preferred_name,language,timezone,bio,current_focus,working_style,response_style,preferences,agent_settings,onboarding_completed,last_seen_at,created_at,updated_at')
    .single();

  if (createError || !created) {
    console.warn('Failed to create Kivo profile, using local profile', createError);
    return getLocalProfile();
  }

  return profileFromRow(created as KivoProfileRow);
}

export async function updateKivoMemoryProfile(input: Partial<Omit<KivoUserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isLocal'>>) {
  const userId = await getOrCreateKivoMemoryUserId();

  if (!userId) {
    const store = await readLocalStore();
    const profile = { ...(store.profile ?? buildLocalProfile()), ...input, updatedAt: nowIso(), isLocal: true };
    await writeLocalStore({ ...store, profile });
    return profile;
  }

  const patch = {
    user_id: userId,
    display_name: input.displayName,
    preferred_name: input.preferredName,
    language: input.language,
    timezone: input.timezone,
    bio: input.bio,
    current_focus: input.currentFocus,
    working_style: input.workingStyle,
    response_style: input.responseStyle,
    preferences: input.preferences,
    agent_settings: input.agentSettings,
    onboarding_completed: input.onboardingCompleted,
    last_seen_at: input.lastSeenAt ?? nowIso(),
  };

  const { data, error } = await supabase
    .from('kivo_profiles')
    .upsert(patch, { onConflict: 'user_id' })
    .select('id,user_id,display_name,preferred_name,language,timezone,bio,current_focus,working_style,response_style,preferences,agent_settings,onboarding_completed,last_seen_at,created_at,updated_at')
    .single();

  if (error || !data) {
    console.warn('Failed to update Kivo profile', error);
    return null;
  }

  return profileFromRow(data as KivoProfileRow);
}

export async function touchKivoProfileSeen() {
  const profile = await updateKivoMemoryProfile({ lastSeenAt: nowIso() });
  return profile;
}

export async function saveKivoMemory(input: KivoMemoryInput): Promise<KivoMemory | null> {
  const content = cleanText(input.content, 4000);
  if (!content) return null;

  const userId = await getOrCreateKivoMemoryUserId();

  if (!userId) return saveLocalMemory({ ...input, content });

  const memoryKey = makeMemoryKey({ ...input, content });
  const payload = {
    user_id: userId,
    type: cleanText(input.type ?? 'note', 40) || 'note',
    title: input.title ? cleanText(input.title, 120) : null,
    content,
    summary: input.summary ? cleanText(input.summary, 1000) : null,
    memory_key: memoryKey,
    memory_scope: input.memoryScope ?? 'long_term',
    status: 'active',
    importance: clampImportance(input.importance),
    confidence: input.confidence ?? 0.8,
    tags: cleanTags(input.tags),
    entities: input.entities ?? {},
    metadata: input.metadata ?? {},
    visibility: input.visibility ?? 'private',
    source: input.source ?? 'chat',
    source_conversation_id: input.sourceConversationId ?? null,
    source_message_id: input.sourceMessageId ?? null,
    expires_at: input.expiresAt ?? null,
    relevance_hint: input.relevanceHint ?? null,
  };

  const query = memoryKey
    ? supabase.from('kivo_memories').upsert(payload, { onConflict: 'user_id,memory_key' })
    : supabase.from('kivo_memories').insert(payload);

  const { data, error } = await query
    .select('id,user_id,type,title,content,summary,memory_key,memory_scope,status,importance,confidence,tags,entities,metadata,visibility,source,source_conversation_id,source_message_id,supersedes_memory_id,last_used_at,use_count,expires_at,relevance_hint,created_at,updated_at')
    .single();

  if (error || !data) {
    console.warn('Failed to save Kivo memory, using local memory', error);
    return saveLocalMemory({ ...input, content });
  }

  await supabase.from('kivo_memory_events').insert({
    user_id: userId,
    memory_id: (data as KivoMemoryRow).id,
    event_type: 'created',
    details: { source: input.source ?? 'chat', memoryKey },
  });

  return memoryFromRow(data as KivoMemoryRow);
}

export async function listKivoMemories(options: { limit?: number; type?: string; tags?: string[]; includeArchived?: boolean } = {}) {
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 80);
  const userId = await getOrCreateKivoMemoryUserId();

  if (!userId) return searchLocalMemories('', limit);

  let query = supabase
    .from('kivo_memories')
    .select('id,user_id,type,title,content,summary,memory_key,memory_scope,status,importance,confidence,tags,entities,metadata,visibility,source,source_conversation_id,source_message_id,supersedes_memory_id,last_used_at,use_count,expires_at,relevance_hint,created_at,updated_at')
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (!options.includeArchived) {
    query = query.eq('status', 'active').eq('archived', false);
  }

  if (options.type) {
    query = query.eq('type', options.type);
  }

  if (options.tags?.length) {
    query = query.overlaps('tags', cleanTags(options.tags));
  }

  const { data, error } = await query;

  if (error || !Array.isArray(data)) {
    console.warn('Failed to list Kivo memories, using local memory', error);
    return searchLocalMemories('', limit);
  }

  return (data as KivoMemoryRow[]).map(memoryFromRow);
}

export async function searchKivoMemories(queryText: string, options: KivoMemorySearchOptions = {}) {
  const limit = Math.min(Math.max(options.limit ?? 8, 1), 20);
  const cleanQuery = cleanText(queryText, 240);
  const userId = await getOrCreateKivoMemoryUserId();

  if (!userId) return searchLocalMemories(cleanQuery, limit);

  const { data, error } = await supabase.rpc('search_kivo_memories', {
    query_text: cleanQuery,
    match_count: limit,
  });

  if (error || !Array.isArray(data)) {
    console.warn('Failed to search Kivo memories, falling back to list', error);
    return listKivoMemories({ limit });
  }

  const memories = (data as KivoMemoryRow[]).map(memoryFromRow);

  if (options.markUsed && memories.length > 0) {
    await Promise.all(memories.slice(0, 5).map((memory) => touchKivoMemoryUsed(memory.id)));
  }

  return memories;
}

export async function touchKivoMemoryUsed(memoryId: string) {
  if (!memoryId || memoryId.startsWith(LOCAL_ID_PREFIX)) return;

  try {
    await supabase.rpc('touch_kivo_memory_used', { memory_uuid: memoryId });
  } catch (error) {
    console.warn('Failed to touch Kivo memory', error);
  }
}

export async function archiveKivoMemory(memoryId: string) {
  if (!memoryId) return false;

  if (memoryId.startsWith(LOCAL_ID_PREFIX)) {
    const store = await readLocalStore();
    store.memories = store.memories.map((memory) => (
      memory.id === memoryId ? { ...memory, status: 'archived', updatedAt: nowIso() } : memory
    ));
    await writeLocalStore(store);
    return true;
  }

  const userId = await getOrCreateKivoMemoryUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('kivo_memories')
    .update({ status: 'archived', archived: true })
    .eq('id', memoryId)
    .eq('user_id', userId);

  if (error) {
    console.warn('Failed to archive Kivo memory', error);
    return false;
  }

  await supabase.from('kivo_memory_events').insert({
    user_id: userId,
    memory_id: memoryId,
    event_type: 'archived',
    details: {},
  });

  return true;
}

export function formatKivoMemoryContext(profile: KivoUserProfile | null, memories: KivoMemory[]) {
  const lines: string[] = [];

  if (profile) {
    const profileParts = [
      profile.preferredName ? `Preferred name: ${profile.preferredName}` : null,
      profile.language ? `Language: ${profile.language}` : null,
      profile.responseStyle ? `Response style: ${profile.responseStyle}` : null,
      profile.currentFocus ? `Current focus: ${profile.currentFocus}` : null,
      profile.workingStyle ? `Working style: ${profile.workingStyle}` : null,
    ].filter(Boolean);

    if (profileParts.length > 0) {
      lines.push(`User profile: ${profileParts.join(' | ')}`);
    }
  }

  const activeMemories = memories
    .filter((memory) => memory.status !== 'archived' && memory.content.trim().length > 0)
    .slice(0, 8);

  if (activeMemories.length > 0) {
    lines.push('Relevant memories:');
    activeMemories.forEach((memory, index) => {
      const label = memory.title || memory.type || `Memory ${index + 1}`;
      const importance = `importance ${memory.importance}/5`;
      const tags = memory.tags.length > 0 ? ` tags: ${memory.tags.join(', ')}` : '';
      lines.push(`- ${label} (${importance}${tags}): ${memory.summary || memory.content}`);
    });
  }

  return lines.join('\n').trim();
}

export async function buildKivoMemoryContext(message: string, options: KivoMemorySearchOptions = {}): Promise<KivoMemoryContext> {
  const [profile, memories] = await Promise.all([
    getKivoMemoryProfile(),
    searchKivoMemories(message, { limit: options.limit ?? 8, markUsed: options.markUsed ?? true }),
  ]);

  return {
    profile,
    memories,
    contextText: formatKivoMemoryContext(profile, memories),
  };
}

export function inferMemoryDraftsFromUserMessage(message: string): KivoMemoryInput[] {
  const clean = cleanText(message, 1000);
  const lower = clean.toLowerCase();

  if (!clean) return [];

  const memoryTriggers = [
    'muista',
    'remember',
    'pidä mielessä',
    'haluan että muistat',
    'i want you to remember',
  ];
  const preferenceTriggers = ['tykkään', 'haluan', 'en halua', 'prefer', 'i like', 'i don\'t want'];
  const projectTriggers = ['teen ', 'rakennan', 'sovellus', 'project', 'app', 'repo'];

  if (memoryTriggers.some((trigger) => lower.includes(trigger))) {
    return [{
      type: 'note',
      title: clean.slice(0, 72),
      content: clean,
      importance: 4,
      tags: ['explicit'],
      source: 'chat_explicit_memory',
      confidence: 0.9,
    }];
  }

  if (preferenceTriggers.some((trigger) => lower.includes(trigger))) {
    return [{
      type: 'preference',
      title: clean.slice(0, 72),
      content: clean,
      importance: 3,
      tags: ['preference'],
      source: 'chat_inferred_memory',
      confidence: 0.68,
    }];
  }

  if (projectTriggers.some((trigger) => lower.includes(trigger)) && clean.length > 24) {
    return [{
      type: 'project',
      title: clean.slice(0, 72),
      content: clean,
      importance: 3,
      tags: ['project'],
      source: 'chat_inferred_memory',
      confidence: 0.62,
    }];
  }

  return [];
}

export async function saveInferredMemoriesFromMessage(message: string, extra?: Partial<KivoMemoryInput>) {
  const drafts = inferMemoryDraftsFromUserMessage(message);

  if (drafts.length === 0) return [];

  const saved = await Promise.all(
    drafts.map((draft) => saveKivoMemory({ ...draft, ...extra, metadata: { ...(draft.metadata ?? {}), ...(extra?.metadata ?? {}) } })),
  );

  return saved.filter((memory): memory is KivoMemory => Boolean(memory));
}
