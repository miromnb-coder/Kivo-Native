import type { KivoAnswerStyle, KivoIntent, KivoIntentName, KivoResponseMode, KivoRiskLevel } from '../_shared/types.ts';
import { clampConfidence } from '../_shared/utils.ts';

type IntentCandidate = {
  name: KivoIntentName;
  score: number;
  confidence: number;
  reason: string;
  signals: string[];
  needsMemory?: boolean;
  needsTool?: boolean;
  riskLevel?: KivoRiskLevel;
  responseMode?: KivoResponseMode;
  answerStyle?: Partial<KivoAnswerStyle>;
};

type PatternGroup = {
  signal: string;
  weight: number;
  patterns: RegExp[];
};

const defaultAnswerStyle: KivoAnswerStyle = {
  useDividers: false,
  useCopyBlocks: false,
  useBullets: true,
  useNumberedSteps: false,
  compact: true,
  avoidTables: true,
  maxSections: 3,
  languageMode: 'match_user',
};

const harmfulPatterns = [
  /\b(kill myself|suicide|self\s*harm|hurt myself)\b/i,
  /\b(itsemurha|satuttaa itseäni|vahingoittaa itseäni)\b/i,
  /\b(how to make|build).{0,24}\b(bomb|explosive)\b/i,
  /\b(pommi|räjähde|ase|huume)\b/i,
];

const memoryQueryGroups: PatternGroup[] = [
  { signal: 'asks_about_memory', weight: 3, patterns: [/\b(muistatko|mitä sanoin|aiemmin|edellisessä keskustelussa)\b/i, /\b(remember|do you remember|last time|previously)\b/i] },
  { signal: 'refers_to_user_context', weight: 2, patterns: [/\b(minun projekti|mun sovellus|kivo|repo|github)\b/i, /\b(my project|my app|my repo)\b/i] },
];

const memorySaveGroups: PatternGroup[] = [
  { signal: 'explicit_memory_save', weight: 4, patterns: [/\b(muista tämä|tallenna muistiin|pidä mielessä)\b/i, /\b(remember this|save this|keep in mind)\b/i] },
];

const planningGroups: PatternGroup[] = [
  { signal: 'planning_request', weight: 3, patterns: [/\b(suunnittele|suunnitelma|prioriteetti|aikataulu|vaiheet|seuraava askel)\b/i, /\b(plan|roadmap|prioritize|next step|schedule)\b/i] },
  { signal: 'today_or_focus', weight: 2, patterns: [/\b(tänään|huomenna|keskittyä|focus|today|tomorrow)\b/i] },
];

const codingGroups: PatternGroup[] = [
  { signal: 'code_context', weight: 3, patterns: [/\b(koodi|korjaa koodi|virhe|bug|error|build|deploy|typescript|react native|expo|supabase|github|deno|tsx|ts)\b/i, /\b(code|fix|implementation|component|function|import|runtime)\b/i] },
  { signal: 'file_or_command_context', weight: 2, patterns: [/src\/|supabase\/|\.tsx\b|\.ts\b|npm\s|npx\s|deno\s/i] },
];

const designGroups: PatternGroup[] = [
  { signal: 'design_request', weight: 3, patterns: [/\b(design|ui|ux|näkymä|kuva|väri|logo|icon|ikoni|premium|tyyli|layout)\b/i] },
  { signal: 'app_visual_direction', weight: 2, patterns: [/\b(suunnitellaan|tee kuva|muuta tätä kuvaa|miltä se näyttäisi)\b/i, /\b(mockup|screen|visual|interface)\b/i] },
];

