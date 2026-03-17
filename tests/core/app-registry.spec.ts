import { describe, expect, it } from 'vitest';
import { APP_REGISTRY } from '../../packages/core/src/registry';
import { CHAOS_TARGETS } from '../../packages/core/src/chaos-contract';
import { parseAppRegistry } from '../../packages/core/src/registry.schema';
import {
  OMNIDASH_CONTRACT,
  OMNIDASH_APP_COUNT,
  REQUIRED_APP_IDS,
  omniDashContractSchema,
} from '../../src/contracts/omnidash.contract';

describe('App registry contract', () => {
  it('enforces exactly 14 registry entries', () => {
    expect(APP_REGISTRY).toHaveLength(14);
    expect(() => parseAppRegistry(APP_REGISTRY)).not.toThrow();
  });

  it('contains required app IDs: orchestrator and fortress', () => {
    const registryKeys = APP_REGISTRY.map(entry => entry.key);
    for (const requiredId of REQUIRED_APP_IDS) {
      expect(registryKeys).toContain(requiredId);
    }
  });

  it('derives chaos targets from chaosTarget=true entries', () => {
    const expectedKeys = APP_REGISTRY.filter((entry) => entry.chaosTarget === true).map((entry) => entry.key);
    const actualKeys = CHAOS_TARGETS.map((target) => target.key);

    expect(actualKeys).toEqual(expectedKeys);
    expect(actualKeys.length).toBeGreaterThan(0);
  });
});

describe('Omnidash contract', () => {
  it('enforces exactly OMNIDASH_APP_COUNT entries', () => {
    expect(OMNIDASH_CONTRACT).toHaveLength(OMNIDASH_APP_COUNT);
  });

  it('passes Zod schema validation', () => {
    expect(() => omniDashContractSchema.parse(OMNIDASH_CONTRACT)).not.toThrow();
  });

  it('contains all required app IDs', () => {
    const contractIds = OMNIDASH_CONTRACT.map(app => app.id);
    for (const requiredId of REQUIRED_APP_IDS) {
      expect(contractIds).toContain(requiredId);
    }
  });

  it('has matching app count between registry and contract', () => {
    expect(APP_REGISTRY).toHaveLength(OMNIDASH_CONTRACT.length);
  });

  it('has matching app keys between registry and contract', () => {
    const registryKeys = APP_REGISTRY.map(e => e.key).sort((a, b) => a.localeCompare(b));
    const contractIds = OMNIDASH_CONTRACT.map(a => a.id).sort((a, b) => a.localeCompare(b));
    expect(registryKeys).toEqual(contractIds);
  });
});
