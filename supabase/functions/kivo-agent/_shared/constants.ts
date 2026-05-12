export const KIVO_AGENT_VERSION = '1.1.0-skeleton';

export const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_CHAT_MODEL = 'openai/gpt-oss-20b';
export const DEFAULT_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export const DEFAULT_LANGSMITH_ENDPOINT = 'https://eu.api.smith.langchain.com';
export const DEFAULT_LANGSMITH_PROJECT = 'Kivo Native Agent';

export const MAX_IMAGE_BASE64_CHARS = 4_000_000;
export const MEMORY_SEARCH_LIMIT = 8;

export const CREDIT_COSTS = {
  normalChat: 1,
  memorySearch: 0,
  vision: 2,
  webSearch: 2,
  writeAction: 3,
} as const;
