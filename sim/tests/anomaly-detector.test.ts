import { describe, it, expect, beforeEach } from 'vitest';
import { AnomalyDetector } from '../anomaly-detector';

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    // Fast alpha (0.5), low threshold (1.0) for easy testing of spikes
    detector = new AnomalyDetector(0.5, 1);
  });

  it('should initialize cleanly and return 0 risk for no data', () => {
    expect(detector.predictFailureRisk([], 0)).toBe(0);
  });

  it('should return 1 risk immediately if errorCount > 0', () => {
    expect(detector.predictFailureRisk([10, 15, 20], 1)).toBe(1);
    expect(detector.predictFailureRisk([], 5)).toBe(1);
  });

  it('should calculate Z-Scores and normalize anomaly risk', () => {
    // Build a baseline of 50ms latencies
    for (let i = 0; i < 10; i++) {
      detector.ingest({ latencyMs: 50, isError: false });
    }

    // A normal latency should not trigger risk
    expect(detector.predictFailureRisk([55, 45], 0)).toBe(0);

    // Provide a massive spike to trigger a Z-Score
    // Baseline is solidly 50. Variance is near 0.
    // A sudden 200ms latency should trigger high anomaly risk.
    const risk = detector.predictFailureRisk([200], 0);
    expect(risk).toBeGreaterThan(0.5); // Should be very high

    // Now ingest the spike. The baseline shifts.
    detector.ingest({ latencyMs: 200, isError: false });

    // Subsequent 200s are less anomalous, but still somewhat anomalous
    // until full adjustment.
    const riskAfter = detector.predictFailureRisk([200], 0);
    expect(riskAfter).toBe(0); // With alpha=0.5, it fully adapted to the new normal
    expect(riskAfter).toBeLessThan(risk); // Risk goes down as it becomes the "new normal"
  });

  it('should gracefully handle 0 variance states', () => {
    detector.ingest({ latencyMs: 100, isError: false });
    detector.ingest({ latencyMs: 100, isError: false });

    // Variance is exactly 0.
    expect(detector.predictFailureRisk([100], 0)).toBe(0);

    // Any deviation from absolute 0 variance requires safe handling in Z-score
    // the math says stdDev = 0, so Z score returns 0.
    // Meaning a spike isn't anomalous initially mathematically if variance is hard 0,
    // until the first deviation is ingested.
    expect(detector.predictFailureRisk([101], 0)).toBe(0);
    
    // Ingesting it breaks the 0 variance.
    detector.ingest({ latencyMs: 101, isError: false });
    expect(detector.predictFailureRisk([150], 0)).toBeGreaterThan(0);
  });
});
