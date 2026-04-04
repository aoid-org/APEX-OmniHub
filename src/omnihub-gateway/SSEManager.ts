/**
 * SSEManager — Server-Sent Events Transport Layer
 * @version 1.0.0
 * @module src/omnihub-gateway/SSEManager
 *
 * Manages SSE connections for real-time streaming from the OmniHub Gateway.
 * Replaces all polling-based communication. Each client gets a dedicated
 * channel with automatic heartbeat and reconnection support.
 *
 * Transport: HTTP + SSE (mandatory per architectural mandate).
 * Polling is prohibited.
 *
 * APEX STANDARDS ENFORCED:
 * - No polling: All real-time data flows through SSE channels
 * - Heartbeat: Keeps connections alive and detects stale clients
 * - Backpressure: Bounded event queue per channel prevents memory leaks
 * - Correlation: Every event carries a unique ID for deduplication
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { SSEEvent, SSEConnectionState, SSESubscription } from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
const DEFAULT_RETRY_MS = 3_000;
const MAX_QUEUE_SIZE = 1_000;

// ============================================================================
// SSE Channel
// ============================================================================

/**
 * Represents a single SSE connection channel to a client.
 * Buffers events and flushes them through a writable controller.
 */
export class SSEChannel {
  readonly channelId: string;
  private _state: SSEConnectionState = 'connecting';
  private readonly queue: SSEEvent[] = [];
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly encoder = new TextEncoder();
  private readonly retryMs: number;

  constructor(channelId: string, retryMs = DEFAULT_RETRY_MS) {
    this.channelId = channelId;
    this.retryMs = retryMs;
  }

  get state(): SSEConnectionState {
    return this._state;
  }

  /**
   * Create a ReadableStream for this SSE channel.
   * Attach to an HTTP Response for streaming.
   */
  createStream(): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start: (ctrl) => {
        this.controller = ctrl;
        this._state = 'open';

        // Send initial retry directive
        this.writeRaw(`retry: ${this.retryMs}\n\n`);

        // Flush any queued events
        for (const event of this.queue) {
          this.writeEvent(event);
        }
        this.queue.length = 0;

        // Start heartbeat
        this.heartbeatTimer = setInterval(() => {
          this.sendHeartbeat();
        }, DEFAULT_HEARTBEAT_INTERVAL_MS);
      },
      cancel: () => {
        this.close();
      },
    });
  }

  /**
   * Push an event to the client.
   * If the stream isn't open yet, events are queued (up to MAX_QUEUE_SIZE).
   */
  send(event: string, data: unknown, id?: string): void {
    const sseEvent: SSEEvent = {
      id: id ?? `${this.channelId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      event,
      data: typeof data === 'string' ? data : JSON.stringify(data),
    };

    if (this._state === 'open' && this.controller) {
      this.writeEvent(sseEvent);
    } else if (this.queue.length < MAX_QUEUE_SIZE) {
      this.queue.push(sseEvent);
    } else {
      // Backpressure: queue full — log the drop so operators can detect data loss
      console.warn(
        `[SSEChannel:${this.channelId}] Backpressure: dropped event "${event}" (queue full at ${MAX_QUEUE_SIZE})`,
      );
    }
  }

  /**
   * Send a heartbeat comment to keep the connection alive.
   */
  private sendHeartbeat(): void {
    if (this._state === 'open' && this.controller) {
      this.writeRaw(`: heartbeat ${new Date().toISOString()}\n\n`);
    }
  }

  /**
   * Write a formatted SSE event to the stream.
   */
  private writeEvent(event: SSEEvent): void {
    const lines: string[] = [
      `id: ${event.id}`,
      `event: ${event.event}`,
    ];

    // Split data across multiple lines if it contains newlines
    for (const line of event.data.split('\n')) {
      lines.push(`data: ${line}`);
    }

    if (event.retry !== undefined) {
      lines.push(`retry: ${event.retry}`);
    }

    lines.push(''); // Trailing newline
    this.writeRaw(lines.join('\n') + '\n');
  }

  /**
   * Write raw text to the underlying stream.
   */
  private writeRaw(text: string): void {
    try {
      this.controller?.enqueue(this.encoder.encode(text));
    } catch {
      // Stream closed — mark as error
      this._state = 'error';
    }
  }

  /**
   * Close the SSE channel.
   */
  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    try {
      this.controller?.close();
    } catch {
      // Already closed
    }

    this._state = 'closed';
    this.controller = null;
  }
}

// ============================================================================
// SSE Manager (Channel Registry)
// ============================================================================

/**
 * SSEManager — Manages all active SSE channels.
 * Provides channel lifecycle, broadcast, and subscription tracking.
 */
export class SSEManager {
  private readonly channels = new Map<string, SSEChannel>();

  /**
   * Create a new SSE channel and return its readable stream.
   * The stream should be passed to a Response object.
   *
   * @returns [channelId, ReadableStream] tuple
   */
  createChannel(channelId?: string): [string, ReadableStream<Uint8Array>] {
    const id = channelId ?? `sse-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // Close existing channel with same ID if present
    const existing = this.channels.get(id);
    if (existing) {
      existing.close();
    }

    const channel = new SSEChannel(id);
    this.channels.set(id, channel);

    const stream = channel.createStream();
    return [id, stream];
  }

  /**
   * Send an event to a specific channel.
   */
  sendToChannel(channelId: string, event: string, data: unknown): boolean {
    const channel = this.channels.get(channelId);
    if (channel?.state !== 'open') {
      return false;
    }
    channel.send(event, data);
    return true;
  }

  /**
   * Broadcast an event to all open channels.
   */
  broadcast(event: string, data: unknown): number {
    let sent = 0;
    for (const channel of this.channels.values()) {
      if (channel.state === 'open') {
        channel.send(event, data);
        sent++;
      }
    }
    return sent;
  }

  /**
   * Close a specific channel.
   */
  closeChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;
    channel.close();
    this.channels.delete(channelId);
    return true;
  }

  /**
   * Close all channels.
   */
  closeAll(): void {
    for (const channel of this.channels.values()) {
      channel.close();
    }
    this.channels.clear();
  }

  /**
   * Get active subscription info for all channels.
   */
  getSubscriptions(): SSESubscription[] {
    const subs: SSESubscription[] = [];
    for (const [id, channel] of this.channels) {
      subs.push({
        subscriptionId: id,
        channel: id,
        createdAt: new Date().toISOString(),
        state: channel.state,
      });
    }
    return subs;
  }

  /**
   * Remove stale (closed/error) channels.
   * Call periodically to prevent memory leaks.
   */
  pruneStale(): number {
    let pruned = 0;
    for (const [id, channel] of this.channels) {
      if (channel.state === 'closed' || channel.state === 'error') {
        this.channels.delete(id);
        pruned++;
      }
    }
    return pruned;
  }

  /**
   * Get the count of active channels.
   */
  get activeCount(): number {
    let count = 0;
    for (const channel of this.channels.values()) {
      if (channel.state === 'open') count++;
    }
    return count;
  }

  /**
   * Create an SSE HTTP Response with proper headers.
   * Convenience method for edge/serverless environments.
   */
  createResponse(channelId?: string): { channelId: string; response: Response } {
    const [id, stream] = this.createChannel(channelId);
    const response = new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-SSE-Channel-Id': id,
      },
    });
    return { channelId: id, response };
  }
}
