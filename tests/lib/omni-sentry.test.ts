import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllData,
  flushOfflineErrors,
  getConfig,
  getHealthStatus,
  getStoredErrors,
  initializeOmniSentry,
  reportError,
  shutdownOmniSentry,
  withResilience,
} from '@/lib/omni-sentry';

describe('omni-sentry', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearAllData();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    shutdownOmniSentry();
    clearAllData();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with merged config', () => {
    initializeOmniSentry({
      maxRetries: 2,
      retryBaseMs: 10,
      healthCheckIntervalMs: 120_000,
    });

    const config = getConfig();
    expect(config.maxRetries).toBe(2);
    expect(config.retryBaseMs).toBe(10);
    expect(config.healthCheckIntervalMs).toBe(120_000);
    expect(config.errorThreshold).toBe(10);
  });

  it('executes resilient operation successfully and keeps circuit closed', async () => {
    initializeOmniSentry({
      maxRetries: 2,
      errorThreshold: 2,
      healthCheckIntervalMs: 120_000,
    });

    const op = vi.fn().mockResolvedValue('ok');
    const result = await withResilience(op, 'healthy-op');

    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
    expect(getHealthStatus().metrics.circuitState).toBe('closed');
  });

  it('opens the circuit after threshold failures and short-circuits further work', async () => {
    initializeOmniSentry({
      maxRetries: 1,
      errorThreshold: 1,
      circuitResetMs: 60_000,
      healthCheckIntervalMs: 120_000,
    });

    const failed = await withResilience(async () => {
      throw new Error('boom');
    }, 'failing-op');
    expect(failed).toBeNull();
    expect(getHealthStatus().metrics.circuitState).toBe('open');

    const skipped = await withResilience(async () => 42, 'skipped-op');
    expect(skipped).toBeNull();
  });

  it('deduplicates repeated errors and stores offline errors when circuit is open', async () => {
    initializeOmniSentry({
      maxRetries: 1,
      errorThreshold: 1,
      dedupeWindowMs: 120_000,
      healthCheckIntervalMs: 120_000,
    });

    await reportError(new Error('same-message'), { source: 'test' });
    await reportError(new Error('same-message'), { source: 'test' });
    expect(getStoredErrors()).toHaveLength(1);

    await withResilience(async () => {
      throw new Error('trip-circuit');
    }, 'trip-circuit');
    expect(getHealthStatus().metrics.circuitState).toBe('open');

    await reportError(new Error('offline-only'), { source: 'offline' });
    const offline = JSON.parse(sessionStorage.getItem('omni_sentry_offline') ?? '[]') as unknown[];
    expect(offline).toHaveLength(1);
  });

  it('flushes offline errors once circuit is healthy', async () => {
    initializeOmniSentry({ healthCheckIntervalMs: 120_000 });
    sessionStorage.setItem(
      'omni_sentry_offline',
      JSON.stringify([
        { error: { name: 'Error', message: 'a' }, timestamp: new Date().toISOString() },
        { error: { name: 'Error', message: 'b' }, timestamp: new Date().toISOString() },
      ]),
    );

    const flushed = await flushOfflineErrors();
    expect(flushed).toBe(2);
    expect(getStoredErrors()).toHaveLength(2);
    expect(JSON.parse(sessionStorage.getItem('omni_sentry_offline') ?? '[]')).toEqual([]);
  });

  it('restores persisted circuit state and persists state on shutdown', () => {
    sessionStorage.setItem(
      'omni_sentry_circuit',
      JSON.stringify({
        state: 'open',
        failures: 3,
        lastFailure: Date.now(),
        lastSuccess: Date.now(),
      }),
    );

    initializeOmniSentry({ healthCheckIntervalMs: 120_000 });
    expect(getHealthStatus().metrics.circuitState).toBe('open');

    shutdownOmniSentry();
    const saved = JSON.parse(sessionStorage.getItem('omni_sentry_circuit') ?? '{}') as {
      state?: string;
    };
    expect(saved.state).toBe('open');
  });

  it('clears all persisted sentry data', async () => {
    initializeOmniSentry({ healthCheckIntervalMs: 120_000 });
    await reportError(new Error('to-clear'), { stage: 'pre-clear' });
    expect(getStoredErrors().length).toBeGreaterThan(0);

    clearAllData();
    expect(getStoredErrors()).toEqual([]);
    expect(sessionStorage.getItem('omni_sentry_errors')).toBeNull();
    expect(sessionStorage.getItem('omni_sentry_offline')).toBeNull();
    expect(sessionStorage.getItem('omni_sentry_health')).toBeNull();
    expect(sessionStorage.getItem('omni_sentry_circuit')).toBeNull();
    expect(getHealthStatus().metrics.circuitState).toBe('closed');
  });
});

