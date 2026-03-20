/**
 * Last-Writer-Wins Register — Conflict-Free Replicated Data Type
 *
 * A CRDT register where concurrent writes are resolved by timestamp,
 * with peer ID as a deterministic tiebreaker. Guarantees convergence
 * across all replicas regardless of merge order (commutativity).
 *
 * APEX STANDARDS:
 * - Immutable merge: Returns new register, never mutates
 * - Deterministic: Same inputs always produce same output
 * - Commutative: merge(A, B) === merge(B, A)
 * - Idempotent: merge(A, A) === A
 *
 * @module lib/crdt/LWWRegister
 * @license Proprietary - APEX Business Systems Ltd.
 */

// ============================================================================
// Types
// ============================================================================

export interface LWWRegisterState<T> {
  value: T;
  timestamp: number;
  peerId: string;
}

// ============================================================================
// LWWRegister Class
// ============================================================================

export class LWWRegister<T> {
  readonly value: T;
  readonly timestamp: number;
  readonly peerId: string;

  constructor(value: T, timestamp: number, peerId: string) {
    this.value = value;
    this.timestamp = timestamp;
    this.peerId = peerId;
  }

  /**
   * Creates a new register with an updated value.
   *
   * Returns a new LWWRegister instance — the original is not mutated.
   * The update is accepted only if the new timestamp is greater than
   * (or equal to, with a higher peer ID) the current timestamp.
   *
   * @param value - The new value to set
   * @param timestamp - Wall-clock timestamp of the write
   * @param peerId - Unique identifier of the writing peer
   * @returns A new LWWRegister reflecting the write
   */
  set(value: T, timestamp: number, peerId: string): LWWRegister<T> {
    if (this.shouldAccept(timestamp, peerId)) {
      return new LWWRegister(value, timestamp, peerId);
    }
    return this;
  }

  /**
   * Returns the current value of the register.
   */
  get(): T {
    return this.value;
  }

  /**
   * Merges this register with another, producing a new register
   * that contains the "winning" write.
   *
   * Merge rule:
   * 1. Higher timestamp wins
   * 2. On timestamp tie, lexicographically higher peerId wins
   *
   * This is commutative: merge(A, B) produces the same result as
   * merge(B, A), guaranteeing convergence across all replicas.
   *
   * @param other - The remote register to merge with
   * @returns A new LWWRegister containing the winning state
   */
  merge(other: LWWRegister<T>): LWWRegister<T> {
    if (other.timestamp > this.timestamp) {
      return new LWWRegister(other.value, other.timestamp, other.peerId);
    }
    if (other.timestamp === this.timestamp && other.peerId > this.peerId) {
      return new LWWRegister(other.value, other.timestamp, other.peerId);
    }
    return new LWWRegister(this.value, this.timestamp, this.peerId);
  }

  /**
   * Serializes the register to a plain object for network transport.
   */
  toJSON(): LWWRegisterState<T> {
    return {
      value: this.value,
      timestamp: this.timestamp,
      peerId: this.peerId,
    };
  }

  /**
   * Deserializes a register from a plain object.
   */
  static fromJSON<T>(state: LWWRegisterState<T>): LWWRegister<T> {
    return new LWWRegister(state.value, state.timestamp, state.peerId);
  }

  /**
   * Determines whether a write with the given timestamp and peerId
   * should be accepted over the current state.
   */
  private shouldAccept(timestamp: number, peerId: string): boolean {
    if (timestamp > this.timestamp) return true;
    if (timestamp === this.timestamp && peerId > this.peerId) return true;
    return false;
  }
}
