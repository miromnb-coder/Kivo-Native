import type {
  KivoAnswerStyle,
  KivoIntent,
  KivoIntentName,
  KivoResponseMode,
  KivoRiskLevel,
} from '../_shared/types.ts';
import { clampConfidence } from '../_shared/utils.ts';

type IntentCandidate = {
  name: KivoIntentName;
  score: number;
  priority: number;
  confidence: number;
  reason: string;
  signals: string[];
  needsMemory: boolean;
  needsTool: boolean;
  riskLevel: KivoRiskLevel;
  responseMode: KivoResponseMode;
  answerStyle?: Partial<KivoAnswerStyle>;
};

type PatternGroup = {
  signal: string;
  weight: number;
  patterns: RegExp[];
};

type CandidateDefinition = {
  name: KivoIntentName;
  baseScore: number;
  priority: number;
  reason: string;
  groups: PatternGroup[];
  needsMemory?: boolean | ((features: RouteFeatures) => boolean);
  needsTool?: boolean | ((features: RouteFeatures) => boolean);
  riskLevel?: KivoRiskLevel | ((features: RouteFeatures) => KivoRiskLevel);
  responseMode?: KivoResponseMode;
  answerStyle?: Partial<KivoAnswerStyle> | ((features: RouteFeatures) => Partial<KivoAnswerStyle>);
};

