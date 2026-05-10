/**
 * Chaos Engine Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { ChaosEngine, NO_CHAOS_CONFIG, DEFAULT_CHAOS_CONFIG } from '../chaos-engine';
import { createEvent } from '../contracts';
import * as telemetry from '../telemetry';

describe('Chaos Engine', () => {
  describe('Determinism', () => {
    it('should produce identical results with same seed', () => {
      const engine1 = new ChaosEngine({ ...DEFAULT_CHAOS_CONFIG, seed: 42 });
      const engine2 = new ChaosEngine({ ...DEFAULT_CHAOS_CONFIG, seed: 42 });

      const event = createEvent('tenant', 'omnilink:system.started')
        .correlationId('test')
        .idempotencyKey('test-key')
        .source('omnilink')
        .payload({})
        .build();

      const decisions1 = [];
      const decisions2 = [];

      for (let i = 0; i < 100; i++) {
        decisions1.push(engine1.decide(event, i));
        decisions2.push(engine2.decide(event, i));
      }

      expect(decisions1).toEqual(decisions2);
    });

    it('should produce different results with different seeds', () => {
      const engine1 = new ChaosEngine({ ...DEFAULT_CHAOS_CONFIG, seed: 42 });
      const engine2 = new ChaosEngine({ ...DEFAULT_CHAOS_CONFIG, seed: 999 });

      const event = createEvent('tenant', 'omnilink:system.started')
        .correlationId('test')
        .idempotencyKey('test-key')
        .source('omnilink')
        .payload({})
        .build();

      const decisions1 = [];
      const decisions2 = [];

      for (let i = 0; i < 100; i++) {
        decisions1.push(engine1.decide(event, i));
        decisions2.push(engine2.decide(event, i));
      }

      expect(decisions1).not.toEqual(decisions2);
    });
  });

  describe('Chaos Rates', () => {
    it('should respect chaos rates over many samples', () => {
      const config = {
        ...DEFAULT_CHAOS_CONFIG,
        seed: 42,
        duplicateRate: 0.15,
        outOfOrderRate: 0.1,
        timeoutRate: 0.05,
      };

      const engine = new ChaosEngine(config);

      const event = createEvent('tenant', 'omnilink:system.started')
        .correlationId('test')
        .idempotencyKey('test-key')
        .source('omnilink')
        .payload({})
        .build();

      const sampleSize = 1000;
      let duplicates = 0;
      let delays = 0;
      let timeouts = 0;

      for (let i = 0; i < sampleSize; i++) {
        const decision = engine.decide(event, i);
        if (decision.shouldDuplicate) duplicates++;
        if (decision.shouldDelay) delays++;
        if (decision.shouldTimeout) timeouts++;
      }

      // Allow 5% margin of error
      expect(duplicates / sampleSize).toBeCloseTo(0.15, 1);
      expect(delays / sampleSize).toBeCloseTo(0.1, 1);
      expect(timeouts / sampleSize).toBeCloseTo(0.05, 1);
    });
  });

  describe('No Chaos Mode', () => {
    it('should never inject chaos with NO_CHAOS_CONFIG', () => {
      const engine = new ChaosEngine(NO_CHAOS_CONFIG);

      const event = createEvent('tenant', 'omnilink:system.started')
        .correlationId('test')
        .idempotencyKey('test-key')
        .source('omnilink')
        .payload({})
        .build();

      for (let i = 0; i < 100; i++) {
        const decision = engine.decide(event, i);

        expect(decision.shouldDuplicate).toBe(false);
        expect(decision.shouldDelay).toBe(false);
        expect(decision.shouldTimeout).toBe(false);
        expect(decision.shouldFailNetwork).toBe(false);
        expect(decision.shouldFailServer).toBe(false);
      }
    });

    it('should dynamically increase chaos rates when adaptiveMode is true and anomalies exist', () => {
      const config = {
        ...DEFAULT_CHAOS_CONFIG,
        seed: 42,
        networkFailureRate: 0.1, // Base 10%
        adaptiveMode: true,
      };

      const engine = new ChaosEngine(config);

      const event = createEvent('tenant', 'omnilink:system.started')
        .correlationId('test')
        .idempotencyKey('test')
        .source('omnilink')
        .payload({})
        .build();

      // Phase 1: Normal operations (mocking the telemetry getter)
      const telemetrySpy = vi.spyOn(telemetry, 'getRecentMetrics').mockReturnValue({
        latencies: [50, 55, 45, 50, 52],
        errorCount: 0,
      });

      let normalFailures = 0;
      for (let i = 0; i < 1000; i++) {
        if (engine.decide(event, i).shouldFailNetwork) normalFailures++;
      }

      // Phase 2: Anomaly detected (high latency + errors)
      telemetrySpy.mockReturnValue({
        latencies: [500, 600, 550, 800],
        errorCount: 5,
      });

      let adaptiveFailures = 0;
      for (let i = 1000; i < 2000; i++) {
        if (engine.decide(event, i).shouldFailNetwork) adaptiveFailures++;
      }

      telemetrySpy.mockRestore();

      // Ensure that adaptive rate is tangibly higher than normal mode rate
      expect(adaptiveFailures).toBeGreaterThan(normalFailures * 1.5);
    });
  });

  describe('Stats Tracking', () => {
    it('should track chaos statistics accurately', () => {
      const engine = new ChaosEngine({ ...DEFAULT_CHAOS_CONFIG, seed: 42 });

      const event = createEvent('tenant', 'omnilink:system.started')
        .correlationId('test')
        .idempotencyKey('test-key')
        .source('omnilink')
        .payload({})
        .build();

      for (let i = 0; i < 100; i++) {
        engine.decide(event, i);
      }

      const stats = engine.getStats();

      expect(stats.totalEvents).toBe(100);
      expect(stats.duplicateRate).toBeGreaterThan(0);
      expect(stats.delayRate).toBeGreaterThan(0);
    });
  });

  describe('Retry Backoff', () => {
    it('should calculate exponential backoff correctly', () => {
      const engine = new ChaosEngine({
        ...DEFAULT_CHAOS_CONFIG,
        baseBackoffMs: 100,
        maxRetries: 3,
        seed: 42,
      });

      const delay0 = engine.calculateRetryDelay(0);
      const delay1 = engine.calculateRetryDelay(1);
      const delay2 = engine.calculateRetryDelay(2);
      const delay3 = engine.calculateRetryDelay(3); // Should be -1 (no more retries)

      expect(delay0).toBeGreaterThanOrEqual(100);
      expect(delay0).toBeLessThanOrEqual(200); // 100 * 2^0 + jitter

      expect(delay1).toBeGreaterThanOrEqual(200);
      expect(delay1).toBeLessThanOrEqual(300); // 100 * 2^1 + jitter

      expect(delay2).toBeGreaterThanOrEqual(400);
      expect(delay2).toBeLessThanOrEqual(500); // 100 * 2^2 + jitter

      expect(delay3).toBe(-1); // No more retries
    });
  });
});
