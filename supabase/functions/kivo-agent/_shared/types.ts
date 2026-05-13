export type KivoIntentName =
  | 'normal_chat'
  | 'memory_query'
  | 'memory_save_candidate'
  | 'planning'
  | 'task_help'
  | 'coding_help'
  | 'app_design_help'
  | 'image_analysis'
  | 'web_search_needed'
  | 'calendar_needed'
  | 'email_summary_needed'
  | 'finance_scan_needed'
  | 'app_action_needed'
  | 'clarification_needed'
  | 'unsafe_or_restricted';

export type KivoToolStatus = 'success' | 'failed' | 'blocked' | 'not_connected';
export type KivoRiskLevel = 'low' | 'medium' | 'high';
export type KivoResponseMode =
  | 'direct'
  | 'structured'
  | 'planner'
  | 'technical'
  | 'design'
  | 'clarifying'
  | 'safe_refusal';

export type KivoAnswerStyle = {
  useDividers: boolean;
  useCopyBlocks: boolean;
  useBullets: boolean;
  useNumberedSteps: boolean;
  compact: boolean;
  avoidTables: boolean;
  maxSections: number;
  languageMode: 'match_user';
};

export type KivoAgentRequest = {
  message?: string;
  conversationId?: string | null;
  history?: Array<{ role?: 'user' | 'assistant'; content?: string }>;
  stream?: boolean;
  memoryContext?: string;
  photoAttached?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
  metadata?: Record<string, unknown>;
};

export type KivoIntent = {
  name: KivoIntentName;
  confidence: number;
  reason?: string;
  signals?: string[];
  needsMemory?: boolean;
  needsTool?: boolean;
  riskLevel?: KivoRiskLevel;
  responseMode?: KivoResponseMode;
  answerStyle?: KivoAnswerStyle;
};

export type KivoAgentEvent = {
  eventType: string;
  ts: string;
  label?: string;
  detail?: string;
  details?: Record<string, unknown>;
};

export type KivoMemoryHit = {
  memoryId: string;
  type: string;
  score: number;
  snippet: string;
};

export type KivoToolRun = {
  toolRunId: string;
  toolName: string;
  status: KivoToolStatus;
  latencyMs?: number;
  output?: Record<string, unknown>;
  error?: string;
};

export type KivoSuggestedAction = {
  id: string;
  label: string;
  actionType: string;
  payload?: Record<string, unknown>;
};

export type KivoUsage = {
  creditsSpent: number;
  tokensIn: number;
  tokensOut: number;
  toolCredits: number;
};

export type KivoAgentResponse = {
  answer: string;
  intent: KivoIntent;
  conversationId: string | null;
  model: string;
  usedMemory: KivoMemoryHit[];
  usedTools: Array<{ toolName: string; toolRunId: string; status: KivoToolStatus }>;
  events: KivoAgentEvent[];
  toolRuns: KivoToolRun[];
  suggestedActions: KivoSuggestedAction[];
  usage: KivoUsage;
  traceId: string;
  error: null | {
    code: string;
    message: string;
    recoverable: boolean;
    details?: Record<string, unknown>;
  };
};

export type KivoAgentContext = {
  userId: string;
  conversationId: string | null;
  traceId: string;
  message: string;
  hasImage: boolean;
  startedAt: number;
};
