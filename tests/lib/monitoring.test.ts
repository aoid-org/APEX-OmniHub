import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as monitoring from '../../src/lib/monitoring';
import { _testing } from '../../src/lib/monitoring';

// Mock storage adapter to avoid side effects and inspect calls
// Actually, _testing.storage is a singleton instance. We can spy on it.

describe('monitoring integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    _testing.queue.clear();
    vi.clearAllMocks();

    // Mock getHealthStatus to be healthy by default
    vi.mock('../../src/lib/omni-sentry', async () => {
      const actual = await vi.importActual('../../src/lib/omni-sentry');
      return {
        ...actual,
        getHealthStatus: () => ({ status: 'healthy' }),
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should queue logs and flush them', () => {
    const event = { name: 'test', duration: 100, timestamp: 123 };
    monitoring.logPerformance(event);

    expect(_testing.queue.size).toBe(1);
    expect(localStorage.getItem('perf_logs')).toBeNull(); // Not written yet

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

    // Queue should be empty because it bypassed the queue
    expect(_testing.queue.size).toBe(0);

    const stored = JSON.parse(localStorage.getItem('error_logs') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].message).toBe('Critical failure');
  });

  it('should flush when time threshold is reached', () => {
    monitoring.logPerformance({ name: 'test', duration: 100, timestamp: 1 });

    expect(localStorage.getItem('perf_logs')).toBeNull();

    // Advance time by 2000ms (flush interval)
    vi.advanceTimersByTime(2000);

    const stored = JSON.parse(localStorage.getItem('perf_logs') || '[]');
    expect(stored).toHaveLength(1);
  });

  it('should flush when size threshold is reached', () => {
    // Threshold is 50
    for (let i = 0; i < 49; i++) {
      monitoring.logPerformance({ name: `test${i}`, duration: 100, timestamp: i });
    }

    expect(_testing.queue.size).toBe(49);
    expect(localStorage.getItem('perf_logs')).toBeNull();

    // 50th item should trigger flush
    monitoring.logPerformance({ name: 'test50', duration: 100, timestamp: 50 });

    // Flush happens synchronously or via microtask?
    // In code: if (queue.size >= FLUSH_THRESHOLD) flushQueue();
    // It is synchronous.

    expect(_testing.queue.size).toBe(0);
    const stored = JSON.parse(localStorage.getItem('perf_logs') || '[]');
    expect(stored).toHaveLength(50);
  });

  it('should respect storage max limits per key', () => {
    // Write directly to storage to simulate existing data
    // Max for perf_logs is 100
    const existing = Array(100).fill({ name: 'old', duration: 0, timestamp: 0 });
    localStorage.setItem('perf_logs', JSON.stringify(existing));

    monitoring.logPerformance({ name: 'new', duration: 100, timestamp: 1 });
    _testing.flushQueue();

    const stored = JSON.parse(localStorage.getItem('perf_logs') || '[]');
    expect(stored).toHaveLength(100);
    expect(stored[99].name).toBe('new');
    expect(stored[0].name).toBe('old'); // Wait, if we append and shift, index 0 should be the second oldest?
    // Code: logs.push(...new); if > max logs.splice(0, logs.length - max);
    // If length 100 + 1 = 101. max 100. remove 101-100 = 1 from start.
    // So stored[0] should be the one that was previously at index 1.
    // Since all 'old' are identical, hard to distinguish.
    // Let's verify size is capped.
  });

  it('should use requestIdleCallback if available', () => {
    const requestIdleCallbackMock = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).requestIdleCallback = requestIdleCallbackMock;

    monitoring.logPerformance({ name: 'test', duration: 100, timestamp: 1 });

    expect(requestIdleCallbackMock).toHaveBeenCalled();

    // Cleanup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).requestIdleCallback;
  });

  it('should flush on visibilitychange', () => {
    // Need to initialize monitoring to attach listeners
    monitoring.initializeMonitoring();

    monitoring.logPerformance({ name: 'test', duration: 100, timestamp: 1 });
    expect(_testing.queue.size).toBe(1);

    // Simulate visibilitychange
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    window.dispatchEvent(new Event('visibilitychange'));

    expect(_testing.queue.size).toBe(0);
    expect(localStorage.getItem('perf_logs')).not.toBeNull();
  });

  it('should group logs by key during flush', () => {
    monitoring.logPerformance({ name: 'perf', duration: 1, timestamp: 1 });
    monitoring.logSecurityEvent('auth_failed', { foo: 'bar' }); // Should be immediate? Yes.

    // Let's use trackUserAction which goes to 'analytics' logs?
    // logAnalyticsEvent writes to 'perf_logs'?? No, checking code...
    // logAnalyticsEvent calls ensureSentry().addBreadcrumb but NO persistLog call in the original code?
    // Checking original code...
    // logAnalyticsEvent: if (DEV) console.log; sentry.addBreadcrumb. NO persistLog.

    // Wait, let's check my monitoring.ts again.
    // logAnalyticsEvent indeed does NOT call persistLog.

    // Let's mock a direct persistLog call via a new exposed method or just check mixed usage if possible.
    // persistLog is internal.
    // But logSecurityEvent writes to 'security_logs'.
    // And I made 'security_logs' critical, so it flushes immediate.

    // Okay, let's manually push to queue to test grouping if we can access it.
    _testing.queue.push({ key: 'key1', entry: 'a', max: 10 });
    _testing.queue.push({ key: 'key2', entry: 'b', max: 10 });
    _testing.queue.push({ key: 'key1', entry: 'c', max: 10 });

    _testing.flushQueue();

    const k1 = JSON.parse(localStorage.getItem('key1') || '[]');
    const k2 = JSON.parse(localStorage.getItem('key2') || '[]');

    expect(k1).toHaveLength(2); // a, c
    expect(k2).toHaveLength(1); // b
  });
});
