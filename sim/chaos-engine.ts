/**
 * CHAOS ENGINEERING ENGINE
 *
 * Deterministic chaos injection for testing system resilience.
 * All chaos is seeded for reproducibility.
 *
 * CAPABILITIES:
 * - Duplicate event injection
 * - Out-of-order delivery
 * - Timeout simulation
 * - Network failure simulation
 * - Partial outage simulation
 *
 * DETERMINISM:
 * - Same seed + sequence → same chaos decisions
 * - Reproducible test runs
 */

import type { EventEnvelope, ChaosMetadata } from './contracts';

// ============================================================================
// TYPES
// ============================================================================

export interface ChaosConfig {
  /** Random seed for deterministic chaos */
  seed: number;

  /** Duplicate injection rate (0.0 - 1.0) */
  duplicateRate: number;

  /** Out-of-order delivery rate (0.0 - 1.0) */
  outOfOrderRate: number;

  /** Timeout injection rate (0.0 - 1.0) */
  timeoutRate: number;

  /** Network failure rate (0.0 - 1.0) */
  networkFailureRate: number;

  /** Server error rate (0.0 - 1.0) */
  serverErrorRate: number;

  /** Maximum delay for out-of-order events (ms) */
  maxDelayMs: number;

  /** Timeout duration (ms) */
  timeoutMs: number;

  /** Maximum number of retries allowed */
  maxRetries: number;

  /** Base backoff delay (ms) */
  baseBackoffMs: number;

  /** Target app for partial outage (null = no outage) */
  partialOutageApp?: string;

  /** When partial outage starts (event sequence number) */
  outageStartSeq?: number;

  /** When partial outage ends (event sequence number) */
  outageEndSeq?: number;

  /** Enable ML-based anomaly detection to adaptively scale chaos (default: false) */
  adaptiveMode?: boolean;
}

export interface ChaosDecision {
  /** Should this event be duplicated? */
  shouldDuplicate: boolean;

  /** Should delivery be delayed (out of order)? */
  shouldDelay: boolean;

  /** Delay amount in milliseconds */
  delayMs: number;

  /** Should this event timeout? */
  shouldTimeout: boolean;

  /** Should this event fail with network error? */
  shouldFailNetwork: boolean;

  /** Should this event fail with server error? */
  shouldFailServer: boolean;

  /** Is this app in partial outage? */
  inPartialOutage: boolean;

  /** Metadata to attach to event */
  metadata: ChaosMetadata;
}

export interface ChaosStats {
  totalEvents: number;
  duplicates: number;
  delayed: number;
  timeouts: number;
  networkFailures: number;
  serverErrors: number;
  duplicateRate: number;
  delayRate: number;
  timeoutRate: number;
  networkFailureRate: number;
  serverErrorRate: number;
}

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Simple seeded PRNG for deterministic chaos
 * Using Mulberry32 algorithm
 */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /**
   * Generate next random number [0, 1)
   */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer [min, max)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Generate random boolean with probability p
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Reset to initial seed
   */
  reset(seed: number): void {
    this.state = seed;
  }
}

// ============================================================================
// CHAOS ENGINE
// ============================================================================

import { getRecentMetrics } from './telemetry';
import { AnomalyDetector } from './anomaly-detector';

export class ChaosEngine {
  private readonly config: ChaosConfig;
  private readonly rng: SeededRandom;
  private readonly anomalyDetector: AnomalyDetector;
  private stats: ChaosStats;
  private eventSequence: number = 0;

  constructor(config: ChaosConfig) {
    this.config = config;
    this.rng = new SeededRandom(config.seed);
    this.stats = {
      totalEvents: 0,
      duplicates: 0,
      delayed: 0,
      timeouts: 0,
      networkFailures: 0,
      serverErrors: 0,
      duplicateRate: 0,
      delayRate: 0,
      timeoutRate: 0,
      networkFailureRate: 0,
      serverErrorRate: 0,
    };
    this.anomalyDetector = new AnomalyDetector(0.2, 2);
  }

  private calculateRiskMultiplier(): number {
    if (!this.config.adaptiveMode) return 1;
    const { latencies, errorCount } = getRecentMetrics(50);
    const riskScore = this.anomalyDetector.predictFailureRisk(latencies, errorCount);
    if (latencies.length > 0) {
      this.anomalyDetector.ingest({ latencyMs: latencies.at(-1)!, isError: errorCount > 0 });
    }
    return 1 + (riskScore * 4);
  }

