import { describe, it, expect } from 'vitest';
import {
  APEX_APPS_MODULE_KEY,
  OMNIBOARD_MODULE_KEY,
  connectModuleKey,
  ownerForIntegration,
  isForbiddenRoute,
} from '../../apps/omnihub-site/dashboard/contracts/omniSurfaceOwnership';
import {
  canOwnAppIntegration,
  mustHandoffToOmniBoard,
} from '../../apps/omnihub-site/dashboard/contracts/appIntegrationOwnership';
import { resolveApexApp } from '../../apps/omnihub-site/dashboard/components/modules/apexAppsResolve';

describe('omniSurfaceOwnership — two-owner canon', () => {
  it('routes APEX ecosystem apps to the APEX Apps MCP modal, never OmniBoard', () => {
    expect(connectModuleKey('apex_ecosystem')).toBe(APEX_APPS_MODULE_KEY);
    expect(connectModuleKey('apex_ecosystem')).not.toBe(OMNIBOARD_MODULE_KEY);
    expect(ownerForIntegration('apex_ecosystem')).toBe('apex_apps');
  });

  it('routes third-party connections to OmniBoard', () => {
    expect(connectModuleKey('third_party')).toBe(OMNIBOARD_MODULE_KEY);
    expect(ownerForIntegration('third_party')).toBe('omniboard');
  });

  it('flags forbidden cross-owner routes', () => {
    expect(isForbiddenRoute('apex_ecosystem', OMNIBOARD_MODULE_KEY)).toBe(true);
    expect(isForbiddenRoute('third_party', APEX_APPS_MODULE_KEY)).toBe(true);
    expect(isForbiddenRoute('apex_ecosystem', APEX_APPS_MODULE_KEY)).toBe(false);
    expect(isForbiddenRoute('third_party', OMNIBOARD_MODULE_KEY)).toBe(false);
  });
});

describe('appIntegrationOwnership — deprecated shim retires single-owner model', () => {
  it('no longer treats OmniBoard as the universal owner', () => {
    expect(canOwnAppIntegration('apex_ecosystem')).toBe(true);
    expect(mustHandoffToOmniBoard('apex_ecosystem')).toBe(false);
    expect(mustHandoffToOmniBoard('integrated_apps')).toBe(true);
  });
});

describe('ApexAppsMcpModule.resolveApexApp — prompt-first resolution', () => {
  it('resolves known apps from natural-language prompts', () => {
    expect(resolveApexApp('connect my DueRadar')?.id).toBe('dueradar');
    expect(resolveApexApp('lampstand')?.id).toBe('thelampstand');
    expect(resolveApexApp('aSpiral')?.id).toBe('aspiral');
    expect(resolveApexApp('flowbills')?.url).toBe('https://flowbills.ca');
  });

  it('returns null for unknown / empty prompts (honest not-found)', () => {
    expect(resolveApexApp('')).toBeNull();
    expect(resolveApexApp('some random saas')).toBeNull();
  });
});
