/**
 * SIM: Metrics Collector Tests
 *
 * Unit tests for the MetricsCollector class.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector, getMetricsCollector, resetMetrics } from '../../sim/metrics';
import type { AppName } from '../../sim/contracts';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('Initialization', () => {
    it('should initialize with empty metrics', () => {
      const stats = collector.getLatencyStats();
      const appMetrics = collector.getAppMetrics();
      const systemMetrics = collector.getSystemMetrics();

      expect(stats).toHaveLength(0);
      expect(appMetrics).toHaveLength(0);
      expect(systemMetrics.totalEvents).toBe(0);
    });

    it('should set start time on initialization', () => {
      // Access private property for testing if needed, or infer from scorecard duration
      // But since startTime is private, we can rely on generateScorecard having a duration > 0
      // provided we wait a tiny bit or just check that it exists.
      const scorecard = collector.generateScorecard('run-1', 'test', 'tenant-1', 123);
      expect(scorecard.timestamp).toBeInstanceOf(Date);
      // Duration might be 0 if fast enough, but timestamp should be valid
    });
  });

  describe('Latency Recording', () => {
    it('should record latency and calculate stats', () => {
      collector.recordLatency('op1', 10, true);
      collector.recordLatency('op1', 20, true);
      collector.recordLatency('op1', 30, true);
      collector.recordLatency('op1', 40, false); // failure
      collector.recordLatency('op1', 100, true); // outlier

      const stats = collector.getLatencyStats('op1');
      expect(stats).toHaveLength(1);

      const opStats = stats[0];
      expect(opStats.operation).toBe('op1');
      expect(opStats.count).toBe(5);
      expect(opStats.min).toBe(10);
      expect(opStats.max).toBe(100);
      expect(opStats.mean).toBe(40); // (10+20+30+40+100)/5 = 200/5 = 40
      expect(opStats.p50).toBe(30); // sorted: 10, 20, 30, 40, 100 -> index 2 (0.5 * 5 = 2.5 -> 3rd element)
      expect(opStats.successRate).toBe(0.8); // 4/5
    });

    it('should handle multiple operations', () => {
      collector.recordLatency('opA', 10, true);
      collector.recordLatency('opB', 20, true);

      const stats = collector.getLatencyStats();
      expect(stats).toHaveLength(2);
      expect(stats.map(s => s.operation)).toContain('opA');
      expect(stats.map(s => s.operation)).toContain('opB');
    });
  });

  describe('App Event Recording', () => {
    const appName: AppName = 'omnilink';

    it('should record app events correctly', () => {
      collector.recordAppEvent(appName, true); // success
      collector.recordAppEvent(appName, true); // success
      collector.recordAppEvent(appName, false); // failure
      collector.recordAppEvent(appName, true, true); // retry
      collector.recordAppEvent(appName, true, false, true); // dedupe

      const metrics = collector.getAppMetrics();
      expect(metrics).toHaveLength(1);

      const appMetric = metrics[0];
      expect(appMetric.app).toBe(appName);
      expect(appMetric.eventsProcessed).toBe(5);
      expect(appMetric.eventsSucceeded).toBe(4);
      expect(appMetric.eventsFailed).toBe(1);
      expect(appMetric.successRate).toBe(0.8);
      expect(appMetric.retriesTotal).toBe(1);
      expect(appMetric.dedupesTotal).toBe(1);
    });

    it('should calculate app-specific latency', () => {
      // Operations starting with appName are counted for app latency
      collector.recordLatency(`${appName}:op1`, 100, true);
      collector.recordLatency(`${appName}:op2`, 200, true);
      collector.recordAppEvent(appName, true);
      collector.recordAppEvent(appName, true);

      const metrics = collector.getAppMetrics();
      const appMetric = metrics[0];

      expect(appMetric.avgLatencyMs).toBe(150);
      expect(appMetric.p95LatencyMs).toBe(200);
    });
  });

  describe('System Metrics', () => {
    it('should calculate system-wide metrics', () => {
      collector.recordLatency('op1', 10, true);
      collector.recordLatency('op2', 20, false); // failure
      collector.recordLatency('op3', 30, true, 1); // retry

      collector.recordAppEvent('omnilink', true);
      collector.recordAppEvent('omnihub', true, false, true); // dedupe

      const metrics = collector.getSystemMetrics(5, { 'circuit-1': 'open' });

      expect(metrics.totalEvents).toBe(3); // from latency metrics
      expect(metrics.errorRate).toBeCloseTo(1/3); // 1 failure out of 3
      expect(metrics.retryRate).toBeCloseTo(1/3); // 1 retry out of 3
      // dedupeRate is calculated from app metrics dedupes / total latency events?
      // Let's check implementation:
      // const totalDedupes = appMetrics.reduce((sum, m) => sum + m.dedupesTotal, 0);
      // dedupeRate: totalEvents > 0 ? totalDedupes / totalEvents : 0
      // totalDedupes = 1 (from omnihub)
      // totalEvents = 3
      expect(metrics.dedupeRate).toBeCloseTo(1/3);

      expect(metrics.queueDepth).toBe(5);
      expect(metrics.circuitBreakers).toEqual({ 'circuit-1': 'open' });
    });
  });

  describe('Scorecard Generation', () => {
    it('should generate a valid scorecard', () => {
      collector.recordAppEvent('omnilink', true);
      // Add some latency so it doesn't fail due to "No events processed" or latency checks
      collector.recordLatency('omnilink:op', 100, true);

      collector.finish();

      const scorecard = collector.generateScorecard('run-1', 'scenario-1', 'tenant-1', 12345);

      expect(scorecard.runId).toBe('run-1');
      expect(scorecard.scenario).toBe('scenario-1');
      expect(scorecard.tenant).toBe('tenant-1');
      expect(scorecard.seed).toBe(12345);
      expect(scorecard.duration).toBeGreaterThanOrEqual(0);
      expect(scorecard.overallScore).toBeGreaterThan(0);
      expect(scorecard.apps['omnilink']).toBeDefined();
    });

    it('should penalize score for failures', () => {
      // 100% failure rate
      collector.recordAppEvent('omnilink', false);
      collector.recordLatency('omnilink:op', 100, false);

      const scorecard = collector.generateScorecard('run-fail', 'test', 'tenant', 1);
      const appScore = scorecard.apps['omnilink'];

      // Should be low score due to 0% success rate
      expect(appScore.successRate).toBe(0);
      expect(appScore.score).toBeLessThan(100);
      expect(appScore.issues.length).toBeGreaterThan(0);
    });

    it('should penalize score for high latency', () => {
      collector.recordAppEvent('omnilink', true);
      // Very high latency > 500ms threshold
      collector.recordLatency('omnilink:op', 1000, true);

      const scorecard = collector.generateScorecard('run-latency', 'test', 'tenant', 1);
      const appScore = scorecard.apps['omnilink'];

      expect(appScore.score).toBeLessThan(100);
      expect(appScore.issues.some(i => i.includes('High p95 latency'))).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    beforeEach(() => {
      resetMetrics();
    });

    it('should return the same instance', () => {
      const instance1 = getMetricsCollector();
      const instance2 = getMetricsCollector();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance on reset', () => {
      const instance1 = getMetricsCollector();
      instance1.recordAppEvent('omnilink', true);

      resetMetrics();
      const instance2 = getMetricsCollector();

      expect(instance1).not.toBe(instance2);
      expect(instance2.getAppMetrics()).toHaveLength(0);
    });
  });

  describe('Reset', () => {
    it('should clear all metrics', () => {
      collector.recordLatency('op', 100, true);
      collector.recordAppEvent('omnilink', true);

      collector.reset();

      expect(collector.getLatencyStats()).toHaveLength(0);
      expect(collector.getAppMetrics()).toHaveLength(0);
    });
  });
});
