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
    description: 'Search relevant user memories from Supabase. Core v1 connected tool.',
  },
  memory_save: {
    name: 'memory_save',
    version: '0.1.0',
    connected: false,
    permission: 'write',
    requiresConfirmation: true,
    description: 'Planned memory save tool. Not enabled in Core v1.',
  },
  groq_chat: {
    name: 'groq_chat',
    version: '1.0.0',
    connected: true,
    permission: 'external',
    requiresConfirmation: false,
    description: 'Generate a final answer with Groq. Core v1 connected tool.',
  },
  image_analysis: {
    name: 'image_analysis',
    version: '0.1.0',
    connected: false,
    permission: 'external',
    requiresConfirmation: false,
    description: 'Planned image analysis tool. Keep disabled in Core v1 unless explicitly enabled later.',
  },
  web_search: {
    name: 'web_search',
    version: '0.1.0',
    connected: false,
    permission: 'external',
    requiresConfirmation: false,
    description: 'Planned live web search tool. Not connected in Core v1.',
  },
};

export function getTool(name: KivoToolName) {
  return toolRegistry[name];
}
