/**
 * useGatewaySSE — React Hook for OmniHub Gateway SSE Connection
 * @version 1.0.0
 * @module src/hooks/useGatewaySSE
 *
 * Connects to the OmniHub Gateway's SSE endpoint on mount and
 * disconnects on unmount. Provides reactive access to streaming
 * tokens, telemetry, and task status via the omniGatewayStore.
 *
 * ZERO POLLING: Uses native EventSource exclusively.
 * Token streaming uses transient state to avoid re-render churn.
 *
 * Usage:
 *   const { status, flushedText, telemetry, taskStatus } = useGatewaySSE();
 *
 * For per-token access without re-renders:
 *   const buffer = useOmniGateway.getState().getTokenBuffer();
 *   // Read buffer.text in a requestAnimationFrame loop
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useEffect, useRef } from 'react';
import { useOmniGateway } from '@/stores/omniGatewayStore';

// ============================================================================
// Configuration
// ============================================================================

interface GatewaySSEOptions {
  /** Override the SSE endpoint URL. Defaults to /api/omnihub-gateway/sse */
  endpoint?: string;
  /** Auth token to include in the SSE connection. */
  authToken?: string;
  /** Whether to auto-connect on mount. Defaults to true. */
  autoConnect?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Connect to the OmniHub Gateway SSE endpoint and return reactive state.
 *
 * - Connects on mount, disconnects on unmount (or when deps change)
 * - Exposes reactive state selectively to minimize re-renders
 * - Token streaming is buffered in transient state; only flushed text
 *   and the sequence counter trigger React re-renders
 */
export function useGatewaySSE(options?: GatewaySSEOptions) {
  const {
    endpoint = '/api/omnihub-gateway/sse',
    authToken,
    autoConnect = true,
  } = options ?? {};

  const connect = useOmniGateway((s) => s.connect);
  const disconnect = useOmniGateway((s) => s.disconnect);

  // Track connection state to prevent double-connect in StrictMode
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!autoConnect || connectedRef.current) return;

    connectedRef.current = true;
    connect(endpoint, authToken);

    return () => {
      connectedRef.current = false;
      disconnect();
    };
  }, [endpoint, authToken, autoConnect, connect, disconnect]);

  // Return reactive state — components re-render only when these change
  const status = useOmniGateway((s) => s.status);
  const channelId = useOmniGateway((s) => s.channelId);
  const isStreaming = useOmniGateway((s) => s.isStreaming);
  const flushedText = useOmniGateway((s) => s.flushedText);
  const tokenSequenceId = useOmniGateway((s) => s.tokenSequenceId);
  const telemetry = useOmniGateway((s) => s.telemetry);
  const taskStatus = useOmniGateway((s) => s.taskStatus);
  const connectedAgents = useOmniGateway((s) => s.connectedAgents);
  const lastError = useOmniGateway((s) => s.lastError);

  return {
    status,
    channelId,
    isStreaming,
    flushedText,
    tokenSequenceId,
    telemetry,
    taskStatus,
    connectedAgents,
    lastError,
  };
}
