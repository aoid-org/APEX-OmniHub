/**
 * OmniGateway SSE State — "The Nerve Fiber"
 * @version 1.0.0
 * @module src/stores/omniGatewayStore
 *
 * Zustand store providing reactive, SSE-driven state for the OmniHub
 * Gateway's real-time telemetry and AI token streaming. Connects to the
 * omnihub-gateway SSE endpoints via native EventSource.
 *
 * ZERO POLLING: All real-time data flows through SSE. No setInterval,
 * no setTimeout polling loops, no mocked WebSocket connections.
 *
 * Architecture:
 *   EventSource → onmessage → Zustand transient state → React (no re-render churn)
 *
 * Transient state pattern:
 *   - Streaming tokens are stored in a mutable ref-like object (tokenBuffer)
 *     that Zustand does NOT track for equality, preventing React re-renders
 *     on every single token.
 *   - Components that need per-token updates use `subscribe()` with a
 *     selector on the `tokenSequenceId` counter, which only increments
 *     on flush boundaries (sentence/paragraph breaks).
 *
 * APEX STANDARDS ENFORCED:
 * - Zero Polling: EventSource only — no setInterval, no setTimeout loops
 * - Transient State: Token streaming via mutable buffer, not reactive state
 * - Fail-Closed: Connection errors set status to 'error', never silently drop
 * - Idempotent Reconnect: EventSource auto-reconnects via browser SSE spec
 * - Memory-Safe: Channel teardown clears all buffers and listeners
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type GatewaySSEStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface GatewayTelemetry {
  readonly workflowId: string;
  readonly state: string;
  readonly modelId: string;
  readonly estimatedCostUsd: number;
  readonly durationMs: number;
  readonly timestamp: string;
}

export interface TaskStatusUpdate {
  readonly taskId: string;
  readonly state: string;
  readonly artifacts: ReadonlyArray<Record<string, unknown>>;
  readonly metadata: Record<string, unknown>;
  readonly timestamp: string;
}

export interface WorkflowCompleteEvent {
  readonly workflowId: string;
  readonly functionName: string;
  readonly cost: number;
  readonly worker: string;
  readonly completedAt: string;
}

/**
 * Mutable token buffer — NOT tracked by Zustand equality checks.
 * This prevents React re-renders on every incoming token.
 * Components that need the live buffer read it via `getTokenBuffer()`.
 */
interface TokenBuffer {
  /** Accumulated text from the current stream */
  text: string;
  /** Number of tokens received in current stream */
  count: number;
  /** Whether a stream is currently active */
  active: boolean;
}

// ============================================================================
// Store Interface
// ============================================================================

interface OmniGatewayState {
  // -- Reactive state (triggers re-renders on change) --

  /** SSE connection status */
  readonly status: GatewaySSEStatus;
  /** Active SSE channel ID */
  readonly channelId: string | null;
  /** Last error message */
  readonly lastError: string | null;
  /** Monotonically increasing counter — bumped on token flush boundaries */
  readonly tokenSequenceId: number;
  /** Latest flushed text snapshot (updated on flush, not per-token) */
  readonly flushedText: string;
  /** Whether a token stream is currently active */
  readonly isStreaming: boolean;
  /** Latest telemetry event */
  readonly telemetry: GatewayTelemetry | null;
  /** Latest task status update */
  readonly taskStatus: TaskStatusUpdate | null;
  /** Connected agent count from gateway */
  readonly connectedAgents: number;
  /** Latest workflow completion event */
  readonly workflowComplete: WorkflowCompleteEvent | null;

  // -- Actions --

  /** Connect to the gateway SSE endpoint */
  connect: (endpoint: string, authToken?: string) => void;
  /** Disconnect from the gateway SSE endpoint */
  disconnect: () => void;
  /** Get the current mutable token buffer (no re-render) */
  getTokenBuffer: () => TokenBuffer;
  /** Flush the token buffer to reactive state (triggers re-render) */
  flushTokens: () => void;
  /** Clear the token buffer and flushed text */
  clearTokens: () => void;
}

// ============================================================================
// Transient Token Buffer (mutable, outside Zustand equality tracking)
// ============================================================================

const _tokenBuffer: TokenBuffer = {
  text: '',
  count: 0,
  active: false,
};

// ============================================================================
// EventSource Manager (module-scoped, not in Zustand state)
// ============================================================================

let _eventSource: EventSource | null = null;

function teardownEventSource(): void {
  if (_eventSource) {
    _eventSource.close();
    _eventSource = null;
  }
  _tokenBuffer.text = '';
  _tokenBuffer.count = 0;
  _tokenBuffer.active = false;
}

// ============================================================================
// Store
// ============================================================================