  private getSimulatedFailure(shouldTimeout: boolean, shouldFailNetwork: boolean, shouldFailServer: boolean) {
    if (shouldTimeout) return 'timeout';
    if (shouldFailNetwork) return 'network';
    if (shouldFailServer) return 'server';
    return undefined;
  }

  /**
   * Make chaos decision for event
   */
  decide(event: EventEnvelope, sequenceOverride?: number): ChaosDecision {
    const seq = sequenceOverride ?? this.eventSequence++;
    this.stats.totalEvents++;

    const inPartialOutage = this.isInPartialOutage(event.target as string, seq);
    const riskMultiplier = this.calculateRiskMultiplier();

    const adaptiveDupRate = Math.min(this.config.duplicateRate * riskMultiplier, 1);
    const adaptiveOutOfOrderRate = Math.min(this.config.outOfOrderRate * riskMultiplier, 1);
    const adaptiveTimeoutRate = Math.min(this.config.timeoutRate * riskMultiplier, 1);
    const adaptiveNetworkRate = Math.min(this.config.networkFailureRate * riskMultiplier, 1);
    const adaptiveServerRate = Math.min(this.config.serverErrorRate * riskMultiplier, 1);

    const shouldDuplicate = !inPartialOutage && this.rng.nextBool(adaptiveDupRate);
    const shouldDelay = !inPartialOutage && this.rng.nextBool(adaptiveOutOfOrderRate);
    const delayMs = shouldDelay ? this.rng.nextInt(0, this.config.maxDelayMs) : 0;
    const shouldTimeout = inPartialOutage || this.rng.nextBool(adaptiveTimeoutRate);
    const shouldFailNetwork = inPartialOutage || this.rng.nextBool(adaptiveNetworkRate);
    const shouldFailServer = this.rng.nextBool(adaptiveServerRate);

    if (shouldDuplicate) this.stats.duplicates++;
    if (shouldDelay) this.stats.delayed++;
    if (shouldTimeout) this.stats.timeouts++;
    if (shouldFailNetwork) this.stats.networkFailures++;
    if (shouldFailServer) this.stats.serverErrors++;

    this.updateRates();

    const metadata: ChaosMetadata = {
      isDuplicate: shouldDuplicate,
      injectedDelayMs: delayMs,
      outOfOrder: shouldDelay,
      simulatedFailure: this.getSimulatedFailure(shouldTimeout, shouldFailNetwork, shouldFailServer),
    };

    return {
      shouldDuplicate,
      shouldDelay,
      delayMs,
      shouldTimeout,
      shouldFailNetwork,
      shouldFailServer,
      inPartialOutage,
      metadata,
    };
  }

  /**
   * Check if target app is in partial outage
   */
  private isInPartialOutage(targetApp: string | undefined, sequence: number): boolean {
    if (!this.config.partialOutageApp || !targetApp) {
      return false;
    }

    if (targetApp !== this.config.partialOutageApp) {
      return false;
    }

    const start = this.config.outageStartSeq ?? 0;
    const end = this.config.outageEndSeq ?? Infinity;

    return sequence >= start && sequence < end;
  }

  /**
   * Update calculated rates
   */
  private updateRates(): void {
    const total = this.stats.totalEvents;
    if (total === 0) return;

    this.stats.duplicateRate = this.stats.duplicates / total;
    this.stats.delayRate = this.stats.delayed / total;
    this.stats.timeoutRate = this.stats.timeouts / total;
    this.stats.networkFailureRate = this.stats.networkFailures / total;
    this.stats.serverErrorRate = this.stats.serverErrors / total;
  }

  /**
   * Get statistics
   */
  getStats(): ChaosStats {
    return { ...this.stats };
  }

  /**
   * Reset engine (for new run)
   */
  reset(newSeed?: number): void {
    if (newSeed !== undefined) {
      this.config.seed = newSeed;
      this.rng.reset(newSeed);
    }

    this.eventSequence = 0;
    this.stats = {
      totalEvents: 0,
      duplicates: 0,
      delayed: 0,
      timeouts: 0,
      networkFailures: 0,
      serverErrors: 0,
      duplicateRate: 0,
      delayRate: 0,
      timeoutRate: 0,
      networkFailureRate: 0,
      serverErrorRate: 0,
    };
    this.anomalyDetector.reset();
  }

  /**
   * Seeded base network latency for adapter calls (50–150ms).
   * Uses the same seeded RNG so every run with the same seed produces
   * identical latency measurements — required for determinism.
   */
  nextNetworkDelay(): number {
    return this.rng.nextInt(50, 150);
  }

