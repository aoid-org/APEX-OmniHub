/**
 * TreeSearchPlanner — Unit Tests
 * @module tests/core/gateway/TreeSearchPlanner
 *
 * Validates parallel path generation, objective-function scoring, and
 * highest-value selection.
 *
 * APEX STANDARDS ENFORCED:
 * - Determinism: Same task + weights MUST produce the same plan.
 * - Explicit Objective: Weight changes MUST shift the selected path.
 * - Auditability: Every plan exposes the full ranked search tree.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { describe, expect, it } from 'vitest';

import {
  planTask,
  planAuto,
  scorePath,
  normalizeWeights,
  generateCandidatePaths,
  summarizePlan,
  DEFAULT_OBJECTIVE,
  PlanResultSchema,
  type CandidatePath,
  type ObjectiveWeights,
} from '../../../src/core/gateway/TreeSearchPlanner';

const fastPath: CandidatePath = {
  id: 'path-fast',
  label: 'Direct',
  steps: [{ solver: 'DIRECT', description: 'do it' }],
  estimates: { speed: 1, correctness: 0.5, profitability: 0.9, reversibility: 0.4, confidence: 0.5 },
};

const rigorousPath: CandidatePath = {
  id: 'path-rigorous',
  label: 'Decompose+verify',
  steps: [
    { solver: 'MULTI_AGENT', description: 'plan' },
    { solver: 'SEARCH', description: 'verify' },
  ],
  estimates: { speed: 0.3, correctness: 1, profitability: 0.4, reversibility: 0.9, confidence: 0.9 },
};

describe('TreeSearchPlanner', () => {
  describe('normalizeWeights', () => {
    it('normalizes weights to sum to 1', () => {
      const w = normalizeWeights({ speed: 2, correctness: 2, profitability: 2, reversibility: 2, confidence: 2 });
      const sum = w.speed + w.correctness + w.profitability + w.reversibility + w.confidence;
      expect(sum).toBeCloseTo(1, 10);
      expect(w.speed).toBeCloseTo(0.2, 10);
    });

    it('falls back to a uniform objective when all weights are zero', () => {
      const w = normalizeWeights({ speed: 0, correctness: 0, profitability: 0, reversibility: 0, confidence: 0 });
      expect(w.correctness).toBeCloseTo(0.2, 10);
    });

    it('clamps negative weights to zero', () => {
      const w = normalizeWeights({ speed: -5, correctness: 1, profitability: 0, reversibility: 0, confidence: 0 });
      expect(w.speed).toBe(0);
      expect(w.correctness).toBeCloseTo(1, 10);
    });
  });

  describe('scorePath', () => {
    it('computes a weighted objective value in [0,1]', () => {
      const objective = normalizeWeights(DEFAULT_OBJECTIVE);
      const scored = scorePath(rigorousPath, objective);
      expect(scored.score).toBeGreaterThanOrEqual(0);
      expect(scored.score).toBeLessThanOrEqual(1);
      // breakdown contributions sum to the total score
      const b = scored.breakdown;
      const sum = b.speed + b.correctness + b.profitability + b.reversibility + b.confidence;
      expect(sum).toBeCloseTo(scored.score, 4);
    });
  });

  describe('planTask', () => {
    it('selects the highest objective-scoring path', () => {
      // Correctness-heavy objective should prefer the rigorous path.
      const correctnessFirst: ObjectiveWeights = {
        speed: 0.05, correctness: 0.8, profitability: 0.05, reversibility: 0.05, confidence: 0.05,
      };
      const plan = planTask('high-stakes task', [fastPath, rigorousPath], correctnessFirst);
      expect(plan.chosen.path.id).toBe('path-rigorous');
    });

    it('flips selection when the objective favors speed', () => {
      const speedFirst: ObjectiveWeights = {
        speed: 0.8, correctness: 0.05, profitability: 0.05, reversibility: 0.05, confidence: 0.05,
      };
      const plan = planTask('quick task', [fastPath, rigorousPath], speedFirst);
      expect(plan.chosen.path.id).toBe('path-fast');
    });

    it('ranks all candidates in descending score order', () => {
      const plan = planTask('t', [fastPath, rigorousPath]);
      for (let i = 1; i < plan.ranked.length; i++) {
        expect(plan.ranked[i - 1].score).toBeGreaterThanOrEqual(plan.ranked[i].score);
      }
      expect(plan.chosen).toEqual(plan.ranked[0]);
    });

    it('breaks ties by confidence, then step count, then id', () => {
      // Two paths with identical objective scores under a uniform objective,
      // differing only in confidence → higher confidence wins.
      const a: CandidatePath = {
        id: 'path-a', label: 'a', steps: [{ solver: 'DIRECT', description: 'x' }],
        estimates: { speed: 0.5, correctness: 0.5, profitability: 0.5, reversibility: 0.5, confidence: 0.4 },
      };
      const b: CandidatePath = {
        id: 'path-b', label: 'b', steps: [{ solver: 'DIRECT', description: 'x' }],
        estimates: { speed: 0.5, correctness: 0.5, profitability: 0.5, reversibility: 0.5, confidence: 0.9 },
      };
      const uniform: ObjectiveWeights = { speed: 1, correctness: 1, profitability: 1, reversibility: 0, confidence: 0 };
      const plan = planTask('tie', [a, b], uniform);
      expect(plan.chosen.score).toBe(plan.ranked[1].score); // equal scores
      expect(plan.chosen.path.id).toBe('path-b');
    });

    it('throws when given no candidates', () => {
      expect(() => planTask('t', [])).toThrow(/at least one candidate/);
    });

    it('is deterministic — same input yields identical plan', () => {
      const a = planTask('determinism check', [fastPath, rigorousPath]);
      const b = planTask('determinism check', [fastPath, rigorousPath]);
      expect(a).toEqual(b);
    });

    it('emits a schema-valid plan', () => {
      const plan = planTask('schema check', [fastPath, rigorousPath]);
      expect(() => PlanResultSchema.parse(plan)).not.toThrow();
    });
  });

  describe('generateCandidatePaths', () => {
    it('produces the fast/balanced/rigorous fan-out', () => {
      const paths = generateCandidatePaths('Refactor the database migration schema with rollback');
      expect(paths.map((p) => p.id)).toEqual(['path-fast', 'path-balanced', 'path-rigorous']);
      for (const p of paths) {
        for (const dim of ['speed', 'correctness', 'profitability', 'reversibility', 'confidence'] as const) {
          expect(p.estimates[dim]).toBeGreaterThanOrEqual(0);
          expect(p.estimates[dim]).toBeLessThanOrEqual(1);
        }
      }
    });

    it('routes backend/db verification through STATIC_ANALYSIS', () => {
      const paths = generateCandidatePaths('Run the database migration and schema rollback');
      const rigorous = paths.find((p) => p.id === 'path-rigorous')!;
      const verifyStep = rigorous.steps[rigorous.steps.length - 1];
      expect(verifyStep.solver).toBe('STATIC_ANALYSIS');
    });

    it('is deterministic across calls', () => {
      const q = 'Plan the architecture and verify the latest documentation';
      expect(generateCandidatePaths(q)).toEqual(generateCandidatePaths(q));
    });
  });

  describe('planAuto', () => {
    it('plans end-to-end from a raw task', () => {
      const plan = planAuto('Design a high-stakes architecture decomposition for the platform');
      expect(['path-fast', 'path-balanced', 'path-rigorous']).toContain(plan.chosen.path.id);
      expect(plan.ranked).toHaveLength(3);
      expect(() => PlanResultSchema.parse(plan)).not.toThrow();
    });

    it('prefers a rigorous path for high-correctness objectives on deep tasks', () => {
      const correctnessFirst: ObjectiveWeights = {
        speed: 0.05, correctness: 0.85, profitability: 0.05, reversibility: 0.025, confidence: 0.025,
      };
      const plan = planAuto(
        'Migrate the database schema, refactor the security authorization, and add encryption',
        correctnessFirst,
      );
      expect(plan.chosen.path.id).toBe('path-rigorous');
    });

    it('prefers the fast path for speed/profit objectives on trivial tasks', () => {
      const speedFirst: ObjectiveWeights = {
        speed: 0.6, correctness: 0.05, profitability: 0.3, reversibility: 0.025, confidence: 0.025,
      };
      const plan = planAuto('rename a variable', speedFirst);
      expect(plan.chosen.path.id).toBe('path-fast');
    });
  });

  describe('summarizePlan', () => {
    it('summarizes the chosen path and ranked tree', () => {
      const plan = planTask('summary', [fastPath, rigorousPath]);
      const s = summarizePlan(plan);
      expect(s).toContain(plan.chosen.path.id);
      expect(s).toContain('path-fast');
      expect(s).toContain('path-rigorous');
    });
  });
});
