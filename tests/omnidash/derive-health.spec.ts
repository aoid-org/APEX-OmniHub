/**
 * deriveHealth — Unit Tests
 * @module tests/omnidash/derive-health.spec
 *
 * OMNI-TEST UNIVERSAL — AAA pattern enforced.
 * Covers all 3 return branches of deriveHealth:
 *   red path, yellow path, green (default) path.
 */

import { describe, it, expect } from 'vitest';
import { deriveHealth } from '@/dashboard/components/DashboardOverview/data';
import type { ContextItem } from '@/dashboard/components/DashboardOverview/types';

describe('deriveHealth', () => {
  it('returns "red" when any item has health === "red"', () => {
    const items: readonly ContextItem[] = [
      { name: 'A', health: 'green', insight: 'ok' },
      { name: 'B', health: 'red', insight: 'critical' },
    ];
    expect(deriveHealth(items)).toBe('red');
  });

  it('returns "yellow" when any item has health === "yellow" and none is red', () => {
    const items: readonly ContextItem[] = [
      { name: 'A', health: 'green', insight: 'ok' },
      { name: 'B', health: 'yellow', insight: 'warn' },
    ];
    expect(deriveHealth(items)).toBe('yellow');
  });

  it('returns "green" when all items have health === "green"', () => {
    const items: readonly ContextItem[] = [
      { name: 'A', health: 'green', insight: 'ok' },
      { name: 'B', health: 'green', insight: 'nominal' },
    ];
    expect(deriveHealth(items)).toBe('green');
  });

  it('returns "green" for an empty context array', () => {
    expect(deriveHealth([])).toBe('green');
  });

  it('red takes precedence over yellow', () => {
    const items: readonly ContextItem[] = [
      { name: 'A', health: 'yellow', insight: 'warn' },
      { name: 'B', health: 'red', insight: 'critical' },
    ];
    expect(deriveHealth(items)).toBe('red');
  });
});
