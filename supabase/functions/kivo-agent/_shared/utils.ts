import { MAX_IMAGE_BASE64_CHARS } from './constants.ts';

export function nowIso() {
  return new Date().toISOString();
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export function cleanText(value: unknown, maxLength = 12000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function cleanBase64(value: unknown) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
    .replace(/\s/g, '')
    .slice(0, MAX_IMAGE_BASE64_CHARS + 1);
}

export function cleanMimeType(value: unknown) {
  if (typeof value !== 'string') return 'image/jpeg';
  const clean = value.trim().toLowerCase();
  if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(clean)) {
    return clean === 'image/jpg' ? 'image/jpeg' : clean;
  }
  return 'image/jpeg';
}

export function tomorrowAtMidnightIso() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
}

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}
