/**
 * SolverRouter — Unit Tests
 * @module tests/core/gateway/SolverRouter
 *
 * Validates deterministic query-to-solver routing.
 *
 * APEX STANDARDS ENFORCED:
 * - Determinism: Same input MUST produce same output, every time.
 * - Fail-Safe: Ambiguous trivial → DIRECT; ambiguous non-trivial → MULTI_AGENT.
 * - Auditability: Every decision carries a signal trace + reasoning.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { describe, expect, it } from 'vitest';

import {
  routeSolver,
  summarizeSolverDecision,
  SolverDecisionSchema,
  MIN_SIGNAL_SCORE,
  SHORT_TASK_CHARS,
} from '../../../src/core/gateway/SolverRouter';
import { routeRequest } from '../../../src/core/gateway/OmniRoute';

describe('SolverRouter', () => {
  describe('routeSolver', () => {
    it('routes code-analysis queries to STATIC_ANALYSIS', () => {
      const d = routeSolver('Run eslint and typecheck to find the type error and dead code');
      expect(d.solver).toBe('STATIC_ANALYSIS');
      expect(d.usedFallback).toBe(false);
      expect(d.scores.STATIC_ANALYSIS).toBeGreaterThanOrEqual(MIN_SIGNAL_SCORE);
    });

    it('routes planning/architecture queries to MULTI_AGENT', () => {
      const d = routeSolver('Decompose the system design and plan the architecture roadmap');
      expect(d.solver).toBe('MULTI_AGENT');
      expect(d.usedFallback).toBe(false);
    });

    it('routes verification queries to SEARCH', () => {
      const d = routeSolver('Verify and fact-check the latest current version against the documentation');
      expect(d.solver).toBe('SEARCH');
      expect(d.usedFallback).toBe(false);
    });

    it('routes trivial edits to DIRECT', () => {
      const d = routeSolver('Fix the typo and rename the variable, then run prettier to format it');
      expect(d.solver).toBe('DIRECT');
      expect(d.usedFallback).toBe(false);
    });

    it('falls back to DIRECT for short ambiguous queries', () => {
      const d = routeSolver('do the thing now');
      expect(d.solver).toBe('DIRECT');
      expect(d.usedFallback).toBe(true);
      expect(d.reasoning).toContain('short query');
    });

    it('falls back to MULTI_AGENT for long ambiguous queries', () => {
      const longAmbiguous =
        'Please go ahead and handle this overall situation for us across the whole business unit this quarter and make it good';
      expect(longAmbiguous.length).toBeGreaterThan(SHORT_TASK_CHARS);
      const d = routeSolver(longAmbiguous);
      expect(d.solver).toBe('MULTI_AGENT');
      expect(d.usedFallback).toBe(true);
      expect(d.reasoning).toContain('fail-safe');
    });

    it('is deterministic — same input yields identical output', () => {
      const q = 'Decompose the architecture and verify the latest documentation';
      const a = routeSolver(q);
      const b = routeSolver(q);
      expect(a).toEqual(b);
    });

    it('produces confidence within [0, 1]', () => {
      const d = routeSolver('plan the architecture and lint the code and verify the docs');
      expect(d.confidence).toBeGreaterThanOrEqual(0);
      expect(d.confidence).toBeLessThanOrEqual(1);
    });

    it('reports zero confidence and zero signals on a no-signal query', () => {
      const d = routeSolver('xyz');
      expect(d.matchedSignals).toHaveLength(0);
      expect(d.confidence).toBe(0);
    });

    it('records matched signals with their solver and weight', () => {
      const d = routeSolver('run a static analysis lint pass');
      expect(d.matchedSignals.length).toBeGreaterThan(0);
      for (const s of d.matchedSignals) {
        expect(s.weight).toBeGreaterThan(0);
        expect(typeof s.signal).toBe('string');
      }
    });

    it('breaks ties deterministically in favor of STATIC_ANALYSIS', () => {
      // 'lint' (STATIC_ANALYSIS w=5) vs 'plan' (MULTI_AGENT w=5) — equal scores.
      const d = routeSolver('lint plan');
      expect(d.scores.STATIC_ANALYSIS).toBe(d.scores.MULTI_AGENT);
      expect(d.solver).toBe('STATIC_ANALYSIS');
    });

    it('emits a schema-valid decision', () => {
      const d = routeSolver('verify the architecture plan with a static analysis lint');
      expect(() => SolverDecisionSchema.parse(d)).not.toThrow();
    });
  });

  describe('summarizeSolverDecision', () => {
    it('summarizes a decision into a single line', () => {
      const d = routeSolver('plan the architecture decomposition roadmap');
      const summary = summarizeSolverDecision(d);
      expect(summary).toContain('MULTI_AGENT');
      expect(summary).toContain('conf=');
    });

    it('flags fallback decisions', () => {
      const d = routeSolver('hi');
      expect(summarizeSolverDecision(d)).toContain('[FALLBACK]');
    });
  });

  describe('routeRequest (unified model + solver routing)', () => {
    it('returns both a model route and a solver route', () => {
      const r = routeRequest('Create a database migration with rollback and verify the schema');
      expect(r.route).toBeDefined();
      expect(r.solver).toBeDefined();
      // Security/DB task → Claude model; verification intent present → SEARCH-capable.
      expect(r.route.target).toBe('CLAUDE_OPUS');
      expect(['STATIC_ANALYSIS', 'MULTI_AGENT', 'SEARCH', 'DIRECT']).toContain(r.solver.solver);
    });

    it('is deterministic on the solver axis and stable on the model target', () => {
      // The model route carries an intentionally-unique decisionId/timestamp,
      // so only the solver sub-decision and the model target are deterministic.
      const q = 'Plan the architecture and lint the static analysis';
      const a = routeRequest(q);
      const b = routeRequest(q);
      expect(a.solver).toEqual(b.solver);
      expect(a.route.target).toBe(b.route.target);
    });
  });
});
