import { describe, expect, it } from 'vitest';
import { APP_REGISTRY } from '../../packages/core/src/registry';
import { CHAOS_TARGETS } from '../../packages/core/src/chaos-contract';

describe('App registry contract', () => {
  it('enforces exactly 14 registry entries', () => {
    expect(APP_REGISTRY).toHaveLength(14);
  });

  it('derives chaos targets from chaosTarget=true entries', () => {
    const expectedKeys = APP_REGISTRY.filter((entry) => entry.chaosTarget === true).map((entry) => entry.key);
    const actualKeys = CHAOS_TARGETS.map((target) => target.key);

    expect(actualKeys).toEqual(expectedKeys);
    expect(actualKeys.length).toBeGreaterThan(0);
  });
});
