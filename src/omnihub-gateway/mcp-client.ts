/**
 * OmniHub MCP Client — Frontend Gateway Bridge
 * @version 1.0.0
 * @module src/omnihub-gateway/mcp-client
 *
 * Typed client for the OmniHub Gateway REST endpoints.
 * Called by dashboard components to trigger workflows and
 * interact with the backend gateway layer.
 *
 * APEX STANDARDS ENFORCED:
 * - Type-safe: All requests and responses are Zod-validated or typed
 * - Auth-first: Every request carries the Supabase JWT
 * - Fail-closed: Network errors throw, never silently succeed
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { TriggerLambdaResponse } from './router';

// ============================================================================
// Configuration
// ============================================================================

const GATEWAY_BASE_URL =
  typeof process !== 'undefined' && process.env?.['OMNIHUB_GATEWAY_URL']
    ? process.env['OMNIHUB_GATEWAY_URL']
    : '/api';

// ============================================================================
// Client Functions
// ============================================================================

export interface LambdaDemoPayload {
  readonly taskData: Record<string, unknown>;
  readonly functionName?: string;
}

/**
 * Trigger an async Lambda orchestration demo via the gateway.
 *
 * Calls POST /api/workflows/trigger-lambda with the user's JWT
 * and task payload. Returns the workflowId for tracking.
 *
 * The backend dispatches the Lambda via Temporal's Asynchronous Activity
 * Completion pattern and broadcasts completion via SSE.
 *
 * @param payload - Task data and optional function name
 * @param authToken - Supabase JWT for authentication
 * @returns The workflow dispatch response with workflowId
 * @throws Error if the request fails or auth is invalid
 */
export async function triggerAsyncLambdaDemo(
  payload: LambdaDemoPayload,
  authToken: string,
): Promise<TriggerLambdaResponse> {
  const url = `${GATEWAY_BASE_URL}/workflows/trigger-lambda`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      taskData: payload.taskData,
      functionName: payload.functionName ?? 'OmniHubWorkerLambda',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(
      `Lambda dispatch failed (${response.status}): ${(errorBody as Record<string, string>).error ?? 'Unknown error'}`,
    );
  }

  return response.json() as Promise<TriggerLambdaResponse>;
}

/**
 * Get the gateway base URL (for SSE connections).
 */
export function getGatewayBaseUrl(): string {
  return GATEWAY_BASE_URL;
}
