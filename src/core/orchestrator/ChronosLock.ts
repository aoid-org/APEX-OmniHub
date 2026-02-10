/**
 * ChronosLock — Idempotency state machine.
 *
 * Manages PENDING → COMPLETED transitions for tool-call
 * idempotency keys. Provides deterministic duplicate detection
 * and rollback capability.
 *
 * In-memory implementation suitable for single-process runtime.
 * Swap with Redis/DB-backed store for distributed deployments.
 *
 * @module core/orchestrator/ChronosLock
 * @version 1.0.0
 * @date 2026-02-09
 */

import {
  type IdempotencyRecord,
  IdempotencyState,
} from '../types/index';

const store = new Map<string, IdempotencyRecord>();

/**
 * Acquire an idempotency lock.
 *
 * @returns the existing record if already present, or a new
 *          PENDING record if this key is fresh.
 */
export function acquire(
  key: string,
): { isNew: boolean; record: IdempotencyRecord } {
  const existing = store.get(key);
  if (existing) {
    return { isNew: false, record: existing };
  }

  const record: IdempotencyRecord = {
    key,
    state: IdempotencyState.PENDING,
    createdAt: new Date().toISOString(),
  };
  store.set(key, record);
  return { isNew: true, record };
}

/**
 * Commit an idempotency key to COMPLETED with a result.
 *
 * @returns true if transition succeeded (was PENDING)
 */
export function commit(
  key: string,
  result?: unknown,
): boolean {
  const record = store.get(key);
  if (!record || record.state !== IdempotencyState.PENDING) {
    return false;
  }

  store.set(key, {
    ...record,
    state: IdempotencyState.COMPLETED,
    completedAt: new Date().toISOString(),
    result,
  });
  return true;
}

/**
 * Roll back (delete) a PENDING idempotency key.
 *
 * @returns true if key was removed (was PENDING)
 */
export function rollback(key: string): boolean {
  const record = store.get(key);
  if (!record || record.state !== IdempotencyState.PENDING) {
    return false;
  }
  store.delete(key);
  return true;
}

/**
 * Look up an idempotency record.
 */
export function lookup(
  key: string,
): IdempotencyRecord | undefined {
  return store.get(key);
}

/**
 * Reset all records (for testing only).
 */
export function _resetForTesting(): void {
  store.clear();
}
