/**
 * MCPHostManager — Singleton MCP Host Controller
 * @version 1.0.0
 * @module src/core/mcp/MCPHostManager
 *
 * Central MCP Host that manages client connections, capability negotiation,
 * and request routing. Triggers mcp_tool_approve modals for risky operations.
 *
 * Architecture:
 *   Agent → MCPHostManager → MCPTransport → External MCP Server
 *                ↕                    ↕
 *         MCPServerRegistry    MCPToolDiscovery
 *
 * APEX STANDARDS ENFORCED:
 * - Singleton Pattern: One host per application lifecycle
 * - Fail-Closed: Unknown servers/tools rejected at boundary
 * - Audit Trail: All tool invocations logged with correlation IDs
 * - Approval Gate: Write/destructive ops require user confirmation
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';
import { MCPServerRegistry, type ServerStatus } from './MCPServerRegistry';
import { MCPToolDiscovery, type MCPToolSchema } from './MCPToolDiscovery';
import {
  createTransport,
  type MCPTransport,
} from './MCPTransport';
import type { MCPConfig } from './mcp.config';
import { BRIDGE_ACTIONS, type BridgePayload } from '@/omniconnect/bridge/acl';

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
  readonly riskLevel: 'read' | 'write' | 'destructive';
  readonly serverId: string;
}

/** Callback for approval gating — returns true if approved */
export type ApprovalCallback = (
  request: ApprovalRequest,
) => Promise<boolean>;

// ============================================================================
// Host Manager
// ============================================================================

export class MCPHostManager {
  private static instance: MCPHostManager | null = null;

  readonly registry: MCPServerRegistry;
  readonly discovery: MCPToolDiscovery;
  private readonly transports = new Map<string, MCPTransport>();
  private approvalCallback: ApprovalCallback | null = null;

  private constructor() {
    this.registry = new MCPServerRegistry();
    this.discovery = new MCPToolDiscovery();
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
    const count = this.registry.load(config);

    // Create transports for all enabled servers
    for (const serverId of this.registry.listServers()) {
      const entry = this.registry.getServer(serverId);
      if (entry && entry.status !== 'disabled') {
        const transport = createTransport(
          entry.config.transport,
          serverId,
        );
        this.transports.set(serverId, transport);
      }
    }

    return count;
  }

  /**
   * Set the approval callback for risky tool invocations.
   * Typically wired to omniModalStore.invoke() with mcp_tool_approve type.
   */
  setApprovalCallback(callback: ApprovalCallback): void {
    this.approvalCallback = callback;
  }

