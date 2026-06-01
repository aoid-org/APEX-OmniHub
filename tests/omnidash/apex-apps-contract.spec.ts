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

  it('must contain correct URLs', () => {
    const appMap = new Map(LIVE_APEX_APPS.map(app => [app.id, app.url]));
    expect(appMap.get('aspiral')).toBe('https://aspiral.icu');
    expect(appMap.get('dueradar')).toBe('https://dueradar.icu');
    expect(appMap.get('sbbl-hq')).toBe('https://sbbl-hq.icu');
    expect(appMap.get('cheapstays')).toBe('https://cheapstays.me');
    expect(appMap.get('flowbills')).toBe('https://flowbills.ca');
    expect(appMap.get('jubeelove')).toBe('https://jubee.love');
  });
});
