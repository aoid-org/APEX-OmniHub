/**
 * MCPToolDiscovery — "Tool Search Tool" Meta-Tool
 * @version 1.0.0
 * @module src/core/mcp/MCPToolDiscovery
 *
 * Implements the "Tool Search Tool" pattern from the MCP specification.
 * Only this meta-tool is loaded at init — actual tool schemas are
 * fetched on-demand to preserve context window budget.
 *
 * APEX STANDARDS ENFORCED:
 * - Lazy Loading: Tool schemas fetched only when needed
 * - Deterministic: Same query always returns same cached result
 * - Fail-Closed: Unknown tools return empty, never throw
 * - Cache-First: Discovered tools cached for session lifetime
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';

// ============================================================================
// Tool Schema Types (MCP Specification)
// ============================================================================

export const MCPToolParameterSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string(),
  required: z.boolean().default(false),
});

export type MCPToolParameter = z.infer<typeof MCPToolParameterSchema>;

export const MCPToolSchemaEntry = z.object({
  /** Fully qualified tool name (e.g., "firecrawl.scrape") */
  name: z.string().min(1),
  /** Human-readable description */
  description: z.string(),
  /** Server ID that provides this tool */
  serverId: z.string().min(1),
  /** Input parameter schema */
  parameters: z.array(MCPToolParameterSchema),
  /** Risk level for approval gating */
  riskLevel: z.enum(['read', 'write', 'destructive']).default('read'),
});

export type MCPToolSchema = z.infer<typeof MCPToolSchemaEntry>;

// ============================================================================
// Discovery Cache
// ============================================================================

export class MCPToolDiscovery {
  /** Cache: serverId → list of tool schemas */
  private readonly cache = new Map<string, readonly MCPToolSchema[]>();
  /** Flat index: toolName → MCPToolSchema */
  private readonly toolIndex = new Map<string, MCPToolSchema>();

  /**
   * Register tool schemas discovered from a server.
   * Called after successful capability negotiation.
   */
  registerTools(serverId: string, tools: readonly MCPToolSchema[]): void {
    const validated = tools.map((t) => MCPToolSchemaEntry.parse(t));
    this.cache.set(serverId, validated);

    for (const tool of validated) {
      this.toolIndex.set(tool.name, tool);
    }
  }

  /**
   * Search for tools by keyword in name or description.
   * This IS the "Tool Search Tool" — the only tool loaded at init.
   */
  searchTools(query: string): readonly MCPToolSchema[] {
    if (!query.trim()) return [];

    const normalized = query.toLowerCase();
    const results: MCPToolSchema[] = [];

    for (const tool of this.toolIndex.values()) {
      const nameMatch = tool.name.toLowerCase().includes(normalized);
      const descMatch = tool.description.toLowerCase().includes(normalized);
      if (nameMatch || descMatch) {
        results.push(tool);
      }
    }

    return results;
  }

  /**
   * Get a specific tool schema by exact name.
   * Returns undefined if not found — fail-closed.
   */
  getTool(toolName: string): MCPToolSchema | undefined {
    return this.toolIndex.get(toolName);
  }

  /**
   * Get all tools from a specific server.
   */
  getToolsByServer(serverId: string): readonly MCPToolSchema[] {
    return this.cache.get(serverId) ?? [];
  }

  /**
   * Get all discovered tools across all servers.
   */
  getAllTools(): readonly MCPToolSchema[] {
    return Array.from(this.toolIndex.values());
  }

  /**
   * Get tools filtered by risk level.
   */
  getToolsByRisk(
    riskLevel: 'read' | 'write' | 'destructive',
  ): readonly MCPToolSchema[] {
    return Array.from(this.toolIndex.values()).filter(
      (t) => t.riskLevel === riskLevel,
    );
  }

  /**
   * Check if a tool requires approval (write or destructive operations).
   */
  requiresApproval(toolName: string): boolean {
    const tool = this.toolIndex.get(toolName);
    if (!tool) return true; // Unknown tool = require approval (fail-closed)
    return tool.riskLevel !== 'read';
  }

  /**
   * Clear cache for a specific server (on disconnect/error).
   */
  clearServer(serverId: string): void {
    const tools = this.cache.get(serverId);
    if (tools) {
      for (const tool of tools) {
        this.toolIndex.delete(tool.name);
      }
      this.cache.delete(serverId);
    }
  }

  /**
   * Get the count of discovered tools.
   */
  get size(): number {
    return this.toolIndex.size;
  }
}
