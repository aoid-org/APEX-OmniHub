/**
 * TreeSearchPlanner — Parallel Tree-Search Execution Planner
 * @version 1.0.0
 * @module src/integrations/maestro/execution/TreeSearchPlanner
 *
 * Replaces linear self-correction with parallel tree search for tasks whose
 * reasoning_budget >= 1000 (logic or architecture tier).
 *
 * Algorithm:
 *   1. generatePaths() — expand candidate routes from strategy catalogue
 *   2. scorePath()     — evaluate each route against the objective function
 *   3. plan()          — return the highest-scoring route; prune the rest
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: scoring is a pure function of route properties
 * - Fail-safe: always returns at least the 'direct' route
 * - Zero external dependencies: self-contained planning logic
 * - ≤ 600 lines per APEX modularity protocol
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ============================================================================
// Public Types
// ============================================================================

export type RouteStrategy =
  | 'direct'
  | 'decompose'
  | 'search-then-execute'
  | 'multi-agent-consensus';

export interface Task {
  readonly id: string;
  readonly intent: string;
  /** Token budget pre-assigned by assessTaskStakes */
  readonly reasoning_budget: number;
  readonly context?: Record<string, unknown>;
}

export interface Route {
  readonly id: string;
  readonly strategy: RouteStrategy;
  readonly steps: readonly string[];
  readonly estimatedLatencyMs: number;
  readonly estimatedTokens: number;
}

export interface PathScore {
  /** 0–1 normalized inverse latency */
  readonly speed: number;
  /** 0–1 strategy-specific correctness prior */
  readonly correctness: number;
  /** 0–1 inverse normalized token cost */
  readonly profitability: number;
  /** Weighted composite — higher is better */
  readonly total: number;
}

export interface ScoredRoute {
  readonly route: Route;
  readonly score: PathScore;
}

// ============================================================================
// Strategy Catalogue
// ============================================================================

interface StrategyProfile {
  readonly steps: readonly string[];
  readonly latencyMs: number;
  readonly tokenMultiplier: number;   // relative to BASE_TOKENS
  readonly correctnessPrior: number;  // 0–1
}

const BASE_TOKENS = 500;

const STRATEGY_PROFILES: Readonly<Record<RouteStrategy, StrategyProfile>> = {
  direct: {
    steps: ['parse-intent', 'execute-action', 'return-result'],
    latencyMs: 800,
    tokenMultiplier: 1,
    correctnessPrior: 0.7,
  },
  decompose: {
    steps: ['parse-intent', 'decompose-subtasks', 'execute-subtasks', 'merge-results', 'return-result'],
    latencyMs: 2000,
    tokenMultiplier: 2.5,
    correctnessPrior: 0.88,
  },
  'search-then-execute': {
    steps: ['parse-intent', 'search-context', 'synthesize-plan', 'execute-action', 'verify-output', 'return-result'],
    latencyMs: 3500,
    tokenMultiplier: 3,
    correctnessPrior: 0.92,
  },
  'multi-agent-consensus': {
    steps: ['parse-intent', 'fan-out-agents', 'collect-responses', 'consensus-vote', 'execute-winner', 'return-result'],
    latencyMs: 5000,
    tokenMultiplier: 4,
    correctnessPrior: 0.95,
  },
};

// Scoring weights (must sum to 1)
const SCORE_WEIGHTS = { speed: 0.25, correctness: 0.50, profitability: 0.25 } as const;

// ⚡ Bolt: pre-compute normalization denominators once
const MAX_LATENCY = Math.max(...Object.values(STRATEGY_PROFILES).map((p) => p.latencyMs));
const MAX_TOKENS  = BASE_TOKENS * Math.max(...Object.values(STRATEGY_PROFILES).map((p) => p.tokenMultiplier));

// Strategy sets keyed by minimum reasoning_budget threshold
const BUDGET_STRATEGIES: ReadonlyArray<{ minBudget: number; strategies: RouteStrategy[] }> = [
  { minBudget: 5000, strategies: ['direct', 'decompose', 'search-then-execute', 'multi-agent-consensus'] },
  { minBudget: 1000, strategies: ['direct', 'decompose', 'search-then-execute'] },
  { minBudget:    0, strategies: ['direct', 'decompose'] },
];

// ============================================================================
// TreeSearchPlanner
// ============================================================================

export class TreeSearchPlanner {
  /**
   * Generate all candidate execution routes for the given task.
   *
   * Higher reasoning_budget unlocks more expensive (but more correct) strategies.
   * Tasks with budget < 1000 should not reach this planner — the engine gate
   * enforces that — but generatePaths handles them gracefully anyway.
   */
  generatePaths(task: Task): Route[] {
    const entry = BUDGET_STRATEGIES.find((b) => task.reasoning_budget >= b.minBudget);
    const strategies = entry?.strategies ?? ['direct'];

    return strategies.map((strategy, i) => {
      const profile = STRATEGY_PROFILES[strategy];
      return {
        id: `${task.id}-route-${i}`,
        strategy,
        steps: profile.steps,
        estimatedLatencyMs: profile.latencyMs,
        estimatedTokens: Math.ceil(BASE_TOKENS * profile.tokenMultiplier),
      };
    });
  }

  /**
   * Score a route against the objective function:
   *   speed         (25%): 1 − normalizedLatency
   *   correctness   (50%): strategy-specific prior from catalogue
   *   profitability (25%): 1 − normalizedTokenCost
   *
   * All sub-scores are in [0, 1]. Higher total is better.
   */
  scorePath(path: Route): ScoredRoute {
    const speed         = 1 - path.estimatedLatencyMs / MAX_LATENCY;
    const profitability = 1 - path.estimatedTokens    / MAX_TOKENS;
    const correctness   = STRATEGY_PROFILES[path.strategy].correctnessPrior;

    const total =
      speed         * SCORE_WEIGHTS.speed         +
      correctness   * SCORE_WEIGHTS.correctness   +
      profitability * SCORE_WEIGHTS.profitability;

    return {
      route: path,
      score: { speed, correctness, profitability, total },
    };
  }

  /**
   * Return the optimal execution route for the task.
   *
   * Steps:
   *   1. Generate all candidate paths (strategy fan-out)
   *   2. Score each path via the objective function
   *   3. Select the highest-scoring route; discard the rest
   *
   * @param task - Task with reasoning_budget pre-assigned by assessTaskStakes
   * @returns ScoredRoute containing the single optimal route
   */
  plan(task: Task): ScoredRoute {
    const paths  = this.generatePaths(task);
    const scored = paths.map((p) => this.scorePath(p));
    return scored.reduce(
      (best, current) => (current.score.total > best.score.total ? current : best),
      scored[0],
    );
  }
}
