/**
 * TaskComplexityScorer — Deterministic Task-to-Model Scoring
 * @version 1.0.0
 * @module src/core/gateway/TaskComplexityScorer
 *
 * Scores incoming task descriptions to determine optimal LLM routing.
 * Uses keyword-weighted analysis with domain classification.
 * No ML — purely deterministic for reproducible routing decisions.
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: Same input always produces same score
 * - Atomic Idempotency: scoreTask() is a pure function
 * - Fail-Safe: Ambiguous scores route to the more capable model
 * - Zero External Dependencies: No API calls, no ML inference
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/** Routing destination */
export type RouteTarget = 'CLAUDE_OPUS' | 'GEMINI_PRO';

/** Domain classification for secondary routing signal */
export type TaskDomain =
  | 'backend'
  | 'frontend'
  | 'database'
  | 'security'
  | 'orchestration'
  | 'ui'
  | 'visualization'
  | 'multimodal'
  | 'general';

/** Result of scoring a task */
export const TaskScoreResultSchema = z.object({
  /** Raw depth score (negative = frontend-leaning, positive = backend-leaning) */
  depthScore: z.number(),
  /** Classified domain */
  domain: z.custom<TaskDomain>(),
  /** Estimated output tokens */
  estimatedTokens: z.number().int().nonnegative(),
  /** Routing decision */
  target: z.custom<RouteTarget>(),
  /** Reasoning trace for auditability */
  reasoning: z.string(),
  /** Matched keywords with their weights */
  matchedKeywords: z.array(
    z.object({
      keyword: z.string(),
      weight: z.number(),
    }),
  ),
});

export type TaskScoreResult = z.infer<typeof TaskScoreResultSchema>;

// ============================================================================
// Keyword Weights — positive = backend, negative = frontend
// ============================================================================

const KEYWORD_WEIGHTS: Readonly<Record<string, number>> = {
  // Backend-heavy (positive weights)
  migration: 15,
  schema: 12,
  refactor: 10,
  saga: 10,
  rollback: 8,
  security: 8,
  webhook: 7,
  database: 10,
  temporal: 9,
  workflow: 7,
  orchestrator: 9,
  api: 5,
  rls: 8,
  policy: 6,
  supabase: 5,
  authentication: 8,
  authorization: 8,
  encryption: 9,
  middleware: 6,
  query: 4,
  index: 5,
  transaction: 8,
  compensation: 7,
  idempotent: 6,
  deterministic: 5,

  // Frontend-heavy (negative weights)
  dashboard: -5,
  chart: -8,
  svg: -10,
  animation: -12,
  ui: -15,
  layout: -15,
  color: -8,
  component: -6,
  modal: -5,
  button: -8,
  responsive: -7,
  css: -10,
  style: -8,
  theme: -7,
  gradient: -9,
  icon: -6,
  typography: -7,
  font: -6,
  hover: -5,
  transition: -6,
  canvas: -8,
  visual: -7,
  image: -5,
  photo: -4,
};

// ============================================================================
// Domain Keywords — for secondary classification signal
// ============================================================================

const DOMAIN_KEYWORDS: Readonly<Record<TaskDomain, readonly string[]>> = {
  backend: ['api', 'server', 'endpoint', 'rest', 'graphql', 'grpc', 'temporal', 'worker'],
  frontend: ['react', 'component', 'jsx', 'tsx', 'hook', 'state', 'props', 'render'],
  database: ['sql', 'migration', 'rls', 'supabase', 'postgres', 'query', 'index', 'table'],
  security: ['auth', 'token', 'jwt', 'rbac', 'zero-trust', 'encryption', 'vault'],
  orchestration: ['workflow', 'saga', 'temporal', 'orchestrator', 'step', 'compensation'],
  ui: ['button', 'modal', 'form', 'input', 'dropdown', 'menu', 'sidebar', 'nav'],
  visualization: ['chart', 'graph', 'dashboard', 'kpi', 'metric', 'report', 'analytics'],
  multimodal: ['image', 'photo', 'camera', 'vision', 'ocr', 'canvas', 'video', 'audio'],
  general: [],
};

// ⚡ Bolt: Pre-calculate the domain entries to avoid Object.entries() overhead on every call.
const PRE_CALCULATED_DOMAIN_ENTRIES = Object.entries(DOMAIN_KEYWORDS) as Array<[TaskDomain, readonly string[]]>;

// ============================================================================
// Scorer
// ============================================================================

/** Routing threshold — scores above this go to Claude Opus */
const ROUTE_THRESHOLD = 50;

/**
 * Score a task description for LLM routing.
 *
 * Algorithm:
 * 1. Tokenize input text (case-insensitive)
 * 2. Sum keyword weights for all matched terms
 * 3. Classify domain by highest keyword match count
 * 4. Apply routing rules:
 *    - depth_score > threshold → CLAUDE_OPUS
 *    - depth_score ≤ threshold AND domain ∈ {ui, viz, multimodal} → GEMINI_PRO
 *    - Ambiguous → CLAUDE_OPUS (fail-safe)
 *
 * @param taskDescription - The task text to score
 * @returns TaskScoreResult with score, domain, target, and reasoning
 */
export function scoreTask(taskDescription: string): TaskScoreResult {
  const normalized = taskDescription.toLowerCase();
  const words = normalized.split(/[\s,;:.!?(){}[\]"'`/\\-]+/).filter(Boolean);

  // 1. Calculate keyword-weighted depth score
  const matchedKeywords: Array<{ keyword: string; weight: number }> = [];
  let depthScore = 0;

  for (const word of words) {
    const weight = KEYWORD_WEIGHTS[word];
    if (weight !== undefined) {
      depthScore += weight;
      matchedKeywords.push({ keyword: word, weight });
    }
  }

  // 2. Classify domain
  let bestDomain: TaskDomain = 'general';
  let bestDomainCount = 0;

  for (const [domain, keywords] of PRE_CALCULATED_DOMAIN_ENTRIES) {
    let count = 0;
    for (const kw of keywords) {
      if (normalized.includes(kw)) count++;
    }
    if (count > bestDomainCount) {
      bestDomainCount = count;
      bestDomain = domain;
    }
  }

  // 3. Estimate output tokens (rough: 0.5 tokens per input character + baseline)
  const estimatedTokens = Math.max(100, Math.ceil(taskDescription.length * 0.5) + 500);

  // 4. Route decision
  let target: RouteTarget;
  let reasoning: string;

  const frontendDomains: TaskDomain[] = ['ui', 'visualization', 'multimodal', 'frontend'];

  if (depthScore > ROUTE_THRESHOLD) {
    target = 'CLAUDE_OPUS';
    reasoning = `depth_score=${depthScore} exceeds threshold=${ROUTE_THRESHOLD}. Routing to Claude Opus for deep processing.`;
  } else if (depthScore <= ROUTE_THRESHOLD && frontendDomains.includes(bestDomain)) {
    target = 'GEMINI_PRO';
    reasoning = `depth_score=${depthScore} within frontend range, domain=${bestDomain}. Routing to Gemini Pro for UI/visual tasks.`;
  } else {
    // Ambiguous — fail-safe to more capable model
    target = 'CLAUDE_OPUS';
    reasoning = `depth_score=${depthScore}, domain=${bestDomain}. Ambiguous — fail-safe routing to Claude Opus.`;
  }

  return {
    depthScore,
    domain: bestDomain,
    estimatedTokens,
    target,
    reasoning,
    matchedKeywords,
  };
}
