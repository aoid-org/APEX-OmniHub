/**
 * SolverRouter — Deterministic Query-to-Solver Routing
 * @version 1.0.0
 * @module src/core/gateway/SolverRouter
 *
 * Eliminates manual tool invocation. Reads a task/query and deterministically
 * routes it to the correct SOLVER CLASS (the "how" of execution), complementing
 * OmniRoute's model routing (the "which model"):
 *
 *   - STATIC_ANALYSIS  → deterministic code tooling (lint, typecheck, AST, SAST)
 *   - MULTI_AGENT      → planning / decomposition / architecture (parallel agents)
 *   - SEARCH           → verification / lookup / research (ground truth retrieval)
 *   - DIRECT           → trivial inline handling (typo, rename, format)
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: Same query always selects the same solver (no ML, no I/O).
 * - Fail-Safe: Ambiguous non-trivial queries escalate to MULTI_AGENT.
 *   Ambiguous trivial queries collapse to DIRECT (zero marginal cost).
 * - Auditable: Full signal trace + reasoning on every decision.
 * - Zero External Dependencies: Pure function, no API calls.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/** The execution strategy a query is routed to. */
export type SolverClass = 'STATIC_ANALYSIS' | 'MULTI_AGENT' | 'SEARCH' | 'DIRECT';

/** A single signal that contributed to a solver's score. */
export const SolverSignalSchema = z.object({
  solver: z.custom<SolverClass>(),
  signal: z.string(),
  weight: z.number(),
});
export type SolverSignal = z.infer<typeof SolverSignalSchema>;

/** Result of routing a query to a solver class. */
export const SolverDecisionSchema = z.object({
  /** Chosen solver class. */
  solver: z.custom<SolverClass>(),
  /** Share of total signal weight captured by the chosen solver, 0..1. */
  confidence: z.number().min(0).max(1),
  /** Raw weighted score per solver class. */
  scores: z.object({
    STATIC_ANALYSIS: z.number(),
    MULTI_AGENT: z.number(),
    SEARCH: z.number(),
    DIRECT: z.number(),
  }),
  /** Every matched signal, for audit/replay. */
  matchedSignals: z.array(SolverSignalSchema),
  /** Whether a fail-safe fallback (no strong signal) was used. */
  usedFallback: z.boolean(),
  /** Human-readable reasoning trace. */
  reasoning: z.string(),
});
export type SolverDecision = z.infer<typeof SolverDecisionSchema>;

// ============================================================================
// Signal Weights — substring intent markers per solver class
// ============================================================================

/**
 * Each solver declares weighted intent markers. Markers are matched as
 * normalized (lowercased) substrings, mirroring the codebase convention in
 * TaskComplexityScorer's domain classification.
 */
const SOLVER_SIGNALS: Readonly<Record<SolverClass, Readonly<Record<string, number>>>> = {
  STATIC_ANALYSIS: {
    'static analysis': 6,
    'typecheck': 5,
    'type-check': 5,
    'type error': 5,
    'type safety': 4,
    lint: 5,
    eslint: 5,
    tsc: 4,
    ast: 5,
    'dead code': 5,
    'code smell': 4,
    cyclomatic: 5,
    'vulnerability scan': 5,
    sast: 5,
    'null check': 3,
    unused: 3,
    'syntax error': 4,
    compile: 3,
  },
  MULTI_AGENT: {
    'system design': 6,
    'business intelligence': 6,
    decompose: 6,
    architecture: 6,
    'break down': 5,
    'multi-step': 5,
    'high-stakes': 5,
    'evaluate options': 5,
    orchestrate: 5,
    plan: 5,
    strategy: 4,
    roadmap: 4,
    'trade-off': 4,
    tradeoff: 4,
    coordinate: 4,
    design: 3,
    milestone: 3,
  },
  SEARCH: {
    'fact-check': 6,
    'validate claim': 6,
    verify: 6,
    'current version': 5,
    'find out': 5,
    research: 5,
    lookup: 5,
    search: 5,
    confirm: 4,
    'up to date': 4,
    latest: 4,
    cite: 4,
    citation: 4,
    reference: 3,
    documentation: 3,
    'what is': 3,
    'who is': 3,
  },
  DIRECT: {
    spelling: 6,
    typo: 6,
    trivial: 6,
    'one-liner': 6,
    rename: 5,
    whitespace: 5,
    prettier: 5,
    'quick fix': 5,
    'small change': 5,
    format: 4,
    comment: 2,
  },
};

