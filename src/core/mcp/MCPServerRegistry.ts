/**
 * MCPServerRegistry — Config-Driven MCP Server Registry
 * @version 1.0.0
 * @module src/core/mcp/MCPServerRegistry
 *
 * Manages the registry of available MCP servers. Config-driven with
 * Zod boundary validation. Provides lookup by ID, capability, and status.
 *
 * APEX STANDARDS ENFORCED:
 * - Deterministic: Static config, no runtime mutations to registry data
 * - Zod-validated: All entries validated at parse time
 * - Fail-closed: Unknown server IDs return undefined, never throw
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';
import {
  MCPConfigSchema,
  getDefaultConfig,
  type MCPConfig,
  type MCPServerEntry,
  type MCPCapability,
} from './mcp.config';

// ============================================================================
// Server Status
// ============================================================================

export type ServerStatus = 'available' | 'connected' | 'error' | 'disabled';

export interface ServerRegistryEntry {
  /** Server configuration (immutable after load) */
  readonly config: MCPServerEntry;
  /** Current connection status */
  status: ServerStatus;
  /** Last error message (null if no error) */
  lastError: string | null;
  /** Timestamp of last successful connection */
  lastConnected: string | null;
}

// ============================================================================
// Registry
// ============================================================================

export class MCPServerRegistry {
  private readonly entries = new Map<string, ServerRegistryEntry>();

  /**
   * Load registry from configuration.
   * Validates config at boundary — invalid entries are rejected.
   */
  load(config?: MCPConfig): number {
    const resolved = config ?? getDefaultConfig();
    const validated = MCPConfigSchema.parse(resolved);

    this.entries.clear();
    let loadedCount = 0;

    for (const [id, serverConfig] of Object.entries(validated.servers)) {
      this.entries.set(id, {
        config: serverConfig,
        status: serverConfig.enabled ? 'available' : 'disabled',
        lastError: null,
        lastConnected: null,
      });
      loadedCount++;
    }

    return loadedCount;
  }

  /**
   * Get a server entry by ID.
   * Returns undefined if not found — fail-closed.
   */
  getServer(serverId: string): ServerRegistryEntry | undefined {
    return this.entries.get(serverId);
  }

  /**
   * List all registered server IDs.
   */
  listServers(): readonly string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * List servers that support a specific capability.
   */
  getServersByCapability(
    capability: MCPCapability,
  ): readonly [string, ServerRegistryEntry][] {
    const result: [string, ServerRegistryEntry][] = [];
    for (const [id, entry] of this.entries) {
      if (
        entry.status !== 'disabled' &&
        entry.config.capabilities.includes(capability)
      ) {
        result.push([id, entry]);
      }
    }
    return result;
  }

  /**
   * List all servers that are currently enabled.
   */
  getEnabledServers(): readonly [string, ServerRegistryEntry][] {
    const result: [string, ServerRegistryEntry][] = [];
    for (const [id, entry] of this.entries) {
      if (entry.status !== 'disabled') {
        result.push([id, entry]);
      }
    }
    return result;
  }

  /**
   * Update the status of a server.
   */
  updateStatus(
    serverId: string,
    status: ServerStatus,
    error?: string,
  ): boolean {
    const entry = this.entries.get(serverId);
    if (!entry) return false;

    entry.status = status;
    if (error !== undefined) {
      entry.lastError = error;
    }
    if (status === 'connected') {
      entry.lastConnected = new Date().toISOString();
      entry.lastError = null;
    }
    return true;
  }

  /**
   * Get the total count of registered servers.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Validate a server ID exists and is enabled.
   * Returns null if valid, or a string describing the issue.
   */
  validateServer(serverId: string): string | null {
    const entry = this.entries.get(serverId);
    if (!entry) return `Unknown server: ${serverId}`;
    if (entry.status === 'disabled') return `Server is disabled: ${serverId}`;
    return null;
  }
}

// ============================================================================
// Schema for external registry queries
// ============================================================================

export const ServerInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['available', 'connected', 'error', 'disabled']),
  capabilities: z.array(z.string()),
  transport: z.string(),
});

export type ServerInfo = z.infer<typeof ServerInfoSchema>;
