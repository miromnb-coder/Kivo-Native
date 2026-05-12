import { runGroqChat } from './groq-chat.ts';

export async function runImageAnalysis(input: {
  imageBase64: string;
  imageMimeType: string;
  question?: string;
  systemPrompt: string;
}) {
  const result = await runGroqChat({
    hasImage: true,
    messages: [
      { role: 'system', content: input.systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: input.question || 'Analyze this image.' },
          { type: 'image_url', image_url: { url: `data:${input.imageMimeType};base64,${input.imageBase64}` } },
        ],
      },
    ],
    maxTokens: 760,
  });

  return {
    description: result.answer,
    model: result.model,
  };
}
