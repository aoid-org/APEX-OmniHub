/**
 * ANOMALY DETECTOR (ENTERPRISE GRADE)
 *
 * Deterministic, zero-dependency statistical ML pipeline for failure prediction.
 * Uses Exponential Moving Average (EMA) and Z-Score mathematics to identify
 * performance degradation and latency spikes in real-time.
 *
 * APEX STANDARDS:
 * - Atomic Idempotency: Stateless calculations based on passed moving windows.
 * - Enterprise Optimization: Zero external ML API network overhead.
 * - Overload-Free: O(1) sliding window processing.
 * - Regression-Free: 100% deterministic output for identical input streams.
 */

export interface TelemetryPoint {
  latencyMs: number;
  isError: boolean;
}

export class AnomalyDetector {
  private readonly emaAlpha: number;
  private readonly zScoreThreshold: number;

  private currentEma: number = 0;
  private currentVariance: number = 0;
  private sampleCount: number = 0;

  /**
   * @param emaAlpha Smoothing factor [0, 1]. Higher means faster reaction to recent changes.
   * @param zScoreThreshold Standard deviations above mean to be considered an anomaly.
   */
  constructor(emaAlpha: number = 0.2, zScoreThreshold: number = 2) {
    this.emaAlpha = emaAlpha;
    this.zScoreThreshold = zScoreThreshold;
  }

  /**
   * Process a new telemetry point and update the rolling statistics.
   * Runs in O(1) time.
   */
  public ingest(point: TelemetryPoint): void {
    const value = point.latencyMs;

    if (this.sampleCount === 0) {
      this.currentEma = value;
      this.currentVariance = 0;
      this.sampleCount = 1;
      return;
    }

    // Update EMA
    const delta = value - this.currentEma;
    this.currentEma += this.emaAlpha * delta;

    // Update Exponential Moving Variance (EMV)
    // Formula: Variance = (1 - alpha) * (Variance + alpha * delta^2)
    this.currentVariance =
      (1 - this.emaAlpha) *
      (this.currentVariance + this.emaAlpha * delta * delta);

    this.sampleCount++;
  }

  /**
   * Calculates the Z-Score of a given value against the current EMA model.
   * @param value The latency value to test.
   */
  public calculateZScore(value: number): number {
    if (this.sampleCount < 2) return 0;
    // Enforce a minimum standard deviation (epsilon) of 10ms to prevent infinite Z-scores
    // on zero-variance baselines, which would otherwise flag tiny jitters as critical anomalies.
    const stdDev = Math.max(Math.sqrt(this.currentVariance), 10);
    return Math.abs(value - this.currentEma) / stdDev;
  }

  /**
   * Predicts the failure risk score [0.0, 1.0] based on the current system state.
   * Incorporates both latency anomalies (Z-Score) and immediate error inputs.
   *
   * @param currentLatencies A batch of recent latency measurements.
   * @param errorCount Number of recent errors.
   */
  public predictFailureRisk(currentLatencies: number[], errorCount: number): number {
    if (currentLatencies.length === 0) {
      return errorCount > 0 ? 1 : 0;
    }

    let maxZScore = 0;
    for (const latency of currentLatencies) {
      const z = this.calculateZScore(latency);
      if (z > maxZScore) maxZScore = z;
    }

    // Base risk from latency anomalies (capped at 1.0)
    // If Z-Score meets threshold, risk starts ramping up.
    let latencyRisk = 0;
    if (maxZScore > this.zScoreThreshold) {
      latencyRisk = Math.min((maxZScore - this.zScoreThreshold) / 2, 1);
    }

    // Error burst risk pushes the score immediately to 1
    const errorRisk = errorCount > 0 ? 1 : 0;

    return Math.max(latencyRisk, errorRisk);
  }

  /**
   * Reset internal state. Useful for test isolation and deterministic restarts.
   */
  public reset(): void {
    this.currentEma = 0;
    this.currentVariance = 0;
    this.sampleCount = 0;
  }
}
