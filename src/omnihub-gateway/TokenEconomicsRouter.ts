/**
 * TokenEconomicsRouter — Asymmetric Model Dispatch
 * @version 1.0.0
 * @module src/omnihub-gateway/TokenEconomicsRouter
 *
 * Implements the asymmetric routing mandate:
 *   - Complex reasoning → Claude Opus 4.6
 *   - Background loops → GPT-5.4 Mini / Cursor Composer 2
 *
 * Supersedes OmniRoute + TaskComplexityScorer with a unified
 * cost-aware routing engine. Scores tasks on complexity, domain,
 * and estimated token volume, then selects the optimal model
 * based on capability match and cost efficiency.
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: Same task always routes to same model
 * - Fail-closed: Ambiguous tasks route to most capable model
 * - Cost-aware: Tracks estimated spend per routing decision
 * - Auditable: Full reasoning trace on every decision
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { ModelProfile, ModelTier, RoutingDecision } from './types';
import { assessTaskStakes } from '../core/gateway/TaskComplexityScorer';

// ============================================================================
// Model Registry
// ============================================================================

const MODEL_PROFILES: readonly ModelProfile[] = [
  {
    modelId: 'claude-opus-4-6',
    provider: 'anthropic',
    tier: 'reasoning',
    costPerInputToken: 0.000015,
    costPerOutputToken: 0.000075,
    maxContextTokens: 200_000,
    capabilities: [
      'complex-reasoning', 'code-generation', 'architecture', 'security-audit',
      'multi-step-planning', 'tool-use', 'long-context', 'agentic',
    ],
    latencyClass: 'high',
  },
  {
    modelId: 'claude-sonnet-4-6',
    provider: 'anthropic',
    tier: 'standard',
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
    maxContextTokens: 200_000,
    capabilities: [
      'code-generation', 'analysis', 'summarization', 'tool-use',
      'moderate-reasoning', 'long-context',
    ],
    latencyClass: 'medium',
  },
  {
    modelId: 'gpt-5.4-mini',
    provider: 'openai',
    tier: 'economy',
    costPerInputToken: 0.0000003,
    costPerOutputToken: 0.0000012,
    maxContextTokens: 128_000,
    capabilities: [
      'summarization', 'classification', 'extraction', 'simple-generation',
      'background-processing', 'high-throughput',
    ],
    latencyClass: 'low',
  },
  {
    modelId: 'cursor-composer-2',
    provider: 'cursor',
    tier: 'economy',
    costPerInputToken: 0.0000005,
    costPerOutputToken: 0.000002,
    maxContextTokens: 128_000,
    capabilities: [
      'code-editing', 'code-completion', 'refactoring', 'background-processing',
      'high-throughput',
    ],
    latencyClass: 'low',
  },
] as const;

// ============================================================================
// Complexity Scoring
// ============================================================================

/** Keywords indicating high complexity (routes to reasoning tier) */
const COMPLEXITY_SIGNALS: Record<string, number> = {
  // Architecture & design
  architect: 15, architecture: 15, design: 8, pattern: 6, refactor: 12,
  migration: 14, schema: 12, saga: 12, compensat: 10,

  // Security
  security: 12, vulnerability: 14, audit: 10, encryption: 12,
  authentication: 10, authorization: 10, rbac: 10, 'zero-trust': 14,

  // Complex operations
  orchestrat: 12, workflow: 8, temporal: 10, distributed: 12,
  transaction: 10, idempoten: 8, deterministic: 6, consensus: 14,

  // Deep reasoning
  analyze: 6, debug: 8, diagnose: 10, investigate: 8, optimize: 8,
  'root-cause': 12, regression: 10, 'race-condition': 14,

  // Planning
  plan: 6, strategy: 8, roadmap: 10, tradeoff: 8,
};

/** Keywords indicating background/simple tasks (routes to economy tier) */
const BACKGROUND_SIGNALS: Record<string, number> = {
  summarize: -6, classify: -8, extract: -6, format: -4,
  log: -4, status: -4, list: -3, count: -3,
  notify: -4, alert: -3, ping: -5, health: -4,
  cache: -3, cleanup: -4, batch: -5, bulk: -5,
  report: -3, aggregate: -4, filter: -3,
};

const PRE_CALCULATED_SIGNALS = [
  ...Object.entries(COMPLEXITY_SIGNALS),
  ...Object.entries(BACKGROUND_SIGNALS),
];

export interface ComplexityScore {
  readonly rawScore: number;
  readonly tier: ModelTier;
  readonly signals: Array<{ keyword: string; weight: number }>;
  readonly reasoning: string;
}

/**
 * Score a task's complexity to determine the appropriate model tier.
 * Positive scores = reasoning, negative scores = economy, middle = standard.
 */
