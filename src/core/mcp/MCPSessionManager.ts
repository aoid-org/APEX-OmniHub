/**
 * MCPSessionManager — Health monitoring & capability cache management
 * @version 1.0.0
 * @module src/core/mcp/MCPSessionManager
 *
 * Single-responsibility: health check heartbeats, resource/prompt discovery
 * caching, and capability negotiation orchestration.
 * Extracted from MCPHostManager to prevent god-class accumulation.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { MCPServerRegistry } from './MCPServerRegistry';
import { MCPToolDiscovery, type MCPToolSchema } from './MCPToolDiscovery';
import type { MCPTransport } from './MCPTransport';
import type { BridgeRiskLevel } from './MCPHostManager';

// ============================================================================
// Types
// ============================================================================

export interface HealthCheckConfig {
  /** Interval between heartbeats in milliseconds (default: 60_000) */
  intervalMs: number;
  /** Maximum consecutive failures before marking server as error (default: 3) */
  maxFailures: number;
}

export const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = { intervalMs: 60_000, maxFailures: 3 };

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
// Session Manager
// ============================================================================

export class MCPSessionManager {
  private readonly healthTimers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly healthFailures = new Map<string, number>();
  private healthConfig: HealthCheckConfig = DEFAULT_HEALTH_CONFIG;

  /** Discovered resources indexed by serverId */
  readonly resources = new Map<string, readonly MCPResource[]>();
  /** Discovered prompts indexed by serverId */
  readonly prompts = new Map<string, readonly MCPPrompt[]>();

  // --------------------------------------------------------------------------
  // Health Check Configuration
  // --------------------------------------------------------------------------

  /** Configure health check heartbeat parameters. */
  setHealthCheckConfig(config: Partial<HealthCheckConfig>): void {
    this.healthConfig = { ...DEFAULT_HEALTH_CONFIG, ...config };
  }

  /** Get current health failure count for a server. */
  getHealthFailures(serverId: string): number {
    return this.healthFailures.get(serverId) ?? 0;
  }

  // --------------------------------------------------------------------------
  // Heartbeat Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Start periodic health checks for a connected server.
   * Sends a JSON-RPC ping; consecutive failures trigger error status.
   */
  startHeartbeat(serverId: string, transport: MCPTransport, registry: MCPServerRegistry): void {
    this.stopHeartbeat(serverId);
    this.healthFailures.set(serverId, 0);

    const timer = setInterval(async () => {
      if (transport.status !== 'connected') {
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
          registry.updateStatus(
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

  /** Stop heartbeat for a server. */
  stopHeartbeat(serverId: string): void {
    const timer = this.healthTimers.get(serverId);
    if (timer) {
      clearInterval(timer);
      this.healthTimers.delete(serverId);
    }
    this.healthFailures.delete(serverId);
  }

  // --------------------------------------------------------------------------
  // Capability Discovery
  // --------------------------------------------------------------------------

  /**
   * Negotiate capabilities for a server based on its declared capabilities.
   * Discovers tools, resources, and prompts as declared.
   */
  async negotiateCapabilities(
    serverId: string,
    capabilities: string[],
    transport: MCPTransport,
    discovery: MCPToolDiscovery,
  ): Promise<void> {
    if (capabilities.includes('tools')) {
      const toolsResponse = await this.listServerTools(serverId, transport);
      if (toolsResponse.length > 0) {
        discovery.registerTools(serverId, toolsResponse);
      }
    }

    if (capabilities.includes('resources')) {
      const resourcesResponse = await this.listServerResources(serverId, transport);
      if (resourcesResponse.length > 0) {
        this.resources.set(serverId, resourcesResponse);
      }
    }

    if (capabilities.includes('prompts')) {
      const promptsResponse = await this.listServerPrompts(serverId, transport);
      if (promptsResponse.length > 0) {
        this.prompts.set(serverId, promptsResponse);
      }
    }
  }

  /** Clear all capability caches for a server. */
  clearCapabilities(serverId: string, discovery: MCPToolDiscovery): void {
    discovery.clearServer(serverId);
    this.resources.delete(serverId);
    this.prompts.delete(serverId);
  }

  // --------------------------------------------------------------------------
  // JSON-RPC Discovery Calls
  // --------------------------------------------------------------------------

  private async listServerTools(serverId: string, transport: MCPTransport): Promise<MCPToolSchema[]> {
    if (transport.status !== 'connected') return [];

    try {
      const response = await transport.send({
        jsonrpc: '2.0',
        id: `discover-${serverId}-${Date.now()}`,
        method: 'tools/list',
      });

      if (!response || response.error || !response.result) return [];
      const tools = response.result;
      if (!Array.isArray(tools)) return [];

      return tools
        .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
        .map((t) => ({
          name: coerceUnknownToString(t['name']),
          description: coerceUnknownToString(t['description']),
          serverId,
          parameters: Array.isArray(t['parameters'])
            ? (t['parameters'] as Array<Record<string, unknown>>).map((p) => ({
                name: coerceUnknownToString(p['name']),
                type: coerceUnknownToString(p['type'], 'string'),
                description: coerceUnknownToString(p['description']),
                required: Boolean(p['required']),
              }))
            : [],
          riskLevel: (t['riskLevel'] as BridgeRiskLevel) ?? 'read',
        }))
        .filter((t) => t.name.length > 0);
    } catch {
      return [];
    }
  }

  private async listServerResources(serverId: string, transport: MCPTransport): Promise<MCPResource[]> {
    if (transport.status !== 'connected') return [];

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

  private async listServerPrompts(serverId: string, transport: MCPTransport): Promise<MCPPrompt[]> {
    if (transport.status !== 'connected') return [];

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
}

// ============================================================================
// Utility
// ============================================================================

function coerceUnknownToString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return fallback;
  return fallback;
}
