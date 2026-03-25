/**
 * MCPHostManager — Singleton MCP Host Controller
 * @version 1.1.0
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
import { MCPToolDiscovery, type MCPToolSchema } from './MCPToolDiscovery';
import {
  createTransport,
  type MCPTransport,
} from './MCPTransport';
import type { MCPConfig } from './mcp.config';

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
// Health Check
// ============================================================================

export interface HealthCheckConfig {
  /** Interval between heartbeats in milliseconds (default: 60_000) */
  intervalMs: number;
  /** Maximum consecutive failures before marking server as error (default: 3) */
  maxFailures: number;
}

const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = { intervalMs: 60_000, maxFailures: 3 };

// ============================================================================
// Resource & Prompt Types (MCP Capability Negotiation)
// ============================================================================

export interface MCPResource {
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType?: string;
  readonly serverId: string;
}

export interface MCPPrompt {
  readonly name: string;
  readonly description: string;
  readonly serverId: string;
  readonly arguments: readonly { name: string; description: string; required: boolean }[];
}

// ============================================================================
// Host Manager
// ============================================================================

export class MCPHostManager {
  private static instance: MCPHostManager | null = null;

  readonly registry: MCPServerRegistry;
  readonly discovery: MCPToolDiscovery;
  private readonly transports = new Map<string, MCPTransport>();
  private approvalCallback: ApprovalCallback | null = null;
  private auditCallback: AuditCallback | null = null;
  private readonly healthTimers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly healthFailures = new Map<string, number>();
  private healthConfig: HealthCheckConfig = DEFAULT_HEALTH_CONFIG;

  /** Discovered resources indexed by serverId */
  readonly resources = new Map<string, readonly MCPResource[]>();
  /** Discovered prompts indexed by serverId */
  readonly prompts = new Map<string, readonly MCPPrompt[]>();

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

  /**
   * Set the audit trail callback for tool invocation logging.
   * Typically wired to Supabase audit_logs insert.
   */
  setAuditCallback(callback: AuditCallback): void {
    this.auditCallback = callback;
  }

