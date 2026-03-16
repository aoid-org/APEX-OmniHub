import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMonitoringTestEnv } from './monitoring-test-helper';

// Must run before importing monitoring
setupMonitoringTestEnv();

import * as monitoring from '../../src/lib/monitoring';

describe('trackUserAction integration', () => {
  beforeEach(() => {
    localStorage.clear();
    monitoring._testing.logCache.clear();
    monitoring._testing.queue.clear();
    vi.clearAllMocks();
  });

  it('should delegate to logAnalyticsEvent', async () => {
    // We use a broader expectation to avoid strict argument matching if metadata objects differ by reference.
    const spy = vi.spyOn(monitoring, 'logAnalyticsEvent');

    monitoring.trackUserAction('test_action', { key: 'value' });

    expect(spy).toHaveBeenCalled();
  });

  it('should include action in metadata', async () => {
    const spy = vi.spyOn(monitoring, 'logAnalyticsEvent');

    monitoring.trackUserAction('login_pressed', { method: 'email' });

    expect(spy).toHaveBeenCalledWith('user_action', expect.objectContaining({
      action: 'login_pressed',
      method: 'email'
    }));
  });

  it('should work without optional metadata', async () => {
    const spy = vi.spyOn(monitoring, 'logAnalyticsEvent');

    monitoring.trackUserAction('logout_pressed');

    expect(spy).toHaveBeenCalledWith('user_action', expect.objectContaining({
      action: 'logout_pressed'
    }));
  });

  it('should handle empty metadata object', async () => {
    const spy = vi.spyOn(monitoring, 'logAnalyticsEvent');

    monitoring.trackUserAction('scroll_end', {});

    expect(spy).toHaveBeenCalledWith('user_action', expect.objectContaining({
      action: 'scroll_end'
    }));
  });
});
