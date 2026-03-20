/**
 * Deterministic Spatial State Merge Function
 *
 * Pure function for merging multi-user spatial coordinate states
 * using LWW (Last-Writer-Wins) semantics. Guarantees identical output
 * regardless of merge order (commutativity).
 *
 * APEX STANDARDS:
 * - Pure function: No side effects
 * - Deterministic: Same inputs → same output (always)
 * - Commutative: mergeSpatialStates(A, B) === mergeSpatialStates(B, A)
 * - Idempotent: mergeSpatialStates(A, A) === A
 *
 * @module lib/crdt/mergeFn
 * @license Proprietary - APEX Business Systems Ltd.
 */

// ============================================================================
// Types
// ============================================================================

export interface SpatialPosition {
  x: number;
  y: number;
  timestamp: number;
  peerId: string;
}

export interface SpatialCRDTState {
  /** Map of entityId → position state */
  positions: Record<string, SpatialPosition>;
  /** Schema version for forward compatibility */
  version: 1;
}

// ============================================================================
// Merge Function
// ============================================================================

/**
 * Merges two spatial CRDT states into a single converged state.
 *
 * For each entity present in either state, the position with the
 * higher timestamp wins. On timestamp tie, lexicographically higher
 * peerId wins (deterministic tiebreaker).
 *
 * This is a pure function with no side effects.
 */
export function mergeSpatialStates(
  local: SpatialCRDTState,
  remote: SpatialCRDTState,
): SpatialCRDTState {
  const merged: Record<string, SpatialPosition> = {};

  // Collect all entity IDs from both states
  const allEntityIds = new Set([
    ...Object.keys(local.positions),
    ...Object.keys(remote.positions),
  ]);

  for (const entityId of allEntityIds) {
    const localPos = local.positions[entityId];
    const remotePos = remote.positions[entityId];

    if (localPos && !remotePos) {
      merged[entityId] = localPos;
    } else if (!localPos && remotePos) {
      merged[entityId] = remotePos;
    } else if (localPos && remotePos) {
      // Both have this entity — resolve with LWW semantics
      merged[entityId] = resolveConflict(localPos, remotePos);
    }
  }

  return { positions: merged, version: 1 };
}

/**
 * Resolves a conflict between two positions using LWW semantics.
 *
 * 1. Higher timestamp wins
 * 2. On tie, lexicographically higher peerId wins
 */
function resolveConflict(a: SpatialPosition, b: SpatialPosition): SpatialPosition {
  if (a.timestamp > b.timestamp) return a;
  if (b.timestamp > a.timestamp) return b;
  // Timestamp tie — deterministic tiebreaker via peerId
  return a.peerId >= b.peerId ? a : b;
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serializes a SpatialCRDTState to a JSON string for network transport.
 */
export function serializeCRDTState(state: SpatialCRDTState): string {
  return JSON.stringify(state);
}

/**
 * Deserializes a SpatialCRDTState from a JSON string.
 * Validates the structure and returns a type-safe result.
 *
 * @throws Error if the JSON is malformed or doesn't match the expected schema
 */
export function deserializeCRDTState(json: string): SpatialCRDTState {
  const parsed: unknown = JSON.parse(json);

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('positions' in parsed) ||
    !('version' in parsed)
  ) {
    throw new Error('[CRDT] Invalid state structure: missing positions or version');
  }

  const state = parsed as Record<string, unknown>;
  if (state.version !== 1) {
    throw new Error(`[CRDT] Unsupported version: ${String(state.version)}`);
  }

  const positions = state.positions as Record<string, unknown>;
  const validated: Record<string, SpatialPosition> = {};

  for (const [entityId, pos] of Object.entries(positions)) {
    if (!isValidPosition(pos)) {
      throw new Error(`[CRDT] Invalid position for entity ${entityId}`);
    }
    validated[entityId] = pos;
  }

  return { positions: validated, version: 1 };
}

/**
 * Creates an empty SpatialCRDTState.
 */
export function createEmptySpatialState(): SpatialCRDTState {
  return { positions: {}, version: 1 };
}

// ============================================================================
// Validation
// ============================================================================

function isValidPosition(pos: unknown): pos is SpatialPosition {
  if (typeof pos !== 'object' || pos === null) return false;
  const p = pos as Record<string, unknown>;
  return (
    typeof p.x === 'number' &&
    typeof p.y === 'number' &&
    typeof p.timestamp === 'number' &&
    typeof p.peerId === 'string'
  );
}
