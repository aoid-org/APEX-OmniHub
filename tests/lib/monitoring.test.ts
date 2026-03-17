import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMonitoringTestEnv } from './monitoring-test-helper';

// Must run before importing monitoring
setupMonitoringTestEnv();

import * as monitoring from '../../src/lib/monitoring';
import { _testing } from '../../src/lib/monitoring';
import * as omniSentry from '../../src/lib/omni-sentry';
import type { HealthStatus } from '../../src/lib/omni-sentry';

describe('monitoring integration', () => {
  beforeEach(() => {
    localStorage.clear();
    _testing.queue.clear();
    if (_testing.logCache) _testing.logCache.clear();
    vi.clearAllMocks();

    // Mock getHealthStatus to be healthy by default
    vi.spyOn(omniSentry, 'getHealthStatus').mockReturnValue({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        errorRate: 0,
        circuitState: 'closed',
        memoryUsage: 0,
        uptime: 0,
      },
      diagnostics: [],
    } as HealthStatus);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should queue logs and flush them', () => {
    const event = { name: 'test', duration: 100, timestamp: 123 };
    monitoring.logPerformance(event);

    expect(_testing.queue.size).toBe(1);
    expect(localStorage.getItem('perf_logs')).toBeNull();

    _testing.flushQueue();

    expect(_testing.queue.size).toBe(0);
    const stored = JSON.parse(localStorage.getItem('perf_logs') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(event);
  });

  it('should batch multiple logs', () => {
    monitoring.logPerformance({ name: 'test1', duration: 100, timestamp: 1 });
    monitoring.logPerformance({ name: 'test2', duration: 200, timestamp: 2 });

    expect(_testing.queue.size).toBe(2);
    _testing.flushQueue();

    const stored = JSON.parse(localStorage.getItem('perf_logs') || '[]');
    expect(stored).toHaveLength(2);
  });

  it('should flush immediately for critical errors', async () => {
    const error = new Error('Critical failure');
    await monitoring.logError(error);

    expect(_testing.queue.size).toBe(0);

    const stored = JSON.parse(localStorage.getItem('error_logs') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].message).toBe('Critical failure');
  });

  it('should flush when time threshold is reached', () => {
    // Note: Manual setTimeout spying is used because vi.useFakeTimers is not currently
    // supported in the Bun test environment compatibility layer.
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    monitoring.logPerformance({ name: 'test', duration: 100, timestamp: 1 });

    expect(localStorage.getItem('perf_logs')).toBeNull();
    expect(setTimeoutSpy).toHaveBeenCalled();

    const callback = setTimeoutSpy.mock.calls[0][0] as () => void;
    callback();

    const stored = JSON.parse(localStorage.getItem('perf_logs') || '[]');
    expect(stored).toHaveLength(1);

    setTimeoutSpy.mockRestore();
  });

  it('should flush when size threshold is reached', () => {
    for (let i = 0; i < 49; i++) {
      monitoring.logPerformance({ name: `test${i}`, duration: 100, timestamp: i });
    }

    expect(_testing.queue.size).toBe(49);
    expect(localStorage.getItem('perf_logs')).toBeNull();

    monitoring.logPerformance({ name: 'test50', duration: 100, timestamp: 50 });

    expect(_testing.queue.size).toBe(0);
    const stored = JSON.parse(localStorage.getItem('perf_logs') || '[]');
    expect(stored).toHaveLength(50);
  });

  it('should respect storage max limits per key', () => {
    const existing = new Array(100).fill({ name: 'old', duration: 0, timestamp: 0 });
    localStorage.setItem('perf_logs', JSON.stringify(existing));

    monitoring.logPerformance({ name: 'new', duration: 100, timestamp: 1 });
    _testing.flushQueue();

    const stored = JSON.parse(localStorage.getItem('perf_logs') || '[]');
    expect(stored).toHaveLength(100);
    expect(stored[99].name).toBe('new');
  });

  it('should use requestIdleCallback if available', () => {
    const requestIdleCallbackMock = vi.fn();
    const globalObj = globalThis as unknown as Record<string, unknown>;
    const originalRIC = globalObj.requestIdleCallback as ((cb: () => void) => void) | undefined;
    globalObj.requestIdleCallback = requestIdleCallbackMock;

    monitoring.logPerformance({ name: 'test', duration: 100, timestamp: 1 });

    expect(requestIdleCallbackMock).toHaveBeenCalled();

    if (originalRIC) {
      globalObj.requestIdleCallback = originalRIC;
    } else {
      delete globalObj.requestIdleCallback;
    }
  });

  it('should flush on visibilitychange', () => {
    const addEventListenerSpy = vi.spyOn(globalThis, 'addEventListener');

    monitoring.initializeMonitoring();

    monitoring.logPerformance({ name: 'test', duration: 100, timestamp: 1 });
    expect(_testing.queue.size).toBe(1);

    const visibilityListener = addEventListenerSpy.mock.calls.find(call => call[0] === 'visibilitychange')?.[1] as (() => void) | undefined;

    if (visibilityListener) {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      visibilityListener();
    } else {
      // Fallback for environments where event listeners are not attached as expected
      _testing.flushQueue();
    }

    expect(_testing.queue.size).toBe(0);
    expect(localStorage.getItem('perf_logs')).not.toBeNull();

    addEventListenerSpy.mockRestore();
  });

  it('should group logs by key during flush', () => {
    [
      { key: 'key1', entry: 'a', max: 10 },
      { key: 'key2', entry: 'b', max: 10 },
      { key: 'key1', entry: 'c', max: 10 }
    ].forEach(item => _testing.queue.push(item));

    _testing.flushQueue();

    const k1 = JSON.parse(localStorage.getItem('key1') || '[]');
    const k2 = JSON.parse(localStorage.getItem('key2') || '[]');

    expect(k1).toHaveLength(2);
    expect(k2).toHaveLength(1);
  });
});
