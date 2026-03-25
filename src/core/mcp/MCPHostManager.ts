/**
 * MCPHostManager — Singleton MCP Host Controller (Facade)
 * @version 2.0.0
 * @module src/core/mcp/MCPHostManager
 *
 * Central MCP Host that manages client connections, capability negotiation,
 * and request routing. Triggers mcp_tool_approve modals for risky operations.
 *
 * Architecture (v2.0.0 — Decomposed):
 *   Agent → MCPHostManager (facade)
 *              ├── MCPConnectionManager  (transport lifecycle)
 *              ├── MCPSessionManager     (health + capability caches)
 *              └── MCPDispatcher         (invocation + audit + approval)
 *                       ↕                       ↕
 *                MCPServerRegistry       MCPToolDiscovery
 *
 * v2.0.0 — Decomposed into MCPConnectionManager, MCPSessionManager, MCPDispatcher
 *           to eliminate god-class risk. Public API is 100% backwards-compatible.
 * v1.1.0 — Added health check heartbeat, resource/prompt discovery,
 *           and audit trail integration for tool invocations.
 *
 * APEX STANDARDS ENFORCED:
 * - Singleton Pattern: One host per application lifecycle
 * - Fail-Closed: Unknown servers/tools rejected at boundary
 * - Audit Trail: All tool invocations persisted with correlation IDs
 * - Approval Gate: Write/destructive ops require user confirmation
 * - Heartbeat: Connected servers monitored; stale connections recovered
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';
import { MCPServerRegistry, type ServerStatus } from './MCPServerRegistry';
import { MCPToolDiscovery } from './MCPToolDiscovery';
import { MCPConnectionManager } from './MCPConnectionManager';
import { MCPSessionManager } from './MCPSessionManager';
import { MCPDispatcher } from './MCPDispatcher';
import type { MCPConfig } from './mcp.config';

// ============================================================================
// Bridge Types (preserved for backwards compatibility)
// ============================================================================

export interface BridgePayload {
  action: string;
  discrepancy: string;
  source: string;
  timestamp: string;
  anomaly: string;
}

export type BridgeRiskLevel = 'read' | 'write' | 'destructive';

export function resolveBridgeRiskLevel(
  toolName: string,
  fallback: BridgeRiskLevel
): BridgeRiskLevel {
  const lw = toolName.toLowerCase();
  if (lw.includes('delete') || lw.includes('destroy') || lw.includes('drop')) return 'destructive';
  if (lw.includes('create') || lw.includes('update') || lw.includes('insert') || lw.includes('modify')) return 'write';
  return fallback;
}

// ============================================================================
// Types
// ============================================================================

export const ToolInvocationSchema = z.object({
  /** Fully qualified tool name */
  toolName: z.string().min(1),
  /** Tool parameters */
  params: z.record(z.unknown()),
  /** Correlation ID for audit trail */
  correlationId: z.string().min(1),
});

export type ToolInvocation = z.infer<typeof ToolInvocationSchema>;

export interface ToolResult {
  /** Whether the tool executed successfully */
  readonly success: boolean;
  /** Result data (undefined on failure) */
  readonly data: unknown;
  /** Error message (undefined on success) */
  readonly error?: string;
  /** Execution time in milliseconds */
  readonly durationMs: number;
  /** Correlation ID matching the invocation */
  readonly correlationId: string;
}

export interface ApprovalRequest {
  readonly toolName: string;
  readonly params: Record<string, unknown>;
  readonly riskLevel: BridgeRiskLevel;
  readonly serverId: string;
}

/** Callback for approval gating — returns true if approved */
export type ApprovalCallback = (
  request: ApprovalRequest,
) => Promise<boolean>;

// ============================================================================
// Audit Trail
// ============================================================================

export interface AuditEntry {
  readonly correlationId: string;
  readonly toolName: string;
  readonly serverId: string;
  readonly riskLevel: BridgeRiskLevel;
  readonly approved: boolean;
  readonly success: boolean;
  readonly durationMs: number;
  readonly error?: string;
  readonly timestamp: string;
}

/** Callback to persist audit entries (e.g., to Supabase audit_logs) */
export type AuditCallback = (entry: AuditEntry) => void;

// ============================================================================
// Health Check (re-exported from MCPSessionManager for compatibility)
// ============================================================================

export type { HealthCheckConfig, MCPResource, MCPPrompt } from './MCPSessionManager';

// ============================================================================
// Host Manager (Facade)
// ============================================================================

export class MCPHostManager {
  private static instance: MCPHostManager | null = null;

  readonly registry: MCPServerRegistry;
  readonly discovery: MCPToolDiscovery;

  /** @internal — Connection lifecycle delegate */
  private readonly connectionMgr: MCPConnectionManager;
  /** @internal — Health & capability cache delegate */
  private readonly sessionMgr: MCPSessionManager;
  /** @internal — Invocation, approval & audit delegate */
  private readonly dispatcher: MCPDispatcher;

