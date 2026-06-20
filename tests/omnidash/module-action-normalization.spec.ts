import { describe, it, expect } from 'vitest';
// Import the CANONICAL production hook directly (vitest '@/' maps to the root
// ./src stub; the production normalizer lives under apps/omnihub-site/src).
import {
  normalizeLiveActions,
  humanizeActionId,
} from '../../apps/omnihub-site/src/hooks/useOmniModuleState';
import type { ModuleAction } from '../../apps/omnihub-site/dashboard/components/ModuleRegistry';

// Baseline registry actions for the Links module (from moduleData.json).
const LINKS_BASELINE: readonly ModuleAction[] = [
  { id: 'add-link', label: 'Add Connection', variant: 'primary' },
  { id: 'test-all', label: 'Test All Links', variant: 'secondary' },
];

describe('normalizeLiveActions (D-1 production binding fix)', () => {
  it('normalizes string action ids from live module-state using registry labels', () => {
    // Exact production payload: omnilink-port/module-state returns string ids.
    const result = normalizeLiveActions(['add-link', 'test-all'], LINKS_BASELINE);
    expect(result).toEqual([
      { id: 'add-link', label: 'Add Connection', variant: 'primary' },
      { id: 'test-all', label: 'Test All Links', variant: 'secondary' },
    ]);
  });

  it('dispatches a real id (never undefined) for every normalized action', () => {
    const result = normalizeLiveActions(['add-link', 'test-all'], LINKS_BASELINE) ?? [];
    expect(result.length).toBe(2);
    for (const action of result) {
      expect(typeof action.id).toBe('string');
      expect(action.id.length).toBeGreaterThan(0);
      expect(action.label.length).toBeGreaterThan(0);
    }
    // The add-link id survives normalization so LinksModule.handleAction can match it.
    expect(result.map((a) => a.id)).toContain('add-link');
  });

  it('hydrates an unknown string id with a humanized label and secondary variant', () => {
    expect(normalizeLiveActions(['mystery-action'], [])).toEqual([
      { id: 'mystery-action', label: 'Mystery Action', variant: 'secondary' },
    ]);
  });

  it('preserves valid object actions and fills gaps from baseline', () => {
    const result = normalizeLiveActions([{ id: 'add-link' }], LINKS_BASELINE);
    expect(result).toEqual([
      { id: 'add-link', label: 'Add Connection', variant: 'primary' },
    ]);
  });

  it('returns undefined for non-array input so existing fallback applies', () => {
    expect(normalizeLiveActions(undefined, LINKS_BASELINE)).toBeUndefined();
    expect(normalizeLiveActions(null, LINKS_BASELINE)).toBeUndefined();
    expect(normalizeLiveActions('add-link', LINKS_BASELINE)).toBeUndefined();
  });

  it('humanizeActionId formats kebab ids', () => {
    expect(humanizeActionId('add-link')).toBe('Add Link');
    expect(humanizeActionId('test-all')).toBe('Test All');
  });
});