type RouteFeatures = {
  text: string;
  lower: string;
  wordCount: number;
  lineCount: number;
  charCount: number;
  hasImage: boolean;
  hasQuestionShape: boolean;
  hasCodeFence: boolean;
  hasFilePath: boolean;
  hasCommand: boolean;
  hasUrl: boolean;
  hasJsonLikeText: boolean;
  hasStackTrace: boolean;
  hasEnvLikeText: boolean;
  hasProjectReference: boolean;
  hasVagueShortRequest: boolean;
  hasWriteAction: boolean;
  hasExternalWriteAction: boolean;
  hasComparisonShape: boolean;
  hasPlanningShape: boolean;
  hasCurrentInfoShape: boolean;
  hasListOrStepsRequest: boolean;
  isLongOrComplex: boolean;
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

const restrictedSafetyPatterns: RegExp[] = [
  /\b(suicide|self[-\s]?harm)\b/i,
  /\b(itsemurha|itsensä\s+satuttaminen|vahingoittaa\s+itseäni)\b/i,
  /\b(bomb|explosive|illegal\s+weapon)\b/i,
  /\b(pommi|räjähde|laiton\s+ase|huume)\b/i,
];

const memorySaveGroups: PatternGroup[] = [
  {
    signal: 'explicit_memory_save',
    weight: 6,
    patterns: [
      /\b(muista tämä|tallenna muistiin|pidä mielessä|kirjaa muistiin)\b/i,
      /\b(remember this|save this|keep this in mind|store this in memory)\b/i,
    ],
  },
];

const memoryQueryGroups: PatternGroup[] = [
  {
    signal: 'explicit_memory_query',
    weight: 5,
    patterns: [
      /\b(muistatko|mitä sanoin|aiemmin|edellisessä keskustelussa|viimeksi puhuttiin)\b/i,
      /\b(do you remember|remember when|last time|previously|what did i say)\b/i,
    ],
  },
  {
    signal: 'personal_context_reference',
    weight: 2,
    patterns: [
      /\b(minun projekti|mun projekti|minun sovellus|mun sovellus|oma sovellus|repo)\b/i,
      /\b(my project|my app|my repo|my product|my codebase)\b/i,
    ],
  },
];

const codingGroups: PatternGroup[] = [
  {
    signal: 'code_keywords',
    weight: 4,
    patterns: [
      /\b(koodi|korjaa koodi|virhe|bugi|bug|error|build|deploy|typescript|javascript|react native|expo|supabase|github|deno|tsx|ts)\b/i,
      /\b(code|fix|implementation|component|function|import|runtime|refactor|compile|lint|stack trace)\b/i,
    ],
  },
  {
    signal: 'code_artifacts',
    weight: 5,
    patterns: [
      /```/,
      /\b(src|app|components|lib|supabase|functions|routes?)\//i,
      /\.(tsx|ts|jsx|js|json|sql|md|css)\b/i,
      /\b(npm|npx|pnpm|yarn|deno|git)\s+/i,
      /\bexport\s+(function|const|type|async)\b/i,
      /\bimport\s+.+\s+from\b/i,
    ],
  },
  {
    signal: 'technical_platform',
    weight: 2,
    patterns: [
      /\b(api|edge function|database|schema|migration|auth|oauth|env|environment variable|secret)\b/i,
      /\b(tietokanta|migraatio|autentikointi|ympäristömuuttuja|salaisuus)\b/i,
    ],
  },
];

const designGroups: PatternGroup[] = [
  {
    signal: 'design_keywords',
    weight: 4,
    patterns: [
      /\b(design|ui|ux|layout|interface|mockup|screen|visual|prototype|brand|logo|icon|premium)\b/i,
      /\b(näkymä|käyttöliittymä|ulkoasu|tyyli|väri|kuva|ikoni|brändi|prototyyppi)\b/i,
    ],
  },
  {
    signal: 'visual_direction_request',
    weight: 3,
    patterns: [
      /\b(suunnitellaan|tee kuva|muuta tätä kuvaa|miltä se näyttäisi|pidä samat värit)\b/i,
      /\b(make an image|edit this image|visualize|same style|same colors)\b/i,
    ],
  },
];

const planningGroups: PatternGroup[] = [
  {
    signal: 'planning_keywords',
    weight: 4,
    patterns: [
      /\b(suunnittele|suunnitelma|prioriteetti|aikataulu|vaiheet|seuraava askel|mitä seuraavaksi)\b/i,
      /\b(plan|roadmap|prioritize|next step|schedule|sequence|strategy)\b/i,
    ],
  },
  {
    signal: 'focus_or_day_planning',
    weight: 2,
    patterns: [
      /\b(tänään|huomenna|keskittyä|järjestys|ensin)\b/i,
      /\b(today|tomorrow|focus|first|order|priority)\b/i,
    ],
  },
];

const currentInfoGroups: PatternGroup[] = [
  {
    signal: 'current_info_keywords',
    weight: 5,
    patterns: [
      /\b(etsi|hae netistä|uusin|ajankohtaista|hinta|saatavilla|uutiset|tarkista netistä)\b/i,
      /\b(search|look up|latest|current|price|available|availability|news|today's|recent)\b/i,
    ],
  },
  {
    signal: 'external_lookup_shape',
    weight: 2,
    patterns: [
      /\b(2025|2026|now|right now|currently)\b/i,
      /\b(nyt|tällä hetkellä|uusimmat|viimeisimmät)\b/i,
    ],
  },
];

const calendarGroups: PatternGroup[] = [
  {
    signal: 'calendar_keywords',
    weight: 5,
    patterns: [
      /\b(kalenteri|tapaaminen|palaveri|vapaa aika|aikani|päivän aikataulu)\b/i,
      /\b(calendar|meeting|event|free slot|schedule for today|availability)\b/i,
    ],
  },
];

const emailGroups: PatternGroup[] = [
  {
    signal: 'email_keywords',
    weight: 5,
    patterns: [
      /\b(email|sähköposti|gmail|inbox|mailbox|unread|viestit)\b/i,
      /\b(sähköpostit|postilaatikko|lukemattomat|saapuneet)\b/i,
    ],
  },
];

const financeGroups: PatternGroup[] = [
  {
    signal: 'finance_keywords',
    weight: 5,
    patterns: [
      /\b(raha|maksu|tilaus|lasku|kuitti|kulut|säästö|budjetti)\b/i,
      /\b(finance|money|subscription|invoice|receipt|spending|budget|expense)\b/i,
    ],
  },
];

const appActionGroups: PatternGroup[] = [
  {
    signal: 'write_action_keywords',
    weight: 4,
    patterns: [
      /\b(lähetä|poista|julkaise|maksa|osta|peru|siirrä|tallenna tämä)\b/i,
      /\b(send|delete|publish|pay|buy|cancel|move|save this)\b/i,
    ],
  },
  {
    signal: 'app_action_keywords',
    weight: 3,
    patterns: [
      /\b(luo muistutus|lisää tehtävä|avaa näkymä|merkitse valmiiksi)\b/i,
      /\b(create reminder|add task|open view|mark as done)\b/i,
    ],
  },
];

const taskHelpGroups: PatternGroup[] = [
  {
    signal: 'task_action_keywords',
    weight: 3,
    patterns: [
      /\b(tee|korjaa|lisää|muuta|vaihda|avaa|luo|päivitä|jatka)\b/i,
      /\b(create|update|change|add|remove|open|edit|continue|improve)\b/i,
    ],
  },
];

const clarificationGroups: PatternGroup[] = [
  {
    signal: 'underspecified_short_request',
    weight: 6,
    patterns: [
      /^(tee|korjaa|muuta|jatka|tämä|tuo|näin|uudestaan)$/i,
      /^(that|this|fix it|do it|again|continue)$/i,
    ],
  },
];

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function wordCount(message: string) {
  return message.trim().split(/\s+/).filter(Boolean).length;
}

function lineCount(message: string) {
  return message.split('\n').filter((line) => line.trim().length > 0).length;
}

function hasQuestionShape(message: string) {
  return /\?|\b(mikä|mitä|miksi|miten|kuinka|milloin|missä|kumpi|voiko|voinko|onko)\b/i.test(message) ||
    /\b(where|what|why|how|when|which|can|could|should|is|are|do|does)\b/i.test(message);
}

function hasCodeFence(message: string) {
  return /```/.test(message);
}

function hasFilePath(message: string) {
  return /\b(src|app|components|lib|supabase|functions|routes?|screens|hooks)\//i.test(message) ||
    /\.(tsx|ts|jsx|js|json|sql|md|css)\b/i.test(message);
}

function hasCommand(message: string) {
  return /\b(npm|npx|pnpm|yarn|deno|git|supabase|expo)\s+[a-z0-9:_./-]+/i.test(message);
}

function hasUrl(message: string) {
  return /https?:\/\/\S+/i.test(message);
}

function hasJsonLikeText(message: string) {
  return /^\s*[{[]/.test(message.trim()) || /"\w+"\s*:/.test(message);
}

function hasStackTrace(message: string) {
  return /\b(error|exception|stack trace|cannot read|undefined is not|failed to|attempted import)\b/i.test(message) ||
    /\b(virhe|kaatuu|ei toimi|epäonnistui)\b/i.test(message);
}

function hasEnvLikeText(message: string) {
  return /\b[A-Z][A-Z0-9_]{5,}\b/.test(message) ||
    /\b(api[_-]?key|secret|token|env|environment variable)\b/i.test(message);
}

function hasProjectReference(message: string) {
  return /\b(kivo|repo|github|minun sovellus|mun sovellus|oma sovellus|projekti)\b/i.test(message) ||
    /\b(my app|my project|my repo|my codebase|my product)\b/i.test(message);
}

function hasVagueShortRequest(message: string) {
  const clean = message.trim();
  return wordCount(clean) <= 3 && /^(tee|korjaa|muuta|jatka|tämä|tuo|uudestaan|fix|do|change|continue|again|this|that)$/i.test(clean);
}

function hasWriteAction(message: string) {
  return /\b(lähetä|poista|julkaise|maksa|osta|peru|delete|send|publish|pay|buy|cancel|remove)\b/i.test(message);
}

function hasExternalWriteAction(message: string) {
  return /\b(lähetä sähköposti|send email|publish|deploy|pay|buy|delete account|poista tili|maksa|osta)\b/i.test(message);
}

function hasComparisonShape(message: string) {
  return /\b(vertaa|kumpi|parempi|ero|vs\.?|compare|which is better|difference|versus)\b/i.test(message);
}

function hasPlanningShape(message: string) {
  return /\b(vaiheet|järjestys|ensin|seuraavaksi|roadmap|step by step|next|priority|prioriteetti)\b/i.test(message);
}

function hasCurrentInfoShape(message: string) {
  return /\b(uusin|uusimmat|nyt|tällä hetkellä|hinta|saatavilla|latest|current|now|price|available|news)\b/i.test(message);
}

function hasListOrStepsRequest(message: string) {
  return /\b(listaa|tee lista|vaiheittain|step by step|bullet|checklist|numbered|steps)\b/i.test(message);
}

function buildFeatures(message: string, hasImage: boolean): RouteFeatures {
  const text = message.trim();
  const words = wordCount(text);
  const lines = lineCount(text);

  return {
    text,
    lower: text.toLowerCase(),
    wordCount: words,
    lineCount: lines,
    charCount: text.length,
    hasImage,
    hasQuestionShape: hasQuestionShape(text),
    hasCodeFence: hasCodeFence(text),
    hasFilePath: hasFilePath(text),
    hasCommand: hasCommand(text),
    hasUrl: hasUrl(text),
    hasJsonLikeText: hasJsonLikeText(text),
    hasStackTrace: hasStackTrace(text),
    hasEnvLikeText: hasEnvLikeText(text),
    hasProjectReference: hasProjectReference(text),
    hasVagueShortRequest: hasVagueShortRequest(text),
    hasWriteAction: hasWriteAction(text),
    hasExternalWriteAction: hasExternalWriteAction(text),
    hasComparisonShape: hasComparisonShape(text),
    hasPlanningShape: hasPlanningShape(text),
    hasCurrentInfoShape: hasCurrentInfoShape(text),
    hasListOrStepsRequest: hasListOrStepsRequest(text),
    isLongOrComplex: words > 22 || lines >= 4 || hasComparisonShape(text) || hasPlanningShape(text),
  };
}

function collectSignals(text: string, groups: PatternGroup[]) {
  const signals: string[] = [];
  let score = 0;

  for (const group of groups) {
    if (group.patterns.some((pattern) => pattern.test(text))) {
      signals.push(group.signal);
      score += group.weight;
    }
  }

  return {
    score,
    signals,
  };
}

function resolveBoolean(value: boolean | ((features: RouteFeatures) => boolean) | undefined, features: RouteFeatures, fallback = false) {
  if (typeof value === 'function') return value(features);
  return value ?? fallback;
}

function resolveRisk(value: KivoRiskLevel | ((features: RouteFeatures) => KivoRiskLevel) | undefined, features: RouteFeatures, fallback: KivoRiskLevel) {
  if (typeof value === 'function') return value(features);
  return value ?? fallback;
}

function resolveAnswerStyle(value: Partial<KivoAnswerStyle> | ((features: RouteFeatures) => Partial<KivoAnswerStyle>) | undefined, features: RouteFeatures) {
  if (typeof value === 'function') return value(features);
  return value ?? {};
}

function isStructuredIntent(name: KivoIntentName) {
  return [
    'planning',
    'task_help',
    'coding_help',
    'app_design_help',
    'web_search_needed',
    'calendar_needed',
    'email_summary_needed',
    'finance_scan_needed',
    'memory_query',
    'memory_save_candidate',
    'image_analysis',
  ].includes(name);
}

function buildStyleForIntent(
  name: KivoIntentName,
  features: RouteFeatures,
  overrides: Partial<KivoAnswerStyle> = {},
): KivoAnswerStyle {
  const technical =
    name === 'coding_help' ||
    features.hasCodeFence ||
    features.hasFilePath ||
    features.hasCommand ||
    features.hasJsonLikeText ||
    features.hasEnvLikeText;

  const structured = isStructuredIntent(name) || features.isLongOrComplex;

  return {
    ...defaultAnswerStyle,
    useDividers: structured,
    useCopyBlocks: technical,
    useBullets: true,
    useNumberedSteps:
      ['planning', 'task_help', 'coding_help'].includes(name) ||
      features.hasPlanningShape ||
      features.hasListOrStepsRequest,
    compact: true,
    avoidTables: true,
    maxSections: technical ? 5 : structured ? 4 : 3,
    languageMode: 'match_user',
    ...overrides,
  };
}

function baseConfidence(score: number, features: RouteFeatures) {
  const complexityBoost = features.isLongOrComplex ? 0.03 : 0;
  const structuralBoost =
    features.hasCodeFence ||
    features.hasFilePath ||
    features.hasCommand ||
    features.hasImage ||
    features.hasUrl
      ? 0.04
      : 0;

  return clampConfidence(0.48 + score * 0.075 + complexityBoost + structuralBoost);
}

function makeCandidate(
  input: Omit<IntentCandidate, 'confidence'> & { confidence?: number },
  features: RouteFeatures,
): IntentCandidate {
  return {
    ...input,
    signals: unique(input.signals),
    confidence: clampConfidence(input.confidence ?? baseConfidence(input.score, features)),
  };
}

function candidateFromGroups(definition: CandidateDefinition, features: RouteFeatures) {
  const matched = collectSignals(features.text, definition.groups);
  if (matched.score <= 0) return null;

  const needsMemory = resolveBoolean(definition.needsMemory, features, false);
  const needsTool = resolveBoolean(definition.needsTool, features, false);
  const riskLevel = resolveRisk(definition.riskLevel, features, 'low');
  const answerStyle = resolveAnswerStyle(definition.answerStyle, features);

  return makeCandidate(
    {
      name: definition.name,
      score: definition.baseScore + matched.score,
      priority: definition.priority,
      reason: definition.reason,
      signals: matched.signals,
      needsMemory,
      needsTool,
      riskLevel,
      responseMode: definition.responseMode ?? 'structured',
      answerStyle,
    },
    features,
  );
}

function addStructuralCandidates(candidates: IntentCandidate[], features: RouteFeatures) {
  if (features.hasImage) {
    candidates.push(makeCandidate(
      {
        name: 'image_analysis',
        score: 9,
        priority: 90,
        confidence: 0.94,
        reason: 'Image attachment was provided.',
        signals: ['image_attached'],
        needsMemory: false,
        needsTool: true,
        riskLevel: 'low',
        responseMode: 'structured',
        answerStyle: { useDividers: true },
      },
      features,
    ));
  }

  if (features.hasCodeFence || features.hasFilePath || features.hasCommand || features.hasStackTrace) {
    candidates.push(makeCandidate(
      {
        name: 'coding_help',
        score: 9,
        priority: 82,
        reason: 'Request contains code artifacts, file paths, commands, or error output.',
        signals: [
          features.hasCodeFence ? 'code_fence' : '',
          features.hasFilePath ? 'file_path' : '',
          features.hasCommand ? 'command' : '',
          features.hasStackTrace ? 'stack_trace' : '',
        ],
        needsMemory: features.hasProjectReference,
        needsTool: false,
        riskLevel: features.hasExternalWriteAction ? 'high' : 'medium',
        responseMode: 'technical',
        answerStyle: { useCopyBlocks: true, useDividers: true, maxSections: 5 },
      },
      features,
    ));
  }

  if (features.hasVagueShortRequest) {
    candidates.push(makeCandidate(
      {
        name: 'clarification_needed',
        score: 8,
        priority: 85,
        reason: 'Request is very short and underspecified.',
        signals: ['vague_short_request'],
        needsMemory: false,
        needsTool: false,
        riskLevel: 'low',
        responseMode: 'clarifying',
        answerStyle: { useDividers: false, useBullets: false, maxSections: 1 },
      },
      features,
    ));
  }

  if (features.hasUrl && features.hasCurrentInfoShape) {
    candidates.push(makeCandidate(
      {
        name: 'web_search_needed',
        score: 8,
        priority: 78,
        reason: 'Request contains a URL and appears to need current or external information.',
        signals: ['url', 'current_info_shape'],
        needsMemory: false,
        needsTool: true,
        riskLevel: 'medium',
        responseMode: 'structured',
        answerStyle: { useDividers: true },
      },
      features,
    ));
  }
}

function chooseBest(candidates: IntentCandidate[]) {
  return [...candidates].sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;

    const priorityDiff = b.priority - a.priority;
    if (priorityDiff !== 0) return priorityDiff;

    return b.confidence - a.confidence;
  })[0];
}

function makeFallbackIntent(features: RouteFeatures): KivoIntent {
  const responseMode: KivoResponseMode = features.isLongOrComplex ? 'structured' : 'direct';

  return {
    name: 'normal_chat',
    confidence: features.hasQuestionShape ? 0.68 : 0.58,
    reason: features.hasQuestionShape
      ? 'General question without a stronger specialized signal.'
      : 'Default conversational intent.',
    signals: features.hasQuestionShape ? ['general_question'] : ['default'],
    needsMemory: features.hasProjectReference || features.wordCount > 16,
    needsTool: false,
    riskLevel: 'low',
    responseMode,
    answerStyle: buildStyleForIntent('normal_chat', features, {
      useDividers: responseMode === 'structured',
      useNumberedSteps: features.hasListOrStepsRequest,
    }),
  };
}

function makeSafetyIntent(features: RouteFeatures): KivoIntent {
  return {
    name: 'unsafe_or_restricted',
    confidence: 0.96,
    reason: 'Request matched restricted or unsafe safety signals.',
    signals: ['safety_restricted'],
    needsMemory: false,
    needsTool: false,
    riskLevel: 'high',
    responseMode: 'safe_refusal',
    answerStyle: buildStyleForIntent('unsafe_or_restricted', features, {
      useDividers: false,
      useBullets: false,
      useNumberedSteps: false,
      maxSections: 1,
    }),
  };
}

function finalizeCandidate(candidate: IntentCandidate, features: RouteFeatures): KivoIntent {
  return {
    name: candidate.name,
    confidence: candidate.confidence,
    reason: candidate.reason,
    signals: unique(candidate.signals),
    needsMemory: candidate.needsMemory,
    needsTool: candidate.needsTool,
    riskLevel: candidate.riskLevel,
    responseMode: candidate.responseMode,
    answerStyle: buildStyleForIntent(candidate.name, features, candidate.answerStyle ?? {}),
  };
}

export function routeIntent(message: string, hasImage = false): KivoIntent {
  const features = buildFeatures(message, hasImage);

  if (!features.text && !features.hasImage) {
    return {
      name: 'clarification_needed',
      confidence: 0.9,
      reason: 'Request is empty.',
      signals: ['empty_request'],
      needsMemory: false,
      needsTool: false,
      riskLevel: 'low',
      responseMode: 'clarifying',
      answerStyle: buildStyleForIntent('clarification_needed', features, {
        useDividers: false,
        useBullets: false,
        maxSections: 1,
      }),
    };
  }

  if (restrictedSafetyPatterns.some((pattern) => pattern.test(features.lower))) {
    return makeSafetyIntent(features);
  }

  const candidates: IntentCandidate[] = [];

  addStructuralCandidates(candidates, features);

  const definitions: CandidateDefinition[] = [
    {
      name: 'memory_save_candidate',
      baseScore: 6,
      priority: 100,
      reason: 'User explicitly asks Kivo to remember or save something.',
      groups: memorySaveGroups,
      needsMemory: false,
      needsTool: true,
      riskLevel: 'medium',
      responseMode: 'structured',
      answerStyle: { useDividers: true },
    },
    {
      name: 'memory_query',
      baseScore: 5,
      priority: 88,
      reason: 'User refers to memory, previous context, or personal project continuity.',
      groups: memoryQueryGroups,
      needsMemory: true,
      needsTool: true,
      riskLevel: 'low',
      responseMode: 'structured',
      answerStyle: { useDividers: true },
    },
    {
      name: 'coding_help',
      baseScore: 5,
      priority: 82,
      reason: 'User asks about code, implementation, build, or debugging.',
      groups: codingGroups,
      needsMemory: (f) => f.hasProjectReference,
      needsTool: false,
      riskLevel: (f) => f.hasExternalWriteAction ? 'high' : 'medium',
      responseMode: 'technical',
      answerStyle: { useCopyBlocks: true, useDividers: true, maxSections: 5 },
    },
    {
      name: 'web_search_needed',
      baseScore: 5,
      priority: 79,
      reason: 'User appears to need current external information.',
      groups: currentInfoGroups,
      needsMemory: false,
      needsTool: true,
      riskLevel: 'medium',
      responseMode: 'structured',
      answerStyle: { useDividers: true },
    },
    {
      name: 'calendar_needed',
      baseScore: 5,
      priority: 76,
      reason: 'User asks about calendar or schedule context.',
      groups: calendarGroups,
      needsMemory: true,
      needsTool: true,
      riskLevel: 'medium',
      responseMode: 'planner',
      answerStyle: { useDividers: true, useNumberedSteps: true },
    },
    {
      name: 'email_summary_needed',
      baseScore: 5,
      priority: 75,
      reason: 'User asks about email or inbox context.',
      groups: emailGroups,
      needsMemory: true,
      needsTool: true,
      riskLevel: 'medium',
      responseMode: 'structured',
      answerStyle: { useDividers: true },
    },
    {
      name: 'finance_scan_needed',
      baseScore: 5,
      priority: 74,
      reason: 'User asks about money, subscriptions, invoices, or spending.',
      groups: financeGroups,
      needsMemory: true,
      needsTool: true,
      riskLevel: 'high',
      responseMode: 'structured',
      answerStyle: { useDividers: true, maxSections: 4 },
    },
    {
      name: 'app_design_help',
      baseScore: 5,
      priority: 72,
      reason: 'User asks for app design, UI/UX, visual direction, or premium product decisions.',
      groups: designGroups,
      needsMemory: (f) => f.hasProjectReference,
      needsTool: false,
      riskLevel: 'low',
      responseMode: 'design',
      answerStyle: { useDividers: true, maxSections: 4 },
    },
    {
      name: 'planning',
      baseScore: 4,
      priority: 68,
      reason: 'User asks for planning, prioritization, or next-step guidance.',
      groups: planningGroups,
      needsMemory: (f) => f.hasProjectReference || f.wordCount > 10,
      needsTool: false,
      riskLevel: 'low',
      responseMode: 'planner',
      answerStyle: { useDividers: true, useNumberedSteps: true },
    },
    {
      name: 'app_action_needed',
      baseScore: 5,
      priority: 62,
      reason: 'User appears to request an app or external write action.',
      groups: appActionGroups,
      needsMemory: true,
      needsTool: true,
      riskLevel: (f) => f.hasWriteAction ? 'high' : 'medium',
      responseMode: 'structured',
      answerStyle: { useDividers: true },
    },
    {
      name: 'task_help',
      baseScore: 3,
      priority: 48,
      reason: 'User asks Kivo to do, change, create, continue, or improve something.',
      groups: taskHelpGroups,
      needsMemory: (f) => f.hasProjectReference,
      needsTool: false,
      riskLevel: (f) => f.hasExternalWriteAction ? 'high' : 'medium',
      responseMode: 'structured',
      answerStyle: { useDividers: true },
    },
    {
      name: 'clarification_needed',
      baseScore: 5,
      priority: 86,
      reason: 'Request is too short or underspecified to execute well.',
      groups: clarificationGroups,
      needsMemory: false,
      needsTool: false,
      riskLevel: 'low',
      responseMode: 'clarifying',
      answerStyle: { useDividers: false, useBullets: false, maxSections: 1 },
    },
  ];

  for (const definition of definitions) {
    const candidate = candidateFromGroups(definition, features);
    if (candidate) candidates.push(candidate);
  }

  if (!candidates.length) {
    return makeFallbackIntent(features);
  }

  const best = chooseBest(candidates);
  return finalizeCandidate(best, features);
}
