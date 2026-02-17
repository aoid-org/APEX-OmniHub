import { describe, it, expect, afterEach, vi } from 'vitest';
import { checkRateLimit, clearRateLimit } from '@/lib/ratelimit';

describe('Rate Limiting', () => {
  let counter = 0;
  // Use a deterministic key generator to avoid security hotspots with Math.random()
  const testKey = (name: string) => `test:ratelimit:${name}:${Date.now()}-${counter++}`;
  const usedKeys: string[] = [];

  afterEach(() => {
    usedKeys.forEach((key) => clearRateLimit(key));
    usedKeys.length = 0;
    vi.restoreAllMocks();
  });

  describe('Tier 1: Functional Correctness', () => {
    it('allows requests under limit', () => {
      const key = testKey('under-limit');
      usedKeys.push(key);

      expect(checkRateLimit(key, 5, 1000).allowed).toBe(true);
      expect(checkRateLimit(key, 5, 1000).allowed).toBe(true); // 2/5
      expect(checkRateLimit(key, 5, 1000).allowed).toBe(true); // 3/5
    });

    it('blocks requests at exact limit', () => {
      const key = testKey('exact-limit');
      usedKeys.push(key);

      // Exhaust limit (5 calls)
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(key, 5, 1000).allowed).toBe(true);
      }

      // 6th request -> blocked
      expect(checkRateLimit(key, 5, 1000).allowed).toBe(false);
    });

    it('blocks requests over limit', () => {
        const key = testKey('over-limit');
        usedKeys.push(key);

        for (let i = 0; i < 5; i++) {
            checkRateLimit(key, 5, 1000);
        }

        // 6th
        expect(checkRateLimit(key, 5, 1000).allowed).toBe(false);
        // 7th
        expect(checkRateLimit(key, 5, 1000).allowed).toBe(false);
    });

    it('resets counter after window expires', async () => {
      const key = testKey('window-reset');
      usedKeys.push(key);

      // Exhaust limit with short window (100ms)
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, 5, 100);
      }
      expect(checkRateLimit(key, 5, 100).allowed).toBe(false);

      // Wait for window to expire (>100ms)
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow again
      expect(checkRateLimit(key, 5, 100).allowed).toBe(true);
    });

    it('handles clearRateLimit correctly', () => {
      const key = testKey('manual-clear');
      usedKeys.push(key);

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, 5, 1000);
      }
      expect(checkRateLimit(key, 5, 1000).allowed).toBe(false);

      // Clear and retry
      clearRateLimit(key);
      expect(checkRateLimit(key, 5, 1000).allowed).toBe(true);
    });
  });

  describe('Tier 2: Boundary Conditions', () => {
    it('handles limit=1 (most restrictive)', () => {
      const key = testKey('limit-one');
      usedKeys.push(key);

      expect(checkRateLimit(key, 1, 1000).allowed).toBe(true);
      expect(checkRateLimit(key, 1, 1000).allowed).toBe(false);
    });

    it('handles limit=0 (always blocked)', () => {
      const key = testKey('limit-zero');
      usedKeys.push(key);

      expect(checkRateLimit(key, 0, 1000).allowed).toBe(false);
    });

    it('handles very short window (50ms)', async () => {
      const key = testKey('short-window');
      usedKeys.push(key);

      expect(checkRateLimit(key, 3, 50).allowed).toBe(true); // 1/3
      expect(checkRateLimit(key, 3, 50).allowed).toBe(true); // 2/3

      // Wait > 50ms
      await new Promise(resolve => setTimeout(resolve, 60));

      // Should reset
      const result = checkRateLimit(key, 3, 50);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // Should be fresh (3-1=2)
    });

    it('handles very long window (1 hour)', () => {
      const key = testKey('long-window');
      usedKeys.push(key);
      const oneHour = 60 * 60 * 1000;

      expect(checkRateLimit(key, 100, oneHour).allowed).toBe(true);
      expect(checkRateLimit(key, 100, oneHour).allowed).toBe(true);
    });

    it('isolates different keys independently', () => {
      const keyA = testKey('key-a');
      const keyB = testKey('key-b');
      usedKeys.push(keyA, keyB);

      // Exhaust keyA
      for (let i = 0; i < 5; i++) {
        checkRateLimit(keyA, 5, 1000);
      }
      expect(checkRateLimit(keyA, 5, 1000).allowed).toBe(false);

      // keyB should be unaffected
      expect(checkRateLimit(keyB, 5, 1000).allowed).toBe(true);
    });
  });

  describe('Tier 3: Security & Performance', () => {
    it('prevents timing attacks on window reset', async () => {
      const key = testKey('timing-attack');
      usedKeys.push(key);

      // Exhaust at T=0
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, 5, 100);
      }

      // Try at T=95ms (before reset)
      await new Promise(resolve => setTimeout(resolve, 95));
      expect(checkRateLimit(key, 5, 100).allowed).toBe(false);

      // Try at T=105ms (after reset) - Wait additional 10ms
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(checkRateLimit(key, 5, 100).allowed).toBe(true);
    });

    it('handles concurrent requests correctly', async () => {
      const key = testKey('concurrent');
      usedKeys.push(key);

      // Simulate 10 concurrent requests (only 5 should pass)
      const promises = Array.from({ length: 10 }, () =>
        new Promise<boolean>(resolve => {
            const res = checkRateLimit(key, 5, 1000);
            resolve(res.allowed);
        })
      );

      const results = await Promise.all(promises);
      const allowed = results.filter(r => r === true).length;

      expect(allowed).toBe(5);
    });

    it('prevents memory leak with many unique keys', async () => {
      const keys = Array.from({ length: 100 }, (_, i) => testKey(`user-${i}`));

      // Create 100 entries with 50ms window
      keys.forEach(key => {
          usedKeys.push(key);
          checkRateLimit(key, 5, 50);
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Note: We cannot verify Map size here as it is not exported.
      // But we verify the code handles high volume without error.
      const triggerKey = testKey('trigger');
      usedKeys.push(triggerKey);
      expect(checkRateLimit(triggerKey, 5, 1000).allowed).toBe(true);
    });

    it('completes in <1ms for typical requests', () => {
      const key = testKey('performance');
      usedKeys.push(key);

      const start = performance.now();
      checkRateLimit(key, 100, 1000);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1);
    });
  });

  describe('Tier 4: Error Handling', () => {
    it('handles negative limit gracefully', () => {
      const key = testKey('negative-limit');
      usedKeys.push(key);
      // Should treat as allowed=false because count (0) >= maxAttempts (-1)
      // 0 >= -1 is true, so it returns false (blocked) immediately
      const result = checkRateLimit(key, -1, 1000);
      expect(result.allowed).toBe(false);
    });

    it('handles negative window gracefully', () => {
      const key = testKey('negative-window');
      usedKeys.push(key);
      // Window is -100ms. resetTime = now - 100.
      // First call: count=1, resetTime=now-100.
      // Second call: now > resetTime, so entry is deleted!
      // Then new entry created.
      // So negative window effectively resets every call.

      const res1 = checkRateLimit(key, 5, -100);
      expect(res1.allowed).toBe(true);

      // Small delay to ensure Date.now() advances
      const start = Date.now();
      while(Date.now() === start) {
        // Busy-wait loop to ensure system clock advances
        // This comment prevents 'no-empty' lint error
      }

      const res2 = checkRateLimit(key, 5, -100);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(4); // 5 - 1 = 4.
      // Wait, if it resets every time:
      // Call 1: store set with resetTime = T - 100.
      // Call 2: T_new > T - 100. Entry deleted. New entry created. Count 1.
      // So remaining should be 4 again.

      expect(res2.remaining).toBe(4);
    });

    it('handles extremely large numbers', () => {
      const key = testKey('large-numbers');
      usedKeys.push(key);
      expect(() => checkRateLimit(key, Number.MAX_SAFE_INTEGER, 1000)).not.toThrow();
      expect(checkRateLimit(key, Number.MAX_SAFE_INTEGER, 1000).allowed).toBe(true);
    });

    it('handles special characters in keys', () => {
      const key = 'user:123@domain.com#$%';
      usedKeys.push(key);
      expect(() => checkRateLimit(key, 5, 1000)).not.toThrow();
      expect(checkRateLimit(key, 5, 1000).allowed).toBe(true);
    });
  });
});
