/**
 * TreeSearchPlanner — Parallel Path Generation + Objective-Function Scoring
 * @version 1.0.0
 * @module src/core/gateway/TreeSearchPlanner
 *
 * Replaces linear single-decision routing with parallel tree-search planning:
 * generate multiple candidate execution paths, score each against an explicit
 * objective function, and select the highest-value route. Designed for
 * high-stakes business intelligence where one-shot routing under-explores.
 *
 * Composes the existing deterministic layer:
 *   - scoreTask   (TaskComplexityScorer) → task depth / stakes signal
 *   - routeSolver (SolverRouter)         → primary solver class per path step
 *
 * Objective dimensions (the vision's speed/correctness/profitability, plus the
 * STORIED decision-scoring axes reversibility/confidence):
 *   speed · correctness · profitability · reversibility · confidence
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: Candidate generation, scoring, and tie-breaks are pure.
 * - Explicit Objective: Weights are declared, normalized, and auditable.
 * - Fail-Safe: Ambiguous ties resolve toward higher confidence / fewer steps.
 * - Zero External Dependencies: No API calls, no ML, no randomness.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';
import { scoreTask } from './TaskComplexityScorer';
import { routeSolver, type SolverClass, type SolverDecision } from './SolverRouter';

// ============================================================================
// Types
// ============================================================================

/** The axes of the objective function. Higher estimate = better on that axis. */
export type ObjectiveDimension =
  | 'speed'
  | 'correctness'
  | 'profitability'
  | 'reversibility'
  | 'confidence';

const DIMENSIONS: readonly ObjectiveDimension[] = [
  'speed',
  'correctness',
  'profitability',
  'reversibility',
  'confidence',
];

const DimensionVectorSchema = z.object({
  speed: z.number().min(0).max(1),
  correctness: z.number().min(0).max(1),
  profitability: z.number().min(0).max(1),
  reversibility: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});
export type DimensionVector = z.infer<typeof DimensionVectorSchema>;

/** Relative importance of each objective dimension (normalized before use). */
export type ObjectiveWeights = DimensionVector;

/** A single step within a candidate path, bound to a solver class. */
export const PathStepSchema = z.object({
  solver: z.custom<SolverClass>(),
  description: z.string(),
});
export type PathStep = z.infer<typeof PathStepSchema>;

/** A candidate execution path (a branch of the search tree). */
export const CandidatePathSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  steps: z.array(PathStepSchema).min(1),
  /** Per-dimension capability estimates in [0,1]. */
  estimates: DimensionVectorSchema,
});
export type CandidatePath = z.infer<typeof CandidatePathSchema>;

/** A candidate path after objective scoring. */
export const ScoredPathSchema = z.object({
  path: CandidatePathSchema,
  /** Weighted objective value in [0,1]. */
  score: z.number().min(0).max(1),
  /** Per-dimension weighted contribution to the score. */
  breakdown: DimensionVectorSchema,
});
export type ScoredPath = z.infer<typeof ScoredPathSchema>;

/** Full plan result: the chosen branch plus the ranked search tree. */
export const PlanResultSchema = z.object({
  chosen: ScoredPathSchema,
  ranked: z.array(ScoredPathSchema),
  objective: DimensionVectorSchema,
  reasoning: z.string(),
});
export type PlanResult = z.infer<typeof PlanResultSchema>;

// ============================================================================
// Default Objective — APEX favors correctness, then return, then speed
// ============================================================================

/**
 * Default objective weights. Correctness is weighted highest (first-pass
 * success doctrine); profitability and speed follow; reversibility and
 * confidence act as safety dampeners. Weights are normalized at scoring time,
 * so these are relative, not required to sum to 1.
 */
export const DEFAULT_OBJECTIVE: ObjectiveWeights = {
  correctness: 0.4,
  profitability: 0.2,
  speed: 0.2,
  reversibility: 0.1,
  confidence: 0.1,
};

// ============================================================================
// Scoring
// ============================================================================

/** Normalize weights to sum to 1. Falls back to a uniform objective if zero. */
export function normalizeWeights(weights: ObjectiveWeights): ObjectiveWeights {
  const total = DIMENSIONS.reduce((sum, d) => sum + Math.max(0, weights[d]), 0);
  if (total <= 0) {
    const uniform = 1 / DIMENSIONS.length;
    return {
      speed: uniform,
      correctness: uniform,
      profitability: uniform,
      reversibility: uniform,
      confidence: uniform,
    };
  }
  return {
    speed: Math.max(0, weights.speed) / total,
    correctness: Math.max(0, weights.correctness) / total,
    profitability: Math.max(0, weights.profitability) / total,
    reversibility: Math.max(0, weights.reversibility) / total,
    confidence: Math.max(0, weights.confidence) / total,
  };
}

/** Score one candidate path against a (normalized) objective. */
export function scorePath(
  path: CandidatePath,
  normalizedObjective: ObjectiveWeights,
): ScoredPath {
  const breakdown = {
    speed: normalizedObjective.speed * path.estimates.speed,
    correctness: normalizedObjective.correctness * path.estimates.correctness,
    profitability: normalizedObjective.profitability * path.estimates.profitability,
    reversibility: normalizedObjective.reversibility * path.estimates.reversibility,
    confidence: normalizedObjective.confidence * path.estimates.confidence,
  };
  const score =
    breakdown.speed +
    breakdown.correctness +
    breakdown.profitability +
    breakdown.reversibility +
    breakdown.confidence;
  return { path, score: round4(score), breakdown };
}

