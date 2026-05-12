import type { KivoAgentRequest } from './types.ts';
import { cleanText } from './utils.ts';

export function parseKivoAgentRequest(value: unknown): KivoAgentRequest {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid request body. Expected an object.');
  }

  const body = value as KivoAgentRequest;
  const history = Array.isArray(body.history)
    ? body.history
        .slice(-12)
        .map((item) => ({
          role: item?.role === 'assistant' ? 'assistant' as const : 'user' as const,
          content: cleanText(item?.content, 4000),
        }))
        .filter((item) => item.content.length > 0)
    : [];

  return {
    message: cleanText(body.message, 12000),
    conversationId: typeof body.conversationId === 'string' && body.conversationId.length > 0 ? body.conversationId : null,
    history,
    stream: Boolean(body.stream),
    memoryContext: cleanText(body.memoryContext, 6000),
    photoAttached: Boolean(body.photoAttached),
    imageBase64: typeof body.imageBase64 === 'string' ? body.imageBase64 : undefined,
    imageMimeType: typeof body.imageMimeType === 'string' ? body.imageMimeType : undefined,
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
  };
}

export function assertMessageOrImage(input: { message?: string; imageBase64?: string; photoAttached?: boolean }) {
  if (!input.message && !input.imageBase64) {
    throw new Error('Message or image is required.');
  }

  if (input.photoAttached && !input.imageBase64) {
    throw new Error('Photo was attached, but imageBase64 was missing.');
  }
}

export function safeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
