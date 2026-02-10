/**
 * ApexRealtimeGateway (Nexus) — WebSocket proxy for OpenAI
 * Realtime sessions with device auth, idempotency, and
 * orchestrator-routed tool calls.
 *
 * Architecture:
 *   Device ─ws─► OmniHub (Nexus) ─ws─► OpenAI Realtime API
 *
 * On tool-call events, Nexus intercepts, routes through the
 * ApexOrchestrator (which enforces Aegis + Chronos + Veritas),
 * and injects the tool output back into the Realtime conversation.
 *
 * @module core/gateway/ApexRealtimeGateway
 * @version 1.0.0
 * @date 2026-02-09
 */

import { createHash, randomUUID } from 'node:crypto';

import { executeTool } from '../orchestrator/ApexOrchestrator';
import { authenticate } from '../security/SpectreHandshake';
import type {
  DeviceProfile,
  ParsedToolCall,
  SafeErrorPayload,
} from '../types/index';
import { filterManifest } from '../../api/tools/manifest';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** OpenAI Realtime WebSocket endpoint. */
export const OPENAI_REALTIME_URL =
  'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
const PING_INTERVAL_MS = 30_000;
const IDLE_TIMEOUT_MS = 300_000;
const TOOL_EXEC_TIMEOUT_MS = 30_000;
const MAX_QUEUE_SIZE = 64;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OpenAIRealtimeEvent {
  readonly type: string;
  readonly item?: {
    readonly id?: string;
    readonly type?: string;
    readonly call_id?: string;
    readonly name?: string;
  };
  readonly call_id?: string;
  readonly name?: string;
  readonly arguments?: string;
  readonly output?: string;
}

interface ConnectionState {
  device: DeviceProfile;
  connectionId: string;
  lastActivity: number;
  messageQueue: string[];
  pingTimer?: ReturnType<typeof setInterval>;
  idleTimer?: ReturnType<typeof setTimeout>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Generate a deterministic idempotency key from device + call ID.
 * Uses SHA-256 — no Math.random.
 */
export function generateIdempotencyKey(
  deviceId: string,
  callId: string,
): string {
  return createHash('sha256')
    .update(`${deviceId}:${callId}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Generate a cryptographically random connection ID.
 */
export function generateConnectionId(): string {
  return randomUUID();
}

/**
 * Create a safe error payload (no stack traces).
 */
export function createSafeError(
  message: string,
  correlationId: string,
): SafeErrorPayload {
  return {
    error: message,
    correlationId,
    timestamp: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Tool call event parsing                                            */
/* ------------------------------------------------------------------ */

/**
 * Check if an OpenAI Realtime event is a completed function call.
 */
export function isFunctionCallDone(
  event: OpenAIRealtimeEvent,
): boolean {
  return event.type === 'response.function_call_arguments.done';
}

/**
 * Parse a tool call from a function_call_arguments.done event.
 */
export function parseToolCall(
  event: OpenAIRealtimeEvent,
  deviceId: string,
): ParsedToolCall | null {
  if (!isFunctionCallDone(event)) {
    return null;
  }

  const toolName = event.name;
  const callId = event.call_id ?? event.item?.call_id;
  if (!toolName || !callId) {
    return null;
  }

  let args: Record<string, unknown> = {};
  if (event.arguments) {
    try {
      args = JSON.parse(event.arguments) as Record<
        string,
        unknown
      >;
    } catch {
      args = {};
    }
  }

  const idempotencyKey = generateIdempotencyKey(
    deviceId,
    callId,
  );

  return { toolName, args, callId, idempotencyKey };
}

/* ------------------------------------------------------------------ */
/*  Tool call routing                                                  */
/* ------------------------------------------------------------------ */

/**
 * Route a parsed tool call through the orchestrator and
 * produce the OpenAI Realtime response events.
 *
 * @returns array of JSON-stringified events to send upstream
 */
export async function routeToolCall(
  toolCall: ParsedToolCall,
  device: DeviceProfile,
): Promise<string[]> {
  const result = await Promise.race([
    executeTool({
      toolName: toolCall.toolName,
      args: toolCall.args,
      device,
      idempotencyKey: toolCall.idempotencyKey,
      callId: toolCall.callId,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Tool execution timeout')),
        TOOL_EXEC_TIMEOUT_MS,
      ),
    ),
  ]);

  const output = result.success
    ? JSON.stringify(result.output)
    : JSON.stringify({ error: result.error });

  // 1. conversation.item.create with function_call_output
  const itemCreate = JSON.stringify({
    type: 'conversation.item.create',
    item: {
      type: 'function_call_output',
      call_id: toolCall.callId,
      output,
    },
  });

  // 2. response.create to prompt model continuation
  const responseCreate = JSON.stringify({
    type: 'response.create',
  });

  return [itemCreate, responseCreate];
}

/* ------------------------------------------------------------------ */
/*  Connection lifecycle                                               */
/* ------------------------------------------------------------------ */

/**
 * Perform Spectre handshake on an incoming connection.
 *
 * @param headers - upgrade request headers
 * @returns connection state on success
 * @throws SpectreAuthError on failure
 */
export function handleUpgrade(
  headers:
    | { get(name: string): string | null | undefined }
    | Record<string, string | undefined>,
): ConnectionState {
  const connectionId = generateConnectionId();
  const device = authenticate(headers, connectionId);

  return {
    device,
    connectionId,
    lastActivity: Date.now(),
    messageQueue: [],
  };
}

/**
 * Check if message queue has capacity (backpressure guard).
 */
export function hasQueueCapacity(
  state: ConnectionState,
): boolean {
  return state.messageQueue.length < MAX_QUEUE_SIZE;
}

/**
 * Start ping/pong and idle timers.
 */
export function startHealthTimers(
  state: ConnectionState,
  onPing: () => void,
  onIdle: () => void,
): void {
  state.pingTimer = setInterval(onPing, PING_INTERVAL_MS);
  state.idleTimer = setTimeout(onIdle, IDLE_TIMEOUT_MS);
}

/**
 * Reset idle timer on activity.
 */
export function resetIdleTimer(
  state: ConnectionState,
  onIdle: () => void,
): void {
  state.lastActivity = Date.now();
  if (state.idleTimer) {
    clearTimeout(state.idleTimer);
  }
  state.idleTimer = setTimeout(onIdle, IDLE_TIMEOUT_MS);
}

/**
 * Clean up timers on disconnect.
 */
export function cleanup(state: ConnectionState): void {
  if (state.pingTimer) {
    clearInterval(state.pingTimer);
  }
  if (state.idleTimer) {
    clearTimeout(state.idleTimer);
  }
  state.messageQueue.length = 0;
}

/**
 * Build the session.update payload with filtered tools.
 */
export function buildSessionUpdate(
  device: DeviceProfile,
  systemPrompt: string,
): string {
  const manifest = filterManifest(device);
  return JSON.stringify({
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      instructions: systemPrompt,
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.6,
        prefix_padding_ms: 300,
        silence_duration_ms: 1200,
      },
      tools: manifest.tools,
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Exports for WebRTC future extension                                */
/* ------------------------------------------------------------------ */

/**
 * Interface for future WebRTC bridging.
 * Implementations would handle SDP negotiation and ICE.
 */
export interface RealtimeBridge {
  readonly protocol: 'websocket' | 'webrtc';
  connect(config: Record<string, unknown>): Promise<void>;
  disconnect(): Promise<void>;
  send(data: string | ArrayBuffer): void;
  onMessage(handler: (data: string | ArrayBuffer) => void): void;
}
