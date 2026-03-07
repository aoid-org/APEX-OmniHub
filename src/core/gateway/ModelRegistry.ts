/**
 * ModelRegistry — LLM Capability Declarations
 * @version 1.0.0
 * @module src/core/gateway/ModelRegistry
 *
 * Centralized registry of available LLM models with their capabilities,
 * constraints, and cost profiles. Used by OmniRoute to validate routing
 * decisions against model limitations.
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: Static registry, no runtime mutations
 * - Zod-Validated: All model configs validated at parse time
 * - Fail-Closed: Unknown model IDs rejected at boundary
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';
import type { RouteTarget, TaskDomain } from './TaskComplexityScorer';

// ============================================================================
// Schemas
// ============================================================================

export const ModelCapabilitySchema = z.object({
  /** Model identifier matching RouteTarget */
  modelId: z.custom<RouteTarget>(),
  /** Human-readable model name */
  displayName: z.string().min(1),
  /** Provider name */
  provider: z.enum(['anthropic', 'google']),
  /** Maximum input context window (tokens) */
  maxInputTokens: z.number().int().positive(),
  /** Maximum output tokens */
  maxOutputTokens: z.number().int().positive(),
  /** Cost per million input tokens (USD) */
  costPerMillionInputTokens: z.number().nonnegative(),
  /** Cost per million output tokens (USD) */
  costPerMillionOutputTokens: z.number().nonnegative(),
  /** Domains this model excels at */
  strongDomains: z.array(z.custom<TaskDomain>()),
  /** Domains this model should NOT handle */
  excludedDomains: z.array(z.custom<TaskDomain>()),
  /** Whether this model supports multimodal input */
  supportsMultimodal: z.boolean(),
  /** Whether this model supports streaming output */
  supportsStreaming: z.boolean(),
});

export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;

// ============================================================================
// Registry Data
// ============================================================================

const MODEL_REGISTRY_DATA: readonly ModelCapability[] = [
  {
    modelId: 'CLAUDE_OPUS',
    displayName: 'Claude Opus 4.6',
    provider: 'anthropic',
    maxInputTokens: 200_000,
    maxOutputTokens: 128_000,
    costPerMillionInputTokens: 15,
    costPerMillionOutputTokens: 75,
    strongDomains: [
      'backend',
      'database',
      'security',
      'orchestration',
      'general',
    ],
    excludedDomains: [],
    supportsMultimodal: true,
    supportsStreaming: true,
  },
  {
    modelId: 'GEMINI_PRO',
    displayName: 'Gemini 3.1 Pro',
    provider: 'google',
    maxInputTokens: 2_000_000,
    maxOutputTokens: 65_000,
    costPerMillionInputTokens: 2,
    costPerMillionOutputTokens: 8,
    strongDomains: [
      'frontend',
      'ui',
      'visualization',
      'multimodal',
    ],
    excludedDomains: [],
    supportsMultimodal: true,
    supportsStreaming: true,
  },
];

// ============================================================================
// Registry API
// ============================================================================

/** Validated, immutable model registry */
const MODELS: ReadonlyMap<RouteTarget, ModelCapability> = (() => {
  const map = new Map<RouteTarget, ModelCapability>();
  for (const raw of MODEL_REGISTRY_DATA) {
    const parsed = ModelCapabilitySchema.parse(raw);
    map.set(parsed.modelId, parsed);
  }
  return map;
})();

/**
 * Get a model's capabilities by its route target ID.
 * Returns undefined if the model ID is not registered.
 */
export function getModelCapability(
  modelId: RouteTarget,
): ModelCapability | undefined {
  return MODELS.get(modelId);
}

/**
 * Get all registered model capabilities.
 */
export function getAllModels(): readonly ModelCapability[] {
  return Array.from(MODELS.values());
}

/**
 * Check if a routing decision respects model constraints.
 *
 * Validates:
 * 1. Model exists in registry
 * 2. Estimated tokens don't exceed output limit
 * 3. Task domain is not in the model's excluded list
 *
 * Returns null if valid, or a string describing the violation.
 */
export function validateRouteDecision(
  modelId: RouteTarget,
  estimatedTokens: number,
  domain: TaskDomain,
): string | null {
  const model = MODELS.get(modelId);
  if (!model) {
    return `Unknown model: ${modelId}`;
  }

  if (estimatedTokens > model.maxOutputTokens) {
    return `Estimated tokens (${estimatedTokens}) exceed ${model.displayName} output limit (${model.maxOutputTokens})`;
  }

  if (model.excludedDomains.includes(domain)) {
    return `Domain "${domain}" is excluded from ${model.displayName}`;
  }

  return null;
}

/**
 * Estimate the cost of a routing decision in USD.
 */
export function estimateCost(
  modelId: RouteTarget,
  inputTokens: number,
  outputTokens: number,
): number {
  const model = MODELS.get(modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1_000_000) * model.costPerMillionInputTokens;
  const outputCost = (outputTokens / 1_000_000) * model.costPerMillionOutputTokens;

  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