// Pre-flatten to avoid repeated Object.entries() allocation per call.
const SOLVER_SIGNAL_ENTRIES: ReadonlyArray<[SolverClass, ReadonlyArray<[string, number]>]> =
  (Object.entries(SOLVER_SIGNALS) as Array<[SolverClass, Readonly<Record<string, number>>]>).map(
    ([solver, signals]) => [solver, Object.entries(signals)] as [SolverClass, Array<[string, number]>],
  );

// ============================================================================
// Routing Constants
// ============================================================================

/** Minimum top score required to commit to a signal-driven solver. */
const MIN_SIGNAL_SCORE = 3;

/** Queries at/below this length with no strong signal collapse to DIRECT. */
const SHORT_TASK_CHARS = 40;

/**
 * Deterministic tie-break order. When two solvers share the top score, the
 * earlier solver in this list wins. Static analysis is preferred first because
 * it is the cheapest verifiable path; MULTI_AGENT is the capable fail-safe.
 */
const TIE_BREAK_ORDER: readonly SolverClass[] = [
  'STATIC_ANALYSIS',
  'MULTI_AGENT',
  'SEARCH',
  'DIRECT',
];

// ============================================================================
// Router
// ============================================================================

/**
 * Route a query to its solver class.
 *
 * Algorithm:
 * 1. Normalize the query (lowercase).
 * 2. Sum weighted substring signals per solver class.
 * 3. Pick the highest-scoring solver (deterministic tie-break).
 * 4. If the top score is below MIN_SIGNAL_SCORE (ambiguous):
 *      - short query  → DIRECT  (trivial, zero marginal cost)
 *      - longer query → MULTI_AGENT (capable fail-safe for decomposition)
 *
 * @param taskDescription - The query/task text to route.
 * @returns SolverDecision with chosen solver, confidence, and audit trail.
 */
export function routeSolver(taskDescription: string): SolverDecision {
  const normalized = taskDescription.toLowerCase();

  const scores: Record<SolverClass, number> = {
    STATIC_ANALYSIS: 0,
    MULTI_AGENT: 0,
    SEARCH: 0,
    DIRECT: 0,
  };
  const matchedSignals: SolverSignal[] = [];

  for (const [solver, signals] of SOLVER_SIGNAL_ENTRIES) {
    for (const [signal, weight] of signals) {
      if (normalized.includes(signal)) {
        scores[solver] += weight;
        matchedSignals.push({ solver, signal, weight });
      }
    }
  }

  // Pick the top solver using the deterministic tie-break order.
  let best: SolverClass = TIE_BREAK_ORDER[0];
  let bestScore = -1;
  for (const solver of TIE_BREAK_ORDER) {
    if (scores[solver] > bestScore) {
      bestScore = scores[solver];
      best = solver;
    }
  }

  const totalScore =
    scores.STATIC_ANALYSIS + scores.MULTI_AGENT + scores.SEARCH + scores.DIRECT;

  let solver: SolverClass;
  let usedFallback: boolean;
  let reasoning: string;

  if (bestScore >= MIN_SIGNAL_SCORE) {
    solver = best;
    usedFallback = false;
    reasoning = `solver=${solver} (score=${bestScore}, total=${totalScore}). Strongest intent signal.`;
  } else if (normalized.trim().length <= SHORT_TASK_CHARS) {
    solver = 'DIRECT';
    usedFallback = true;
    reasoning = `No strong signal (top=${bestScore}); short query (<=${SHORT_TASK_CHARS} chars) → DIRECT inline handling.`;
  } else {
    solver = 'MULTI_AGENT';
    usedFallback = true;
    reasoning = `No strong signal (top=${bestScore}); non-trivial query → fail-safe to MULTI_AGENT for decomposition.`;
  }

  const confidence =
    totalScore > 0 ? Math.round((scores[solver] / totalScore) * 100) / 100 : 0;

  return { solver, confidence, scores, matchedSignals, usedFallback, reasoning };
}

/**
 * Summarize a solver decision for logging/monitoring.
 */
export function summarizeSolverDecision(decision: SolverDecision): string {
  const flags = decision.usedFallback ? ['[FALLBACK]'] : [];
  return [
    `→ ${decision.solver}`,
    `(conf=${decision.confidence.toFixed(2)})`,
    ...flags,
    `signals=${decision.matchedSignals.length}`,
  ].join(' ');
}

/** Exposed for tests and policy tuning. */
export { SOLVER_SIGNALS, MIN_SIGNAL_SCORE, SHORT_TASK_CHARS };
