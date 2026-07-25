/**
 * RoutePolicy — Zod-Validated Routing Rules
 * @version 1.0.0
 * @module src/core/gateway/RoutePolicy
 *
 * Defines deterministic routing rules that override the scorer's default
 * decision when specific conditions are met. Ensures critical task types
 * are never routed to the wrong model.
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: Same input + policy always produces same override
 * - Fail-Closed: Unknown rule types are ignored (no override)
 * - Zod-Validated: Policy configs validated at boundary
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';
import type { RouteTarget, TaskDomain } from './TaskComplexityScorer';

// ============================================================================
// Schemas
// ============================================================================

/** A routing rule that forces a specific model when conditions match */
export const RoutingRuleSchema = z.object({
  /** Unique rule identifier */
  id: z.string().min(1),
  /** Human-readable description */
  description: z.string().min(1),
  /** Condition: keyword that must appear in the task */
  matchKeywords: z.array(z.string().min(1)),
  /** Condition: require ALL keywords (true) or ANY keyword (false) */
  requireAll: z.boolean().default(false),
  /** Condition: domain must match (optional) */
  matchDomain: z.custom<TaskDomain>().optional(),
  /** Override: force this model when conditions match */
  forceTarget: z.custom<RouteTarget>(),
  /** Priority: higher priority rules override lower ones */
  priority: z.number().int().nonnegative().default(0),
});

export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

/** Policy configuration */
export const RoutePolicyConfigSchema = z.object({
  rules: z.array(RoutingRuleSchema),
  /** Whether to log override decisions */
  auditOverrides: z.boolean().default(true),
});

export type RoutePolicyConfig = z.infer<typeof RoutePolicyConfigSchema>;

// ============================================================================
// Default Policy Rules
// ============================================================================

/**
 * Default routing policy rules.
 *
 * These enforce hard boundaries:
 * - Database migrations NEVER go to Gemini
 * - SVG/animation generation NEVER goes to Claude
 * - Security-critical tasks ALWAYS go to Claude
 */
export const DEFAULT_POLICY_RULES: readonly RoutingRule[] = [
  {
    id: 'rule-db-migration-claude',
    description: 'Database migrations always route to Claude Opus',
    matchKeywords: ['migration', 'schema', 'alter', 'rls'],
    requireAll: false,
    forceTarget: 'CLAUDE_OPUS',
    priority: 100,
  },
  {
    id: 'rule-security-claude',
    description: 'Security-critical tasks always route to Claude Opus',
    matchKeywords: ['security', 'authentication', 'authorization', 'encryption', 'zero-trust'],
    requireAll: false,
    forceTarget: 'CLAUDE_OPUS',
    priority: 100,
  },
  {
    id: 'rule-saga-claude',
    description: 'Saga/orchestration always routes to Claude Opus',
    matchKeywords: ['saga', 'orchestrator', 'temporal', 'workflow', 'compensation'],
    requireAll: false,
    forceTarget: 'CLAUDE_OPUS',
    priority: 90,
  },
  {
    id: 'rule-svg-gemini',
    description: 'SVG/animation generation always routes to Gemini Pro',
    matchKeywords: ['svg', 'animation', 'canvas', 'visualization'],
    requireAll: false,
    matchDomain: 'visualization',
    forceTarget: 'GEMINI_PRO',
    priority: 80,
  },
  {
    id: 'rule-ui-generation-gemini',
    description: 'UI component generation routes to Gemini Pro',
    matchKeywords: ['component', 'layout', 'responsive', 'dashboard'],
    requireAll: false,
    matchDomain: 'ui',
    forceTarget: 'GEMINI_PRO',
    priority: 70,
  },
];

// ============================================================================
// Policy Engine
// ============================================================================

// Pre-sort the default rules to avoid O(N log N) sorting on every evaluation
const PRE_SORTED_DEFAULT_RULES = [...DEFAULT_POLICY_RULES].sort(
  (a, b) => b.priority - a.priority,
);

export interface PolicyOverride {
  /** The rule that triggered the override */
  readonly rule: RoutingRule;
  /** The original target before override */
  readonly originalTarget: RouteTarget;
  /** The overridden target */
  readonly overriddenTarget: RouteTarget;
}

/**
 * Evaluate routing rules against a task description and scorer result.
 *
 * Rules are evaluated in priority order (highest first).
 * The first matching rule produces an override.
 *
 * @param taskDescription - The task text
 * @param scorerTarget - The target suggested by TaskComplexityScorer
 * @param scorerDomain - The domain classified by the scorer
 * @param rules - Policy rules to evaluate (default: DEFAULT_POLICY_RULES)
 * @returns PolicyOverride if a rule matched, or null if no override
 */
export function evaluatePolicy(
  taskDescription: string,
  scorerTarget: RouteTarget,
  scorerDomain: TaskDomain,
  rules: readonly RoutingRule[] = DEFAULT_POLICY_RULES,
): PolicyOverride | null {
  const normalized = taskDescription.toLowerCase();

  // Sort by priority descending (reuse pre-sorted default if unmodified)
  const sortedRules =
    rules === DEFAULT_POLICY_RULES
      ? PRE_SORTED_DEFAULT_RULES
      : [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    // Skip if rule would produce the same target (no-op override)
    if (rule.forceTarget === scorerTarget) {
      continue;
    }

    // Check domain condition (if specified)
    if (rule.matchDomain !== undefined && rule.matchDomain !== scorerDomain) {
      continue;
    }

    // ⚡ Bolt: Replaced .filter().length with .every()/.some() to allow short-circuiting
    // and prevent O(N) intermediate array allocations
    const keywordsMatch = rule.requireAll
      ? rule.matchKeywords.every((kw) => normalized.includes(kw.toLowerCase()))
      : rule.matchKeywords.some((kw) => normalized.includes(kw.toLowerCase()));

    if (keywordsMatch) {
      return {
        rule,
        originalTarget: scorerTarget,
        overriddenTarget: rule.forceTarget,
      };
    }
  }

  return null;
}
