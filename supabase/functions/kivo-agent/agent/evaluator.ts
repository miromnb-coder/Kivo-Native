import type { KivoAgentResponse, KivoToolStatus } from '../_shared/types.ts';

type EvaluationIssue = {
  code: string;
  message: string;
  severity: 'error' | 'warning';
};

type ToolClaimRule = {
  code: string;
  toolName: string;
  claimPatterns: RegExp[];
  allowedIfAnyToolSuccess?: string[];
  message: string;
};

const MAX_MOBILE_ANSWER_CHARS = 6000;
const MAX_SUGGESTED_ACTIONS = 6;

function normalize(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}

function addIssue(issues: EvaluationIssue[], issue: EvaluationIssue) {
  if (issues.some((item) => item.code === issue.code && item.message === issue.message)) return;
  issues.push(issue);
}

function hasSuccessfulTool(response: KivoAgentResponse, toolName: string) {
  return response.usedTools.some((tool) => tool.toolName === toolName && tool.status === 'success') ||
    response.toolRuns.some((run) => run.toolName === toolName && run.status === 'success');
}

function hasToolWithStatus(response: KivoAgentResponse, toolName: string, status: KivoToolStatus) {
  return response.usedTools.some((tool) => tool.toolName === toolName && tool.status === status) ||
    response.toolRuns.some((run) => run.toolName === toolName && run.status === status);
}

function hasAnySuccessfulTool(response: KivoAgentResponse, toolNames: string[]) {
  return toolNames.some((toolName) => hasSuccessfulTool(response, toolName));
}

function matchesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function isMarkdownTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isMarkdownTableRow(line: string) {
  if (!line.includes('|')) return false;
  if (/https?:\/\//i.test(line) && !/^\s*\|/.test(line)) return false;

  return line
    .split('|')
    .filter((cell) => cell.trim().length > 0)
    .length >= 2;
}

function containsMarkdownTable(answer: string) {
  const lines = answer.split('\n').map((line) => line.trim());

  for (let index = 0; index < lines.length - 1; index += 1) {
    const current = lines[index];
    const next = lines[index + 1];

    if (isMarkdownTableRow(current) && isMarkdownTableDivider(next)) {
      return true;
    }
  }

  return false;
}

function hasSuspiciousRawTableText(answer: string) {
  const tableLikeLines = answer
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => isMarkdownTableRow(line));

  return tableLikeLines.length >= 3;
}

function containsHiddenReasoningLanguage(answer: string) {
  return matchesAny(answer, [
    /\bchain[-\s]?of[-\s]?thought\b/i,
    /\bhidden reasoning\b/i,
    /\binternal reasoning\b/i,
    /\byksityinen päättely\b/i,
    /\bsisäinen päättely\b/i,
    /\bajatusketju\b/i,
  ]);
}

function hasRawJsonLeak(answer: string) {
  const clean = answer.trim();

  if (!clean.startsWith('{') && !clean.startsWith('[')) return false;
  if (!clean.endsWith('}') && !clean.endsWith(']')) return false;

  return /"answer"\s*:|"intent"\s*:|"traceId"\s*:|"toolRuns"\s*:/.test(clean);
}

