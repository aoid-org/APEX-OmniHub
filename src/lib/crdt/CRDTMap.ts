/**
 * CRDTMap — Conflict-Free Replicated Map
 *
 * A CRDT map where each entry is a LWWRegister with an optional tombstone
 * for deletions. Guarantees convergence across all replicas regardless
 * of merge order (commutativity, associativity, idempotency).
 *
 * APEX STANDARDS:
 * - Immutable merge: Returns new map, never mutates
 * - Deterministic: Same inputs always produce same output
 * - Commutative: merge(A, B) === merge(B, A)
 * - Idempotent: merge(A, A) === A
 * - Tombstone-aware: Deletions propagate correctly
 *
 * @module lib/crdt/CRDTMap
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { LWWRegister, type LWWRegisterState } from './LWWRegister';

// ============================================================================
// Types
// ============================================================================

export interface CRDTMapEntry<V> {
  register: LWWRegisterState<V>;
  tombstone: boolean;
  tombstoneTimestamp: number;
  tombstonePeerId: string;
}

export interface CRDTMapState<V> {
  entries: Record<string, CRDTMapEntry<V>>;
}

// ============================================================================
// Internal Entry Wrapper
// ============================================================================

interface InternalEntry<V> {
  register: LWWRegister<V>;
  tombstone: boolean;
  tombstoneTimestamp: number;
  tombstonePeerId: string;
}

// ============================================================================
// CRDTMap Class
// ============================================================================

export class CRDTMap<K extends string, V> {
  private readonly _entries: Map<K, InternalEntry<V>>;

  constructor(entries?: Map<K, InternalEntry<V>>) {
    this._entries = entries ?? new Map();
  }

  /**
   * Sets a value for a key. If the key was previously deleted (tombstoned),
   * the set only takes effect if its timestamp is newer than the tombstone.
   */
  set(key: K, value: V, timestamp: number, peerId: string): CRDTMap<K, V> {
    const next = new Map(this._entries);
    const existing = next.get(key);

    if (existing) {
      // If there's a tombstone, only resurrect if the set is newer
      if (existing.tombstone) {
        if (
          timestamp > existing.tombstoneTimestamp ||
          (timestamp === existing.tombstoneTimestamp && peerId > existing.tombstonePeerId)
        ) {
          next.set(key, {
            register: new LWWRegister(value, timestamp, peerId),
            tombstone: false,
            tombstoneTimestamp: existing.tombstoneTimestamp,
            tombstonePeerId: existing.tombstonePeerId,
          });
        }
        // Otherwise, the tombstone wins — don't resurrect
      } else {
        // Normal set — update the register
        next.set(key, {
          ...existing,
          register: existing.register.set(value, timestamp, peerId),
        });
      }
    } else {
      // New entry
      next.set(key, {
        register: new LWWRegister(value, timestamp, peerId),
        tombstone: false,
        tombstoneTimestamp: 0,
        tombstonePeerId: '',
      });
    }

    return new CRDTMap(next);
  }

  /**
   * Returns the value for a key, or undefined if the key doesn't exist
   * or has been deleted (tombstoned).
   */
  get(key: K): V | undefined {
    const entry = this._entries.get(key);
    if (!entry || entry.tombstone) return undefined;
    return entry.register.get();
  }

  /**
   * Marks a key as deleted via tombstone. The deletion propagates during merge.
   * A subsequent set with a newer timestamp can resurrect the key.
   */
  delete(key: K, timestamp: number, peerId: string): CRDTMap<K, V> {
    const next = new Map(this._entries);
    const existing = next.get(key);

    if (!existing) return this; // Nothing to delete

    // Only apply tombstone if it's newer than the current register
    if (
      timestamp > existing.register.timestamp ||
      (timestamp === existing.register.timestamp && peerId > existing.register.peerId)
    ) {
      next.set(key, {
        ...existing,
        tombstone: true,
        tombstoneTimestamp: timestamp,
        tombstonePeerId: peerId,
      });
    }

    return new CRDTMap(next);
  }

  /**
   * Merges this map with another, producing a new map that converges
   * deterministically regardless of merge order.
   *
   * For each key present in either map:
   * 1. Merge the LWW registers (higher timestamp wins)
   * 2. Merge tombstone state (most recent tombstone wins)
   * 3. If tombstone is newer than register, entry stays deleted
   */
  merge(other: CRDTMap<K, V>): CRDTMap<K, V> {
    const next = new Map(this._entries);

    for (const [key, otherEntry] of other._entries) {
      const localEntry = next.get(key);

      if (localEntry === undefined) {
        // Key only exists in other — take it as-is
        next.set(key, {
          register: LWWRegister.fromJSON(otherEntry.register.toJSON()),
          tombstone: otherEntry.tombstone,
          tombstoneTimestamp: otherEntry.tombstoneTimestamp,
          tombstonePeerId: otherEntry.tombstonePeerId,
        });
      } else {
        // Key exists in both — merge register and tombstone
        const mergedRegister = localEntry.register.merge(otherEntry.register);

        // Determine winning tombstone
        let tombstoneTimestamp = localEntry.tombstoneTimestamp;
        let tombstonePeerId = localEntry.tombstonePeerId;

        let tombstone: boolean;
        if (otherEntry.tombstoneTimestamp > localEntry.tombstoneTimestamp) {
          tombstoneTimestamp = otherEntry.tombstoneTimestamp;
          tombstonePeerId = otherEntry.tombstonePeerId;
          tombstone = otherEntry.tombstone;
        } else if (
          otherEntry.tombstoneTimestamp === localEntry.tombstoneTimestamp &&
          otherEntry.tombstonePeerId > localEntry.tombstonePeerId
        ) {
          tombstonePeerId = otherEntry.tombstonePeerId;
          tombstone = otherEntry.tombstone;
        } else {
          tombstone = localEntry.tombstone;
        }

        // If the register was updated after the tombstone, resurrect
        if (
          mergedRegister.timestamp > tombstoneTimestamp ||
          (mergedRegister.timestamp === tombstoneTimestamp &&
            mergedRegister.peerId > tombstonePeerId)
        ) {
          tombstone = false;
        }

        next.set(key, {
          register: mergedRegister,
          tombstone,
          tombstoneTimestamp,
          tombstonePeerId,
        });
      }
    }

    return new CRDTMap(next);
  }

  /**
   * Returns all non-tombstoned entries as [key, value] pairs.
   */
  entries(): Array<[K, V]> {
    const result: Array<[K, V]> = [];
    for (const [key, entry] of this._entries) {
      if (!entry.tombstone) {
        result.push([key, entry.register.get()]);
      }
    }
    return result;
  }

  /**
   * Returns the number of non-tombstoned entries.
   */
  get size(): number {
    let count = 0;
    for (const entry of this._entries.values()) {
      if (!entry.tombstone) count++;
    }
    return count;
  }

  /**
   * Checks if a key exists and is not tombstoned.
   */
  has(key: K): boolean {
    const entry = this._entries.get(key);
    return entry !== undefined && !entry.tombstone;
  }

  /**
   * Serializes the map to a plain object for network transport.
   * Includes tombstoned entries (needed for merge correctness).
   */
  toJSON(): CRDTMapState<V> {
    const entries: Record<string, CRDTMapEntry<V>> = {};
    for (const [key, entry] of this._entries) {
      entries[key] = {
        register: entry.register.toJSON(),
        tombstone: entry.tombstone,
        tombstoneTimestamp: entry.tombstoneTimestamp,
        tombstonePeerId: entry.tombstonePeerId,
      };
    }
    return { entries };
  }

  /**
   * Deserializes a map from a plain object.
   */
  static fromJSON<K extends string, V>(state: CRDTMapState<V>): CRDTMap<K, V> {
    const entries = new Map<K, InternalEntry<V>>();
    for (const [key, entry] of Object.entries(state.entries)) {
      entries.set(key as K, {
        register: LWWRegister.fromJSON(entry.register),
        tombstone: entry.tombstone,
        tombstoneTimestamp: entry.tombstoneTimestamp,
        tombstonePeerId: entry.tombstonePeerId,
      });
    }
    return new CRDTMap(entries);
  }
}