const currentInfoGroups: PatternGroup[] = [
  { signal: 'current_external_info', weight: 3, patterns: [/\b(etsi|hae netistä|uusin|ajankohtaista|hinta|saatavilla|uutiset)\b/i, /\b(search|latest|current|price|available|news|today's)\b/i] },
];

const calendarGroups: PatternGroup[] = [
  { signal: 'calendar_context', weight: 3, patterns: [/\b(kalenteri|tapaaminen|palaveri|free slot|vapaa aika|calendar|meeting)\b/i] },
];

const emailGroups: PatternGroup[] = [
  { signal: 'email_context', weight: 3, patterns: [/\b(email|sähköposti|gmail|inbox|viestit|mail)\b/i] },
];

const financeGroups: PatternGroup[] = [
  { signal: 'finance_context', weight: 3, patterns: [/\b(raha|maksu|tilaus|lasku|kulut|säästö|finance|subscription|invoice|receipt)\b/i] },
];

const actionGroups: PatternGroup[] = [
  { signal: 'action_request', weight: 2, patterns: [/\b(tee|korjaa|lisää|muuta|vaihda|avaa|luo|päivitä|poista)\b/i, /\b(create|update|change|add|remove|open|send|edit)\b/i] },
];

const clarificationGroups: PatternGroup[] = [
  { signal: 'underspecified_short_request', weight: 2, patterns: [/^(tee|korjaa|muuta|jatka|tämä|that|fix it|do it)$/i] },
];

function collectSignals(text: string, groups: PatternGroup[]) {
  const signals: string[] = [];
  let score = 0;

  for (const group of groups) {
    if (group.patterns.some((pattern) => pattern.test(text))) {
      signals.push(group.signal);
      score += group.weight;
    }
  }

  return { score, signals };
}

function wordCount(message: string) {
  return message.trim().split(/\s+/).filter(Boolean).length;
}

function hasQuestionShape(message: string) {
  return /\?|\b(mikä|mitä|miksi|miten|kuinka|milloin|where|what|why|how|when|which)\b/i.test(message);
}

function isLikelyWriteAction(text: string) {
  return /\b(lähetä|send|delete|poista|osta|buy|pay|maksa|cancel|peru|publish|deploy)\b/i.test(text);
}

function buildStyleForIntent(name: KivoIntentName, message: string, overrides: Partial<KivoAnswerStyle> = {}): KivoAnswerStyle {
  const longOrComplex = wordCount(message) > 18 || /\b(vertaa|compare|suunnitelma|vaiheet|architecture|rakenne|implementation)\b/i.test(message);
  const technical = name === 'coding_help';
  const structured = ['planning', 'task_help', 'coding_help', 'app_design_help', 'finance_scan_needed'].includes(name);

  return {
    ...defaultAnswerStyle,
    useDividers: structured || longOrComplex,
    useCopyBlocks: technical || /`|src\/|npm\s|npx\s|json|sql|env|api key/i.test(message),
    useNumberedSteps: ['planning', 'task_help', 'coding_help'].includes(name),
    maxSections: technical ? 5 : structured ? 4 : longOrComplex ? 4 : 3,
    ...overrides,
  };
}

function makeCandidate(input: Omit<IntentCandidate, 'confidence'> & { confidence?: number }): IntentCandidate {
  return {
    confidence: clampConfidence(input.confidence ?? 0.58 + input.score * 0.08),
    ...input,
  };
}

function chooseBest(candidates: IntentCandidate[]) {
  return [...candidates].sort((a, b) => b.score - a.score || b.confidence - a.confidence)[0];
}

function candidateFromGroups(input: {
  name: KivoIntentName;
  message: string;
  groups: PatternGroup[];
  baseScore: number;
  reason: string;
  needsMemory?: boolean;
  needsTool?: boolean;
  riskLevel?: KivoRiskLevel;
  responseMode?: KivoResponseMode;
  answerStyle?: Partial<KivoAnswerStyle>;
}) {
  const matched = collectSignals(input.message, input.groups);
  if (matched.score <= 0) return null;

  return makeCandidate({
    name: input.name,
    score: input.baseScore + matched.score,
    reason: input.reason,
    signals: matched.signals,
    needsMemory: input.needsMemory,
    needsTool: input.needsTool,
    riskLevel: input.riskLevel,
    responseMode: input.responseMode,
    answerStyle: input.answerStyle,
  });
}

export function routeIntent(message: string, hasImage = false): KivoIntent {
  const text = message.trim();
  const lower = text.toLowerCase();
  const candidates: IntentCandidate[] = [];

  if (harmfulPatterns.some((pattern) => pattern.test(lower))) {
    return {
      name: 'unsafe_or_restricted',
      confidence: 0.96,
      reason: 'Request matched restricted or unsafe safety signals.',
      signals: ['safety_restricted'],
      needsMemory: false,
      needsTool: false,
      riskLevel: 'high',
      responseMode: 'safe_refusal',
      answerStyle: buildStyleForIntent('unsafe_or_restricted', text, { useDividers: false, useBullets: false, maxSections: 1 }),
    };
  }

  if (hasImage) {
    candidates.push(makeCandidate({
      name: 'image_analysis',
      score: 7,
      confidence: 0.94,
      reason: 'Image attachment was provided.',
      signals: ['image_attached'],
      needsMemory: false,
      needsTool: true,
      riskLevel: 'low',
      responseMode: 'structured',
      answerStyle: { useDividers: true },
    }));
  }

  const definitions: Array<Parameters<typeof candidateFromGroups>[0]> = [
    { name: 'memory_save_candidate', message: text, groups: memorySaveGroups, baseScore: 5, reason: 'User explicitly asks Kivo to remember something.', needsMemory: false, needsTool: true, riskLevel: 'medium', responseMode: 'structured', answerStyle: { useDividers: true } },
    { name: 'memory_query', message: text, groups: memoryQueryGroups, baseScore: 4, reason: 'User refers to memory, previous context, or personal project continuity.', needsMemory: true, needsTool: true, riskLevel: 'low', responseMode: 'structured', answerStyle: { useDividers: true } },
    { name: 'coding_help', message: text, groups: codingGroups, baseScore: 4, reason: 'User asks about code, implementation, build, or debugging.', needsMemory: true, needsTool: false, riskLevel: 'medium', responseMode: 'technical', answerStyle: { useCopyBlocks: true, useDividers: true, maxSections: 5 } },
    { name: 'app_design_help', message: text, groups: designGroups, baseScore: 4, reason: 'User asks for app design, UI/UX, visual direction, or premium product decisions.', needsMemory: true, needsTool: false, riskLevel: 'low', responseMode: 'design', answerStyle: { useDividers: true, maxSections: 4 } },
    { name: 'planning', message: text, groups: planningGroups, baseScore: 3, reason: 'User asks for planning, prioritization, or next-step guidance.', needsMemory: true, needsTool: false, riskLevel: 'low', responseMode: 'planner', answerStyle: { useDividers: true, useNumberedSteps: true } },
    { name: 'web_search_needed', message: text, groups: currentInfoGroups, baseScore: 5, reason: 'User appears to need current external information.', needsMemory: false, needsTool: true, riskLevel: 'medium', responseMode: 'structured', answerStyle: { useDividers: true } },
    { name: 'calendar_needed', message: text, groups: calendarGroups, baseScore: 5, reason: 'User asks about calendar context.', needsMemory: true, needsTool: true, riskLevel: 'medium', responseMode: 'planner', answerStyle: { useDividers: true } },
    { name: 'email_summary_needed', message: text, groups: emailGroups, baseScore: 5, reason: 'User asks about email or inbox context.', needsMemory: true, needsTool: true, riskLevel: 'medium', responseMode: 'structured', answerStyle: { useDividers: true } },
    { name: 'finance_scan_needed', message: text, groups: financeGroups, baseScore: 5, reason: 'User asks about money, subscriptions, invoices, or spending.', needsMemory: true, needsTool: true, riskLevel: 'high', responseMode: 'structured', answerStyle: { useDividers: true, maxSections: 4 } },
    { name: 'task_help', message: text, groups: actionGroups, baseScore: 2, reason: 'User asks Kivo to do, change, create, or continue something.', needsMemory: true, needsTool: isLikelyWriteAction(lower), riskLevel: isLikelyWriteAction(lower) ? 'high' : 'medium', responseMode: 'structured', answerStyle: { useDividers: true } },
    { name: 'clarification_needed', message: text, groups: clarificationGroups, baseScore: 4, reason: 'Request is too short or underspecified to execute well.', needsMemory: false, needsTool: false, riskLevel: 'low', responseMode: 'clarifying', answerStyle: { useDividers: false, useBullets: false, maxSections: 1 } },
  ];

  for (const definition of definitions) {
    const candidate = candidateFromGroups(definition);
    if (candidate) candidates.push(candidate);
  }

  if (!candidates.length) {
    const question = hasQuestionShape(text);
    const name: KivoIntentName = question ? 'normal_chat' : 'normal_chat';
    return {
      name,
      confidence: question ? 0.68 : 0.58,
      reason: question ? 'General question without a stronger specialized signal.' : 'Default conversational intent.',
      signals: question ? ['general_question'] : ['default'],
      needsMemory: wordCount(text) > 10,
      needsTool: false,
      riskLevel: 'low',
      responseMode: wordCount(text) > 18 ? 'structured' : 'direct',
      answerStyle: buildStyleForIntent(name, text),
    };
  }

  const best = chooseBest(candidates);
  return {
    name: best.name,
    confidence: best.confidence,
    reason: best.reason,
    signals: best.signals,
    needsMemory: best.needsMemory ?? false,
    needsTool: best.needsTool ?? false,
    riskLevel: best.riskLevel ?? 'low',
    responseMode: best.responseMode ?? 'structured',
    answerStyle: buildStyleForIntent(best.name, text, best.answerStyle ?? {}),
  };
}