function hasMalformedFence(answer: string) {
  const fenceCount = (answer.match(/```/g) ?? []).length;
  return fenceCount % 2 !== 0;
}

function hasExcessiveDividers(answer: string) {
  const dividers = answer
    .split('\n')
    .filter((line) => /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim()));

  return dividers.length > 6;
}

function hasDividerAfterAlmostEveryParagraph(answer: string) {
  const chunks = answer
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (chunks.length < 5) return false;

  const dividerChunks = chunks.filter((chunk) => /^(-{3,}|\*{3,}|_{3,})$/.test(chunk));
  return dividerChunks.length >= Math.ceil(chunks.length / 2);
}

function hasDuplicateSuggestedActions(response: KivoAgentResponse) {
  const seen = new Set<string>();

  for (const action of response.suggestedActions) {
    const key = action.id || `${action.actionType}:${action.label}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }

  return false;
}

function hasInvalidUsage(response: KivoAgentResponse) {
  return [
    response.usage.creditsSpent,
    response.usage.tokensIn,
    response.usage.tokensOut,
    response.usage.toolCredits,
  ].some((value) => typeof value !== 'number' || Number.isNaN(value) || value < 0);
}

function hasToolClaimWithoutSuccess(response: KivoAgentResponse, rule: ToolClaimRule) {
  const answer = normalize(response.answer);

  if (!matchesAny(answer, rule.claimPatterns)) return false;

  const allowedTools = rule.allowedIfAnyToolSuccess ?? [rule.toolName];
  return !hasAnySuccessfulTool(response, allowedTools);
}

const toolClaimRules: ToolClaimRule[] = [
  {
    code: 'web_search_claim_without_tool',
    toolName: 'web_search',
    claimPatterns: [
      /\b(i searched|i looked this up|web search|searched the web|found online)\b/i,
      /\b(latest sources|current sources|according to sources)\b/i,
      /\b(ha(i|e)n netistä|etsin netistä|verkkohaku|hain verkosta|löysin netistä)\b/i,
      /\b(lähteiden mukaan|ajankohtaisten lähteiden mukaan)\b/i,
    ],
    message: 'Answer appears to claim web search without a successful web_search tool run.',
  },
  {
    code: 'calendar_claim_without_tool',
    toolName: 'calendar_read',
    claimPatterns: [
      /\b(i checked your calendar|your calendar shows|you have a meeting|your schedule says)\b/i,
      /\b(tarkistin kalenterisi|kalenterissasi on|sinulla on tapaaminen|aikataulusi mukaan)\b/i,
    ],
    message: 'Answer appears to claim calendar access without a successful calendar tool run.',
  },
  {
    code: 'email_claim_without_tool',
    toolName: 'email_summary',
    claimPatterns: [
      /\b(i checked your email|i read your emails|your inbox|your email says|you received)\b/i,
      /\b(tarkistin sähköpostisi|luin sähköpostisi|inboxissasi|sähköpostissasi|sait viestin)\b/i,
    ],
    message: 'Answer appears to claim email access without a successful email tool run.',
  },
  {
    code: 'finance_claim_without_tool',
    toolName: 'finance_scan',
    claimPatterns: [
      /\b(i scanned your spending|your transactions show|your bank data|your subscriptions cost)\b/i,
      /\b(tarkistin kulusi|tapahtumasi näyttävät|pankkitietosi|tilauksesi maksavat)\b/i,
    ],
    message: 'Answer appears to claim finance scanning without a successful finance tool run.',
  },
  {
    code: 'image_claim_without_tool',
    toolName: 'image_analysis',
    claimPatterns: [
      /\b(in the image|i can see in the image|the picture shows|the screenshot shows)\b/i,
      /\b(kuvassa näkyy|näen kuvassa|kuva näyttää|screenshotissa näkyy)\b/i,
    ],
    message: 'Answer appears to claim image analysis without a successful image_analysis tool run.',
  },
  {
    code: 'memory_save_claim_without_tool',
    toolName: 'memory_save',
    claimPatterns: [
      /\b(i saved this to memory|i will remember this|saved to memory)\b/i,
      /\b(tallensin tämän muistiin|muistan tämän jatkossa|tallennettu muistiin)\b/i,
    ],
    message: 'Answer appears to claim memory save without a successful memory_save tool run.',
  },
];

function evaluateRequiredFields(response: KivoAgentResponse, issues: EvaluationIssue[]) {
  if (!normalize(response.answer)) {
    addIssue(issues, {
      code: 'empty_answer',
      message: 'Answer is empty.',
      severity: 'error',
    });
  }

  if (!response.traceId) {
    addIssue(issues, {
      code: 'missing_trace_id',
      message: 'traceId is missing.',
      severity: 'error',
    });
  }

  if (!response.intent?.name) {
    addIssue(issues, {
      code: 'missing_intent_name',
      message: 'intent.name is missing.',
      severity: 'error',
    });
  }

  if (typeof response.intent?.confidence !== 'number' || Number.isNaN(response.intent.confidence)) {
    addIssue(issues, {
      code: 'invalid_intent_confidence',
      message: 'intent.confidence must be a number.',
      severity: 'warning',
    });
  }

  if (response.intent?.confidence < 0 || response.intent?.confidence > 1) {
    addIssue(issues, {
      code: 'intent_confidence_out_of_range',
      message: 'intent.confidence should be between 0 and 1.',
      severity: 'warning',
    });
  }

  if (!response.model) {
    addIssue(issues, {
      code: 'missing_model',
      message: 'model is missing.',
      severity: 'warning',
    });
  }
}

function evaluateFormatting(response: KivoAgentResponse, issues: EvaluationIssue[]) {
  const answer = normalize(response.answer);

  if (containsMarkdownTable(answer) || hasSuspiciousRawTableText(answer)) {
    addIssue(issues, {
      code: 'markdown_table_detected',
      message: 'Answer contains markdown table formatting. Use mobile-friendly sections instead.',
      severity: 'error',
    });
  }

  if (hasRawJsonLeak(answer)) {
    addIssue(issues, {
      code: 'raw_json_response_detected',
      message: 'Answer appears to expose raw JSON instead of a user-facing answer.',
      severity: 'error',
    });
  }

  if (hasMalformedFence(answer)) {
    addIssue(issues, {
      code: 'malformed_code_fence',
      message: 'Answer contains an unclosed fenced code block.',
      severity: 'warning',
    });
  }

  if (hasExcessiveDividers(answer) || hasDividerAfterAlmostEveryParagraph(answer)) {
    addIssue(issues, {
      code: 'divider_overuse',
      message: 'Answer appears to overuse section dividers.',
      severity: 'warning',
    });
  }

  if (answer.length > MAX_MOBILE_ANSWER_CHARS) {
    addIssue(issues, {
      code: 'answer_too_long_for_mobile',
      message: 'Answer is very long for a mobile chat response.',
      severity: 'warning',
    });
  }

  if (containsHiddenReasoningLanguage(answer)) {
    addIssue(issues, {
      code: 'hidden_reasoning_reference',
      message: 'Answer refers to hidden/internal reasoning. Keep reasoning summarized.',
      severity: 'warning',
    });
  }
}

function evaluateToolHonesty(response: KivoAgentResponse, issues: EvaluationIssue[]) {
  for (const rule of toolClaimRules) {
    if (hasToolClaimWithoutSuccess(response, rule)) {
      addIssue(issues, {
        code: rule.code,
        message: rule.message,
        severity: 'error',
      });
    }
  }

  const requestedDisconnectedWebSearch =
    response.intent.name === 'web_search_needed' &&
    hasToolWithStatus(response, 'web_search', 'not_connected');

  if (requestedDisconnectedWebSearch && matchesAny(response.answer, [
    /\b(i found|i searched|according to current|latest results)\b/i,
    /\b(löysin|hain|ajankohtaisten tulosten mukaan|uusimpien tietojen mukaan)\b/i,
  ])) {
    addIssue(issues, {
      code: 'disconnected_web_search_overclaim',
      message: 'Web search was not connected, but answer appears to present current lookup results.',
      severity: 'error',
    });
  }

  const usedMemory = response.usedMemory.length > 0 || hasSuccessfulTool(response, 'memory_search');

  if (!usedMemory && matchesAny(response.answer, [
    /\b(i remember|based on your memory|from your saved context)\b/i,
    /\b(muistan|muistisi perusteella|tallennetun muistisi perusteella)\b/i,
  ])) {
    addIssue(issues, {
      code: 'memory_claim_without_memory',
      message: 'Answer appears to claim memory use without retrieved memory.',
      severity: 'warning',
    });
  }
}

function evaluateContract(response: KivoAgentResponse, issues: EvaluationIssue[]) {
  if (!Array.isArray(response.usedTools)) {
    addIssue(issues, {
      code: 'used_tools_not_array',
      message: 'usedTools must be an array.',
      severity: 'error',
    });
  }

  if (!Array.isArray(response.toolRuns)) {
    addIssue(issues, {
      code: 'tool_runs_not_array',
      message: 'toolRuns must be an array.',
      severity: 'error',
    });
  }

  if (!Array.isArray(response.events)) {
    addIssue(issues, {
      code: 'events_not_array',
      message: 'events must be an array.',
      severity: 'error',
    });
  }

  if (!Array.isArray(response.suggestedActions)) {
    addIssue(issues, {
      code: 'suggested_actions_not_array',
      message: 'suggestedActions must be an array.',
      severity: 'error',
    });
  }

  if (response.suggestedActions.length > MAX_SUGGESTED_ACTIONS) {
    addIssue(issues, {
      code: 'too_many_suggested_actions',
      message: 'Too many suggested actions for a compact mobile response.',
      severity: 'warning',
    });
  }

  if (hasDuplicateSuggestedActions(response)) {
    addIssue(issues, {
      code: 'duplicate_suggested_actions',
      message: 'Suggested actions contain duplicates.',
      severity: 'warning',
    });
  }

  if (hasInvalidUsage(response)) {
    addIssue(issues, {
      code: 'invalid_usage_values',
      message: 'Usage values must be non-negative numbers.',
      severity: 'warning',
    });
  }

  const toolRunKeys = new Set(response.toolRuns.map((run) => `${run.toolRunId}:${run.toolName}`));

  for (const tool of response.usedTools) {
    const key = `${tool.toolRunId}:${tool.toolName}`;

    if (!toolRunKeys.has(key)) {
      addIssue(issues, {
        code: 'used_tool_missing_tool_run',
        message: `usedTools references ${tool.toolName}, but matching toolRun is missing.`,
        severity: 'warning',
      });
    }
  }
}

function evaluateConnectedServiceLimitations(response: KivoAgentResponse, issues: EvaluationIssue[]) {
  const notConnectedTools = response.toolRuns
    .filter((run) => run.status === 'not_connected')
    .map((run) => run.toolName);

  if (!notConnectedTools.length) return;

  const answer = normalize(response.answer);

  for (const toolName of notConnectedTools) {
    if (toolName === 'web_search' && !matchesAny(answer, [
      /\bnot connected\b/i,
      /\bei ole vielä yhdistetty\b/i,
      /\ben väitä\b/i,
      /\bdo not have live web search\b/i,
    ])) {
      addIssue(issues, {
        code: 'missing_not_connected_disclosure_web_search',
        message: 'web_search is not connected, but the answer does not clearly disclose the limitation.',
        severity: 'warning',
      });
    }

    if (toolName === 'image_analysis' && !matchesAny(answer, [
      /\bnot connected\b/i,
      /\bei ole vielä yhdistetty\b/i,
      /\ben voi analysoida kuvaa\b/i,
      /\bimage analysis is not connected\b/i,
    ])) {
      addIssue(issues, {
        code: 'missing_not_connected_disclosure_image',
        message: 'image_analysis is not connected, but the answer does not clearly disclose the limitation.',
        severity: 'warning',
      });
    }
  }
}

export function evaluateResponse(response: KivoAgentResponse) {
  const detailedIssues: EvaluationIssue[] = [];

  evaluateRequiredFields(response, detailedIssues);
  evaluateFormatting(response, detailedIssues);
  evaluateToolHonesty(response, detailedIssues);
  evaluateContract(response, detailedIssues);
  evaluateConnectedServiceLimitations(response, detailedIssues);

  const errors = detailedIssues.filter((issue) => issue.severity === 'error');
  const warnings = detailedIssues.filter((issue) => issue.severity === 'warning');

  return {
    ok: errors.length === 0,
    issues: detailedIssues.map((issue) => `${issue.code}: ${issue.message}`),
    errors: errors.map((issue) => issue.message),
    warnings: warnings.map((issue) => issue.message),
    details: detailedIssues,
  };
}
