/**
 * MCP Server Configuration — Environment-Aware Registry
 * @version 1.0.0
 * @module src/core/mcp/mcp.config
 *
 * Zod-validated configuration schema for MCP server connections.
 * API keys are supplied only by the backend MCP proxy, never the client bundle.
 *
 * APEX STANDARDS ENFORCED:
 * - Zod boundary validation on all config
 * - Secret-safe: client registry never reads privileged environment variables
 * - Fail-closed: invalid config rejected at parse time
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';

// ============================================================================
// Transport Types
// ============================================================================

export const MCPTransportType = z.enum(['stdio', 'sse', 'streamable-http']);
export type MCPTransportType = z.infer<typeof MCPTransportType>;

// ============================================================================
// Capability Types
// ============================================================================

export const MCPCapability = z.enum(['tools', 'resources', 'prompts']);
export type MCPCapability = z.infer<typeof MCPCapability>;

// ============================================================================
// Server Entry Schema
// ============================================================================

export const MCPServerEntrySchema = z.object({
  /** Human-readable server name */
  name: z.string().min(1),
  /** Executable command (e.g., "npx") */
  command: z.string().min(1),
  /** Command arguments */
  args: z.array(z.string()),
  /** Non-secret client metadata only; backend proxy injects privileged env. */
  env: z.record(z.string()),
  /** Transport protocol */
  transport: MCPTransportType,
  /** Server capabilities */
  capabilities: z.array(MCPCapability).min(1),
  /** Whether this server is enabled */
  enabled: z.boolean().default(true),
  /** Connection timeout in milliseconds */
  timeoutMs: z.number().int().positive().default(30_000),
  /** Maximum concurrent requests */
  maxConcurrent: z.number().int().positive().default(5),
});

export type MCPServerEntry = z.infer<typeof MCPServerEntrySchema>;

// ============================================================================
// Full Config Schema
// ============================================================================

export const MCPConfigSchema = z.object({
  /** Map of server ID → server config */
  servers: z.record(MCPServerEntrySchema),
  /** Global defaults */
  defaults: z
    .object({
      timeoutMs: z.number().int().positive().default(30_000),
      maxConcurrent: z.number().int().positive().default(5),
    })
    .default({}),
});

export type MCPConfig = z.infer<typeof MCPConfigSchema>;

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default MCP server configuration.
 * Privileged environment variables are resolved by the backend mcp-proxy.
 */
export function getDefaultConfig(): MCPConfig {
  return MCPConfigSchema.parse({
    servers: {
      firecrawl: {
        name: 'Firecrawl Web Scraper',
        command: 'npx',
        args: ['-y', 'firecrawl-mcp'],
        env: {},
        transport: 'stdio',
        capabilities: ['tools'],
      },
      'google-workspace': {
        name: 'Google Workspace',
        command: 'npx',
        args: ['-y', '@anthropic/google-workspace-mcp'],
        env: {},
        transport: 'stdio',
        capabilities: ['tools', 'resources'],
      },
      github: {
        name: 'GitHub',
        command: 'npx',
        args: ['-y', '@anthropic/github-mcp'],
        env: {},
        transport: 'stdio',
        capabilities: ['tools', 'resources'],
      },
      supabase: {
        name: 'Supabase',
        command: 'npx',
        args: ['-y', '@supabase/mcp-server'],
        env: {},
        transport: 'stdio',
        capabilities: ['tools', 'resources'],
      },
    },
    defaults: {
      timeoutMs: 30_000,
      maxConcurrent: 5,
    },
  });
}
