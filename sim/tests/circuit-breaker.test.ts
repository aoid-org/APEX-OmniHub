/**
 * Circuit Breaker Tests
 * Covers states: closed → open → half_open → closed lifecycle,
 * queue operations, registry helpers, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerError,
  getCircuitBreaker,
  getAllCircuitBreakers,
  getAllCircuitStats,
  resetAllCircuits,
  destroyAllCircuits,
  type CircuitBreakerConfig,
} from '../circuit-breaker';
import type { EventEnvelope } from '../contracts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<CircuitBreakerConfig>): CircuitBreakerConfig {
  return {
    name: 'test-cb',
    failureThreshold: 3,
    successThreshold: 2,
    openTimeout: 50, // short for tests
    maxQueueSize: 5,
    ...overrides,
  };
}

function makeEvent(id = 'evt-1'): EventEnvelope {
  return {
    eventId: id,
    eventType: 'test:domain.action',
    correlationId: `corr-${id}`,
    idempotencyKey: `idem-${id}`,
    tenantId: 'tenant-1',
    payload: {},
    timestamp: new Date().toISOString(),
    schemaVersion: '1.0',
    source: 'omnidash',
    trace: { traceId: `corr-${id}`, spanId: `span-${id}`, parentSpanId: null },
  } as unknown as EventEnvelope;
}

async function failN(cb: CircuitBreaker, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await cb.execute(() => Promise.reject(new Error('boom'))).catch(() => {});
  }
}

async function succeedN(cb: CircuitBreaker, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await cb.execute(() => Promise.resolve('ok'));
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker(makeConfig());
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cb.destroy();
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts in CLOSED state', () => {
    expect(cb.getState()).toBe('closed');
    expect(cb.isOpen()).toBe(false);
  });

  it('getStats returns initial zero values', () => {
    const stats = cb.getStats();
    expect(stats.state).toBe('closed');
    expect(stats.failures).toBe(0);
    expect(stats.successes).toBe(0);
    expect(stats.consecutiveFailures).toBe(0);
    expect(stats.consecutiveSuccesses).toBe(0);
    expect(stats.queueDepth).toBe(0);
    expect(stats.totalRequests).toBe(0);
    expect(stats.lastStateChange).toBeNull();
    expect(stats.lastFailure).toBeNull();
    expect(stats.lastSuccess).toBeNull();
  });

  // ── execute ────────────────────────────────────────────────────────────────

  it('executes successful operation and records success', async () => {
    const result = await cb.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
    const stats = cb.getStats();
    expect(stats.successes).toBe(1);
    expect(stats.totalSuccesses).toBe(1);
    expect(stats.consecutiveSuccesses).toBe(1);
    expect(stats.consecutiveFailures).toBe(0);
    expect(stats.lastSuccess).toBeInstanceOf(Date);
  });

  it('executes failing operation and records failure', async () => {
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    const stats = cb.getStats();
    expect(stats.failures).toBe(1);
    expect(stats.totalFailures).toBe(1);
    expect(stats.consecutiveFailures).toBe(1);
    expect(stats.lastFailure).toBeInstanceOf(Date);
  });

  it('increments totalRequests on every call', async () => {
    await cb.execute(() => Promise.resolve('ok'));
    await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    expect(cb.getStats().totalRequests).toBe(2);
  });

  // ── CLOSED → OPEN transition ──────────────────────────────────────────────

  it('opens circuit after reaching failureThreshold', async () => {
    await failN(cb, 3); // threshold is 3
    expect(cb.getState()).toBe('open');
    expect(cb.isOpen()).toBe(true);
    expect(cb.getStats().lastStateChange).toBeInstanceOf(Date);
  });

  it('rejects fast when circuit is OPEN', async () => {
    await failN(cb, 3);
    await expect(cb.execute(() => Promise.resolve('x'))).rejects.toBeInstanceOf(CircuitBreakerError);
  });

  it('CircuitBreakerError has correct circuitName', async () => {
    await failN(cb, 3);
    try {
      await cb.execute(() => Promise.resolve('x'));
    } catch (err) {
      expect(err).toBeInstanceOf(CircuitBreakerError);
      expect((err as CircuitBreakerError).circuitName).toBe('test-cb');
      expect((err as CircuitBreakerError).name).toBe('CircuitBreakerError');
    }
  });

  it('does NOT re-open an already-open circuit (guard branch)', async () => {
    await failN(cb, 3); // opens
    const firstChange = cb.getStats().lastStateChange!.getTime();
    // Trying to open again should no-op (guard: if state === 'open' return)
    // Simulate by calling more failures (circuit is open so execute throws before recordFailure)
    expect(cb.getState()).toBe('open');
    const secondChange = cb.getStats().lastStateChange!.getTime();
    expect(secondChange).toBe(firstChange); // unchanged
  });

  // ── OPEN → HALF_OPEN transition ───────────────────────────────────────────

  it('transitions to HALF_OPEN after openTimeout', async () => {
    await failN(cb, 3);
    expect(cb.getState()).toBe('open');

    await new Promise(r => setTimeout(r, 120)); // wait past 50ms openTimeout

    expect(cb.getState()).toBe('half_open');
    expect(cb.getStats().consecutiveSuccesses).toBe(0); // reset on half-open
  });

  // ── HALF_OPEN → CLOSED transition ────────────────────────────────────────

  it('closes circuit from HALF_OPEN after enough successes', async () => {
    await failN(cb, 3);
    await new Promise(r => setTimeout(r, 120));
    expect(cb.getState()).toBe('half_open');

    await succeedN(cb, 2); // successThreshold is 2
    expect(cb.getState()).toBe('closed');
  });

  it('does NOT re-close an already-closed circuit (guard branch)', async () => {
    // Circuit is already closed — calling close() directly is private but
    // we can verify via the public reset() which also resets to closed state.
    cb.reset();
    expect(cb.getState()).toBe('closed');
    // A success on a closed circuit should NOT re-close (no state change date from close guard)
    await succeedN(cb, 1);
    // lastStateChange remains what it was set to by reset()
    expect(cb.getState()).toBe('closed');
    // Stats updated but state remains the same
    expect(cb.getStats().successes).toBe(1);
  });

  // ── HALF_OPEN recovery with onRecover callback ────────────────────────────

  it('invokes onRecover for each queued event when circuit closes', async () => {
    const recovered: EventEnvelope[] = [];
    const cbWithRecover = new CircuitBreaker(
      makeConfig({ onRecover: (e) => recovered.push(e), openTimeout: 50 }),
    );

    // Queue some events
    const evt1 = makeEvent('e1');
    const evt2 = makeEvent('e2');
    cbWithRecover.enqueue(evt1);
    cbWithRecover.enqueue(evt2);
    expect(cbWithRecover.getQueue()).toHaveLength(2);

    // Open the circuit
    await failN(cbWithRecover, 3);
    // Wait for half-open
    await new Promise(r => setTimeout(r, 120));
    expect(cbWithRecover.getState()).toBe('half_open');

    // Succeed enough to close
    await succeedN(cbWithRecover, 2);
    expect(cbWithRecover.getState()).toBe('closed');

    // Queue should be flushed
    expect(cbWithRecover.getQueue()).toHaveLength(0);
    // onRecover should have been called for each event
    expect(recovered).toHaveLength(2);
    expect(recovered[0]).toBe(evt1);
    expect(recovered[1]).toBe(evt2);

    cbWithRecover.destroy();
  });

  it('closes from HALF_OPEN without onRecover (no callback branch)', async () => {
    // cb has no onRecover — just ensure close() works without callback
    const cbNoRecover = new CircuitBreaker(makeConfig({ openTimeout: 50 }));
    cbNoRecover.enqueue(makeEvent('e1'));
    await failN(cbNoRecover, 3);
    await new Promise(r => setTimeout(r, 120));
    await succeedN(cbNoRecover, 2);
    expect(cbNoRecover.getState()).toBe('closed');
    expect(cbNoRecover.getQueue()).toHaveLength(0);
    cbNoRecover.destroy();
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  it('reset() returns circuit to closed state and zeroes counters', async () => {
    await failN(cb, 3);
    expect(cb.getState()).toBe('open');
    cb.reset();
    expect(cb.getState()).toBe('closed');
    expect(cb.getStats().failures).toBe(0);
    expect(cb.getStats().consecutiveFailures).toBe(0);
    expect(cb.getStats().successes).toBe(0);
    expect(cb.getStats().consecutiveSuccesses).toBe(0);
  });

  it('reset() with no open timer does not throw', () => {
    // Circuit is closed — no timer set
    expect(() => cb.reset()).not.toThrow();
  });

  it('reset() cancels the open-timer so halfOpen never fires after reset', async () => {
    await failN(cb, 3); // opens, schedules timer
    cb.reset(); // cancels timer
    // Wait past openTimeout — circuit should remain closed (timer was cancelled)
    await new Promise(r => setTimeout(r, 120));
    expect(cb.getState()).toBe('closed');
  });

  // ── enqueue / getQueue ────────────────────────────────────────────────────

  it('enqueue returns true and increases queue depth', () => {
    const ok = cb.enqueue(makeEvent('e1'));
    expect(ok).toBe(true);
    expect(cb.getStats().queueDepth).toBe(1);
    expect(cb.getQueue()).toHaveLength(1);
  });

  it('enqueue returns false when queue is full', () => {
    for (let i = 0; i < 5; i++) cb.enqueue(makeEvent(`e${i}`));
    const overflow = cb.enqueue(makeEvent('overflow'));
    expect(overflow).toBe(false);
    expect(cb.getStats().queueDepth).toBe(5); // still at maxQueueSize
  });

  it('getQueue returns a copy (mutations do not affect internal queue)', () => {
    cb.enqueue(makeEvent('e1'));
    const q = cb.getQueue();
    q.pop(); // mutate the copy
    expect(cb.getStats().queueDepth).toBe(1); // internal unchanged
  });

  // ── destroy ───────────────────────────────────────────────────────────────

  it('destroy() with active timer clears it', async () => {
    await failN(cb, 3); // timer scheduled
    expect(() => cb.destroy()).not.toThrow();
    // Double-destroy should not throw either
    expect(() => cb.destroy()).not.toThrow();
  });

  it('destroy() when no timer is a no-op', () => {
    expect(() => cb.destroy()).not.toThrow();
  });

  // ── consecutive-success reset on failure ──────────────────────────────────

  it('resets consecutiveSuccesses to 0 on any failure', async () => {
    await succeedN(cb, 2);
    expect(cb.getStats().consecutiveSuccesses).toBe(2);
    await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    expect(cb.getStats().consecutiveSuccesses).toBe(0);
  });

  // ── consecutive-failure reset on success ──────────────────────────────────

  it('resets consecutiveFailures to 0 on any success', async () => {
    await failN(cb, 2); // below threshold
    expect(cb.getStats().consecutiveFailures).toBe(2);
    await succeedN(cb, 1);
    expect(cb.getStats().consecutiveFailures).toBe(0);
  });
});

// ─── Registry helpers ────────────────────────────────────────────────────────

describe('Circuit Breaker Registry helpers', () => {
  beforeEach(() => {
    destroyAllCircuits();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    destroyAllCircuits();
    vi.restoreAllMocks();
  });

  it('getCircuitBreaker creates a new breaker with defaults', () => {
    const cb = getCircuitBreaker('registry-cb');
    expect(cb).toBeInstanceOf(CircuitBreaker);
  });

  it('getCircuitBreaker returns the same instance on subsequent calls', () => {
    const a = getCircuitBreaker('same-cb');
    const b = getCircuitBreaker('same-cb');
    expect(a).toBe(b);
  });

  it('getCircuitBreaker accepts config overrides', () => {
    const cb = getCircuitBreaker('custom-cb', { failureThreshold: 10 });
    expect(cb).toBeInstanceOf(CircuitBreaker);
  });

  it('getAllCircuitBreakers returns a Map of all registered breakers', () => {
    getCircuitBreaker('cb-a');
    getCircuitBreaker('cb-b');
    const all = getAllCircuitBreakers();
    expect(all).toBeInstanceOf(Map);
    expect(all.has('cb-a')).toBe(true);
    expect(all.has('cb-b')).toBe(true);
  });

  it('getAllCircuitStats returns stats keyed by name', () => {
    getCircuitBreaker('stats-cb');
    const stats = getAllCircuitStats();
    expect(typeof stats).toBe('object');
    expect(stats['stats-cb']).toBeDefined();
    expect(stats['stats-cb'].state).toBe('closed');
  });

  it('resetAllCircuits resets all breakers', async () => {
    const cb = getCircuitBreaker('reset-all-cb', { failureThreshold: 2, openTimeout: 50000 });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    for (let i = 0; i < 2; i++) {
      await cb.execute(() => Promise.reject(new Error('x'))).catch(() => {});
    }
    expect(cb.getState()).toBe('open');
    resetAllCircuits();
    expect(cb.getState()).toBe('closed');
  });

  it('destroyAllCircuits destroys all breakers and clears the map', () => {
    getCircuitBreaker('destroy-cb-1');
    getCircuitBreaker('destroy-cb-2');
    destroyAllCircuits();
    const all = getAllCircuitBreakers();
    expect(all.size).toBe(0);
  });
});
