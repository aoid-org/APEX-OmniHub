/**
 * Spatial Activities — Local Activities for Delta Processing
 *
 * These activities execute in the same process as the workflow worker,
 * avoiding the overhead of a separate activity task queue. Designed for
 * sub-millisecond validation and fast I/O to Supabase.
 *
 * APEX STANDARDS:
 * - Local Activities: No separate worker, no task queue overhead
 * - Fail-fast: ApplicationFailure with descriptive non-retryable errors
 * - Type-safe: Full TypeScript coverage
 *
 * @module lib/temporal/spatialActivities
 * @license Proprietary - APEX Business Systems Ltd.
 */

import { ApplicationFailure } from '@temporalio/activity';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface SpatialDelta {
  dx: number;
  dy: number;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum absolute delta per update to prevent teleportation exploits */
const MAX_DELTA_MAGNITUDE = 1000;

/** Maximum absolute coordinate value (world bounds) */
const MAX_COORDINATE = 50_000;

/** Minimum timestamp (reject deltas from before Unix epoch) */
const MIN_TIMESTAMP = 0;

// ============================================================================
// Supabase Client (server-side, service role)
// ============================================================================

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw ApplicationFailure.nonRetryable(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables',
      'CONFIGURATION_ERROR',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ============================================================================
// Activities
// ============================================================================

/**
 * Validates that a spatial delta is within acceptable bounds.
 *
 * Checks:
 * - dx and dy are finite numbers
 * - Magnitude does not exceed MAX_DELTA_MAGNITUDE
 * - Timestamp is a positive finite number
 *
 * Throws a non-retryable ApplicationFailure on validation failure,
 * since invalid input will never become valid on retry.
 */
export async function validateDelta(delta: SpatialDelta): Promise<void> {
  const { dx, dy, timestamp } = delta;

  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    throw ApplicationFailure.nonRetryable(
      `Delta coordinates must be finite numbers. Received dx=${dx}, dy=${dy}`,
      'INVALID_DELTA',
      { dx, dy },
    );
  }

  if (Math.abs(dx) > MAX_DELTA_MAGNITUDE || Math.abs(dy) > MAX_DELTA_MAGNITUDE) {
    throw ApplicationFailure.nonRetryable(
      `Delta magnitude exceeds maximum of ${MAX_DELTA_MAGNITUDE}. Received dx=${dx}, dy=${dy}`,
      'DELTA_OUT_OF_BOUNDS',
      { dx, dy, maxMagnitude: MAX_DELTA_MAGNITUDE },
    );
  }

  if (!Number.isFinite(timestamp) || timestamp < MIN_TIMESTAMP) {
    throw ApplicationFailure.nonRetryable(
      `Timestamp must be a non-negative finite number. Received ${timestamp}`,
      'INVALID_TIMESTAMP',
      { timestamp },
    );
  }
}

/**
 * Persists the current coordinates to Supabase.
 *
 * Uses an upsert on the `spatial_positions` table keyed by entityId.
 * This ensures idempotent writes — safe for Temporal's at-least-once
 * activity execution guarantee.
 */
export async function persistCoordinates(
  entityId: string,
  x: number,
  y: number,
  userId: string,
): Promise<void> {
  if (Math.abs(x) > MAX_COORDINATE || Math.abs(y) > MAX_COORDINATE) {
    throw ApplicationFailure.nonRetryable(
      `Coordinates out of world bounds. x=${x}, y=${y}, max=${MAX_COORDINATE}`,
      'COORDINATES_OUT_OF_BOUNDS',
      { x, y, maxCoordinate: MAX_COORDINATE },
    );
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('spatial_positions')
    .upsert(
      {
        entity_id: entityId,
        x,
        y,
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'entity_id' },
    );

  if (error) {
    // Retryable — database may be temporarily unavailable
    throw ApplicationFailure.retryable(
      `Failed to persist coordinates for entity ${entityId}: ${error.message}`,
      'PERSISTENCE_ERROR',
      { entityId, x, y, supabaseError: error },
    );
  }
}

/**
 * Broadcasts the current position to a Supabase Realtime channel.
 *
 * Uses Supabase Realtime broadcast for fan-out to all connected
 * clients subscribed to the entity's spatial channel.
 */
export async function broadcastPosition(
  entityId: string,
  x: number,
  y: number,
  channel: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const realtimeChannel = supabase.channel(channel);

  const result = await realtimeChannel.send({
    type: 'broadcast',
    event: 'position_update',
    payload: {
      entityId,
      x,
      y,
      timestamp: Date.now(),
    },
  });

  // Clean up channel subscription after broadcast
  await supabase.removeChannel(realtimeChannel);

  if (result !== 'ok') {
    // Retryable — realtime service may be temporarily unavailable
    throw ApplicationFailure.retryable(
      `Failed to broadcast position for entity ${entityId} on channel ${channel}: ${result}`,
      'BROADCAST_ERROR',
      { entityId, x, y, channel, result },
    );
  }
}
