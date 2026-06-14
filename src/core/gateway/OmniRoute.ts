/**
 * OmniRoute — Bifurcated LLM Routing Middleware
 * @version 1.0.0
 * @module src/core/gateway/OmniRoute
 *
 * Central routing middleware that scores incoming tasks, applies policy
 * rules, validates against model constraints, and produces deterministic
 * routing decisions. Sits between the UI layer (ApexAssistant) and the
 * orchestration layer (Temporal workflows via Supabase Edge Functions).
 *
 * Integration:
 * - Receives task descriptions from ApexAssistant.sendQuery()
 * - Scores via TaskComplexityScorer (deterministic, no ML)
 * - Applies RoutePolicy overrides (priority-ordered rules)
 * - Validates via ModelRegistry (constraint checking)
 * - Attaches routeDecision to EventEnvelope
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: Same task always routes to same model
 * - Fail-Closed: Invalid routes fall back to Claude Opus
 * - Auditable: Full reasoning trace on every decision
 * - Zero Dependencies: No external API calls for routing
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';
import { scoreTask, type RouteTarget, type TaskScoreResult } from './TaskComplexityScorer';
import { validateRouteDecision, estimateCost, getModelCapability } from './ModelRegistry';
import { evaluatePolicy, type PolicyOverride } from './RoutePolicy';
import { routeSolver, type SolverDecision } from './SolverRouter';

// ============================================================================
// Types
// ============================================================================

/** Complete routing decision with full audit trail */
export const RouteDecisionSchema = z.object({
  /** Unique decision identifier */
  decisionId: z.string().min(1),
  /** ISO 8601 timestamp of decision */
  timestamp: z.string(),
  /** Final routing target after all evaluations */
  target: z.custom<RouteTarget>(),
  /** Score result from TaskComplexityScorer */
  score: z.custom<TaskScoreResult>(),
  /** Policy override (null if scorer decision was kept) */
  policyOverride: z.custom<PolicyOverride | null>(),
  /** Validation result (null if valid, string if invalid) */
  validationResult: z.string().nullable(),
  /** Estimated cost in USD */
  estimatedCostUsd: z.number().nonnegative(),
  /** Whether a fallback was triggered */
  usedFallback: z.boolean(),
  /** Human-readable reasoning */
  reasoning: z.string(),
  /** Deterministic route explanation signals for audit/replay */
  routeExplanation: z.array(z.string()),
});

export type RouteDecision = z.infer<typeof RouteDecisionSchema>;

// ============================================================================
// Middleware
// ============================================================================

/**
 * Route a task description to the optimal LLM.
 *
 * Flow:
 * 1. Score the task via TaskComplexityScorer
 * 2. Apply RoutePolicy overrides
 * 3. Validate the decision against ModelRegistry constraints
 * 4. If validation fails, fallback to Claude Opus
 * 5. Estimate cost and package final decision
 *
 * @param taskDescription - The task text to route
 * @returns RouteDecision with full audit trail
 */
export function routeTask(taskDescription: string): RouteDecision {
  const decisionId = `rd-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const timestamp = new Date().toISOString();

  // Step 1: Score the task
  const score = scoreTask(taskDescription);
  let target = score.target;
  let reasoning = score.reasoning;
  let usedFallback = false;

  // Step 2: Apply policy overrides
  const policyOverride = evaluatePolicy(
    taskDescription,
    target,
    score.domain,
  );

  if (policyOverride) {
    target = policyOverride.overriddenTarget;
    reasoning += ` | POLICY OVERRIDE [${policyOverride.rule.id}]: ${policyOverride.rule.description}`;
  }

  // Step 3: Validate against model constraints
  const validationResult = validateRouteDecision(
    target,
    score.estimatedTokens,
    score.domain,
  );

  if (validationResult !== null) {
    // Validation failed — fallback to Claude Opus (most capable)
    reasoning += ` | VALIDATION FAILED: ${validationResult}. Falling back to CLAUDE_OPUS.`;
    target = 'CLAUDE_OPUS';
    usedFallback = true;
  }

  // Step 4: Estimate cost
  const model = getModelCapability(target);
  const inputTokens = Math.ceil(taskDescription.length / 4);
  const estimatedCostUsd = model
    ? estimateCost(target, inputTokens, score.estimatedTokens)
    : 0;

  const routeExplanation = [
    `score:${score.depthScore}`,
    `domain:${score.domain}`,
    `target:${target}`,
    policyOverride ? `policy:${policyOverride.rule.id}` : 'policy:none',
    usedFallback ? 'fallback:true' : 'fallback:false',
  ];

  return {
    decisionId,
    timestamp,
    target,
    score,
    policyOverride,
    validationResult,
    estimatedCostUsd,
    usedFallback,
    reasoning,
    routeExplanation,
  };
}

/**
 * Batch route multiple tasks (for parallel orchestration).
 * Each task is independently scored and routed.
 */
export function routeTasks(
  taskDescriptions: readonly string[],
): readonly RouteDecision[] {
  return taskDescriptions.map(routeTask);
}

/**
 * A fully-routed request: the model decision (which LLM) plus the solver
 * decision (which execution strategy). This is the unified "automated routing"
 * surface — a single call eliminates manual model AND tool selection.
 */
export interface RoutedRequest {
  /** Which model handles the task (CLAUDE_OPUS | GEMINI_PRO). */
  readonly route: RouteDecision;
  /** Which solver class executes the task (static-analysis | multi-agent | search | direct). */
  readonly solver: SolverDecision;
}

/**
 * Route a task across both axes in one deterministic call:
 *   - model   (via routeTask → score → policy → validation)
 *   - solver  (via routeSolver → intent classification)
 *
 * Both sub-decisions are independent and side-effect-free, so the combined
 * result is itself deterministic and replayable.
 *
 * @param taskDescription - The task/query text to route.
 * @returns RoutedRequest pairing the model route with the solver route.
 */
export function routeRequest(taskDescription: string): RoutedRequest {
  return {
    route: routeTask(taskDescription),
    solver: routeSolver(taskDescription),
  };
}

/**
 * Get a summary of routing decisions for logging/monitoring.
 */
export function summarizeDecision(decision: RouteDecision): string {
  const overrideParts = decision.policyOverride
    ? [
        `[OVERRIDE: ${decision.policyOverride.rule.id}]`,
        `[${decision.policyOverride.rule.description}]`,
      ]
    : [];
  const fallbackParts = decision.usedFallback ? ['[FALLBACK]'] : [];

  return [
    `[${decision.decisionId}]`,
    `→ ${decision.target}`,
    `(score=${decision.score.depthScore}, domain=${decision.score.domain})`,
    ...overrideParts,
    ...fallbackParts,
    `$${decision.estimatedCostUsd.toFixed(4)}`,
  ].join(' ');
}
