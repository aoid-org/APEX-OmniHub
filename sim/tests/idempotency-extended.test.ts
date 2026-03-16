/**
 * Extended Idempotency Engine Tests
 * Covers paths not exercised by the base idempotency.test.ts:
 * - Custom TTL / expiration paths
 * - storeReceipt / deleteReceipt / getAllReceipts
 * - cleanupExpired
 * - startAutoCleanup / stopAutoCleanup
 * - executeEventIdempotently / markEventProcessed
 * - persistToDatabase / loadFromDatabase / cleanupDatabaseExpired (SIM_MODE)
 * - stats with zero total (hitRate edge case)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  withIdempotency,
  clearAllReceipts,
  hasIdempotencyKey,
  getReceipt,
  getStats,
  storeReceipt,
  deleteReceipt,
  getAllReceipts,
  cleanupExpired,
  startAutoCleanup,
  stopAutoCleanup,
  executeEventIdempotently,
  markEventProcessed,
  persistToDatabase,
  loadFromDatabase,
  cleanupDatabaseExpired,
} from '../idempotency';
import type { EventEnvelope } from '../contracts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEnvelope(id = 'evt-1', options: { withDelay?: boolean } = {}): EventEnvelope {
  return {
    eventId: id,
    eventType: 'test:domain.action',
    correlationId: `corr-${id}`,
    idempotencyKey: `idem-${id}`,
    tenantId: 'tenant-1',
    payload: { test: true },
    timestamp: new Date().toISOString(),
    schemaVersion: '1.0',
    source: 'omnidash',
    trace: { traceId: `corr-${id}`, spanId: `span-${id}`, parentSpanId: null },
    ...(options.withDelay ? { chaos: { injectedDelayMs: 1000 } } : {}),
  } as unknown as EventEnvelope;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Idempotency Engine — extended coverage', () => {
  beforeEach(() => {
    clearAllReceipts();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    stopAutoCleanup();
    vi.restoreAllMocks();
  });

  // ── storeReceipt ─────────────────────────────────────────────────────────

  describe('storeReceipt', () => {
    it('manually stores a receipt that can be retrieved', () => {
      storeReceipt('manual-key', 'corr-m', 'manual-event', { req: 1 }, { res: 2 });
      const r = getReceipt('manual-key');
      expect(r).not.toBeNull();
      expect(r!.idempotencyKey).toBe('manual-key');
      expect(r!.correlationId).toBe('corr-m');
      expect(r!.eventType).toBe('manual-event');
      expect(r!.response).toEqual({ res: 2 });
    });

    it('stores a receipt with custom TTL', () => {
      storeReceipt('ttl-key', 'corr-t', 'ttl-event', null, 'response', 5000);
      expect(hasIdempotencyKey('ttl-key')).toBe(true);
    });
  });

  // ── deleteReceipt ────────────────────────────────────────────────────────

  describe('deleteReceipt', () => {
    it('deletes an existing receipt', async () => {
      await withIdempotency('del-key', 'corr-d', 'del-event', async () => 'data');
      expect(hasIdempotencyKey('del-key')).toBe(true);
      const deleted = deleteReceipt('del-key');
      expect(deleted).toBe(true);
      expect(hasIdempotencyKey('del-key')).toBe(false);
    });

    it('returns false when deleting non-existent key', () => {
      const deleted = deleteReceipt('does-not-exist');
      expect(deleted).toBe(false);
    });
  });

  // ── getAllReceipts ────────────────────────────────────────────────────────

  describe('getAllReceipts', () => {
    it('returns empty array when no receipts', () => {
      expect(getAllReceipts()).toHaveLength(0);
    });

    it('returns all stored receipts', async () => {
      await withIdempotency('all-1', 'c1', 'e1', async () => 1);
      await withIdempotency('all-2', 'c2', 'e2', async () => 2);
      const all = getAllReceipts();
      expect(all.length).toBe(2);
    });
  });

  // ── cleanupExpired ───────────────────────────────────────────────────────

  describe('cleanupExpired', () => {
    it('removes expired receipts and returns count', async () => {
      // Store with 1ms TTL (immediately expires)
      storeReceipt('expired-key', 'c', 'e', null, 'val', 1);
      // Wait for TTL to pass
      await new Promise(r => setTimeout(r, 5));
      const cleaned = cleanupExpired();
      expect(cleaned).toBe(1);
      expect(hasIdempotencyKey('expired-key')).toBe(false);
    });

    it('returns 0 when nothing is expired', async () => {
      storeReceipt('active-key', 'c', 'e', null, 'val', 60000);
      const cleaned = cleanupExpired();
      expect(cleaned).toBe(0);
    });
  });

  // ── has() — expired branch ───────────────────────────────────────────────

  describe('hasIdempotencyKey — expired branch', () => {
    it('returns false for expired key without cleanup', async () => {
      storeReceipt('exp-has', 'c', 'e', null, 'v', 1);
      await new Promise(r => setTimeout(r, 5));
      expect(hasIdempotencyKey('exp-has')).toBe(false);
    });
  });

  // ── get() — expired branch ───────────────────────────────────────────────

  describe('getReceipt — expired branch', () => {
    it('returns null for expired key', async () => {
      storeReceipt('exp-get', 'c', 'e', null, 'v', 1);
      await new Promise(r => setTimeout(r, 5));
      expect(getReceipt('exp-get')).toBeNull();
    });
  });

  // ── getStats — hitRate edge case ─────────────────────────────────────────

  describe('getStats — zero total', () => {
    it('returns hitRate of 0 when no operations have been performed', () => {
      const stats = getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('reports expired receipts separately from active', async () => {
      storeReceipt('active', 'c', 'e', null, 'v', 60000);
      storeReceipt('expired', 'c', 'e', null, 'v', 1);
      await new Promise(r => setTimeout(r, 5));
      const stats = getStats();
      expect(stats.activeReceipts).toBe(1);
      expect(stats.expiredReceipts).toBe(1);
    });
  });

  // ── startAutoCleanup / stopAutoCleanup ───────────────────────────────────

  describe('startAutoCleanup / stopAutoCleanup', () => {
    it('startAutoCleanup does not throw', () => {
      expect(() => startAutoCleanup(50)).not.toThrow();
    });

    it('startAutoCleanup is idempotent (second call is no-op)', () => {
      startAutoCleanup(50);
      expect(() => startAutoCleanup(50)).not.toThrow();
      stopAutoCleanup();
    });

    it('stopAutoCleanup is safe when cleanup not running', () => {
      expect(() => stopAutoCleanup()).not.toThrow();
    });

    it('auto-cleanup runs and removes expired receipts', async () => {
      storeReceipt('auto-clean-1', 'c', 'e', null, 'v', 1);
      startAutoCleanup(30);
      await new Promise(r => setTimeout(r, 80));
      stopAutoCleanup();
      // The cleanup interval fires at 30ms; expired receipt should be gone
      expect(hasIdempotencyKey('auto-clean-1')).toBe(false);
    });
  });

  // ── withIdempotency — custom TTL ─────────────────────────────────────────

  describe('withIdempotency — custom TTL', () => {
    it('accepts a custom ttlMs parameter', async () => {
      const result = await withIdempotency(
        'custom-ttl',
        'corr-ttl',
        'ttl-event',
        async () => 'ttl-result',
        5000,
      );
      expect(result.result).toBe('ttl-result');
      expect(result.wasCached).toBe(false);
    });
  });

  // ── executeEventIdempotently ─────────────────────────────────────────────

  describe('executeEventIdempotently', () => {
    it('executes handler on first call', async () => {
      const env = makeEnvelope('exec-1');
      let called = 0;
      const result = await executeEventIdempotently(env, async () => {
        called++;
        return { done: true };
      });
      expect(result.wasCached).toBe(false);
      expect(result.result).toEqual({ done: true });
      expect(called).toBe(1);
    });

    it('returns cached result on duplicate event', async () => {
      const env = makeEnvelope('exec-dup');
      let called = 0;
      await executeEventIdempotently(env, async () => {
        called++;
        return 'first';
      });
      const r2 = await executeEventIdempotently(env, async () => {
        called++;
        return 'second';
      });
      expect(r2.wasCached).toBe(true);
      expect(r2.result).toBe('first');
      expect(called).toBe(1);
    });

    it('uses short TTL for chaos-injected events', async () => {
      const envWithChaos = makeEnvelope('exec-chaos', { withDelay: true });
      const result = await executeEventIdempotently(envWithChaos, async () => 'chaos-result');
      expect(result.wasCached).toBe(false);
      // Receipt should exist (short TTL but not yet expired)
      expect(hasIdempotencyKey(envWithChaos.idempotencyKey)).toBe(true);
    });

    it('uses default TTL for non-chaos events', async () => {
      const envNormal = makeEnvelope('exec-normal');
      const result = await executeEventIdempotently(envNormal, async () => 'normal-result');
      expect(result.wasCached).toBe(false);
      expect(hasIdempotencyKey(envNormal.idempotencyKey)).toBe(true);
    });
  });

  // ── markEventProcessed ───────────────────────────────────────────────────

  describe('markEventProcessed', () => {
    it('marks event as processed with default response', () => {
      const env = makeEnvelope('mark-1');
      markEventProcessed(env);
      expect(hasIdempotencyKey(env.idempotencyKey)).toBe(true);
      const r = getReceipt(env.idempotencyKey);
      expect(r!.response).toEqual({ status: 'ok' });
    });

    it('marks event with custom response', () => {
      const env = makeEnvelope('mark-custom');
      markEventProcessed(env, { custom: 'response', status: 'done' });
      const r = getReceipt(env.idempotencyKey);
      expect(r!.response).toEqual({ custom: 'response', status: 'done' });
    });

    it('subsequent executeEventIdempotently call returns cached result', async () => {
      const env = makeEnvelope('mark-cached');
      markEventProcessed(env, { status: 'ok' });
      let handlerCalled = false;
      const result = await executeEventIdempotently(env, async () => {
        handlerCalled = true;
        return { status: 'from-handler' };
      });
      expect(result.wasCached).toBe(true);
      expect(handlerCalled).toBe(false);
    });
  });

  // ── persistToDatabase (SIM_MODE) ─────────────────────────────────────────

  describe('persistToDatabase — SIM_MODE', () => {
    it('returns 0 in SIM_MODE without touching DB', async () => {
      const original = process.env.SIM_MODE;
      process.env.SIM_MODE = 'true';
      try {
        const count = await persistToDatabase();
        expect(count).toBe(0);
      } finally {
        process.env.SIM_MODE = original;
      }
    });
  });

  // ── loadFromDatabase (SIM_MODE) ──────────────────────────────────────────

  describe('loadFromDatabase — SIM_MODE', () => {
    it('returns 0 in SIM_MODE without touching DB', async () => {
      const original = process.env.SIM_MODE;
      process.env.SIM_MODE = 'true';
      try {
        const count = await loadFromDatabase();
        expect(count).toBe(0);
      } finally {
        process.env.SIM_MODE = original;
      }
    });

    it('returns 0 in SIM_MODE even when tenantId is provided', async () => {
      const original = process.env.SIM_MODE;
      process.env.SIM_MODE = 'true';
      try {
        const count = await loadFromDatabase('tenant-123');
        expect(count).toBe(0);
      } finally {
        process.env.SIM_MODE = original;
      }
    });
  });

  // ── cleanupDatabaseExpired (SIM_MODE) ────────────────────────────────────

  describe('cleanupDatabaseExpired — SIM_MODE', () => {
    it('returns 0 in SIM_MODE without touching DB', async () => {
      const original = process.env.SIM_MODE;
      process.env.SIM_MODE = 'true';
      try {
        const count = await cleanupDatabaseExpired();
        expect(count).toBe(0);
      } finally {
        process.env.SIM_MODE = original;
      }
    });
  });

  // ── persistToDatabase — missing credentials ──────────────────────────────

  describe('persistToDatabase — missing credentials', () => {
    it('returns 0 when Supabase credentials are missing (non-SIM_MODE)', async () => {
      const origSim = process.env.SIM_MODE;
      const origUrl = process.env.SUPABASE_URL;
      const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SIM_MODE = 'false';
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      try {
        const count = await persistToDatabase();
        expect(count).toBe(0);
      } finally {
        process.env.SIM_MODE = origSim;
        if (origUrl !== undefined) process.env.SUPABASE_URL = origUrl;
        if (origKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      }
    });
  });

  // ── loadFromDatabase — missing credentials ───────────────────────────────

  describe('loadFromDatabase — missing credentials', () => {
    it('returns 0 when Supabase credentials are missing', async () => {
      const origSim = process.env.SIM_MODE;
      const origUrl = process.env.SUPABASE_URL;
      const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SIM_MODE = 'false';
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      try {
        const count = await loadFromDatabase();
        expect(count).toBe(0);
      } finally {
        process.env.SIM_MODE = origSim;
        if (origUrl !== undefined) process.env.SUPABASE_URL = origUrl;
        if (origKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      }
    });
  });

  // ── cleanupDatabaseExpired — missing credentials ─────────────────────────

  describe('cleanupDatabaseExpired — missing credentials', () => {
    it('returns 0 when Supabase credentials are missing', async () => {
      const origSim = process.env.SIM_MODE;
      const origUrl = process.env.SUPABASE_URL;
      const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SIM_MODE = 'false';
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      try {
        const count = await cleanupDatabaseExpired();
        expect(count).toBe(0);
      } finally {
        process.env.SIM_MODE = origSim;
        if (origUrl !== undefined) process.env.SUPABASE_URL = origUrl;
        if (origKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      }
    });
  });
});