  /**
   * Configure health check heartbeat parameters.
   */
  setHealthCheckConfig(config: Partial<HealthCheckConfig>): void {
    this.healthConfig = { ...DEFAULT_HEALTH_CONFIG, ...config };
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
    const validation = this.registry.validateServer(serverId);
    if (validation !== null) {
      throw new Error(validation);
    }

    const transport = this.transports.get(serverId);
    if (!transport) {
      throw new Error(`No transport for server: ${serverId}`);
    }

    const entry = this.registry.getServer(serverId);
    const capabilities = entry?.config.capabilities ?? [];

    try {
      await transport.connect();
      this.registry.updateStatus(serverId, 'connected');

      // Negotiate capabilities based on server declaration
      if (capabilities.includes('tools')) {
        const toolsResponse = await this.listServerTools(serverId);
        if (toolsResponse.length > 0) {
          this.discovery.registerTools(serverId, toolsResponse);
        }
      }

      if (capabilities.includes('resources')) {
        const resourcesResponse = await this.listServerResources(serverId);
        if (resourcesResponse.length > 0) {
          this.resources.set(serverId, resourcesResponse);
        }
      }

      if (capabilities.includes('prompts')) {
        const promptsResponse = await this.listServerPrompts(serverId);
        if (promptsResponse.length > 0) {
          this.prompts.set(serverId, promptsResponse);
        }
      }

      // Start health check heartbeat
      this.startHeartbeat(serverId);
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
    this.stopHeartbeat(serverId);
    const transport = this.transports.get(serverId);
    if (transport) {
      await transport.disconnect();
      this.registry.updateStatus(serverId, 'available');
    }
    // Always clear capability caches regardless of transport state
    this.discovery.clearServer(serverId);
    this.resources.delete(serverId);
    this.prompts.delete(serverId);
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
    const startTime = Date.now();
    const parsed = ToolInvocationSchema.parse(invocation);

    // 1. Look up tool
    const tool = this.discovery.getTool(parsed.toolName);
    if (!tool) {
      this.emitAudit({
        correlationId: parsed.correlationId,
        toolName: parsed.toolName,
        serverId: 'unknown',
        riskLevel: 'read',
        approved: false,
        success: false,
        durationMs: Date.now() - startTime,
        error: `Unknown tool: ${parsed.toolName}`,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        data: undefined,
        error: `Unknown tool: ${parsed.toolName}`,
        durationMs: Date.now() - startTime,
        correlationId: parsed.correlationId,
      };
    }

    const riskLevel = tool.riskLevel ?? 'read';

    // 2. Approval gate for risky operations
    if (this.discovery.requiresApproval(parsed.toolName)) {
      const approved = await this.requestApproval({
        toolName: parsed.toolName,
        params: parsed.params,
        riskLevel,
        serverId: tool.serverId,
      });

      if (!approved) {
        this.emitAudit({
          correlationId: parsed.correlationId,
          toolName: parsed.toolName,
          serverId: tool.serverId,
          riskLevel,
          approved: false,
          success: false,
          durationMs: Date.now() - startTime,
          error: 'User denied tool invocation',
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          data: undefined,
          error: 'User denied tool invocation',
          durationMs: Date.now() - startTime,
          correlationId: parsed.correlationId,
        };
      }
    }

    // 3. Send JSON-RPC request (transport handles retry)
    const transport = this.transports.get(tool.serverId);
    if (transport?.status !== 'connected') {
      this.emitAudit({
        correlationId: parsed.correlationId,
        toolName: parsed.toolName,
        serverId: tool.serverId,
        riskLevel,
        approved: true,
        success: false,
        durationMs: Date.now() - startTime,
        error: `Server not connected: ${tool.serverId}`,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        data: undefined,
        error: `Server not connected: ${tool.serverId}`,
        durationMs: Date.now() - startTime,
        correlationId: parsed.correlationId,
      };
    }

    try {
      const response = await transport.send({
        jsonrpc: '2.0',
        id: parsed.correlationId,
        method: `tools/${parsed.toolName}`,
        params: parsed.params,
      });

      const success = !response.error;
      const result: ToolResult = success
        ? {
            success: true,
            data: response.result,
            durationMs: Date.now() - startTime,
            correlationId: parsed.correlationId,
          }
        : {
            success: false,
            data: undefined,
            error: response.error!.message,
            durationMs: Date.now() - startTime,
            correlationId: parsed.correlationId,
          };

      // 4. Persist audit entry
      this.emitAudit({
        correlationId: parsed.correlationId,
        toolName: parsed.toolName,
        serverId: tool.serverId,
        riskLevel,
        approved: true,
        success: result.success,
        durationMs: result.durationMs,
        error: result.error,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Tool invocation failed';
      this.emitAudit({
        correlationId: parsed.correlationId,
        toolName: parsed.toolName,
        serverId: tool.serverId,
        riskLevel,
        approved: true,
        success: false,
        durationMs: Date.now() - startTime,
        error: message,
        timestamp: new Date().toISOString(),
      });
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
    if (transport?.status !== 'connected') return [];

    try {
      const response = await transport.send({
        jsonrpc: '2.0',
        id: `discover-${serverId}-${Date.now()}`,
        method: 'tools/list',
      });

      if (!response || response.error || !response.result) return [];

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
          riskLevel: (t['riskLevel'] as BridgeRiskLevel) ?? 'read',
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
  // Health Check Heartbeat
  // --------------------------------------------------------------------------

  /**
   * Start periodic health checks for a connected server.
   * Sends a JSON-RPC ping; consecutive failures trigger error status.
   */
  private startHeartbeat(serverId: string): void {
    this.stopHeartbeat(serverId);
    this.healthFailures.set(serverId, 0);

    const timer = setInterval(async () => {
      const transport = this.transports.get(serverId);
      if (transport?.status !== 'connected') {
        this.stopHeartbeat(serverId);
        return;
      }

      try {
        await transport.send({
          jsonrpc: '2.0',
          id: `heartbeat-${serverId}-${Date.now()}`,
          method: 'ping',
        });
        this.healthFailures.set(serverId, 0);
      } catch {
        const failures = (this.healthFailures.get(serverId) ?? 0) + 1;
        this.healthFailures.set(serverId, failures);

        if (failures >= this.healthConfig.maxFailures) {
          this.registry.updateStatus(
            serverId,
            'error',
            `Health check failed ${failures} consecutive times`,
          );
          this.stopHeartbeat(serverId);
        }
      }
    }, this.healthConfig.intervalMs);

    this.healthTimers.set(serverId, timer);
  }

  /**
   * Stop heartbeat for a server.
   */
  private stopHeartbeat(serverId: string): void {
    const timer = this.healthTimers.get(serverId);
    if (timer) {
      clearInterval(timer);
      this.healthTimers.delete(serverId);
    }
    this.healthFailures.delete(serverId);
  }

  /**
   * Get current health failure count for a server (for testing/monitoring).
   */
  getHealthFailures(serverId: string): number {
    return this.healthFailures.get(serverId) ?? 0;
  }

  // --------------------------------------------------------------------------
  // Resource & Prompt Discovery
  // --------------------------------------------------------------------------

  /**
   * List resources from a connected server via JSON-RPC.
   */
  private async listServerResources(serverId: string): Promise<MCPResource[]> {
    const transport = this.transports.get(serverId);
    if (transport?.status !== 'connected') return [];

    try {
      const response = await transport.send({
        jsonrpc: '2.0',
        id: `discover-resources-${serverId}-${Date.now()}`,
        method: 'resources/list',
      });

      if (!response || response.error || !response.result) return [];
      const items = response.result;
      if (!Array.isArray(items)) return [];

      return items
        .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map((r) => ({
          uri: coerceUnknownToString(r['uri']),
          name: coerceUnknownToString(r['name']),
          description: coerceUnknownToString(r['description']),
          mimeType: typeof r['mimeType'] === 'string' ? r['mimeType'] : undefined,
          serverId,
        }))
        .filter((r) => r.uri.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * List prompts from a connected server via JSON-RPC.
   */
  private async listServerPrompts(serverId: string): Promise<MCPPrompt[]> {
    const transport = this.transports.get(serverId);
    if (transport?.status !== 'connected') return [];

    try {
      const response = await transport.send({
        jsonrpc: '2.0',
        id: `discover-prompts-${serverId}-${Date.now()}`,
        method: 'prompts/list',
      });

      if (!response || response.error || !response.result) return [];
      const items = response.result;
      if (!Array.isArray(items)) return [];

      return items
        .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
        .map((p) => ({
          name: coerceUnknownToString(p['name']),
          description: coerceUnknownToString(p['description']),
          serverId,
          arguments: Array.isArray(p['arguments'])
            ? (p['arguments'] as Array<Record<string, unknown>>).map((a) => ({
                name: coerceUnknownToString(a['name']),
                description: coerceUnknownToString(a['description']),
                required: Boolean(a['required']),
              }))
            : [],
        }))
        .filter((p) => p.name.length > 0);
    } catch {
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Audit Trail
  // --------------------------------------------------------------------------

  /**
   * Emit an audit entry to the registered callback.
   * Fire-and-forget: audit failures never block tool execution.
   */
  private emitAudit(entry: AuditEntry): void {
    if (!this.auditCallback) return;
    try {
      this.auditCallback(entry);
    } catch {
      // Audit persistence failures are silent — never block the pipeline
    }
  }
}

function coerceUnknownToString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return fallback;
  return fallback;
}
