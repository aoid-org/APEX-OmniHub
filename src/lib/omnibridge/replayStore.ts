/**
 * Idempotency & Replay Store for OmniBridge
 *
 * Provides best-effort deduplication within a single Vercel Edge isolate.
 * Keys on source_id + trace_id for hardened mode.
 *
 * @module lib/omnibridge/replayStore
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { acquireAsync } from '../../core/orchestrator/ChronosLock';

export interface ReplayStore {
  /**
   * Check if an idempotency key or composite replay key has already been processed.
   * Returns true if the key is a duplicate (already processed).
   */
  isDuplicate(key: string): Promise<boolean>;
}

class DurableReplayStore implements ReplayStore {
  public async isDuplicate(key: string): Promise<boolean> {
    try {
      const { isNew } = await acquireAsync(key, { toolName: 'omnibridge_ingest' });
      return !isNew;
    } catch (e) {
      // In case of store failure, fail-closed is safer for idempotency, 
      // but we could also fail-open if availability > exactly-once.
      // Default to fail-closed (act as duplicate).
      console.error('ReplayStore failure:', e);
      return true;
    }
  }
}

export const replayStore = new DurableReplayStore();

/**
 * Generates a hardened mode replay key.
 */
export function getHardenedReplayKey(sourceId: string, traceId: string): string {
  return `omnibridge:replay:${sourceId}:${traceId}`;
}

/**
 * Generates a legacy mode idempotency key.
 */
export function getLegacyIdempotencyKey(key: string): string {
  return `omnibridge:idempotency:${key}`;
}

/**
 * Clears the in-memory store. Useful for testing.
 */
export function clearReplayStore(): void {
  import('../../core/orchestrator/ChronosLock').then(({ _resetForTesting }) => {
    _resetForTesting();
  });
}
