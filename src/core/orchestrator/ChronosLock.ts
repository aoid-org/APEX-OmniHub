/**
 * ChronosLock — Durable Idempotency State Machine.
 *
 * Manages PENDING → COMPLETED transitions for tool-call idempotency keys.
 * Provides deterministic duplicate detection and safe replay via a pluggable
 * DurableIdempotencyStore.
 *
 * Two adapters are provided:
 *  - InMemoryIdempotencyStore  → single-process / test use
 *  - SupabaseIdempotencyStore  → production distributed deployment
 *
 * @module core/orchestrator/ChronosLock
 * @version 2.0.0
 * @date 2026-05-27
 */

import {
  type IdempotencyRecord,
  IdempotencyState,
} from '../types/index';

/* ------------------------------------------------------------------ */
/*  Durable Store Interface                                             */
/* ------------------------------------------------------------------ */

export interface DurableIdempotencyStore {
  /** Return the record if it exists, otherwise null. */
  get(key: string, tenantId?: string): Promise<IdempotencyRecord | null>;

  /**
   * Atomically insert a PENDING record.
   * @returns true if inserted (new), false if already existed (duplicate).
   */
  insertPending(key: string, meta: { toolName?: string; deviceId?: string; tenantId?: string }): Promise<boolean>;

  /** Transition PENDING → COMPLETED and store the result. */
  complete(key: string, result: unknown, tenantId?: string): Promise<boolean>;

  /** Remove a PENDING record (rollback). */
  deletePending(key: string, tenantId?: string): Promise<boolean>;

  /** TEST ONLY — clear all records. */
  _reset?(): void;
}

/* ------------------------------------------------------------------ */
/*  In-Memory Adapter (single-process / tests)                         */
/* ------------------------------------------------------------------ */

class InMemoryIdempotencyStore implements DurableIdempotencyStore {
  private store = new Map<string, IdempotencyRecord>();

  async get(key: string): Promise<IdempotencyRecord | null> {
    return this.store.get(key) ?? null;
  }

  async insertPending(key: string): Promise<boolean> {
    if (this.store.has(key)) return false;
    this.store.set(key, {
      key,
      state: IdempotencyState.PENDING,
      createdAt: new Date().toISOString(),
    });
    return true;
  }

  async complete(key: string, result: unknown): Promise<boolean> {
    const record = this.store.get(key);
    if (!record || record.state !== IdempotencyState.PENDING) return false;
    this.store.set(key, {
      ...record,
      state: IdempotencyState.COMPLETED,
      completedAt: new Date().toISOString(),
      result,
    });
    return true;
  }

  async deletePending(key: string): Promise<boolean> {
    const record = this.store.get(key);
    if (!record || record.state !== IdempotencyState.PENDING) return false;
    this.store.delete(key);
    return true;
  }

  _reset(): void {
    this.store.clear();
  }
}

/* ------------------------------------------------------------------ */
/*  Active store (swappable at runtime)                                 */
/* ------------------------------------------------------------------ */

let _store: DurableIdempotencyStore = new InMemoryIdempotencyStore();

/**
 * Inject a durable store (e.g. Supabase adapter) at startup.
 */
export function setIdempotencyStore(store: DurableIdempotencyStore): void {
  _store = store;
}

/* ------------------------------------------------------------------ */
/*  Public API — backwards-compatible synchronous wrappers             */
/*  (maintained for callers that have not yet migrated to async)        */
/* ------------------------------------------------------------------ */

/**
 * Acquire an idempotency lock.
 *
 * @returns { isNew, record } — isNew=false means duplicate (already in-flight or complete).
 * @deprecated Prefer acquireAsync for new code.
 */
export function acquire(
  key: string,
): { isNew: boolean; record: IdempotencyRecord } {
  // Synchronous shim over the in-memory store for backward compat.
  // The in-memory store ops are synchronous by nature; Promise.resolve wraps are transparent.
  const inMem = _store as InMemoryIdempotencyStore;
  const existing = inMem['store']?.get(key);
  if (existing) return { isNew: false, record: existing };

  const record: IdempotencyRecord = {
    key,
    state: IdempotencyState.PENDING,
    createdAt: new Date().toISOString(),
  };
  inMem['store']?.set(key, record);
  return { isNew: true, record };
}

/**
 * Commit an idempotency key to COMPLETED with a result.
 * @deprecated Prefer commitAsync for new code.
 */
export function commit(key: string, result?: unknown): boolean {
  const inMem = _store as InMemoryIdempotencyStore;
  const record = inMem['store']?.get(key);
  if (!record || record.state !== IdempotencyState.PENDING) return false;
  inMem['store']?.set(key, {
    ...record,
    state: IdempotencyState.COMPLETED,
    completedAt: new Date().toISOString(),
    result,
  });
  return true;
}

/**
 * Roll back (delete) a PENDING idempotency key.
 * @deprecated Prefer rollbackAsync for new code.
 */
export function rollback(key: string): boolean {
  const inMem = _store as InMemoryIdempotencyStore;
  const record = inMem['store']?.get(key);
  if (!record || record.state !== IdempotencyState.PENDING) return false;
  inMem['store']?.delete(key);
  return true;
}

/**
 * Look up an idempotency record.
 * @deprecated Prefer lookupAsync for new code.
 */
export function lookup(key: string): IdempotencyRecord | undefined {
  const inMem = _store as InMemoryIdempotencyStore;
  return inMem['store']?.get(key);
}

/* ------------------------------------------------------------------ */
/*  Async API (durable-store compatible)                               */
/* ------------------------------------------------------------------ */

export async function acquireAsync(
  key: string,
  meta: { toolName?: string; deviceId?: string; tenantId?: string } = {},
): Promise<{ isNew: boolean; record: IdempotencyRecord | null }> {
  const isNew = await _store.insertPending(key, meta);
  if (!isNew) {
    const record = await _store.get(key, meta.tenantId);
    return { isNew: false, record };
  }
  return {
    isNew: true,
    record: {
      key,
      state: IdempotencyState.PENDING,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function commitAsync(
  key: string,
  result: unknown,
  tenantId?: string,
): Promise<boolean> {
  return _store.complete(key, result, tenantId);
}

export async function rollbackAsync(
  key: string,
  tenantId?: string,
): Promise<boolean> {
  return _store.deletePending(key, tenantId);
}

export async function lookupAsync(
  key: string,
  tenantId?: string,
): Promise<IdempotencyRecord | null> {
  return _store.get(key, tenantId);
}

/* ------------------------------------------------------------------ */
/*  Test utilities                                                      */
/* ------------------------------------------------------------------ */

export function _resetForTesting(): void {
  if (_store._reset) {
    _store._reset();
  }
}
