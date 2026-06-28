import { describe, it, expect } from 'vitest';
import {
  canOwnAppIntegration,
  mustHandoffToOmniBoard,
  IntegrationSurface,
} from '../../apps/omnihub-site/dashboard/contracts/appIntegrationOwnership';
import {
  connectModuleKey,
  ownerForIntegration,
  APEX_APPS_MODULE_KEY,
  OMNIBOARD_MODULE_KEY,
} from '../../apps/omnihub-site/dashboard/contracts/omniSurfaceOwnership';

// Canon updated 2026-06-28 (contract §1): the single-owner model is RETIRED.
// Two owners now exist — OmniBoard (third-party) and APEX Apps (first-party MCP).
describe('Integration Ownership Contract (two-owner canon)', () => {
  it('recognises both OmniBoard and APEX Apps as owners; nothing else', () => {
    expect(canOwnAppIntegration('omniboard')).toBe(true);
    expect(canOwnAppIntegration('apex_ecosystem')).toBe(true);

    const nonOwners: IntegrationSurface[] = [
      'omnislate', 'settings', 'header',
      'right_rail', 'integrated_apps', 'links_module', 'other',
    ];
    nonOwners.forEach(surface => {
      expect(canOwnAppIntegration(surface)).toBe(false);
    });
  });

  it('does NOT hand APEX ecosystem apps off to OmniBoard', () => {
    expect(mustHandoffToOmniBoard('apex_ecosystem')).toBe(false);
    expect(mustHandoffToOmniBoard('omniboard')).toBe(false);
  });

  it('still hands genuine third-party surfaces off to OmniBoard', () => {
    const thirdParty: IntegrationSurface[] = [
      'settings', 'integrated_apps', 'links_module',
    ];
    thirdParty.forEach(surface => {
      expect(mustHandoffToOmniBoard(surface)).toBe(true);
    });
  });

  it('routes each integration kind to its owning module', () => {
    expect(ownerForIntegration('apex_ecosystem')).toBe('apex_apps');
    expect(ownerForIntegration('third_party')).toBe('omniboard');
    expect(connectModuleKey('apex_ecosystem')).toBe(APEX_APPS_MODULE_KEY);
    expect(connectModuleKey('third_party')).toBe(OMNIBOARD_MODULE_KEY);
  });
});
