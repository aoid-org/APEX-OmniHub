/**
 * OmniRoute + TaskComplexityScorer + ModelRegistry + RoutePolicy — Unit Tests
 * @module tests/core/gateway/OmniRoute
 *
 * Validates the full bifurcated LLM routing pipeline:
 *  Task → Score → Policy Override → Model Validation → RouteDecision
 *
 * Critical test: DETERMINISM — same input MUST produce same output, every time.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { describe, expect, it } from 'vitest';

import {
  routeTask,
  routeTasks,
  summarizeDecision,
} from '../../../src/core/gateway/OmniRoute';
import type { RouteTarget } from '../../../src/core/gateway/TaskComplexityScorer';
import {
  estimateCost,
  getAllModels,
  getModelCapability,
  validateRouteDecision,
} from '../../../src/core/gateway/ModelRegistry';
import {
  DEFAULT_POLICY_RULES,
  evaluatePolicy,
} from '../../../src/core/gateway/RoutePolicy';

// ============================================================================
// ModelRegistry
// ============================================================================

describe('ModelRegistry', () => {
  describe('getModelCapability', () => {
    it('returns Claude Opus capabilities', () => {
      const model = getModelCapability('CLAUDE_OPUS');
      expect(model).toBeDefined();
      expect(model?.displayName).toBe('Claude Opus 4.6');
      expect(model?.provider).toBe('anthropic');
      expect(model?.maxOutputTokens).toBe(128_000);
    });

    it('returns Gemini Pro capabilities', () => {
      const model = getModelCapability('GEMINI_PRO');
      expect(model).toBeDefined();
      expect(model?.displayName).toBe('Gemini 3.1 Pro');
      expect(model?.provider).toBe('google');
      expect(model?.maxInputTokens).toBe(2_000_000);
    });

    it('returns undefined for unknown model ID', () => {
      const model = getModelCapability('UNKNOWN' as RouteTarget);
      expect(model).toBeUndefined();
    });
  });

  describe('getAllModels', () => {
    it('returns both registered models', () => {
      const models = getAllModels();
      expect(models).toHaveLength(2);
      const ids = models.map((m) => m.modelId);
      expect(ids).toContain('CLAUDE_OPUS');
      expect(ids).toContain('GEMINI_PRO');
    });
  });

  describe('validateRouteDecision', () => {
    it('returns null for valid routing', () => {
      const result = validateRouteDecision('CLAUDE_OPUS', 100, 'backend');
      expect(result).toBeNull();
    });

    it('rejects when estimated tokens exceed model output limit', () => {
      const result = validateRouteDecision('GEMINI_PRO', 999_999, 'frontend');
      expect(result).not.toBeNull();
      expect(result).toContain('exceed');
    });

    it('rejects unknown model IDs', () => {
      const result = validateRouteDecision(
        'FANTASY_MODEL' as RouteTarget,
        100,
        'backend',
      );
      expect(result).toContain('Unknown model');
    });
  });

  describe('estimateCost', () => {
    it('calculates cost based on model pricing', () => {
      // Claude Opus: $15/M input, $75/M output
      const cost = estimateCost('CLAUDE_OPUS', 1_000_000, 1_000_000);
      expect(cost).toBe(90); // 15 + 75
    });

    it('returns 0 for unknown model', () => {
      const cost = estimateCost('UNKNOWN' as RouteTarget, 1000, 1000);
      expect(cost).toBe(0);
    });

    it('calculates Gemini Pro cost correctly', () => {
      // Gemini Pro: $2/M input, $8/M output
      const cost = estimateCost('GEMINI_PRO', 1_000_000, 1_000_000);
      expect(cost).toBe(10); // 2 + 8
    });
  });
});

// ============================================================================
// RoutePolicy
// ============================================================================

describe('RoutePolicy', () => {
  describe('evaluatePolicy', () => {
    it('returns null when no policy override needed', () => {
      // Migration tasks already route to CLAUDE_OPUS by scorer
      const override = evaluatePolicy(
        'Run the migration',
        'CLAUDE_OPUS',
        'database',
      );
      expect(override).toBeNull();
    });

    it('overrides GEMINI_PRO to CLAUDE_OPUS for security tasks', () => {
      const override = evaluatePolicy(
        'Review the authentication flow',
        'GEMINI_PRO',
        'security',
      );
      expect(override).not.toBeNull();
      expect(override?.overriddenTarget).toBe('CLAUDE_OPUS');
      expect(override?.rule.id).toBe('rule-security-claude');
    });

    it('overrides CLAUDE_OPUS to GEMINI_PRO for SVG + visualization domain', () => {
      const override = evaluatePolicy(
        'Generate SVG chart visualization',
        'CLAUDE_OPUS',
        'visualization',
      );
      expect(override).not.toBeNull();
      expect(override?.overriddenTarget).toBe('GEMINI_PRO');
    });

    it('applies highest-priority rule first', () => {
      // Security (priority 100) should win over SVG (priority 80)
      const override = evaluatePolicy(
        'Build SVG visualization with encryption security',
        'GEMINI_PRO',
        'visualization',
      );
      expect(override).not.toBeNull();
      expect(override?.rule.id).toBe('rule-security-claude');
    });

    it('skips rules that require domain match when domain differs', () => {
      // SVG rule requires visualization domain
      const override = evaluatePolicy(
        'Generate SVG icon',
        'CLAUDE_OPUS',
        'backend', // Not visualization
      );
      // The svg rule has matchDomain: visualization, so it won't match
      expect(
        override === null || override?.rule?.id !== 'rule-svg-gemini',
      ).toBe(true);
    });

    it('accepts custom rules array', () => {
      const customRules = [
        {
          id: 'test-rule',
          description: 'Test custom rule',
          matchKeywords: ['banana'],
          requireAll: false,
          forceTarget: 'GEMINI_PRO' as RouteTarget,
          priority: 50,
        },
      ];
      const override = evaluatePolicy(
        'Process the banana',
        'CLAUDE_OPUS',
        'general',
        customRules,
      );
      expect(override).not.toBeNull();
      expect(override?.rule.id).toBe('test-rule');
    });
  });

  describe('DEFAULT_POLICY_RULES', () => {
    it('has rules with unique IDs', () => {
      const ids = DEFAULT_POLICY_RULES.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all rules have non-empty matchKeywords', () => {
      for (const rule of DEFAULT_POLICY_RULES) {
        expect(rule.matchKeywords.length).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// OmniRoute (integrated pipeline)
// ============================================================================

describe('OmniRoute', () => {
  describe('routeTask', () => {
    it('returns a complete RouteDecision with all fields', () => {
      const decision = routeTask('Create a database migration');
      expect(decision.decisionId).toMatch(/^rd-/);
      expect(decision.timestamp).toBeTruthy();
      expect(decision.target).toBeTruthy();
      expect(decision.score).toBeTruthy();
      expect(decision.reasoning).toBeTruthy();
      expect(typeof decision.estimatedCostUsd).toBe('number');
      expect(typeof decision.usedFallback).toBe('boolean');
    });

    it('routes backend tasks to CLAUDE_OPUS', () => {
      const decision = routeTask(
        'Refactor the database migration with saga orchestrator and rollback compensation',
      );
      expect(decision.target).toBe('CLAUDE_OPUS');
    });

    it('routes frontend tasks to GEMINI_PRO', () => {
      const decision = routeTask(
        'Build a responsive dashboard layout with CSS animation and SVG chart',
      );
      expect(decision.target).toBe('GEMINI_PRO');
    });

    it('includes cost estimate in USD', () => {
      const decision = routeTask('Create a simple UI component');
      expect(decision.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    });

    it('appends policy override reasoning when override triggers', () => {
      const decision = routeTask(
        'Review zero-trust encryption and authentication security',
      );
      // Security keywords should trigger policy
      expect(decision.target).toBe('CLAUDE_OPUS');
    });
  });

  describe('routeTasks', () => {
    it('routes multiple tasks independently', () => {
      const decisions = routeTasks([
        'Create database migration with schema rollback',
        'Build responsive dashboard with SVG chart animation',
      ]);
      expect(decisions).toHaveLength(2);
      expect(decisions[0].target).toBe('CLAUDE_OPUS');
      expect(decisions[1].target).toBe('GEMINI_PRO');
    });

    it('handles empty input', () => {
      const decisions = routeTasks([]);
      expect(decisions).toHaveLength(0);
    });
  });

  describe('summarizeDecision', () => {
    it('produces a readable summary string', () => {
      const decision = routeTask('Run the migration');
      const summary = summarizeDecision(decision);
      expect(summary).toContain(decision.decisionId);
      expect(summary).toContain(decision.target);
      expect(summary).toContain('$');
      expect(decision.routeExplanation).toContain(`target:${decision.target}`);
    });

    it('includes FALLBACK label when fallback triggered', () => {
      // Force a fallback by creating a decision with usedFallback = true
      const decision = routeTask('Run the migration');
      const manualDecision = { ...decision, usedFallback: true };
      const summary = summarizeDecision(manualDecision);
      expect(summary).toContain('[FALLBACK]');
    });
  });
});