  /**
   * Canonical retry backoff - uses config.baseBackoffMs (default 500ms)
   * Exponential + full-range jitter [0, baseBackoffMs]
   */
  calculateRetryDelay(attempt: number): number {
    if (attempt >= this.config.maxRetries) {
      return -1; // No more retries
    }

    // Exponential backoff: baseDelay * 2^attempt + jitter
    const exponential = this.config.baseBackoffMs * Math.pow(2, attempt);
    const jitter = this.rng.nextInt(0, this.config.baseBackoffMs);

    return exponential + jitter;
  }

  /**
   * Should retry after failure?
   */
  shouldRetry(attempt: number): boolean {
    return attempt < this.config.maxRetries;
  }

  /**
   * Get current sequence number
   */
  getSequence(): number {
    return this.eventSequence;
  }
}

// ============================================================================
// DEFAULT CONFIGS
// ============================================================================

export const DEFAULT_CHAOS_CONFIG: ChaosConfig = {
  seed: 42,
  duplicateRate: 0.15, // 15% duplicate rate
  outOfOrderRate: 0.10, // 10% out of order
  timeoutRate: 0.05, // 5% timeout rate
  networkFailureRate: 0.03, // 3% network failures
  serverErrorRate: 0.02, // 2% server errors
  maxDelayMs: 5000, // Max 5 second delay
  timeoutMs: 30000, // 30 second timeout
  maxRetries: 2, // Max 2 retries
  baseBackoffMs: 500, // 500ms base backoff
};

export const LIGHT_CHAOS_CONFIG: ChaosConfig = {
  seed: 42,
  duplicateRate: 0.05,
  outOfOrderRate: 0.05,
  timeoutRate: 0.01,
  networkFailureRate: 0.01,
  serverErrorRate: 0.01,
  maxDelayMs: 2000,
  timeoutMs: 30000,
  maxRetries: 2,
  baseBackoffMs: 500,
};

export const HEAVY_CHAOS_CONFIG: ChaosConfig = {
  seed: 42,
  duplicateRate: 0.30, // 30% duplicates
  outOfOrderRate: 0.25, // 25% out of order
  timeoutRate: 0.15, // 15% timeouts
  networkFailureRate: 0.10, // 10% network failures
  serverErrorRate: 0.05, // 5% server errors
  maxDelayMs: 10000, // Max 10 second delay
  timeoutMs: 15000, // 15 second timeout
  maxRetries: 3,
  baseBackoffMs: 1000,
};

export const NO_CHAOS_CONFIG: ChaosConfig = {
  seed: 42,
  duplicateRate: 0,
  outOfOrderRate: 0,
  timeoutRate: 0,
  networkFailureRate: 0,
  serverErrorRate: 0,
  maxDelayMs: 0,
  timeoutMs: 30000,
  maxRetries: 0,
  baseBackoffMs: 500,
};

// ============================================================================
// FACTORY
// ============================================================================

export function createChaosEngine(config: Partial<ChaosConfig> = {}): ChaosEngine {
  return new ChaosEngine({
    ...DEFAULT_CHAOS_CONFIG,
    ...config,
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Inject chaos metadata into event
 */
export function injectChaos<T>(event: EventEnvelope<T>, metadata: ChaosMetadata): EventEnvelope<T> {
  return {
    ...event,
    chaos: {
      ...event.chaos,
      ...metadata,
    },
  };
}

/**
 * Create duplicate event
 */
export function createDuplicate<T>(event: EventEnvelope<T>): EventEnvelope<T> {
  return {
    ...event,
    eventId: crypto.randomUUID(), // New event ID
    chaos: {
      ...event.chaos,
      isDuplicate: true,
    },
  };
}

/**
 * Simulate delay
 */
export async function simulateDelay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simulate failure
 */
export class ChaosError extends Error {
  constructor(
    public type: 'timeout' | 'network' | 'server' | 'validation',
    message: string
  ) {
    super(message);
    this.name = 'ChaosError';
  }
}

export function simulateFailure(type: 'timeout' | 'network' | 'server'): never {
  switch (type) {
    case 'timeout':
      throw new ChaosError('timeout', 'Simulated timeout error');
    case 'network':
      throw new ChaosError('network', 'Simulated network error');
    case 'server':
      throw new ChaosError('server', 'Simulated server error (500)');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ChaosEngine,
  createChaosEngine,
  DEFAULT_CHAOS_CONFIG,
  LIGHT_CHAOS_CONFIG,
  HEAVY_CHAOS_CONFIG,
  NO_CHAOS_CONFIG,
  injectChaos,
  createDuplicate,
  simulateDelay,
  simulateFailure,
  ChaosError,
};