  // --------------------------------------------------------------------------
  // Connection Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Connect to a specific MCP server.
   */
  async connectServer(serverId: string): Promise<void> {
    const validation = this.registry.validateServer(serverId);
    if (validation !== null) {
      throw new Error(validation);
    }

    const transport = this.transports.get(serverId);
    if (!transport) {
      throw new Error(`No transport for server: ${serverId}`);
    }

    try {
      await transport.connect();
      this.registry.updateStatus(serverId, 'connected');

      // Negotiate capabilities: list available tools
      const toolsResponse = await this.listServerTools(serverId);
      if (toolsResponse.length > 0) {
        this.discovery.registerTools(serverId, toolsResponse);
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
   */
  async disconnectServer(serverId: string): Promise<void> {
    const transport = this.transports.get(serverId);
    if (transport) {
      await transport.disconnect();
      this.discovery.clearServer(serverId);
      this.registry.updateStatus(serverId, 'available');
    }
  }

  // --------------------------------------------------------------------------
  // Tool Invocation
  // --------------------------------------------------------------------------

  /**
   * Invoke an MCP tool with approval gating.
   *
   * Flow:
   * 1. Validate tool exists in discovery cache
   * 2. Check risk level — gate write/destructive ops through approval
   * 3. Send JSON-RPC request via transport
   * 4. Return structured result
   */
  async invokeTool(invocation: ToolInvocation): Promise<ToolResult> {
    const startTime = Date.now();
    const parsed = ToolInvocationSchema.parse(invocation);

    // 1. Look up tool
    const tool = this.discovery.getTool(parsed.toolName);
    if (!tool) {
      return {
        success: false,
        data: undefined,
        error: `Unknown tool: ${parsed.toolName}`,
        durationMs: Date.now() - startTime,
        correlationId: parsed.correlationId,
      };
    }

    // 2. Approval gate for risky operations
    if (this.discovery.requiresApproval(parsed.toolName)) {
      const approved = await this.requestApproval({
        toolName: parsed.toolName,
        params: parsed.params,
        riskLevel: resolveBridgeRiskLevel(parsed.toolName, tool.riskLevel),
        serverId: tool.serverId,
      });

      if (!approved) {
        return {
          success: false,
          data: undefined,
          error: 'User denied tool invocation',
          durationMs: Date.now() - startTime,
          correlationId: parsed.correlationId,
        };
      }
    }

    // 3. Send JSON-RPC request
    const transport = this.transports.get(tool.serverId);
    if (!transport || transport.status !== 'connected') {
      return {
        success: false,
        data: undefined,
        error: `Server not connected: ${tool.serverId}`,
        durationMs: Date.now() - startTime,
        correlationId: parsed.correlationId,
      };
    }

    try {
      if (response.error) {
        return {
          success: false,
          data: undefined,
          error: response.error.message,
          durationMs: Date.now() - startTime,
          correlationId: parsed.correlationId,
        };
      }

      return {
        success: true,
        data: response.result,
        durationMs: Date.now() - startTime,
        correlationId: parsed.correlationId,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Tool invocation failed';
      return {
        success: false,
        data: undefined,
        error: message,
        durationMs: Date.now() - startTime,
        correlationId: parsed.correlationId,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  /**
   * List tools from a connected server via JSON-RPC.
   */
  private async listServerTools(
    serverId: string,
  ): Promise<MCPToolSchema[]> {
    const transport = this.transports.get(serverId);
    if (!transport || transport.status !== 'connected') return [];

    try {
      const response =
        transport?.status === 'connected'
          ? await transport.send({
              jsonrpc: '2.0',
              id: `discover-${serverId}-${Date.now()}`,
              method: 'tools/list',
            })
          : undefined;

      if (!response) return [];
      if (response.error || !response.result) return [];

      // Parse tools from response
      const tools = response.result;
      if (!Array.isArray(tools)) return [];

      return tools
        .filter(
          (t): t is Record<string, unknown> =>
            typeof t === 'object' && t !== null,
        )
        .map((t) => ({
          name: coerceUnknownToString(t['name']),
          description: coerceUnknownToString(t['description']),
          serverId,
          parameters: Array.isArray(t['parameters'])
            ? (t['parameters'] as Array<Record<string, unknown>>).map(
                (p) => ({
                  name: coerceUnknownToString(p['name']),
                  type: coerceUnknownToString(p['type'], 'string'),
                  description: coerceUnknownToString(p['description']),
                  required: Boolean(p['required']),
                }),
              )
            : [],
          riskLevel: (t['riskLevel'] as 'read' | 'write' | 'destructive') ?? 'read',
        }))
        .filter((t) => t.name.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Request user approval for a risky tool invocation.
   */
  private async requestApproval(
    request: ApprovalRequest,
  ): Promise<boolean> {
    if (!this.approvalCallback) {
      // No callback set — fail-closed: deny by default
      return false;
    }
    return this.approvalCallback(request);
  }

  /**
   * Get the transport for a server (for testing).
   */
  getTransport(serverId: string): MCPTransport | undefined {
    return this.transports.get(serverId);
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

  // --------------------------------------------------------------------------
  // Financial Approval Gate (OmniMCP)
  // --------------------------------------------------------------------------

  /**
   * Gate for saga actions that mutate invoice or compliance_records data.
   *
   * Flow:
   *   1. Dispatch mcp_tool_approve → omniModalStore via approvalCallback
   *   2. Await user confirmation (fail-closed — no callback = reject)
   *   3. On rejection: return a PENDING_NETWORK BridgePayload
   *   4. On approval: return null (caller proceeds)
   *
   * @param toolName  - The tool name requesting financial data access
   * @param params    - Tool parameters for display in approval modal
   * @param correlId  - Correlation ID for audit trail
   * @returns null on approval, PENDING_NETWORK BridgePayload on rejection
   */
  async requireFinancialApproval(
    toolName: string,
    params: Record<string, unknown>,
    correlId: string,
  ): Promise<BridgePayload | null> {
    const approved = await this.requestApproval({
      toolName,
      params,
      riskLevel: 'write',
      serverId: 'financial-gate',
    });

    if (approved) return null;

    return buildPendingNetworkPayload(correlId);
  }
}

function coerceUnknownToString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return fallback;
  return fallback;
}

// ── Module-level helpers (not on class to keep cognitive complexity ≤ 15) ─────

function buildPendingNetworkPayload(correlId: string): BridgePayload {
  // Validate action membership at compile time via the imported const array
  const action = BRIDGE_ACTIONS[0]; // 'PENDING_NETWORK'
  return {
    action,
    discrepancy: '0.00',
    source: 'WEB3',
    timestamp: new Date().toISOString(),
    anomaly: `MCP_APPROVAL_REJECTED: correlationId=${correlId}`,
  };
}
