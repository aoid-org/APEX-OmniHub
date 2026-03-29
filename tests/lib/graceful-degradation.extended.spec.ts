import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logErrorMock = vi.hoisted(() => vi.fn());
const logAnalyticsEventMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/lib/monitoring', () => ({
  logError: logErrorMock,
  logAnalyticsEvent: logAnalyticsEventMock,
}));

import {
  CircuitBreaker,
  ServiceHealthChecker,
  loadResourceWithFallback,
  retryWithBackoff,
  withFallback,
  withTimeout,
} from '@/lib/graceful-degradation';

describe('graceful-degradation extended', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T00:00:00.000Z'));
    logErrorMock.mockClear();
    logAnalyticsEventMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries until success', async () => {
    let calls = 0;
    const promise = retryWithBackoff(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error('transient');
        return 'ok';
      },
      3,
      10,
    );

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(calls).toBe(3);
  });

  it('logs and throws after retry exhaustion', async () => {
    const promise = retryWithBackoff(
      async () => {
        throw new Error('hard-fail');
      },
      2,
      10,
    );

    const assertion = expect(promise).rejects.toThrow('hard-fail');
    await vi.runAllTimersAsync();
    await assertion;
    expect(logErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: 'retry_exhausted' }),
    );
  });

  it('supports timeout wrappers', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 500)).resolves.toBe('ok');

    const slow = withTimeout(
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('late'), 2_000);
      }),
      100,
      'too-slow',
    );
    const assertion = expect(slow).rejects.toThrow('too-slow');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it('uses fallback on primary failure', async () => {
    await expect(
      withFallback(
        async () => 'primary',
        () => 'fallback',
      ),
    ).resolves.toBe('primary');

    await expect(
      withFallback(
        async () => {
          throw new Error('primary-failed');
        },
        () => 'fallback',
      ),
    ).resolves.toBe('fallback');

    expect(logErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: 'using_fallback' }),
    );
  });

  it('opens and resets circuit breaker based on failures and timeout', async () => {
    const breaker = new CircuitBreaker(2, 1_000);

    await expect(
      breaker.execute(async () => {
        throw new Error('fail-1');
      }),
    ).rejects.toThrow('fail-1');
    await expect(
      breaker.execute(async () => {
        throw new Error('fail-2');
      }),
    ).rejects.toThrow('fail-2');

    expect(breaker.getState()).toBe('open');
    await expect(breaker.execute(async () => 'blocked')).rejects.toThrow(
      'Circuit breaker is open',
    );

    vi.setSystemTime(new Date('2026-03-25T00:00:02.000Z'));
    await expect(breaker.execute(async () => 'recovered')).resolves.toBe(
      'recovered',
    );
    expect(breaker.getState()).toBe('closed');

    breaker.reset();
    expect(breaker.getState()).toBe('closed');
  });

  it('loads primary resource and falls back on failure', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ok: true } as Response);

    const primary = await loadResourceWithFallback('https://primary.example');
    expect(primary.ok).toBe(true);

    const fallback = await loadResourceWithFallback(
      'https://primary-fail.example',
      'https://fallback.example',
    );
    expect(fallback.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(logErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: 'loading_fallback_resource' }),
    );
  });

  it('tracks degraded and restored services', () => {
    const checker = new ServiceHealthChecker();
    expect(checker.isAnyServiceDown()).toBe(false);
    expect(checker.isServiceHealthy('db')).toBe(true);

    checker.markServiceDown('db');
    expect(checker.isServiceHealthy('db')).toBe(false);
    expect(checker.isAnyServiceDown()).toBe(true);

    checker.markServiceUp('db');
    expect(checker.isServiceHealthy('db')).toBe(true);
    expect(checker.isAnyServiceDown()).toBe(false);
    expect(checker.getAllServices().get('db')).toBe(true);
    expect(logAnalyticsEventMock).toHaveBeenCalled();
  });
});
