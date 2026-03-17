import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMonitoringTestEnv } from './monitoring-test-helper';

// Must run before importing monitoring
setupMonitoringTestEnv();

import { trackUserAction, _testing } from '../../src/lib/monitoring';

describe('trackUserAction integration', () => {
  beforeEach(() => {
    localStorage.clear();
    _testing.logCache.clear();
    _testing.queue.clear();
    vi.clearAllMocks();
  });

  it('should delegate to logAnalyticsEvent with "user_action" and correctly merged metadata', async () => {
    // trackUserAction calls _testing.logAnalyticsEvent internally.
    // By spying on _testing.logAnalyticsEvent, we can catch the intra-module call.
    const spy = vi.spyOn(_testing, 'logAnalyticsEvent');

    trackUserAction('login_pressed', { method: 'email' });

    // In CI (optimized ESM), we add a tiny wait to ensure the async call has been initiated
    // even though spies usually catch the invocation immediately.
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('user_action', expect.objectContaining({
      action: 'login_pressed',
      method: 'email'
    }));
  });

  it('should work without optional metadata', async () => {
    const spy = vi.spyOn(_testing, 'logAnalyticsEvent');

    trackUserAction('logout_pressed');

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(spy).toHaveBeenCalledWith('user_action', expect.objectContaining({
      action: 'logout_pressed'
    }));
  });

  it('should handle empty metadata object', async () => {
    const spy = vi.spyOn(_testing, 'logAnalyticsEvent');

    trackUserAction('scroll_end', {});

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(spy).toHaveBeenCalledWith('user_action', expect.objectContaining({
      action: 'scroll_end'
    }));
  });
});
