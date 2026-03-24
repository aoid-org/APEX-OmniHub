/**
 * MCPTransport — Transport Abstraction Layer
 * @version 1.0.0
 * @module src/core/mcp/MCPTransport
 *
 * Defines the transport interface for MCP server communication.
 * Supports stdio (local) and Streamable HTTP (remote) protocols.
 * Each transport implementation handles JSON-RPC message framing.
 *
 * APEX STANDARDS ENFORCED:
 * - Interface-first: Pure interface + factory pattern
 * - Fail-closed: Connection failures produce rejection, not silent drops
 * - Zero side effects: Transport does not interpret message semantics
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';
import type { MCPTransportType } from './mcp.config';

// ============================================================================
// JSON-RPC Types (MCP Protocol)
// ============================================================================

export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string().min(1),
  params: z.record(z.unknown()).optional(),
});

export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;

export const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.unknown().optional(),
    })
    .optional(),
});

export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;

// ============================================================================
// Transport Interface
// ============================================================================

export type TransportStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPTransport {
  /** Current connection status */
  readonly status: TransportStatus;
  /** Transport type identifier */
  readonly type: MCPTransportType;

  /** Establish connection to the MCP server */
  connect(): Promise<void>;
  /** Disconnect from the MCP server */
  disconnect(): Promise<void>;
  /** Send a JSON-RPC request and await the response */
  send(request: JsonRpcRequest): Promise<JsonRpcResponse>;
}

// ============================================================================
// Stdio Transport (Local Process)
// ============================================================================

/**
 * StdioTransport — communicates with MCP servers via stdin/stdout.
 *
 * In browser/PWA context, this transport delegates to a backend proxy
 * that manages the child process. The transport sends HTTP requests
 * to the proxy, which forwards them to the MCP server's stdin.
 */
export class StdioTransport implements MCPTransport {
  readonly type: MCPTransportType = 'stdio';
  private _status: TransportStatus = 'disconnected';
  private readonly serverId: string;
  private readonly proxyBaseUrl: string;

  constructor(serverId: string, proxyBaseUrl?: string) {
    this.serverId = serverId;
    // Resolve proxy URL: prefer Supabase edge function, fall back to relative path
    const meta = import.meta as unknown as Record<string, Record<string, string> | undefined>;
    const supabaseUrl = meta['env']?.['VITE_SUPABASE_URL'] ?? '';
    this.proxyBaseUrl = proxyBaseUrl ??
      (supabaseUrl ? `${supabaseUrl}/functions/v1/mcp-proxy` : '/api/mcp-proxy');
  }

  get status(): TransportStatus {
    return this._status;
  }

  /** Get auth headers for proxy requests */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // Inject Supabase auth token if available (set by session management)
    if (typeof globalThis !== 'undefined' && '_supabaseAuthToken' in globalThis) {
      const token = (globalThis as Record<string, unknown>)['_supabaseAuthToken'];
      if (typeof token === 'string' && token.length > 0) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async connect(): Promise<void> {
    this._status = 'connecting';
    try {
      const response = await fetch(`${this.proxyBaseUrl}/connect`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ serverId: this.serverId }),
      });
      if (!response.ok) {
        throw new Error(`Connect failed: ${response.status}`);
      }
      this._status = 'connected';
    } catch (err) {
      this._status = 'error';
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await fetch(`${this.proxyBaseUrl}/disconnect`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ serverId: this.serverId }),
      });
    } finally {
      this._status = 'disconnected';
    }
  }

  async send(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (this._status !== 'connected') {
      throw new Error(`Cannot send: transport status is "${this._status}"`);
    }

    const response = await fetch(`${this.proxyBaseUrl}/rpc`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ serverId: this.serverId, request }),
    });

    if (!response.ok) {
      throw new Error(`RPC failed: ${response.status}`);
    }

    const raw: unknown = await response.json();
    return JsonRpcResponseSchema.parse(raw);
  }
}

// ============================================================================
// Streamable HTTP Transport (Remote)
// ============================================================================

/**
 * StreamableHTTPTransport — communicates with remote MCP servers via HTTP.
 *
 * Sends JSON-RPC requests directly to the server's HTTP endpoint.
 * Each request-response pair is a single HTTP POST.
 */
export class StreamableHTTPTransport implements MCPTransport {
  readonly type: MCPTransportType = 'streamable-http';
  private _status: TransportStatus = 'disconnected';
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;

  constructor(endpoint: string, headers: Record<string, string> = {}) {
    this.endpoint = endpoint;
    this.headers = headers;
  }

  get status(): TransportStatus {
    return this._status;
  }

  async connect(): Promise<void> {
    this._status = 'connecting';
    try {
      // Verify endpoint is reachable
      const response = await fetch(this.endpoint, {
        method: 'OPTIONS',
        headers: this.headers,
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(`Endpoint check failed: ${response.status}`);
      }
      this._status = 'connected';
    } catch (err) {
      this._status = 'error';
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this._status = 'disconnected';
  }

  async send(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (this._status !== 'connected') {
      throw new Error(`Cannot send: transport status is "${this._status}"`);
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`RPC failed: ${response.status}`);
    }

    const raw: unknown = await response.json();
    return JsonRpcResponseSchema.parse(raw);
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a transport instance based on transport type.
 */
export function createTransport(
  transportType: MCPTransportType,
  serverId: string,
  options?: { endpoint?: string; headers?: Record<string, string> },
): MCPTransport {
  switch (transportType) {
    case 'stdio':
      return new StdioTransport(serverId);
    case 'streamable-http':
      if (!options?.endpoint) {
        throw new Error('StreamableHTTPTransport requires an endpoint URL');
      }
      return new StreamableHTTPTransport(
        options.endpoint,
        options.headers ?? {},
      );
    case 'sse':
      // SSE transport uses the same HTTP mechanism with streaming
      if (!options?.endpoint) {
        throw new Error('SSE transport requires an endpoint URL');
      }
      return new StreamableHTTPTransport(
        options.endpoint,
        options.headers ?? {},
      );
    default: {
      const _exhaustive: never = transportType;
      throw new Error(`Unsupported MCP transport type: ${_exhaustive}`);
    }
  }
}
