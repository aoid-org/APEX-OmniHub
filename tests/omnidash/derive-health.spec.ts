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
import type { OmniSlateContextItem } from '@/dashboard/types/context.types';

const mockItem = (health: 'healthy' | 'warning' | 'broken' | 'unknown'): OmniSlateContextItem => ({
  id: '1',
  kind: 'apex_app',
  label: 'A',
  source: 'system',
  health,
  metadata: {},
  droppedAt: ''
});

describe('deriveHealth', () => {
  it('returns "red" when any item has health === "broken"', () => {
    const items: readonly OmniSlateContextItem[] = [
      mockItem('healthy'),
      mockItem('broken'),
    ];
    expect(deriveHealth(items)).toBe('red');
  });

  it('returns "yellow" when any item has health === "warning" and none is broken', () => {
    const items: readonly OmniSlateContextItem[] = [
      mockItem('healthy'),
      mockItem('warning'),
    ];
    expect(deriveHealth(items)).toBe('yellow');
  });

  it('returns "green" when all items have health === "healthy"', () => {
    const items: readonly OmniSlateContextItem[] = [
      mockItem('healthy'),
      mockItem('healthy'),
    ];
    expect(deriveHealth(items)).toBe('green');
  });

  it('returns "green" for an empty context array', () => {
    expect(deriveHealth([])).toBe('green');
  });

  it('red takes precedence over yellow', () => {
    const items: readonly OmniSlateContextItem[] = [
      mockItem('warning'),
      mockItem('broken'),
    ];
    expect(deriveHealth(items)).toBe('red');
  });
});