export const useOmniGateway = create<OmniGatewayState>((set, get) => ({
  status: 'disconnected',
  channelId: null,
  lastError: null,
  tokenSequenceId: 0,
  flushedText: '',
  isStreaming: false,
  telemetry: null,
  taskStatus: null,
  connectedAgents: 0,
  workflowComplete: null,

  connect: (endpoint: string, authToken?: string) => {
    // Tear down existing connection
    teardownEventSource();

    set({ status: 'connecting', lastError: null });

    // Build SSE URL with auth token as query param
    // (EventSource does not support custom headers; token goes in URL)
    let url = endpoint;
    if (authToken) {
      const separator = endpoint.includes('?') ? '&' : '?';
      url = `${endpoint}${separator}token=${encodeURIComponent(authToken)}`;
    }

    const es = new EventSource(url);
    _eventSource = es;

    // ------------------------------------------------------------------
    // Connection lifecycle (SSE spec: auto-reconnect on network failure)
    // ------------------------------------------------------------------

    es.onopen = () => {
      set({ status: 'connected', lastError: null });
    };

    es.onerror = () => {
      // EventSource auto-reconnects per spec. We update status but do NOT
      // close — the browser handles reconnection with exponential backoff.
      if (es.readyState === EventSource.CLOSED) {
        set({ status: 'error', lastError: 'SSE connection closed by server' });
      } else {
        set({ status: 'connecting' });
      }
    };

    // ------------------------------------------------------------------
    // Channel ID assignment (sent by SSEManager on connection)
    // ------------------------------------------------------------------

    es.addEventListener('channel', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as { channelId: string };
        set({ channelId: data.channelId });
      } catch {
        // Non-JSON channel event — use raw data as channel ID
        set({ channelId: event.data });
      }
    });

    // ------------------------------------------------------------------
    // AI Token Streaming — piped into transient buffer (NO re-render)
    // ------------------------------------------------------------------

    es.addEventListener('token', (event: MessageEvent) => {
      _tokenBuffer.text += event.data;
      _tokenBuffer.count++;
      _tokenBuffer.active = true;

      // Auto-flush on sentence boundaries to batch UI updates.
      // This prevents re-rendering on every single token while
      // still providing near-real-time visual feedback.
      const lastChar = event.data[event.data.length - 1];
      if (lastChar === '.' || lastChar === '!' || lastChar === '?' || lastChar === '\n') {
        get().flushTokens();
      }
    });

    es.addEventListener('token_start', () => {
      _tokenBuffer.text = '';
      _tokenBuffer.count = 0;
      _tokenBuffer.active = true;
      set({ isStreaming: true, flushedText: '' });
    });

    es.addEventListener('token_done', () => {
      _tokenBuffer.active = false;
      // Final flush — push all remaining tokens to reactive state
      get().flushTokens();
      set({ isStreaming: false });
    });

    // ------------------------------------------------------------------
    // Telemetry events — routing decisions, cost tracking
    // ------------------------------------------------------------------

    es.addEventListener('telemetry', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as GatewayTelemetry;
        set({ telemetry: data });
      } catch {
        // Malformed telemetry — ignore silently
      }
    });

    // ------------------------------------------------------------------
    // Task status updates — A2A workflow state transitions
    // ------------------------------------------------------------------

    es.addEventListener('task_status', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as TaskStatusUpdate;
        set({ taskStatus: data });
      } catch {
        // Malformed task status — ignore silently
      }
    });

    // ------------------------------------------------------------------
    // Agent registry updates — connected agent count changes
    // ------------------------------------------------------------------

    es.addEventListener('agents', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as { count: number };
        set({ connectedAgents: data.count });
      } catch {
        // Malformed agent data — ignore silently
      }
    });

    // ------------------------------------------------------------------
    // Workflow completion — Lambda async activity callback
    // ------------------------------------------------------------------

    es.addEventListener('workflow_complete', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WorkflowCompleteEvent;
        set({ workflowComplete: data });
      } catch {
        // Malformed workflow complete event — ignore silently
      }
    });
  },

  disconnect: () => {
    teardownEventSource();
    set({
      status: 'disconnected',
      channelId: null,
      lastError: null,
      isStreaming: false,
    });
  },

  getTokenBuffer: () => _tokenBuffer,

  flushTokens: () => {
    set((state) => ({
      flushedText: _tokenBuffer.text,
      tokenSequenceId: state.tokenSequenceId + 1,
    }));
  },

  clearTokens: () => {
    _tokenBuffer.text = '';
    _tokenBuffer.count = 0;
    _tokenBuffer.active = false;
    set({
      flushedText: '',
      tokenSequenceId: 0,
      isStreaming: false,
    });
  },
}));