export function scoreComplexity(taskDescription: string): ComplexityScore {
  const normalized = taskDescription.toLowerCase();
  const signals: Array<{ keyword: string; weight: number }> = [];
  let rawScore = 0;

  // ⚡ Bolt: Pre-calculate the combined entries to avoid Object.entries() overhead on every call.
  // We use a cached array of entries.
  for (const [keyword, weight] of PRE_CALCULATED_SIGNALS) {
    if (normalized.includes(keyword)) {
      rawScore += weight; // background signals are already negative
      signals.push({ keyword, weight });
    }
  }

  // Determine tier
  let tier: ModelTier;
  let reasoning: string;

  if (rawScore >= 20) {
    tier = 'reasoning';
    reasoning = `High complexity (score=${rawScore}). Requires deep reasoning capability.`;
  } else if (rawScore <= -10) {
    tier = 'economy';
    reasoning = `Low complexity (score=${rawScore}). Suitable for economy-tier background processing.`;
  } else {
    tier = 'standard';
    reasoning = `Moderate complexity (score=${rawScore}). Standard tier sufficient.`;
  }

  return { rawScore, tier, signals, reasoning };
}

// ============================================================================
// Token Economics Router
// ============================================================================

export class TokenEconomicsRouter {
  private readonly models: readonly ModelProfile[];
  private readonly fallbackModelId: string;

  constructor(
    models?: readonly ModelProfile[],
    fallbackModelId = 'claude-opus-4-6',
  ) {
    this.models = models ?? MODEL_PROFILES;
    this.fallbackModelId = fallbackModelId;
  }

  /**
   * Route a task to the optimal model based on complexity and cost.
   *
   * Flow:
   * 1. Score task complexity → determine target tier
   * 2. Filter models by tier + capability match
   * 3. Select lowest-cost model within the tier
   * 4. Estimate cost based on input/output token projections
   * 5. Fallback to reasoning tier if no match found
   */
  route(taskDescription: string, requiredCapabilities?: string[]): RoutingDecision {
    const requestId = `te-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const complexity = scoreComplexity(taskDescription);

    // Filter models by tier
    let candidates = this.models.filter((m) => m.tier === complexity.tier);

    // Filter by required capabilities if specified
    if (requiredCapabilities && requiredCapabilities.length > 0) {
      candidates = candidates.filter((m) =>
        requiredCapabilities.every((cap) => m.capabilities.includes(cap)),
      );
    }

    // Fallback: if no candidates in target tier, escalate to reasoning
    if (candidates.length === 0) {
      candidates = this.models.filter((m) => m.tier === 'reasoning');
    }

    // Final fallback: use the hardcoded fallback model
    if (candidates.length === 0) {
      const fallback = this.models.find((m) => m.modelId === this.fallbackModelId);
      if (fallback) {
        candidates = [fallback];
      }
    }

    // Select cheapest candidate (by output token cost, which dominates)
    const selected = candidates.reduce((cheapest, current) =>
      current.costPerOutputToken < cheapest.costPerOutputToken ? current : cheapest,
    candidates[0]);

    // Estimate cost
    const estimatedInputTokens = Math.ceil(taskDescription.length / 4);
    const estimatedOutputTokens = Math.max(100, estimatedInputTokens * 2);
    const estimatedCostUsd =
      estimatedInputTokens * selected.costPerInputToken +
      estimatedOutputTokens * selected.costPerOutputToken;

    const reasoning = [
      complexity.reasoning,
      `Selected: ${selected.modelId} (${selected.provider}, tier=${selected.tier})`,
      `Est. cost: $${estimatedCostUsd.toFixed(6)}`,
      candidates.length > 1 ? `Candidates: ${candidates.map((c) => c.modelId).join(', ')}` : '',
    ].filter(Boolean).join(' | ');

    return {
      requestId,
      selectedModel: selected,
      reasoning,
      estimatedCostUsd,
      timestamp: new Date().toISOString(),
      reasoning_budget: assessTaskStakes(taskDescription).reasoning_budget,
    };
  }

  /**
   * Route with explicit tier override (bypass complexity scoring).
   */
  routeToTier(tier: ModelTier, requiredCapabilities?: string[]): RoutingDecision {
    const tierDescription = `Explicit tier override: ${tier}`;
    // Create a synthetic description that will score into the desired tier
    let syntheticTask = tierDescription;
    if (tier === 'reasoning') {
      syntheticTask = 'architecture security audit orchestration ' + tierDescription;
    } else if (tier === 'economy') {
      syntheticTask = 'summarize classify batch ' + tierDescription;
    }
    return this.route(syntheticTask, requiredCapabilities);
  }

  /**
   * Get a model profile by ID.
   */
  getModel(modelId: string): ModelProfile | undefined {
    return this.models.find((m) => m.modelId === modelId);
  }

  /**
   * List all available models.
   */
  listModels(): readonly ModelProfile[] {
    return this.models;
  }

  /**
   * Estimate cost for a given model and token counts.
   */
  estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.getModel(modelId);
    if (!model) return 0;
    return inputTokens * model.costPerInputToken + outputTokens * model.costPerOutputToken;
  }
}
