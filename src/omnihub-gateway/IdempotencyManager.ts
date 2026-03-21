/**
 * IdempotencyManager — UUIDv5-Based Idempotency Tracking
 * @version 1.0.0
 * @module src/omnihub-gateway/IdempotencyManager
 *
 * Generates deterministic UUIDv5 idempotency keys from request metadata
 * and tracks their state. Replaces the in-memory ChronosLock with a
 * design ready for Supabase cache backing.
 *
 * Key Generation:
 *   UUIDv5(namespace, tenantId + method + contentHash) → deterministic key
 *
 * State Machine:
 *   PENDING → COMPLETED | FAILED
 *   (no backwards transitions)
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: Same request always produces same idempotency key
 * - Fail-closed: Unknown keys are treated as new (PENDING)
 * - TTL-bounded: Entries expire after configurable TTL
 * - Supabase-ready: Interface designed for drop-in Supabase cache provider
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { IdempotencyEntry } from './types';

// ============================================================================
// UUIDv5 Implementation (RFC 4122)
// ============================================================================

/**
 * APEX OmniHub namespace UUID for idempotency key generation.
 * This is a fixed UUID used as the UUIDv5 namespace.
 */
const OMNIHUB_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace

/**
 * Generate a UUIDv5 from a namespace UUID and a name string.
 * Uses Web Crypto API (SHA-1) per RFC 4122 Section 4.3.
 */
export async function generateUUIDv5(namespace: string, name: string): Promise<string> {
  // Parse namespace UUID to bytes
  const namespaceBytes = parseUUID(namespace);

  // Encode name as UTF-8
  const nameBytes = new TextEncoder().encode(name);

  // Concatenate namespace + name
  const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
  combined.set(namespaceBytes, 0);
  combined.set(nameBytes, namespaceBytes.length);

  // SHA-256 hash (stronger than RFC 4122 SHA-1; output truncated to 16 bytes for UUID format)
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const hashBytes = new Uint8Array(hashBuffer);

  // Set version (5) and variant bits per RFC 4122
  hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50; // Version 5
  hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80; // Variant 10xx

  return formatUUID(hashBytes);
}

/**
 * Parse a UUID string to a Uint8Array (16 bytes).
 */
function parseUUID(uuid: string): Uint8Array {
  const hex = uuid.replaceAll('-', '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Number.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Format a byte array as a UUID string.
 */
function formatUUID(bytes: Uint8Array): string {
  const hex = Array.from(bytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

// ============================================================================
// Idempotency Store Interface (Supabase-ready)
// ============================================================================

/**
 * Storage backend interface for idempotency entries.
 * Default implementation is in-memory; swap for Supabase in production.
 */
export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyEntry | undefined>;
  set(key: string, entry: IdempotencyEntry): Promise<void>;
  delete(key: string): Promise<boolean>;
}

/**
 * In-memory idempotency store with TTL eviction.
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly entries = new Map<string, IdempotencyEntry>();
  private readonly maxEntries: number;

  constructor(maxEntries = 50_000) {
    this.maxEntries = maxEntries;
  }

  async get(key: string): Promise<IdempotencyEntry | undefined> {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    // Check TTL expiration
    const age = Date.now() - new Date(entry.createdAt).getTime();
    if (age > entry.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }

    return entry;
  }

  async set(key: string, entry: IdempotencyEntry): Promise<void> {
    // Evict oldest if at capacity
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      const firstKey = this.entries.keys().next().value as string;
      this.entries.delete(firstKey);
    }
    this.entries.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.entries.delete(key);
  }

  /** Visible entry count (for testing/monitoring) */
  get size(): number {
    return this.entries.size;
  }
}

// ============================================================================
// Idempotency Manager
// ============================================================================

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class IdempotencyManager {
  private readonly store: IdempotencyStore;
  private readonly namespace: string;
  private readonly defaultTtlMs: number;

  constructor(
    store?: IdempotencyStore,
    namespace = OMNIHUB_NAMESPACE,
    defaultTtlMs = DEFAULT_TTL_MS,
  ) {
    this.store = store ?? new InMemoryIdempotencyStore();
    this.namespace = namespace;
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Generate a deterministic UUIDv5 idempotency key.
   *
   * @param tenantId - Tenant identifier
   * @param method - JSON-RPC method name
   * @param contentHash - Hash of the request content
   * @returns Deterministic UUIDv5 string
   */
  async generateKey(tenantId: string, method: string, contentHash: string): Promise<string> {
    const name = `${tenantId}:${method}:${contentHash}`;
    return generateUUIDv5(this.namespace, name);
  }

  /**
   * Check if a request is a duplicate and handle accordingly.
   *
   * Returns:
   * - { isDuplicate: false } if this is a new request (entry created as PENDING)
   * - { isDuplicate: true, entry } if this request was already processed
   */
  async check(key: string): Promise<{ isDuplicate: boolean; entry?: IdempotencyEntry }> {
    const existing = await this.store.get(key);

    if (existing) {
      return { isDuplicate: true, entry: existing };
    }

    // Create new PENDING entry
    const entry: IdempotencyEntry = {
      key,
      namespace: this.namespace,
      state: 'pending',
      createdAt: new Date().toISOString(),
      ttlMs: this.defaultTtlMs,
    };

    await this.store.set(key, entry);
    return { isDuplicate: false, entry };
  }

  /**
   * Mark an idempotency key as completed with a result.
   */
  async complete(key: string, result: unknown): Promise<boolean> {
    const existing = await this.store.get(key);
    if (existing?.state !== 'pending') {
      return false;
    }

    await this.store.set(key, {
      ...existing,
      state: 'completed',
      completedAt: new Date().toISOString(),
      result,
    });

    return true;
  }

  /**
   * Mark an idempotency key as failed.
   * Failed entries can be retried (they are evicted).
   */
  async fail(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  /**
   * Explicitly remove an idempotency entry.
   */
  async remove(key: string): Promise<boolean> {
    return this.store.delete(key);
  }
}
