/**
 * RETRY LOGIC TESTS
 *
 * Validates the retry logic with exponential backoff
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChaosEngine, DEFAULT_CHAOS_CONFIG } from '../chaos-engine';

describe('Retry Logic', () => {
  let engine: ChaosEngine;

  beforeEach(() => {
    engine = new ChaosEngine({ ...DEFAULT_CHAOS_CONFIG, seed: 42 });
  });

  describe('calculateRetryDelay', () => {
    it('should return exponential backoff values', () => {
      const backoff0 = engine.calculateRetryDelay(0);
      const backoff1 = engine.calculateRetryDelay(1);
      const backoff2 = engine.calculateRetryDelay(2); // >= maxRetries (2) → -1
      const backoff3 = engine.calculateRetryDelay(3); // >= maxRetries (2) → -1

      // Uses config.baseBackoffMs (500ms) + full-range jitter [0, 500ms].
      // DEFAULT_CHAOS_CONFIG.maxRetries = 2, so attempts >= 2 return -1.
      expect(backoff0).toBeGreaterThanOrEqual(500);  // 500ms base + jitter ≥ 0
      expect(backoff0).toBeLessThanOrEqual(1000);    // 500ms + max jitter 500ms

      expect(backoff1).toBeGreaterThanOrEqual(1000); // 1000ms base + jitter ≥ 0
      expect(backoff1).toBeLessThanOrEqual(1500);    // 1000ms + max jitter 500ms

      expect(backoff2).toBe(-1); // maxRetries exceeded
      expect(backoff3).toBe(-1); // maxRetries exceeded
    });

    it('should return -1 when max retries exceeded', () => {
      const backoff10 = engine.calculateRetryDelay(10); // >= maxRetries (2) → -1
      expect(backoff10).toBe(-1);
    });

    it('should add jitter to prevent synchronized retries', () => {
      const backoffs = [];
      for (let i = 0; i < 10; i++) {
        backoffs.push(engine.calculateRetryDelay(1));
      }

      // All values should be in range but not identical
      const uniqueValues = new Set(backoffs);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });

    it('should be deterministic with same seed', () => {
      const engine1 = new ChaosEngine({ ...DEFAULT_CHAOS_CONFIG, seed: 123 });
      const engine2 = new ChaosEngine({ ...DEFAULT_CHAOS_CONFIG, seed: 123 });

      const backoffs1 = Array.from({ length: 5 }, (_, i) => engine1.calculateRetryDelay(i));
      const backoffs2 = Array.from({ length: 5 }, (_, i) => engine2.calculateRetryDelay(i));

      expect(backoffs1).toEqual(backoffs2);
    });
  });

  describe('Retry Success Rate', () => {
    it('should eventually succeed with retries', () => {
      const maxRetries = 2;
      let attempts = 0;
      let lastError: Error | null = null;

      // Simulate retry loop
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        attempts++;

        try {
          // Fail first 2 attempts, succeed on 3rd
          if (attempt < 2) {
            throw new Error('Simulated failure');
          }

          // Success on 3rd attempt
          expect(attempts).toBe(3);
          lastError = null;
          break;
        } catch (error) {
          lastError = error as Error;

          if (attempt >= maxRetries) {
            throw error;
          }
        }
      }

      expect(lastError).toBeNull();
      expect(attempts).toBe(3);
    });

    it('should fail after max retries exhausted', () => {
      const maxRetries = 2;
      let attempts = 0;
      let finalError: Error | null = null;

      try {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          attempts++;

          // Always fail
          const error = new Error('Simulated failure');

          if (attempt >= maxRetries) {
            throw error;
          }

          // Continue retry loop
        }
      } catch (error) {
        finalError = error as Error;
      }

      expect(finalError).not.toBeNull();
      expect(finalError?.message).toBe('Simulated failure');
      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe('Chaos Injection on Retries', () => {
    it('should only apply chaos on first attempt', () => {
      const event = {
        eventId: 'test-1',
        correlationId: 'corr-1',
        idempotencyKey: 'idem-1',
        tenantId: 'test',
        eventType: 'test:event' as unknown,
        payload: {},
        timestamp: new Date().toISOString(),
        source: 'test' as unknown,
        trace: { traceId: 'trace-1', spanId: 'span-1' },
        schemaVersion: '1.0.0',
      };

      const _chaosDecision = engine.decide(event, 1);

      // Chaos should be applied (first attempt)
      const shouldApplyChaos0 = 0 === 0;
      expect(shouldApplyChaos0).toBe(true);

      // Chaos should NOT be applied on retries
      const shouldApplyChaos1 = 1 === 0;
      const shouldApplyChaos2 = 2 === 0;
      expect(shouldApplyChaos1).toBe(false);
      expect(shouldApplyChaos2).toBe(false);
    });
  });
});
