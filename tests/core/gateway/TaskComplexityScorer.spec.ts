/**
 * TaskComplexityScorer — Unit Tests
 * @module tests/core/gateway/TaskComplexityScorer
 *
 * Validates the deterministic scoring and domain classification logic.
 *
 * APEX STANDARDS ENFORCED:
 * - Determinism: Same input MUST produce same output.
 * - Edge Case Coverage: Empty strings, no matches, tie-breaking.
 */
import { describe, expect, it } from 'vitest';
import { scoreTask } from '../../../src/core/gateway/TaskComplexityScorer';

describe('TaskComplexityScorer', () => {
  describe('scoreTask', () => {
    // --- Migrated Tests ---

    it('assigns positive depth score for backend keywords', () => {
      const result = scoreTask(
        'Create a migration to add the users schema with rollback support',
      );
      expect(result.depthScore).toBeGreaterThan(0);
      expect(result.target).toBe('CLAUDE_OPUS');
    });

    it('assigns negative depth score for frontend keywords', () => {
      const result = scoreTask(
        'Build a responsive dashboard layout with CSS animations and SVG icons',
      );
      expect(result.depthScore).toBeLessThan(0);
      expect(result.target).toBe('GEMINI_PRO');
    });

    it('routes ambiguous tasks to CLAUDE_OPUS as fail-safe', () => {
      const result = scoreTask('Do something vague and unclassifiable');
      expect(result.target).toBe('CLAUDE_OPUS');
      expect(result.reasoning).toContain('Ambiguous');
    });

    it('classifies domain via keyword match count', () => {
      const dbResult = scoreTask(
        'Run SQL migration on Supabase Postgres with RLS policy',
      );
      expect(dbResult.domain).toBe('database');

      const uiResult = scoreTask(
        'Create a button component with modal dropdown form and input',
      );
      expect(uiResult.domain).toBe('ui');
    });

    it('estimates output tokens from input length', () => {
      const result = scoreTask('Short task');
      expect(result.estimatedTokens).toBeGreaterThanOrEqual(100);

      const longResult = scoreTask('A '.repeat(500));
      expect(longResult.estimatedTokens).toBeGreaterThan(
        result.estimatedTokens,
      );
    });

    it('records matched keywords with weights', () => {
      const result = scoreTask('migration with refactor and security review');
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
      const migrationKw = result.matchedKeywords.find(
        (kw) => kw.keyword === 'migration',
      );
      expect(migrationKw).toBeDefined();
      expect(migrationKw?.weight).toBe(15);
    });

    it('provides reasoning trace', () => {
      const result = scoreTask('Create UI layout with CSS animations');
      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(10);
    });

    // --- New Edge Case Tests ---

    it('handles empty string input gracefully', () => {
      const result = scoreTask('');
      expect(result.depthScore).toBe(0);
      expect(result.domain).toBe('general');
      expect(result.target).toBe('CLAUDE_OPUS'); // Ambiguous case
      expect(result.matchedKeywords).toEqual([]);
    });

    it('handles strings with only punctuation', () => {
      const result = scoreTask('!!! ??? ...');
      expect(result.depthScore).toBe(0);
      expect(result.domain).toBe('general');
      expect(result.matchedKeywords).toEqual([]);
    });

    it('handles strings with no matching keywords', () => {
      const result = scoreTask('The quick brown fox jumps over the lazy dog');
      expect(result.depthScore).toBe(0);
      expect(result.domain).toBe('general');
      expect(result.target).toBe('CLAUDE_OPUS');
    });

    it('is case-insensitive for both scoring and domain classification', () => {
      const upper = scoreTask('MIGRATION REACT');
      const lower = scoreTask('migration react');

      expect(upper.depthScore).toBe(lower.depthScore);
      expect(upper.domain).toBe(lower.domain);
      expect(upper.target).toBe(lower.target);
    });

    it('applies domain tie-breaking (first match wins based on internal order)', () => {
      // 'api' -> backend, 'react' -> frontend.
      // DOMAIN_KEYWORDS order: backend, frontend, database, security, orchestration, ui, visualization, multimodal, general
      const result = scoreTask('api react');
      expect(result.domain).toBe('backend'); // backend comes before frontend
    });

    it('performs substring matches for domain classification', () => {
      // 'authentication' contains 'auth' which is a security domain keyword
      const result = scoreTask('authentication');
      expect(result.domain).toBe('security');
    });

    it('performs exact word matches for keyword weights', () => {
      // 'migrations' (plural) should NOT match 'migration' (singular) for weight
      // but WILL match for domain classification (substring)
      const result = scoreTask('migrations');
      expect(result.depthScore).toBe(0);
      expect(result.domain).toBe('database');
    });

    it('handles multiple occurrences of the same keyword', () => {
      // 'migration' weight is 15. Twice should be 30.
      const result = scoreTask('migration migration');
      expect(result.depthScore).toBe(30);
      expect(result.matchedKeywords).toHaveLength(2);
    });

    it('routes to CLAUDE_OPUS when score exceeds threshold even if domain is frontend', () => {
      // migration (15) * 4 = 60. Threshold is 50.
      // react -> frontend domain.
      const result = scoreTask('migration migration migration migration react');
      expect(result.depthScore).toBe(60);
      expect(result.domain).toBe('frontend'); // 1 match for frontend, 1 match for database (migration) -> tie-break to database?
      // Wait, let's check tie-break:
      // backend: 0
      // frontend: 'react' (1)
      // database: 'migration' (1)
      // Tie-break: backend, frontend, database. Frontend wins over database.

      expect(result.domain).toBe('frontend');
      expect(result.target).toBe('CLAUDE_OPUS');
    });

    it('routes to GEMINI_PRO for low score and frontend-leaning domain', () => {
      // dashboard domain: visualization
      const result = scoreTask('dashboard');
      expect(result.depthScore).toBe(-5);
      expect(result.domain).toBe('visualization');
      expect(result.target).toBe('GEMINI_PRO');
    });

    it('handles complex tokenization (slashes, backslashes, braces)', () => {
      const result = scoreTask('migration/refactor{security}\\api');
      // words: migration, refactor, security, api
      // migration(15) + refactor(10) + security(8) + api(5) = 38
      expect(result.depthScore).toBe(38);
      expect(result.matchedKeywords.map(k => k.keyword)).toContain('migration');
      expect(result.matchedKeywords.map(k => k.keyword)).toContain('refactor');
      expect(result.matchedKeywords.map(k => k.keyword)).toContain('security');
      expect(result.matchedKeywords.map(k => k.keyword)).toContain('api');
    });
  });

  describe('DETERMINISM (critical gate)', () => {
    it('produces identical results for the same input across 100 runs', () => {
      const input =
        'Refactor the authentication middleware with saga orchestrator support';
      const baseline = scoreTask(input);

      for (let i = 0; i < 100; i++) {
        const result = scoreTask(input);
        expect(result.depthScore).toBe(baseline.depthScore);
        expect(result.target).toBe(baseline.target);
        expect(result.domain).toBe(baseline.domain);
        expect(result.matchedKeywords).toEqual(baseline.matchedKeywords);
      }
    });
  });
});
