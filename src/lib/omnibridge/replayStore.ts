/**
 * Idempotency & Replay Store for OmniBridge
 *
 * Provides best-effort deduplication within a single Vercel Edge isolate.
 * Keys on source_id + trace_id for hardened mode.
 *
 * @module lib/omnibridge/replayStore
 * @license Proprietary - APEX Business Systems Ltd.
 */

export interface ReplayStore {
  /**
   * Check if an idempotency key or composite replay key has already been processed.
   * Returns true if the key is a duplicate (already processed).
   */
  isDuplicate(key: string): boolean;

  // async checkAndSet(key: string, ttl: number): Promise<boolean>;
}

const processedKeys = new Set<string>();
const MAX_IDEMPOTENCY_KEYS = 10_000;

class InMemoryReplayStore implements ReplayStore {
  public isDuplicate(key: string): boolean {
    if (processedKeys.has(key)) {
      return true;
    }

    // Evict oldest entries if we exceed the cap to bound memory
    if (processedKeys.size >= MAX_IDEMPOTENCY_KEYS) {
      const firstKey = processedKeys.values().next().value as string;
      processedKeys.delete(firstKey);
    }

    processedKeys.add(key);
    return false;
  }
}

export const replayStore = new InMemoryReplayStore();

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
  processedKeys.clear();
}
