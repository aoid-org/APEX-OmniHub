/**
 * Spatial Coordinate Orchestration Workflow — Temporal Durable Execution
 *
 * Maintains a long-running coordinate tracking session per entity.
 * Uses Temporal Updates for synchronous delta application and Queries
 * for zero-latency position reads. The workflow runs indefinitely
 * until explicitly closed via the `close` signal.
 *
 * APEX STANDARDS:
 * - Deterministic: All state mutations happen through Update handlers
 * - Durable: Workflow state survives worker restarts
 * - Observable: Query handler provides instant position reads
 * - Graceful: Close signal allows clean shutdown
 *
 * @module lib/temporal/spatialWorkflow
 * @license Proprietary - APEX Business Systems Ltd.
 */

import {
  defineUpdate,
  defineQuery,
  defineSignal,
  setHandler,
  condition,
  proxyActivities,
} from '@temporalio/workflow';

import type { SpatialDelta } from './spatialActivities';

type Activities = typeof import('./spatialActivities');

// ============================================================================
// Shared Type Definitions (importable by client code)
// ============================================================================

export interface SpatialWorkflowInput {
  entityId: string;
  x: number;
  y: number;
  userId: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface ApplyDeltaResult {
  x: number;
  y: number;
  appliedAt: number;
}

// ============================================================================
// Update / Query / Signal Definitions
// ============================================================================

/**
 * Update: Apply a spatial delta and return the new position synchronously.
 * The caller blocks until the workflow processes the delta, guaranteeing
 * read-after-write consistency.
 */
export const applyDelta = defineUpdate<ApplyDeltaResult, [SpatialDelta]>(
  'applyDelta',
);

/**
 * Query: Read the current position without mutating workflow state.
 * Queries are served from the cached workflow state — zero latency.
 */
export const getPosition = defineQuery<Position>('getPosition');

/**
 * Signal: Gracefully terminate the coordinate tracking session.
 * The workflow will persist final state and complete.
 */
export const close = defineSignal('close');

// ============================================================================
// Activity Proxies (Local Activities for fast execution)
// ============================================================================

const { validateDelta, persistCoordinates, broadcastPosition } =
  proxyActivities<Activities>({
    startToCloseTimeout: '5 seconds',
  });

// ============================================================================
// Workflow Implementation
// ============================================================================

/**
 * Long-running spatial coordinate tracking workflow.
 *
 * Lifecycle:
 * 1. Initialized with entity ID and starting coordinates
 * 2. Accepts `applyDelta` updates to mutate position
 * 3. Persists and broadcasts after each delta
 * 4. Responds to `getPosition` queries instantly
 * 5. Terminates on `close` signal after final persistence
 */
export async function spatialCoordinateWorkflow(
  input: SpatialWorkflowInput,
): Promise<Position> {
  const { entityId, userId } = input;

  // Mutable workflow state — survives replays via event sourcing
  let x = input.x;
  let y = input.y;
  let closed = false;

  // ---------------------------------------------------------------------------
  // Query Handler: getPosition
  // ---------------------------------------------------------------------------
  setHandler(getPosition, (): Position => {
    return { x, y };
  });

  // ---------------------------------------------------------------------------
  // Update Handler: applyDelta
  // ---------------------------------------------------------------------------
  setHandler(applyDelta, async (delta: SpatialDelta): Promise<ApplyDeltaResult> => {
    // Validate bounds via local activity
    await validateDelta(delta);

    // Apply delta to workflow state
    x += delta.dx;
    y += delta.dy;

    // Persist updated coordinates
    await persistCoordinates(entityId, x, y, userId);

    // Broadcast to realtime subscribers
    await broadcastPosition(entityId, x, y, `spatial:${entityId}`);

    return { x, y, appliedAt: delta.timestamp };
  });

  // ---------------------------------------------------------------------------
  // Signal Handler: close
  // ---------------------------------------------------------------------------
  setHandler(close, () => {
    closed = true;
  });

  // Persist initial position
  await persistCoordinates(entityId, x, y, userId);
  await broadcastPosition(entityId, x, y, `spatial:${entityId}`);

  // Block indefinitely until close signal
  await condition(() => closed);

  // Final persistence before workflow completes
  await persistCoordinates(entityId, x, y, userId);

  return { x, y };
}
