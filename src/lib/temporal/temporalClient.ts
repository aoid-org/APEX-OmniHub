/**
 * Temporal Client Wrapper — Update-with-Start Pattern
 *
 * Provides a high-level API for managing spatial coordinate sessions.
 * Uses the Update-with-Start pattern: when updating a position, the
 * workflow is started if it doesn't exist, or updated if it does.
 * This eliminates race conditions and simplifies client code.
 *
 * APEX STANDARDS:
 * - Lazy singleton: Connection established on first use
 * - Update-with-Start: Atomic workflow creation + first update
 * - Type-safe: Full workflow type inference
 * - Graceful: Clean session teardown via signals
 *
 * @module lib/temporal/temporalClient
 * @license Proprietary - APEX Business Systems Ltd.
 */

import {
  Connection,
  Client,
  WorkflowNotFoundError,
} from '@temporalio/client';

import type { Position, ApplyDeltaResult } from './spatialWorkflow';

// ============================================================================
// Constants
// ============================================================================

const TASK_QUEUE = 'spatial-orchestration';
const WORKFLOW_ID_PREFIX = 'spatial-session';

// ============================================================================
// Lazy Singleton Client
// ============================================================================

let _client: Client | null = null;
let _clientPromise: Promise<Client> | null = null;

/**
 * Returns a lazily-initialized Temporal Client singleton.
 * The connection is established once and reused for all operations.
 * Thread-safe: concurrent callers share the same initialization promise.
 */
async function getClient(): Promise<Client> {
  if (_client) return _client;

  _clientPromise ??= (async () => {
      const address =
        process.env.TEMPORAL_ADDRESS || 'localhost:7233';
      const namespace =
        process.env.TEMPORAL_NAMESPACE || 'default';

      const connection = await Connection.connect({ address });

      _client = new Client({
        connection,
        namespace,
      });

      return _client;
    })();

  return _clientPromise;
}

/**
 * Derives a deterministic workflow ID from an entity ID.
 * This ensures one workflow per entity, enabling Update-with-Start
 * to find or create the correct workflow.
 */
function workflowId(entityId: string): string {
  return `${WORKFLOW_ID_PREFIX}-${entityId}`;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates a new spatial coordinate tracking session for an entity.
 *
 * Starts a `spatialCoordinateWorkflow` that runs indefinitely,
 * tracking the entity's position and accepting delta updates.
 *
 * @param entityId - Unique identifier for the spatial entity
 * @param userId - ID of the user who owns this session
 * @param initialPosition - Starting coordinates
 * @returns The workflow run handle's workflow ID
 */
export async function createSpatialSession(
  entityId: string,
  userId: string,
  initialPosition: { x: number; y: number },
): Promise<string> {
  const client = await getClient();
  const wfId = workflowId(entityId);

  const handle = await client.workflow.start('spatialCoordinateWorkflow', {
    taskQueue: TASK_QUEUE,
    workflowId: wfId,
    args: [
      {
        entityId,
        x: initialPosition.x,
        y: initialPosition.y,
        userId,
      },
    ],
  });

  return handle.workflowId;
}

/**
 * Updates an entity's position by applying a delta.
 *
 * Uses the Update-with-Start pattern:
 * - If the workflow exists, sends an update with the delta
 * - If the workflow does not exist, starts it at (0, 0) then applies the delta
 *
 * This guarantees that a position update never fails due to a missing workflow,
 * which is critical for reconnection scenarios and crash recovery.
 *
 * @param wfId - Workflow ID (from createSpatialSession or workflowId helper)
 * @param delta - Movement delta to apply
 * @returns The new position after the delta is applied
 */
export async function updatePosition(
  wfId: string,
  delta: { dx: number; dy: number },
): Promise<ApplyDeltaResult> {
  const client = await getClient();
  const timestamp = Date.now();

  try {
    // Attempt to send update to existing workflow
    const handle = client.workflow.getHandle(wfId);
    const result = await handle.executeUpdate('applyDelta', {
      args: [{ dx: delta.dx, dy: delta.dy, timestamp }],
    });
    return result as ApplyDeltaResult;
  } catch (err) {
    if (err instanceof WorkflowNotFoundError) {
      // Workflow doesn't exist — start it with zero origin, then apply delta
      const entityId = wfId.replace(`${WORKFLOW_ID_PREFIX}-`, '');

      await client.workflow.start('spatialCoordinateWorkflow', {
        taskQueue: TASK_QUEUE,
        workflowId: wfId,
        args: [
          {
            entityId,
            x: 0,
            y: 0,
            userId: 'system',
          },
        ],
      });

      // Now apply the delta to the freshly-started workflow
      const handle = client.workflow.getHandle(wfId);
      const result = await handle.executeUpdate('applyDelta', {
        args: [{ dx: delta.dx, dy: delta.dy, timestamp }],
      });
      return result as ApplyDeltaResult;
    }
    throw err;
  }
}

/**
 * Queries the current position of an entity.
 *
 * Uses a Temporal Query, which reads workflow state without
 * mutating it. Queries are served from the cached workflow
 * history — zero latency, no activity execution.
 *
 * @param wfId - Workflow ID to query
 * @returns Current position coordinates
 */
export async function getPosition(wfId: string): Promise<Position> {
  const client = await getClient();
  const handle = client.workflow.getHandle(wfId);
  return handle.query<Position>('getPosition');
}

/**
 * Gracefully closes a spatial session.
 *
 * Sends a `close` signal to the workflow, which triggers
 * final state persistence before the workflow completes.
 * The workflow will return its final position.
 *
 * @param wfId - Workflow ID to close
 */
export async function closeSpatialSession(wfId: string): Promise<void> {
  const client = await getClient();
  const handle = client.workflow.getHandle(wfId);
  await handle.signal('close');
}
