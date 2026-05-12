export type KivoToolName =
  | 'memory_search'
  | 'memory_save'
  | 'groq_chat'
  | 'image_analysis'
  | 'web_search';

export type KivoToolDefinition = {
  name: KivoToolName;
  version: string;
  connected: boolean;
  permission: 'read' | 'write' | 'external';
  requiresConfirmation: boolean;
  description: string;
};

export const toolRegistry: Record<KivoToolName, KivoToolDefinition> = {
  memory_search: {
    name: 'memory_search',
    version: '1.0.0',
    connected: true,
    permission: 'read',
    requiresConfirmation: false,
    description: 'Search relevant user memories from Supabase.',
  },
  memory_save: {
    name: 'memory_save',
    version: '1.0.0',
    connected: true,
    permission: 'write',
    requiresConfirmation: true,
    description: 'Save stable long-term user memory.',
  },
  groq_chat: {
    name: 'groq_chat',
    version: '1.0.0',
    connected: true,
    permission: 'external',
    requiresConfirmation: false,
    description: 'Generate a final answer with Groq.',
  },
  image_analysis: {
    name: 'image_analysis',
    version: '1.0.0',
    connected: true,
    permission: 'external',
    requiresConfirmation: false,
    description: 'Analyze an attached image through a vision model.',
  },
  web_search: {
    name: 'web_search',
    version: '0.1.0',
    connected: false,
    permission: 'external',
    requiresConfirmation: false,
    description: 'Placeholder for future live web search.',
  },
};

export function getTool(name: KivoToolName) {
  return toolRegistry[name];
}
