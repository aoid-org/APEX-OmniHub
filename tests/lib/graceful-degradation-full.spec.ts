import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryWithBackoff,
  withTimeout,
  withFallback,
  CircuitBreaker,
  ServiceHealthChecker,
  loadResourceWithFallback,
} from '../../src/lib/graceful-degradation';

vi.mock('../../src/lib/monitoring', () => ({
  logError: vi.fn(),
  logAnalyticsEvent: vi.fn(),
}));

describe('graceful-degradation (full coverage)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('retryWithBackoff', () => {
    it('should return result on first try if successful', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      const result = await retryWithBackoff(fn);
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('ok');

      const promise = retryWithBackoff(fn, 3, 100);
      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after exhausting all retries', async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValue(new Error('persistent'));

      await expect(retryWithBackoff(fn, 2, 10)).rejects.toThrow('persistent');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('withTimeout', () => {
    it('should return result if completed before timeout', async () => {
      const promise = Promise.resolve('fast');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('fast');
    });

    it('should throw if operation exceeds timeout', async () => {
      const slow = new Promise((resolve) => setTimeout(resolve, 5000));
      const promise = withTimeout(slow, 100, 'Too slow');
      vi.advanceTimersByTime(200);
      await expect(promise).rejects.toThrow('Too slow');
    });

    it('should use default timeout error message', async () => {
      const slow = new Promise((resolve) => setTimeout(resolve, 5000));
      const promise = withTimeout(slow, 100);
      vi.advanceTimersByTime(200);
      await expect(promise).rejects.toThrow('Operation timed out');
    });
  });

  describe('withFallback', () => {
    it('should return primary result on success', async () => {
      const result = await withFallback(
        () => Promise.resolve('primary'),
        () => 'fallback'
      );
      expect(result).toBe('primary');
    });

    it('should return fallback on primary failure', async () => {
      const result = await withFallback(
        () => Promise.reject(new Error('fail')),
        () => 'fallback'
      );
      expect(result).toBe('fallback');
    });

    it('should handle async fallback', async () => {
      const result = await withFallback(
        () => Promise.reject(new Error('fail')),
        () => Promise.resolve('async-fallback')
      );
      expect(result).toBe('async-fallback');
    });
  });

  describe('CircuitBreaker', () => {
    it('should allow execution when closed', async () => {
      const cb = new CircuitBreaker(3, 1000);
      const result = await cb.execute(() => Promise.resolve('ok'));
      expect(result).toBe('ok');
      expect(cb.getState()).toBe('closed');
    });

    it('should open after reaching failure threshold', async () => {
      const cb = new CircuitBreaker(2, 1000);
      const failFn = () => Promise.reject(new Error('fail'));

      await expect(cb.execute(failFn)).rejects.toThrow('fail');
      await expect(cb.execute(failFn)).rejects.toThrow('fail');

      expect(cb.getState()).toBe('open');
      await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toThrow('Circuit breaker is open');
    });

    it('should transition to half-open after timeout', async () => {
      const cb = new CircuitBreaker(1, 1000);
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();

      expect(cb.getState()).toBe('open');
      vi.advanceTimersByTime(1500);

      const result = await cb.execute(() => Promise.resolve('recovered'));
      expect(result).toBe('recovered');
      expect(cb.getState()).toBe('closed');
    });

    it('should reset state', () => {
      const cb = new CircuitBreaker();
      cb.reset();
      expect(cb.getState()).toBe('closed');
    });
  });

  describe('ServiceHealthChecker', () => {
    it('should report services healthy by default', () => {
      const checker = new ServiceHealthChecker();
      expect(checker.isServiceHealthy('api')).toBe(true);
      expect(checker.isAnyServiceDown()).toBe(false);
    });

    it('should track service down/up states', () => {
      const checker = new ServiceHealthChecker();
      checker.markServiceDown('api');
      expect(checker.isServiceHealthy('api')).toBe(false);
      expect(checker.isAnyServiceDown()).toBe(true);

      checker.markServiceUp('api');
      expect(checker.isServiceHealthy('api')).toBe(true);
      expect(checker.isAnyServiceDown()).toBe(false);
    });

    it('should return all services map', () => {
      const checker = new ServiceHealthChecker();
      checker.markServiceDown('db');
      checker.markServiceUp('cache');

      const services = checker.getAllServices();
      expect(services.get('db')).toBe(false);
      expect(services.get('cache')).toBe(true);
    });
  });

  describe('loadResourceWithFallback', () => {
    it('should return primary response on success', async () => {
      vi.useRealTimers();
      const mockResponse = new Response('ok', { status: 200 });
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      const result = await loadResourceWithFallback('https://primary.test');
      expect(result).toBe(mockResponse);

      vi.restoreAllMocks();
    });

    it('should try fallback when primary fails', async () => {
      vi.useRealTimers();
      const fallbackResponse = new Response('fallback', { status: 200 });
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('', { status: 500 }))
        .mockResolvedValueOnce(fallbackResponse);

      const result = await loadResourceWithFallback('https://primary.test', 'https://fallback.test');
      expect(result).toBe(fallbackResponse);

      vi.restoreAllMocks();
    });

    it('should throw if primary fails and no fallback', async () => {
      vi.useRealTimers();
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 500 }));

      await expect(loadResourceWithFallback('https://primary.test')).rejects.toThrow();

      vi.restoreAllMocks();
    });
  });
});
