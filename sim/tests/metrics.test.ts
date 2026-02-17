import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetricsCollector, getMetricsCollector, resetMetrics } from '../metrics';
import type { AppName } from '../contracts';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    // Mock date to have consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

    // Reset singleton state before each test
    resetMetrics();
    collector = getMetricsCollector();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe('Initialization', () => {
    it('should initialize with start time', () => {
      expect(collector).toBeDefined();
      // We can't access private properties directly, but we can verify behavior
      const scorecard = collector.generateScorecard('run-1', 'test', 'tenant-1', 123);
      expect(scorecard.timestamp).toEqual(new Date('2024-01-01T12:00:00Z'));
    });
  });

  describe('Latency Recording', () => {
    it('should record latency metrics correctly', () => {
      collector.recordLatency('op1', 100, true);
      collector.recordLatency('op1', 200, false);
      collector.recordLatency('op2', 300, true);

      const stats = collector.getLatencyStats();
      expect(stats).toHaveLength(2);

      const op1Stats = stats.find(s => s.operation === 'op1');
      expect(op1Stats).toBeDefined();
      expect(op1Stats?.count).toBe(2);
      expect(op1Stats?.min).toBe(100);
      expect(op1Stats?.max).toBe(200);
      expect(op1Stats?.mean).toBe(150);
      expect(op1Stats?.successRate).toBe(0.5);

      const op2Stats = stats.find(s => s.operation === 'op2');
      expect(op2Stats).toBeDefined();
      expect(op2Stats?.count).toBe(1);
      expect(op2Stats?.mean).toBe(300);
      expect(op2Stats?.successRate).toBe(1.0);
    });

    it('should filter latency stats by operation', () => {
      collector.recordLatency('op1', 100, true);
      collector.recordLatency('op2', 200, true);

      const stats = collector.getLatencyStats('op1');
      expect(stats).toHaveLength(1);
      expect(stats[0].operation).toBe('op1');
    });

    it('should calculate percentiles correctly', () => {
      // Add 100 measurements: 1..100
      for (let i = 1; i <= 100; i++) {
        collector.recordLatency('perf-test', i, true);
      }

      const stats = collector.getLatencyStats('perf-test')[0];
      expect(stats.p50).toBe(50);
      expect(stats.p95).toBe(95);
      expect(stats.p99).toBe(99);
    });
  });

  describe('App Event Recording', () => {
    it('should track app success/failure counts', () => {
      const app: AppName = 'omnilink';
      collector.recordAppEvent(app, true);
      collector.recordAppEvent(app, true);
      collector.recordAppEvent(app, false);

      const metrics = collector.getAppMetrics();
      const appMetric = metrics.find(m => m.app === app);

      expect(appMetric).toBeDefined();
      expect(appMetric?.eventsProcessed).toBe(3);
      expect(appMetric?.eventsSucceeded).toBe(2);
      expect(appMetric?.eventsFailed).toBe(1);
      expect(appMetric?.successRate).toBeCloseTo(0.666, 2);
    });

    it('should track retries and dedupes', () => {
      const app: AppName = 'omnihub';
      collector.recordAppEvent(app, true, true, false); // Retry
      collector.recordAppEvent(app, true, false, true); // Dedupe
      collector.recordAppEvent(app, true, true, true);  // Both

      const metrics = collector.getAppMetrics();
      const appMetric = metrics.find(m => m.app === app);

      expect(appMetric?.retriesTotal).toBe(2);
      expect(appMetric?.dedupesTotal).toBe(2);
    });

    it('should calculate app-specific latency', () => {
      const app: AppName = 'tradeline247';
      // Record latency for app operations (must start with app name)
      collector.recordLatency(`${app}:op1`, 100, true);
      collector.recordLatency(`${app}:op2`, 200, true);

      // Need to record at least one app event to have the app show up in metrics
      collector.recordAppEvent(app, true);

      const metrics = collector.getAppMetrics();
      const appMetric = metrics.find(m => m.app === app);

      expect(appMetric?.avgLatencyMs).toBe(150);
      expect(appMetric?.p95LatencyMs).toBe(200);
    });
  });

  describe('System Metrics', () => {
    it('should aggregate system-wide metrics', () => {
      collector.recordLatency('op1', 100, true);
      collector.recordLatency('op2', 200, false); // Failed
      collector.recordLatency('op3', 300, true, 1); // Retry attempt 1

      // Record some dedupes
      collector.recordAppEvent('omnilink', true, false, true);

      const metrics = collector.getSystemMetrics(10, { 'cb-1': 'open' });

      expect(metrics.totalEvents).toBe(3);
      expect(metrics.avgLatencyMs).toBe(200);
      expect(metrics.errorRate).toBeCloseTo(0.333, 2); // 1 failure / 3 events
      expect(metrics.retryRate).toBeCloseTo(0.333, 2); // 1 retry / 3 events
      expect(metrics.dedupeRate).toBeCloseTo(0.333, 2); // 1 dedupe / 3 events
      expect(metrics.queueDepth).toBe(10);
      expect(metrics.circuitBreakers).toEqual({ 'cb-1': 'open' });
    });

    it('should handle empty metrics safely', () => {
      const metrics = collector.getSystemMetrics();
      expect(metrics.totalEvents).toBe(0);
      expect(metrics.avgLatencyMs).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });
  });

  describe('Scorecard Generation', () => {
    it('should generate a passing scorecard for good metrics', () => {
      // Simulate good behavior
      const app: AppName = 'omnilink';

      // 100 successful events, low latency
      for (let i = 0; i < 100; i++) {
        collector.recordAppEvent(app, true);
        collector.recordLatency(`${app}:op`, 50, true);
      }

      // Move time forward 1 second
      vi.advanceTimersByTime(1000);
      collector.finish();

      const scorecard = collector.generateScorecard('run-1', 'happy-path', 'tenant-1', 123);

      expect(scorecard.passed).toBe(true);
      expect(scorecard.duration).toBe(1000);
      expect(scorecard.apps[app].score).toBe(100);
      expect(scorecard.system.score).toBe(100);
    });

    it('should generate a failing scorecard for bad metrics', () => {
      const app: AppName = 'omnilink';

      // 100 failed events
      for (let i = 0; i < 100; i++) {
        collector.recordAppEvent(app, false);
      }

      // High latency
      collector.recordLatency(`${app}:op`, 5000, false);

      const scorecard = collector.generateScorecard('run-1', 'sad-path', 'tenant-1', 123);

      expect(scorecard.passed).toBe(false);
      expect(scorecard.apps[app].passed).toBe(false);
      expect(scorecard.system.latency).toBe(false); // > 500ms default
      expect(scorecard.system.errors).toBe(false); // 100% error rate
    });

    it('should respect SIM_MODE env var for relaxed thresholds', () => {
      vi.stubEnv('SIM_MODE', 'true');

      const app: AppName = 'omnilink';
      // High latency but acceptable in SIM_MODE (threshold 3000ms)
      collector.recordLatency(`${app}:op`, 2000, true);
      collector.recordAppEvent(app, true);

      const scorecard = collector.generateScorecard('run-1', 'sim-mode', 'tenant-1', 123);

      expect(scorecard.system.latency).toBe(true); // Should pass with 2000ms in SIM_MODE
    });

    it('should respect CHAOS_THRESHOLD env var', () => {
      vi.stubEnv('CHAOS_THRESHOLD', '50');

      const scorecard = collector.generateScorecard('run-1', 'custom-threshold', 'tenant-1', 123);
      expect(scorecard.requiredScore).toBe(50);
    });

    it('should detect high p95 latency warnings', () => {
      const app: AppName = 'omnilink';
      collector.recordAppEvent(app, true);
      // P95 > 500ms triggers warning
      for(let i=0; i<20; i++) {
         collector.recordLatency(`${app}:op`, 600, true);
      }

      const scorecard = collector.generateScorecard('run-1', 'warn-latency', 'tenant-1', 123);
      expect(scorecard.warnings.some(w => w.includes('High p95 latency'))).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getMetricsCollector();
      const instance2 = getMetricsCollector();
      expect(instance1).toBe(instance2);
    });

    it('should reset the instance', () => {
      const instance1 = getMetricsCollector();
      instance1.recordLatency('op', 100, true);

      resetMetrics();

      const instance2 = getMetricsCollector();
      expect(instance1).not.toBe(instance2);
      expect(instance2.getLatencyStats()).toHaveLength(0);
    });

    it('should reset internal state via reset() method', () => {
      collector.recordLatency('op', 100, true);
      collector.recordAppEvent('omnilink', true);

      collector.reset();

      expect(collector.getLatencyStats()).toHaveLength(0);
      expect(collector.getAppMetrics()).toHaveLength(0);
    });
  });

  describe('Score Calculation Edge Cases', () => {
    it('should penalize high retry rates', () => {
      const app: AppName = 'omnilink';
      // 10 events, 3 retries (30% retry rate > 20% threshold)
      for(let i=0; i<10; i++) {
        collector.recordAppEvent(app, true, i < 3);
      }

      const scorecard = collector.generateScorecard('run-1', 'retry-test', 'tenant-1', 123);
      const appScore = scorecard.apps[app];

      expect(appScore.issues.some(i => i.includes('High retry rate'))).toBe(true);
      expect(appScore.score).toBeLessThan(100);
    });

  });
});
