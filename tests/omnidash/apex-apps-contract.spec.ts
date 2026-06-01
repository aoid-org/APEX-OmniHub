import { describe, it, expect } from 'vitest';
import { LIVE_APEX_APPS } from '../../apps/omnihub-site/dashboard/contracts/apexApps';

describe('APEX Apps Contract', () => {
  it('must contain exactly six live apps', () => {
    expect(LIVE_APEX_APPS.length).toBe(6);
  });

  it('must not contain TradeLine', () => {
    const hasTradeLine = LIVE_APEX_APPS.some(app => 
      app.label.toLowerCase().includes('tradeline') || 
      app.id.toLowerCase().includes('tradeline')
    );
    expect(hasTradeLine).toBe(false);
  });

  it('must contain exactly the 6 required ecosystem apps', () => {
    const appMap = new Map(LIVE_APEX_APPS.map(app => [app.id, app.label]));
    expect(appMap.get('aspiral')).toBe('aSpiral CRM');
    expect(appMap.get('dueradar')).toBe('DueRadar');
    expect(appMap.get('sbbl-hq')).toBe('SBBL-HQ');
    expect(appMap.get('command')).toBe('CommandMatrix');
    expect(appMap.get('office')).toBe('APEX-Office');
    expect(appMap.get('omnihub')).toBe('APEX-OmniHub');
  });
});
