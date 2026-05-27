import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  throttle,
  debounce,
  recordMetric,
  getMetricsSummary,
  measureAsync,
  memoize
} from '../../src/lib/performance';

describe('Performance Utilities', () => {
  describe('throttle', () => {
    beforeEach(() => {
      if (typeof vi.useFakeTimers === 'function') {
        vi.useFakeTimers();
      }
    });

    afterEach(() => {
      vi.restoreAllMocks();
      if (typeof vi.useRealTimers === 'function') {
        vi.useRealTimers();
      }
    });

    it('executes immediately on the first call', () => {
      const func = vi.fn();
      const [throttled] = throttle(func, 100);

      throttled();
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('ignores subsequent calls within the limit', () => {
      const func = vi.fn();
      const [throttled] = throttle(func, 100);

      throttled();
      throttled();
      throttled();

      expect(func).toHaveBeenCalledTimes(1);
    });

    it('executes again after the limit has passed', async () => {
      const func = vi.fn();
      const [throttled] = throttle(func, 100);

      throttled();

      if (typeof vi.advanceTimersByTime === 'function') {
        vi.advanceTimersByTime(101);
      } else {
        await new Promise(resolve => setTimeout(resolve, 110));
      }

      throttled();

      expect(func).toHaveBeenCalledTimes(2);
    });

    it('passes arguments to the function', () => {
      const func = vi.fn();
      const [throttled] = throttle(func, 100);

      throttled('test', 123);
      expect(func).toHaveBeenCalledWith('test', 123);
    });

    it('resets state when cancelled', () => {
      const func = vi.fn();
      const [throttled, cancel] = throttle(func, 100);

      throttled();
      expect(func).toHaveBeenCalledTimes(1);

      cancel();

      throttled();
      expect(func).toHaveBeenCalledTimes(2);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      if (typeof vi.useFakeTimers === 'function') {
        vi.useFakeTimers();
      }
    });

    afterEach(() => {
      if (typeof vi.useRealTimers === 'function') {
        vi.useRealTimers();
      }
    });

    it('waits before executing', async () => {
      const func = vi.fn();
      const [debounced] = debounce(func, 100);

      debounced();
      expect(func).not.toHaveBeenCalled();

      if (typeof vi.advanceTimersByTime === 'function') {
        vi.advanceTimersByTime(50);
        expect(func).not.toHaveBeenCalled();
        vi.advanceTimersByTime(51);
      } else {
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      expect(func).toHaveBeenCalledTimes(1);
    });

    it('resets timer if called again', async () => {
      const func = vi.fn();
      const [debounced] = debounce(func, 100);

      debounced();

      if (typeof vi.advanceTimersByTime === 'function') {
        vi.advanceTimersByTime(50);
        debounced();
        vi.advanceTimersByTime(50);
        expect(func).not.toHaveBeenCalled();
        vi.advanceTimersByTime(51);
      } else {
        await new Promise(resolve => setTimeout(resolve, 50));
        debounced();
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      expect(func).toHaveBeenCalledTimes(1);
    });

    it('can be cancelled', async () => {
      const func = vi.fn();
      const [debounced, cancel] = debounce(func, 100);

      debounced();
      cancel();

      if (typeof vi.advanceTimersByTime === 'function') {
        vi.advanceTimersByTime(101);
      } else {
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      expect(func).not.toHaveBeenCalled();
    });
  });

  describe('metrics', () => {
    it('records and summarizes metrics', () => {
      recordMetric('test-metric', 10);
      recordMetric('test-metric', 20);
      recordMetric('other-metric', 5);

      const summary = getMetricsSummary();
      expect(summary['test-metric']).toBeDefined();
      expect(summary['test-metric'].count).toBeGreaterThanOrEqual(2);
      expect(summary['other-metric']).toBeDefined();
    });

    it('respects MAX_METRICS limit', () => {
      for (let i = 0; i < 150; i++) {
        recordMetric('limit-test', i);
      }

      const summary = getMetricsSummary();

      let totalCount = 0;
      for (const key in summary) {
        totalCount += summary[key].count;
      }
      expect(totalCount).toBeLessThanOrEqual(100);
    });
  });

  describe('measureAsync', () => {
    it('measures execution time', async () => {
      const result = await measureAsync('async-test', async () => {
        return 'done';
      });

      expect(result).toBe('done');
      const summary = getMetricsSummary();
      expect(summary['async-test']).toBeDefined();
      expect(summary['async-test'].count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('memoize', () => {
    it('caches results', () => {
      const func = vi.fn((x: number) => x * 2);
      const memoized = memoize(func as any);

      expect(memoized(2)).toBe(4);
      expect(memoized(2)).toBe(4);
      expect(func).toHaveBeenCalledTimes(1);

      expect(memoized(3)).toBe(6);
      expect(func).toHaveBeenCalledTimes(2);
    });

    it('caches based on all arguments', () => {
      const func = vi.fn((a: number, b: number) => a + b);
      const memoized = memoize(func as any);

      expect(memoized(1, 2)).toBe(3);
      expect(memoized(1, 2)).toBe(3);
      expect(memoized(2, 1)).toBe(3);
      expect(func).toHaveBeenCalledTimes(2);
    });
  });
});
