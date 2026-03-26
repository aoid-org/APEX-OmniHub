/**
 * MCPConnectionManager — Transport lifecycle management
 * @version 1.0.0
 * @module src/core/mcp/MCPConnectionManager
 *
 * Single-responsibility: create, connect, disconnect, and retrieve MCP transports.
 * Extracted from MCPHostManager to prevent god-class accumulation.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { MCPServerRegistry } from './MCPServerRegistry';
import {
  createTransport,
  type MCPTransport,
} from './MCPTransport';
import type { MCPConfig } from './mcp.config';

export class MCPConnectionManager {
  private readonly transportMap = new Map<string, MCPTransport>();

  /**
   * Create transports for all enabled servers in the registry.
   * Returns the number of servers loaded.
   */
  initializeTransports(registry: MCPServerRegistry, config?: MCPConfig): number {
    const count = registry.load(config);

    for (const serverId of registry.listServers()) {
      const entry = registry.getServer(serverId);
      if (entry && entry.status !== 'disabled') {
        const transport = createTransport(
          entry.config.transport,
          serverId,
        );
        this.transportMap.set(serverId, transport);
      }
    }

    return count;
  }

  /**
   * Establish transport-level connection for a server.
   * Validates via registry before connecting.
   */
  async connect(serverId: string, registry: MCPServerRegistry): Promise<void> {
    const validation = registry.validateServer(serverId);
    if (validation !== null) {
      throw new Error(validation);
    }

    const transport = this.transportMap.get(serverId);
    if (!transport) {
      throw new Error(`No transport for server: ${serverId}`);
    }

    await transport.connect();
    registry.updateStatus(serverId, 'connected');
  }

  /**
   * Disconnect transport for a server.
   */
  async disconnect(serverId: string, registry: MCPServerRegistry): Promise<void> {
    const transport = this.transportMap.get(serverId);
    if (transport) {
      await transport.disconnect();
      registry.updateStatus(serverId, 'available');
    }
  }

  /** Retrieve a transport by server ID. */
  getTransport(serverId: string): MCPTransport | undefined {
    return this.transportMap.get(serverId);
  }

  /**
   * Backwards-compatible transport registry exposure for tests and legacy callers.
   * Returns the live transport map used by the facade.
   */
  get transports(): Map<string, MCPTransport> {
    return this.transportMap;
  }
}
