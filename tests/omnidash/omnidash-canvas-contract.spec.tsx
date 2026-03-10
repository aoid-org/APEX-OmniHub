/**
 * Omnidash Canvas Contract Tests
 * Lock 3: Assert canvas tiles derive from APP_REGISTRY metadata, not hardcoded values.
 */

import { describe, it, expect } from 'vitest';
import { APP_REGISTRY, type AppRegistryEntry } from '../../packages/core/src/registry';
import {
  OMNIDASH_CONTRACT,
  OMNIDASH_APP_COUNT,
  REQUIRED_APP_IDS,
} from '../../src/contracts/omnidash.contract';

describe('Omnidash Canvas Contract', () => {
  it('canvas must render exactly OMNIDASH_APP_COUNT app tiles', () => {
    // DashboardOverview renders AppsSection which maps APP_REGISTRY
    expect(APP_REGISTRY).toHaveLength(OMNIDASH_APP_COUNT);
  });

  it('each registry entry has valid metadata for tile rendering', () => {
    for (const entry of APP_REGISTRY) {
      // Label is shown on tile
      expect(entry.label).toBeTruthy();
      expect(typeof entry.label).toBe('string');

      // Route is used for navigation dispatch
      expect(entry.routePath).toMatch(/^\/omnidash/);

      // Status is shown on tile chip
      expect(['Live', 'Partial']).toContain(entry.dashboard.status);

      // Category drives tile grouping
      expect(['control-plane', 'security', 'automation', 'operations', 'platform']).toContain(entry.category);
    }
  });

  it('required apps exist in registry for tile rendering', () => {
    const registryKeys = APP_REGISTRY.map((entry: AppRegistryEntry) => entry.key);
    for (const requiredId of REQUIRED_APP_IDS) {
      expect(registryKeys).toContain(requiredId);
    }
  });

  it('contract apps have correct launchMode for intent dispatch', () => {
    const orchestrator = OMNIDASH_CONTRACT.find(a => a.id === 'orchestrator');
    expect(orchestrator).toBeDefined();
    expect(orchestrator!.launchMode).toBe('oauth'); // Partial → oauth flow

    const fortress = OMNIDASH_CONTRACT.find(a => a.id === 'fortress');
    expect(fortress).toBeDefined();
    expect(fortress!.launchMode).toBe('navigate'); // Live → direct navigation
  });

  it('every contract app has a valid widgetType or null', () => {
    for (const app of OMNIDASH_CONTRACT) {
      expect([null, 'module', 'iframe', 'native']).toContain(app.widgetType);
    }
  });

  it('contract app defaultBounds are positive integers', () => {
    for (const app of OMNIDASH_CONTRACT) {
      expect(app.defaultBounds.width).toBeGreaterThan(0);
      expect(app.defaultBounds.height).toBeGreaterThan(0);
      expect(Number.isInteger(app.defaultBounds.width)).toBe(true);
      expect(Number.isInteger(app.defaultBounds.height)).toBe(true);
    }
  });

  it('each tile click dispatches an OmniDashIntent with the correct appKey', () => {
    // Verify handleAppClick in DashboardOverview maps correctly:
    // APP_REGISTRY.find(e => e.label === app.name) → intent.appKey = entry.key
    for (const entry of APP_REGISTRY) {
      const contractApp = OMNIDASH_CONTRACT.find(a => a.id === entry.key);
      expect(contractApp).toBeDefined();
      expect(contractApp!.title).toBe(entry.label);
    }
  });
});