  /** Discovered resources indexed by serverId */
  get resources(): Map<string, readonly import('./MCPSessionManager').MCPResource[]> {
    return this.sessionMgr.resources;
  }

  /** Discovered prompts indexed by serverId */
  get prompts(): Map<string, readonly import('./MCPSessionManager').MCPPrompt[]> {
    return this.sessionMgr.prompts;
  }

  private constructor() {
    this.registry = new MCPServerRegistry();
    this.discovery = new MCPToolDiscovery();
    this.connectionMgr = new MCPConnectionManager();
    this.sessionMgr = new MCPSessionManager();
    this.dispatcher = new MCPDispatcher();
  }

  /** Get singleton instance */
  static getInstance(): MCPHostManager {
    MCPHostManager.instance ??= new MCPHostManager();
    return MCPHostManager.instance;
  }

  /** Reset singleton (for testing only) */
  static resetInstance(): void {
    MCPHostManager.instance = null;
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  /**
   * Initialize the host with server configuration.
   * Loads registry and creates transport instances.
   */
  initialize(config?: MCPConfig): number {
    return this.connectionMgr.initializeTransports(this.registry, config);
  }

  /**
   * Set the approval callback for risky tool invocations.
   * Typically wired to omniModalStore.invoke() with mcp_tool_approve type.
   */
  setApprovalCallback(callback: ApprovalCallback): void {
    this.dispatcher.setApprovalCallback(callback);
  }

  /**
   * Set the audit trail callback for tool invocation logging.
   * Typically wired to Supabase audit_logs insert.
   */
  setAuditCallback(callback: AuditCallback): void {
    this.dispatcher.setAuditCallback(callback);
  }

  /**
   * Configure health check heartbeat parameters.
   */
  setHealthCheckConfig(config: Partial<import('./MCPSessionManager').HealthCheckConfig>): void {
    this.sessionMgr.setHealthCheckConfig(config);
  }

  // --------------------------------------------------------------------------
  // Connection Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Connect to a specific MCP server.
   * Performs full capability negotiation (tools, resources, prompts)
   * and starts a health check heartbeat.
   */
  async connectServer(serverId: string): Promise<void> {
    const entry = this.registry.getServer(serverId);
    const capabilities = entry?.config.capabilities ?? [];

    try {
      await this.connectionMgr.connect(serverId, this.registry);

      const transport = this.connectionMgr.getTransport(serverId);
      if (transport) {
        // Negotiate capabilities based on server declaration
        await this.sessionMgr.negotiateCapabilities(
          serverId,
          capabilities,
          transport,
          this.discovery,
        );
        // Start health check heartbeat
        this.sessionMgr.startHeartbeat(serverId, transport, this.registry);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown connection error';
      this.registry.updateStatus(serverId, 'error', message);
      throw err;
    }
  }

  /**
   * Disconnect from a specific MCP server.
   * Stops heartbeat and clears all capability caches.
   */
  async disconnectServer(serverId: string): Promise<void> {
    this.sessionMgr.stopHeartbeat(serverId);
    await this.connectionMgr.disconnect(serverId, this.registry);
    // Always clear capability caches regardless of transport state
    this.sessionMgr.clearCapabilities(serverId, this.discovery);
  }

  // --------------------------------------------------------------------------
  // Tool Invocation
  // --------------------------------------------------------------------------

  /**
   * Invoke an MCP tool with approval gating and audit trail.
   *
   * Flow:
   * 1. Validate tool exists in discovery cache
   * 2. Check risk level — gate write/destructive ops through approval
   * 3. Send JSON-RPC request via transport (with retry)
   * 4. Persist audit entry
   * 5. Return structured result
   */
  async invokeTool(invocation: ToolInvocation): Promise<ToolResult> {
    return this.dispatcher.invokeTool(
      invocation,
      this.discovery,
      (serverId) => this.connectionMgr.getTransport(serverId),
    );
  }

  // --------------------------------------------------------------------------
  // Internal / Testing Helpers
  // --------------------------------------------------------------------------

  /**
   * Get the transport for a server (for testing).
   */
  getTransport(serverId: string) {
    return this.connectionMgr.getTransport(serverId);
  }

  /**
   * Update status for a server.
   */
  updateServerStatus(
    serverId: string,
    status: ServerStatus,
    error?: string,
  ): void {
    this.registry.updateStatus(serverId, status, error);
  }

  /**
   * Get current health failure count for a server (for testing/monitoring).
   */
  getHealthFailures(serverId: string): number {
    return this.sessionMgr.getHealthFailures(serverId);
  }
}

function coerceUnknownToString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return fallback;
  return fallback;
}

// Retain for any external consumers that may import it directly
export { coerceUnknownToString };
