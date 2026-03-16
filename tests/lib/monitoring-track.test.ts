import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMonitoringTestEnv } from './monitoring-test-helper';

// Must run before importing monitoring
setupMonitoringTestEnv();

import * as monitoring from '../../src/lib/monitoring';

describe('trackUserAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call logAnalyticsEvent with "user_action" and merged metadata', async () => {
    // In ESM, spying on an export and then calling another function in the SAME module
    // that uses that export will NOT work because the module uses the internal reference.
    // However, if we mock the module or use a proxy, it might work.
    // Let's try to verify via side effects if the spy continues to fail.
    const spy = vi.spyOn(monitoring, 'logAnalyticsEvent').mockImplementation(async () => {});

    monitoring.trackUserAction('login_pressed', { method: 'email' });

    // We expect logAnalyticsEvent to have been called.
    // If this fails, it's because monitoring.ts calls its internal logAnalyticsEvent directly.
    expect(spy).toHaveBeenCalledWith('user_action', {
      action: 'login_pressed',
      method: 'email'
    });
  });

  it('should work without optional metadata', async () => {
    const spy = vi.spyOn(monitoring, 'logAnalyticsEvent').mockImplementation(async () => {});

    monitoring.trackUserAction('logout_pressed');

    expect(spy).toHaveBeenCalledWith('user_action', {
      action: 'logout_pressed'
    });
  });

  it('should handle empty metadata object', async () => {
    const spy = vi.spyOn(monitoring, 'logAnalyticsEvent').mockImplementation(async () => {});

    monitoring.trackUserAction('scroll_end', {});

    expect(spy).toHaveBeenCalledWith('user_action', {
      action: 'scroll_end'
    });
  });
});