/**
 * Rank candidate paths against the objective and select the highest-value one.
 *
 * Deterministic tie-break order (when objective scores are equal):
 *   1. higher confidence estimate
 *   2. fewer steps (cheaper / faster to execute)
 *   3. lexicographically smaller path id
 *
 * @param task - The task being planned (recorded in the reasoning trace).
 * @param candidates - The candidate paths (branches) to evaluate.
 * @param weights - Objective weights (defaults to DEFAULT_OBJECTIVE).
 * @returns PlanResult with the chosen branch and the full ranked tree.
 */
export function planTask(
  task: string,
  candidates: readonly CandidatePath[],
  weights: ObjectiveWeights = DEFAULT_OBJECTIVE,
): PlanResult {
  if (candidates.length === 0) {
    throw new Error('planTask requires at least one candidate path');
  }

  const objective = normalizeWeights(weights);
  const scored = candidates.map((c) => scorePath(c, objective));

  const ranked = [...scored].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.path.estimates.confidence !== a.path.estimates.confidence) {
      return b.path.estimates.confidence - a.path.estimates.confidence;
    }
    if (a.path.steps.length !== b.path.steps.length) {
      return a.path.steps.length - b.path.steps.length;
    }
    return a.path.id < b.path.id ? -1 : a.path.id > b.path.id ? 1 : 0;
  });

  const chosen = ranked[0];
  const reasoning =
    `Evaluated ${candidates.length} path(s) for "${truncate(task, 60)}". ` +
    `Chose ${chosen.path.id} (${chosen.path.label}) with objective score ` +
    `${chosen.score.toFixed(4)} over ${ranked.length} ranked branch(es).`;

  return { chosen, ranked, objective, reasoning };
}

// ============================================================================
// Candidate Generation — deterministic fan-out from the task
// ============================================================================

/**
 * Generate a canonical fan-out of candidate paths for a task, deriving each
 * branch's estimates from the task's complexity (scoreTask) and primary solver
 * (routeSolver). Three strategies span the speed/rigor frontier:
 *
 *   - FAST     : single-step direct execution (max speed, lower correctness)
 *   - BALANCED : execute + verify (middle of the frontier)
 *   - RIGOROUS : decompose → execute → verify (max correctness, low speed)
 */
export function generateCandidatePaths(task: string): CandidatePath[] {
  const score = scoreTask(task);
  const solver: SolverDecision = routeSolver(task);
  const primary = solver.solver;

  // Stakes proxy in [0,1]: deeper tasks raise the value of rigor.
  const stakes = clamp01(Math.abs(score.depthScore) / 60);
  const conf = clamp01(solver.confidence);

  // The verification solver is type-aware: code → static analysis, else search.
  const verifySolver: SolverClass =
    primary === 'STATIC_ANALYSIS' || score.domain === 'backend' || score.domain === 'database'
      ? 'STATIC_ANALYSIS'
      : 'SEARCH';

  const fast: CandidatePath = {
    id: 'path-fast',
    label: 'Direct execution',
    steps: [{ solver: primary, description: `Execute directly via ${primary}` }],
    estimates: {
      speed: 0.95,
      correctness: clamp01(0.5 + 0.2 * conf - 0.15 * stakes),
      profitability: 0.85,
      reversibility: 0.4,
      confidence: clamp01(0.45 + 0.4 * conf),
    },
  };

  const balanced: CandidatePath = {
    id: 'path-balanced',
    label: 'Execute then verify',
    steps: [
      { solver: primary, description: `Execute via ${primary}` },
      { solver: verifySolver, description: `Verify result via ${verifySolver}` },
    ],
    estimates: {
      speed: 0.6,
      correctness: clamp01(0.78 + 0.1 * stakes),
      profitability: 0.65,
      reversibility: 0.7,
      confidence: clamp01(0.6 + 0.3 * conf),
    },
  };

  const rigorous: CandidatePath = {
    id: 'path-rigorous',
    label: 'Decompose, execute, verify',
    steps: [
      { solver: 'MULTI_AGENT', description: 'Decompose into sub-tasks (parallel agents)' },
      { solver: primary, description: `Execute each sub-task via ${primary}` },
      { solver: verifySolver, description: `Independently verify via ${verifySolver}` },
    ],
    estimates: {
      speed: 0.3,
      correctness: clamp01(0.9 + 0.08 * stakes),
      profitability: clamp01(0.45 - 0.1 * stakes),
      reversibility: 0.9,
      confidence: clamp01(0.7 + 0.25 * conf),
    },
  };

  return [fast, balanced, rigorous];
}

/**
 * One-call autonomous planner: fan out candidate paths for the task, then
 * score and select against the objective. This is the tree-search replacement
 * for linear routeTask.
 */
export function planAuto(
  task: string,
  weights: ObjectiveWeights = DEFAULT_OBJECTIVE,
): PlanResult {
  return planTask(task, generateCandidatePaths(task), weights);
}

/** One-line summary of a plan for logging/monitoring. */
export function summarizePlan(plan: PlanResult): string {
  const order = plan.ranked.map((r) => `${r.path.id}:${r.score.toFixed(3)}`).join(' > ');
  return `→ ${plan.chosen.path.id} (${plan.chosen.path.label}) [${order}]`;
}

// ============================================================================
// Helpers
// ============================================================================

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
