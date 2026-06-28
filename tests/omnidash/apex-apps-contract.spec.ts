import { describe, it, expect } from 'vitest';
import { LIVE_APEX_APPS } from '../../apps/omnihub-site/dashboard/contracts/apexApps';

// Canon updated 2026-06-28: registry expanded to the 9 OmniPort-enabled APEX
// ecosystem apps (per shutdown/ecosystem directive). TradeLine remains excluded.
describe('APEX Apps Contract', () => {
  it('must contain exactly nine live apps', () => {
    expect(LIVE_APEX_APPS.length).toBe(9);
  });

  it('must not contain TradeLine (decommissioned)', () => {
    const hasTradeLine = LIVE_APEX_APPS.some(app =>
      app.label.toLowerCase().includes('tradeline') ||
      app.id.toLowerCase().includes('tradeline')
    );
    expect(hasTradeLine).toBe(false);
  });

  it('must contain exactly the 9 required OmniPort ecosystem apps', () => {
    const appMap = new Map(LIVE_APEX_APPS.map(app => [app.id, app.label]));
    expect(appMap.get('aspiral')).toBe('aSpiral');
    expect(appMap.get('jubeelove')).toBe('Jubee Love');
    expect(appMap.get('armageddon')).toBe('Armageddon Test Suite');
    expect(appMap.get('playmoney')).toBe('PlayMoney');
    expect(appMap.get('dueradar')).toBe('DueRadar');
    expect(appMap.get('thelampstand')).toBe('TheLampStand');
    expect(appMap.get('cheapstays')).toBe('CheapStays');
    expect(appMap.get('sbbl-hq')).toBe('SBBL-HQ');
    expect(appMap.get('flowbills')).toBe('FLOWBills');
  });

  it('every app exposes a real https OmniPort URL', () => {
    for (const app of LIVE_APEX_APPS) {
      expect(app.url.startsWith('https://'), `${app.id} must be https`).toBe(true);
    }
  });
});
