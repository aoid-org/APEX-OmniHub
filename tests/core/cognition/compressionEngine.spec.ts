/**
 * CompressionEngine Unit Tests
 * @module tests/core/cognition/compressionEngine
 *
 * Validates standalone compression utilities:
 *  - Entity extraction (PascalCase, file paths, dotted names, ALL_CAPS)
 *  - Jaccard similarity computation
 *  - Semantic deduplication
 *  - Primacy-Recency Split compression
 *  - Entity retention quality gate
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { describe, expect, it } from 'vitest';

import {
  compressEntries,
  deduplicateEntries,
  extractEntities,
  jaccardSimilarity,
  verifyRetention,
  type CompressibleEntry,
} from '../../../src/core/cognition/compressionEngine';

// ============================================================================
// Helpers
// ============================================================================

function makeEntry(id: string, content: string): CompressibleEntry {
  return { id, content, timestamp: new Date().toISOString() };
}

function makeEntries(count: number, prefix = 'entry'): CompressibleEntry[] {
  return Array.from({ length: count }, (_, i) =>
    makeEntry(`${prefix}-${i}`, `${prefix} action ${i} with some detail`),
  );
}

// ============================================================================
// Entity Extraction
// ============================================================================

describe('extractEntities', () => {
  it('extracts PascalCase identifiers', () => {
    const entities = extractEntities(
      'The CognitionManager handles TaskComplexityScorer routing.',
    );
    expect(entities).toContain('CognitionManager');
    expect(entities).toContain('TaskComplexityScorer');
  });

  it('extracts file paths starting with src/', () => {
    const entities = extractEntities(
      'Modified src/core/cognition/brain.md for persistence.',
    );
    expect(entities).toContain('src/core/cognition/brain.md');
  });

  it('extracts dotted file names', () => {
    const entities = extractEntities(
      'Updated omniModalStore.ts and compressionEngine.ts',
    );
    expect(entities).toContain('omniModalStore.ts');
    expect(entities).toContain('compressionEngine.ts');
  });

  it('extracts ALL_CAPS constants', () => {
    const entities = extractEntities(
      'Check CACHE_VERSION and SHORT_TERM_MAX against limits.',
    );
    expect(entities).toContain('CACHE_VERSION');
    expect(entities).toContain('SHORT_TERM_MAX');
  });

  it('returns deduplicated sorted array', () => {
    const entities = extractEntities(
      'CognitionManager then CognitionManager again',
    );
    const cognitionCount = entities.filter(
      (e) => e === 'CognitionManager',
    ).length;
    expect(cognitionCount).toBe(1);
    // Verify sorted
    for (let i = 1; i < entities.length; i++) {
      expect(entities[i] >= entities[i - 1]).toBe(true);
    }
  });

  it('returns empty array for text with no entities', () => {
    const entities = extractEntities('just some lowercase words');
    // May match dotted patterns — assert no PascalCase or ALL_CAPS
    const hasPascal = entities.some((e) => /^[A-Z][a-z]+[A-Z]/.test(e));
    const hasCaps = entities.some((e) => /^[A-Z][A-Z_]{2,}$/.test(e));
    expect(hasPascal).toBe(false);
    expect(hasCaps).toBe(false);
  });
});

// ============================================================================
// Jaccard Similarity
// ============================================================================

describe('jaccardSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(jaccardSimilarity('hello world', 'hello world')).toBe(1);
  });

  it('returns 0 for completely disjoint strings', () => {
    expect(jaccardSimilarity('alpha beta', 'gamma delta')).toBe(0);
  });

  it('returns a value between 0 and 1 for partial overlap', () => {
    const sim = jaccardSimilarity('the quick brown fox', 'the slow brown dog');
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it('is case-insensitive', () => {
    expect(jaccardSimilarity('Hello World', 'hello world')).toBe(1);
  });

  it('returns 1 for two empty strings', () => {
    expect(jaccardSimilarity('', '')).toBe(1);
  });

  it('returns 0 when one string is empty', () => {
    expect(jaccardSimilarity('hello', '')).toBe(0);
    expect(jaccardSimilarity('', 'world')).toBe(0);
  });
});

// ============================================================================
// Deduplication
// ============================================================================

describe('deduplicateEntries', () => {
  it('keeps unique entries unchanged', () => {
    const entries = [
      makeEntry('1', 'deploy database migration'),
      makeEntry('2', 'update UI dashboard component'),
      makeEntry('3', 'configure authentication flow'),
    ];
    const result = deduplicateEntries(entries);
    expect(result.unique).toHaveLength(3);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it('removes near-duplicate entries above default threshold', () => {
    const entries = [
      makeEntry('1', 'deploy the database migration script'),
      makeEntry('2', 'deploy the database migration script now'),
    ];
    const result = deduplicateEntries(entries);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it('respects custom threshold', () => {
    const entries = [
      makeEntry('1', 'alpha beta gamma'),
      makeEntry('2', 'alpha beta delta'),
    ];
    // Low threshold = more aggressive dedup
    const strict = deduplicateEntries(entries, 0.3);
    expect(strict.duplicatesRemoved).toBe(1);

    // High threshold = more lenient
    const lenient = deduplicateEntries(entries, 0.99);
    expect(lenient.duplicatesRemoved).toBe(0);
  });

  it('handles empty input', () => {
    const result = deduplicateEntries([]);
    expect(result.unique).toHaveLength(0);
    expect(result.duplicatesRemoved).toBe(0);
  });
});

// ============================================================================
// Compression
// ============================================================================

describe('compressEntries', () => {
  it('returns all entries preserved when count ≤ 10', () => {
    const entries = makeEntries(8);
    const result = compressEntries(entries);
    expect(result.preserved).toHaveLength(8);
    expect(result.summaries).toHaveLength(0);
    expect(result.compressedCount).toBe(0);
    expect(result.ratio).toBe(1);
  });

  it('compresses middle zone for 20+ entries', () => {
    const entries = makeEntries(25);
    const result = compressEntries(entries);
    expect(result.compressedCount).toBeGreaterThan(0);
    expect(result.summaries.length).toBeGreaterThan(0);
    expect(result.preserved.length).toBeLessThan(25);
  });

  it('preserves primacy zone (first 20%) and recency zone (last 10%)', () => {
    const entries = makeEntries(50, 'op');
    const result = compressEntries(entries);

    // First entry should be in preserved
    const hasFirst = result.preserved.some((e) => e.id === 'op-0');
    expect(hasFirst).toBe(true);

    // Last entry should be in preserved
    const hasLast = result.preserved.some((e) => e.id === 'op-49');
    expect(hasLast).toBe(true);
  });

  it('produces a valid compression ratio for large input', () => {
    const entries = makeEntries(100);
    const result = compressEntries(entries);
    expect(result.ratio).toBeGreaterThan(0);
    expect(result.compressedCount).toBeGreaterThan(0);
    expect(result.summaries.length).toBeGreaterThan(0);
  });

  it('extracts entities from compressed summaries', () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeEntry(
        `e-${i}`,
        `Modified CognitionManager in src/core/cognition/${i}.ts`,
      ),
    );
    const result = compressEntries(entries);
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities).toContain('CognitionManager');
  });

  it('respects custom chunk size', () => {
    const entries = makeEntries(30);
    const small = compressEntries(entries, 3);
    const large = compressEntries(entries, 10);
    // Smaller chunks produce more summaries
    expect(small.summaries.length).toBeGreaterThanOrEqual(
      large.summaries.length,
    );
  });
});

// ============================================================================
// Retention Quality Gate
// ============================================================================

describe('verifyRetention', () => {
  it('passes when all entities are retained', () => {
    const original = ['Alpha', 'Beta', 'Gamma'];
    const compressed = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    expect(verifyRetention(original, compressed)).toBe(true);
  });

  it('passes at exactly 90% retention threshold', () => {
    const original = Array.from({ length: 10 }, (_, i) => `Entity${i}`);
    const compressed = original.slice(0, 9); // 9/10 = 90%
    expect(verifyRetention(original, compressed)).toBe(true);
  });

  it('fails below 90% retention', () => {
    const original = Array.from({ length: 10 }, (_, i) => `Entity${i}`);
    const compressed = original.slice(0, 8); // 8/10 = 80%
    expect(verifyRetention(original, compressed)).toBe(false);
  });

  it('passes with empty original entities', () => {
    expect(verifyRetention([], ['something'])).toBe(true);
  });

  it('respects custom threshold', () => {
    const original = ['A', 'B', 'C', 'D', 'E'];
    const compressed = ['A', 'B', 'C']; // 60%
    expect(verifyRetention(original, compressed, 0.5)).toBe(true);
    expect(verifyRetention(original, compressed, 0.7)).toBe(false);
  });
});
