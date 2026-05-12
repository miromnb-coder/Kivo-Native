import type { KivoIntent } from '../_shared/types.ts';
import { clampConfidence } from '../_shared/utils.ts';

function matchAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function routeIntent(message: string, hasImage = false): KivoIntent {
  const text = message.toLowerCase();

  if (hasImage) {
    return { name: 'image_analysis', confidence: 0.94, reason: 'Image attachment was provided.' };
  }

  if (matchAny(text, [/\b(muista|muistatko|memory|remember)\b/i, /mitä sanoin/i])) {
    return { name: 'memory_query', confidence: 0.88, reason: 'User refers to memory or previous context.' };
  }

  if (matchAny(text, [/\b(muista tämä|tallenna muistiin|remember this)\b/i])) {
    return { name: 'memory_save_candidate', confidence: 0.9, reason: 'User asks to remember something.' };
  }

  if (matchAny(text, [/suunnittele|suunnitelma|aikataulu|huomenna|tänään|prioriteetti|plan/i])) {
    return { name: 'planning', confidence: 0.86, reason: 'User asks for planning or prioritization.' };
  }

  if (matchAny(text, [/koodi|code|bug|error|virhe|typescript|react native|expo|supabase|github|build/i])) {
    return { name: 'coding_help', confidence: 0.87, reason: 'User asks about code or technical implementation.' };
  }

  if (matchAny(text, [/design|ui|ux|näkymä|kuva|logo|icon|väri|premium|suunnitellaan/i])) {
    return { name: 'app_design_help', confidence: 0.84, reason: 'User asks about product or UI design.' };
  }

  if (matchAny(text, [/etsi|hae netistä|uusin|latest|ajankohtaista|hinta|saatavilla|news/i])) {
    return { name: 'web_search_needed', confidence: 0.82, reason: 'User needs current external information.' };
  }

  if (matchAny(text, [/kalenteri|calendar|tapaaminen|aikani|free slot/i])) {
    return { name: 'calendar_needed', confidence: 0.82, reason: 'User asks about calendar context.' };
  }

  if (matchAny(text, [/email|sähköposti|gmail|inbox/i])) {
    return { name: 'email_summary_needed', confidence: 0.82, reason: 'User asks about email context.' };
  }

  if (matchAny(text, [/raha|maksu|tilaus|subscription|finance|kulut|säästö/i])) {
    return { name: 'finance_scan_needed', confidence: 0.8, reason: 'User asks about finance or subscriptions.' };
  }

  if (matchAny(text, [/tee|korjaa|lisää|muuta|vaihda|avaa|create|update/i])) {
    return { name: 'task_help', confidence: clampConfidence(0.74), reason: 'User asks for an action or task help.' };
  }

  return { name: 'normal_chat', confidence: 0.62, reason: 'Default conversational intent.' };
}
