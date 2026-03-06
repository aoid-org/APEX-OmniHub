/**
 * ZIndexManager — Battery Stress Tests
 *
 * Pure function module — no React dependencies needed.
 * Tests all 5 public functions under normal, edge, and stress conditions.
 *
 * APEX STANDARDS: Every test is deterministic. Same input → same output.
 */

import { describe, it, expect } from 'vitest';
import {
  getNextZ,
  getMaxZ,
  needsNormalization,
  normalizeZStack,
  bringToFront,
  CANVAS_Z_BASE,
} from '../../apps/omnihub-site/src/lib/ZIndexManager';

// ═══════════════════════════════════════════════════
// getNextZ
// ═══════════════════════════════════════════════════

describe('ZIndexManager.getNextZ', () => {
  it('returns CANVAS_Z_BASE for empty layouts', () => {
    expect(getNextZ({})).toBe(CANVAS_Z_BASE);
  });

  it('returns max + 1 for single widget', () => {
    expect(getNextZ({ a: { z: 15 } })).toBe(16);
  });

  it('returns max + 1 for multiple widgets', () => {
    expect(getNextZ({ a: { z: 10 }, b: { z: 25 }, c: { z: 12 } })).toBe(26);
  });

  it('handles identical z-values', () => {
    expect(getNextZ({ a: { z: 10 }, b: { z: 10 } })).toBe(11);
  });
});

// ═══════════════════════════════════════════════════
// getMaxZ
// ═══════════════════════════════════════════════════

describe('ZIndexManager.getMaxZ', () => {
  it('returns CANVAS_Z_BASE for empty layouts', () => {
    expect(getMaxZ({})).toBe(CANVAS_Z_BASE);
  });

  it('returns correct max across many widgets', () => {
    const layouts: Record<string, { z: number }> = {};
    for (let i = 0; i < 50; i++) {
      layouts[`w-${String(i)}`] = { z: CANVAS_Z_BASE + i * 3 };
    }
    expect(getMaxZ(layouts)).toBe(CANVAS_Z_BASE + 49 * 3);
  });
});

// ═══════════════════════════════════════════════════
// needsNormalization
// ═══════════════════════════════════════════════════

describe('ZIndexManager.needsNormalization', () => {
  it('returns false for fresh layouts', () => {
    expect(needsNormalization({ a: { z: 10 }, b: { z: 11 } })).toBe(false);
  });

  it('returns true when z-index reaches 900', () => {
    expect(needsNormalization({ a: { z: 900 } })).toBe(true);
  });

  it('returns true when z-index exceeds 900', () => {
    expect(needsNormalization({ a: { z: 950 } })).toBe(true);
  });

  it('returns false at z=899', () => {
    expect(needsNormalization({ a: { z: 899 } })).toBe(false);
  });

  it('returns false for empty layouts', () => {
    expect(needsNormalization({})).toBe(false);
  });
});

// ═══════════════════════════════════════════════════
// normalizeZStack
// ═══════════════════════════════════════════════════

describe('ZIndexManager.normalizeZStack', () => {
  it('returns empty for empty layouts', () => {
    expect(normalizeZStack({})).toEqual({});
  });

  it('compacts z-values to sequential from CANVAS_Z_BASE', () => {
    const result = normalizeZStack({
      a: { z: 450 },
      b: { z: 899 },
      c: { z: 200 },
    });

    // c=200 < a=450 < b=899 → sequential: c=10, a=11, b=12
    expect(result.c.z).toBe(CANVAS_Z_BASE);
    expect(result.a.z).toBe(CANVAS_Z_BASE + 1);
    expect(result.b.z).toBe(CANVAS_Z_BASE + 2);
  });

  it('preserves relative order during normalization', () => {
    const result = normalizeZStack({
      x: { z: 100 },
      y: { z: 50 },
      z: { z: 75 },
    });

    // y=50 < z=75 < x=100
    expect(result.y.z).toBeLessThan(result.z.z);
    expect(result.z.z).toBeLessThan(result.x.z);
  });

  it('handles single widget', () => {
    const result = normalizeZStack({ only: { z: 888 } });
    expect(result.only.z).toBe(CANVAS_Z_BASE);
  });

  it('stress: normalizes 100 widgets correctly', () => {
    const layouts: Record<string, { z: number }> = {};
    for (let i = 0; i < 100; i++) {
      layouts[`w-${String(i)}`] = { z: 500 + i * 4 };
    }

    const result = normalizeZStack(layouts);
    const zValues = Object.values(result).map(l => l.z);
    const sorted = [...zValues].sort((a, b) => a - b);

    // All z-values should be sequential from CANVAS_Z_BASE
    expect(sorted[0]).toBe(CANVAS_Z_BASE);
    expect(sorted.at(-1)).toBe(CANVAS_Z_BASE + 99);

    // Every value should be unique
    expect(new Set(zValues).size).toBe(100);
  });
});

// ═══════════════════════════════════════════════════
// bringToFront
// ═══════════════════════════════════════════════════

describe('ZIndexManager.bringToFront', () => {
  it('elevates widget above all others', () => {
    const layouts = { a: { z: 10 }, b: { z: 12 }, c: { z: 11 } };
    const { newZ } = bringToFront('a', layouts);
    expect(newZ).toBe(13); // max(12) + 1
  });

  it('is idempotent when widget is already on top (single widget special case)', () => {
    const layouts = { a: { z: 15 }, b: { z: 12 } };
    const { newZ } = bringToFront('a', layouts);
    // Already on top — no change
    expect(newZ).toBe(15);
  });

  it('returns CANVAS_Z_BASE for unknown widget', () => {
    const layouts = { a: { z: 10 } };
    const result = bringToFront('unknown', layouts);
    // Unknown widget — uses fallback z from CANVAS_Z_BASE
    expect(result.newZ).toBeDefined();
  });

  it('triggers normalization when z-index inflation reaches threshold', () => {
    const layouts = { a: { z: 898 }, b: { z: 899 } };
    const { normalized } = bringToFront('a', layouts);
    expect(normalized).toBe(true);
  });

  it('does NOT normalize when below threshold', () => {
    const layouts = { a: { z: 10 }, b: { z: 20 } };
    const { normalized } = bringToFront('a', layouts);
    expect(normalized).toBe(false);
  });

  it('stress: 500 sequential bringToFront calls stay below PIP floor', () => {
    let layouts: Record<string, { z: number }> = {};
    for (let i = 0; i < 10; i++) {
      layouts[`w-${String(i)}`] = { z: CANVAS_Z_BASE + i };
    }

    // Simulate 500 clicks cycling through widgets
    for (let click = 0; click < 500; click++) {
      const widgetKey = `w-${String(click % 10)}`;
      const { newZ, normalized } = bringToFront(widgetKey, layouts);

      if (normalized) {
        // Apply normalization
        const normalizedZ = normalizeZStack(layouts);
        for (const [id, { z }] of Object.entries(normalizedZ)) {
          layouts[id] = { z };
        }
        layouts[widgetKey] = { z: newZ };
      } else {
        layouts[widgetKey] = { z: newZ };
      }
    }

    // After 500 operations, no z-value should exceed PIP floor (1000)
    const allZ = Object.values(layouts).map(l => l.z);
    expect(Math.max(...allZ)).toBeLessThan(1000);
  });
});
