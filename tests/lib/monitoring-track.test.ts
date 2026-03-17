import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMonitoringTestEnv } from './monitoring-test-helper';

// Must run before importing monitoring
setupMonitoringTestEnv();

import * as monitoring from '../../src/lib/monitoring';

describe('trackUserAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call logAnalyticsEvent with "user_action" and merged metadata', () => {
    // Note: vi.spyOn on a module export usually works in Bun's Vitest compatibility layer
    // as it uses a proxy or similar mechanism for module exports.
    const spy = vi.spyOn(monitoring, 'logAnalyticsEvent');

    monitoring.trackUserAction('login_pressed', { method: 'email' });

    expect(spy).toHaveBeenCalledWith('user_action', {
      action: 'login_pressed',
      method: 'email'
    });
  });

  it('should work without optional metadata', () => {
    const spy = vi.spyOn(monitoring, 'logAnalyticsEvent');

    monitoring.trackUserAction('logout_pressed');

    expect(spy).toHaveBeenCalledWith('user_action', {
      action: 'logout_pressed'
    });
  });

  it('should handle empty metadata object', () => {
    const spy = vi.spyOn(monitoring, 'logAnalyticsEvent');

    monitoring.trackUserAction('scroll_end', {});

    expect(spy).toHaveBeenCalledWith('user_action', {
      action: 'scroll_end'
    });
  });
});
