/**
 * OmniMCP Unit Tests — MCPHostManager + MCPServerRegistry + MCPToolDiscovery
 * @module tests/core/mcp/MCPHostManager
 *
 * Validates:
 *  - Registry loading and server filtering
 *  - Tool discovery caching and search
 *  - Approval gating for write/destructive operations
 *  - Host manager initialization and transport creation
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MCPServerRegistry } from '../../../src/core/mcp/MCPServerRegistry';
import {
  MCPToolDiscovery,
  type MCPToolSchema,
} from '../../../src/core/mcp/MCPToolDiscovery';
import {
  MCPHostManager,
  ToolInvocationSchema,
} from '../../../src/core/mcp/MCPHostManager';
import {
  MCPConfigSchema,
  getDefaultConfig,
} from '../../../src/core/mcp/mcp.config';
import {
  StdioTransport,
  StreamableHTTPTransport,
  createTransport,
  JsonRpcRequestSchema,
  isTransientError,
  withRetry,
} from '../../../src/core/mcp/MCPTransport';

// ============================================================================
// Helpers
// ============================================================================

function makeTestConfig() {
  return MCPConfigSchema.parse({
    servers: {
      'test-scraper': {
        name: 'Test Scraper',
        command: 'npx',
        args: ['-y', 'test-mcp'],
        env: { API_KEY: 'test-key' },
        transport: 'stdio',
        capabilities: ['tools'],
      },
      'test-workspace': {
        name: 'Test Workspace',
        command: 'npx',
        args: ['-y', 'workspace-mcp'],
        env: { TOKEN: 'ws-token' },
        transport: 'stdio',
        capabilities: ['tools', 'resources'],
        enabled: true,
      },
      'disabled-server': {
        name: 'Disabled Server',
        command: 'npx',
        args: [],
        env: {},
        transport: 'stdio',
        capabilities: ['tools'],
        enabled: false,
      },
    },
  });
}

function makeTools(serverId: string): MCPToolSchema[] {
  return [
    {
      name: `${serverId}.read_data`,
      description: 'Read data from the server',
      serverId,
      parameters: [
        { name: 'query', type: 'string', description: 'Search query', required: true },
      ],
      riskLevel: 'read',
    },
    {
      name: `${serverId}.write_data`,
      description: 'Write data to the server',
      serverId,
      parameters: [
        { name: 'data', type: 'object', description: 'Data to write', required: true },
      ],
      riskLevel: 'write',
    },
    {
      name: `${serverId}.delete_all`,
      description: 'Delete all data (destructive)',
      serverId,
      parameters: [],
      riskLevel: 'destructive',
    },
  ];
}

// ============================================================================
// MCPServerRegistry
// ============================================================================

describe('MCPServerRegistry', () => {
  let registry: MCPServerRegistry;

  beforeEach(() => {
    registry = new MCPServerRegistry();
    registry.load(makeTestConfig());
  });

  describe('load', () => {
    it('loads all servers from config', () => {
      expect(registry.size).toBe(3);
    });

    it('validates config at boundary', () => {
      expect(() =>
        registry.load(MCPConfigSchema.parse({ servers: {} })),
      ).not.toThrow();
      expect(registry.size).toBe(0);
    });
  });

  describe('getServer', () => {
    it('returns entry for valid server ID', () => {
      const entry = registry.getServer('test-scraper');
      expect(entry).toBeDefined();
      expect(entry?.config.name).toBe('Test Scraper');
      expect(entry?.status).toBe('available');
    });

    it('returns undefined for unknown server ID', () => {
      expect(registry.getServer('nonexistent')).toBeUndefined();
    });
  });

  describe('listServers', () => {
    it('returns all server IDs', () => {
      const ids = registry.listServers();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('test-scraper');
      expect(ids).toContain('disabled-server');
    });
  });

  describe('getServersByCapability', () => {
    it('returns servers with matching capability', () => {
      const results = registry.getServersByCapability('resources');
      expect(results).toHaveLength(1);
      expect(results[0][0]).toBe('test-workspace');
    });

    it('excludes disabled servers', () => {
      const results = registry.getServersByCapability('tools');
      const ids = results.map(([id]) => id);
      expect(ids).not.toContain('disabled-server');
    });
  });

  describe('getEnabledServers', () => {
    it('excludes disabled servers', () => {
      const enabled = registry.getEnabledServers();
      const ids = enabled.map(([id]) => id);
      expect(ids).not.toContain('disabled-server');
      expect(ids).toHaveLength(2);
    });
  });

  describe('updateStatus', () => {
    it('updates server status and clears error on connect', () => {
      registry.updateStatus('test-scraper', 'connected');
      const entry = registry.getServer('test-scraper');
      expect(entry?.status).toBe('connected');
      expect(entry?.lastConnected).not.toBeNull();
      expect(entry?.lastError).toBeNull();
    });

    it('stores error message on failure', () => {
      registry.updateStatus('test-scraper', 'error', 'Connection refused');
      const entry = registry.getServer('test-scraper');
      expect(entry?.status).toBe('error');
      expect(entry?.lastError).toBe('Connection refused');
    });

    it('returns false for unknown server', () => {
      expect(registry.updateStatus('ghost', 'connected')).toBe(false);
    });
  });

  describe('validateServer', () => {
    it('returns null for valid, enabled server', () => {
      expect(registry.validateServer('test-scraper')).toBeNull();
    });

    it('returns error for unknown server', () => {
      expect(registry.validateServer('ghost')).toContain('Unknown server');
    });

    it('returns error for disabled server', () => {
      expect(registry.validateServer('disabled-server')).toContain(
        'disabled',
      );
    });
  });
});

// ============================================================================
// MCPToolDiscovery
// ============================================================================

describe('MCPToolDiscovery', () => {
  let discovery: MCPToolDiscovery;

  beforeEach(() => {
    discovery = new MCPToolDiscovery();
    discovery.registerTools('server-a', makeTools('server-a'));
  });

  describe('registerTools', () => {
    it('indexes tools by name', () => {
      expect(discovery.size).toBe(3);
    });

    it('registers tools from multiple servers', () => {
      discovery.registerTools('server-b', makeTools('server-b'));
      expect(discovery.size).toBe(6);
    });
  });

  describe('searchTools', () => {
    it('finds tools by name keyword', () => {
      const results = discovery.searchTools('read');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('server-a.read_data');
    });

    it('finds tools by description keyword', () => {
      const results = discovery.searchTools('destructive');
      expect(results).toHaveLength(1);
    });

    it('returns empty for no match', () => {
      expect(discovery.searchTools('quantum')).toHaveLength(0);
    });

    it('returns empty for blank query', () => {
      expect(discovery.searchTools('  ')).toHaveLength(0);
    });

    it('is case-insensitive', () => {
      const results = discovery.searchTools('READ');
      expect(results).toHaveLength(1);
    });
  });

  describe('getTool', () => {
    it('returns exact tool by name', () => {
      const tool = discovery.getTool('server-a.write_data');
      expect(tool).toBeDefined();
      expect(tool?.riskLevel).toBe('write');
    });

    it('returns undefined for unknown tool', () => {
      expect(discovery.getTool('nonexistent')).toBeUndefined();
    });
  });

  describe('getToolsByServer', () => {
    it('returns tools for a specific server', () => {
      const tools = discovery.getToolsByServer('server-a');
      expect(tools).toHaveLength(3);
    });

    it('returns empty for unknown server', () => {
      expect(discovery.getToolsByServer('ghost')).toHaveLength(0);
    });
  });

  describe('getToolsByRisk', () => {
    it('filters by risk level', () => {
      const reads = discovery.getToolsByRisk('read');
      expect(reads).toHaveLength(1);
      expect(reads[0].name).toContain('read');

      const destructive = discovery.getToolsByRisk('destructive');
      expect(destructive).toHaveLength(1);
    });
  });

  describe('requiresApproval', () => {
    it('returns false for read operations', () => {
      expect(
        discovery.requiresApproval('server-a.read_data'),
      ).toBe(false);
    });

    it('returns true for write operations', () => {
      expect(
        discovery.requiresApproval('server-a.write_data'),
      ).toBe(true);
    });

    it('returns true for destructive operations', () => {
      expect(
        discovery.requiresApproval('server-a.delete_all'),
      ).toBe(true);
    });

    it('returns true for unknown tools (fail-closed)', () => {
      expect(discovery.requiresApproval('unknown.tool')).toBe(true);
    });
  });

  describe('clearServer', () => {
    it('removes tools for a specific server', () => {
      discovery.clearServer('server-a');
      expect(discovery.size).toBe(0);
      expect(discovery.getTool('server-a.read_data')).toBeUndefined();
    });

    it('handles clearing non-existent server gracefully', () => {
      expect(() => discovery.clearServer('ghost')).not.toThrow();
    });
  });
});

// ============================================================================
// MCPTransport
// ============================================================================

describe('MCPTransport', () => {
  describe('StdioTransport', () => {
    it('starts in disconnected state', () => {
      const transport = new StdioTransport('test-server');
      expect(transport.status).toBe('disconnected');
      expect(transport.type).toBe('stdio');
    });

    it('rejects send when not connected', async () => {
      const transport = new StdioTransport('test-server');
      await expect(
        transport.send({
          jsonrpc: '2.0',
          id: '1',
          method: 'test',
        }),
      ).rejects.toThrow('Cannot send');
    });
  });

  describe('StreamableHTTPTransport', () => {
    it('starts in disconnected state', () => {
      const transport = new StreamableHTTPTransport(
        'https://example.com/mcp',
      );
      expect(transport.status).toBe('disconnected');
      expect(transport.type).toBe('streamable-http');
    });

    it('rejects send when not connected', async () => {
      const transport = new StreamableHTTPTransport(
        'https://example.com/mcp',
      );
      await expect(
        transport.send({
          jsonrpc: '2.0',
          id: '1',
          method: 'test',
        }),
      ).rejects.toThrow('Cannot send');
    });
  });

  describe('createTransport', () => {
    it('creates StdioTransport for stdio type', () => {
      const transport = createTransport('stdio', 'test-server');
      expect(transport.type).toBe('stdio');
    });

    it('creates StreamableHTTPTransport for streamable-http type', () => {
      const transport = createTransport('streamable-http', 'test-server', {
        endpoint: 'https://example.com/mcp',
      });
      expect(transport.type).toBe('streamable-http');
    });

    it('throws when streamable-http has no endpoint', () => {
      expect(() =>
        createTransport('streamable-http', 'test-server'),
      ).toThrow('endpoint');
    });

    it('throws when sse has no endpoint', () => {
      expect(() => createTransport('sse', 'test-server')).toThrow(
        'endpoint',
      );
    });
  });
});

// ============================================================================
// Retry & Transient Error Detection (v1.1.0)
// ============================================================================

describe('isTransientError', () => {
  it('returns true for TypeError (fetch network failure)', () => {
    expect(isTransientError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('returns true for timeout errors', () => {
    expect(isTransientError(new Error('Request timeout'))).toBe(true);
  });

  it('returns true for ECONNREFUSED', () => {
    expect(isTransientError(new Error('ECONNREFUSED'))).toBe(true);
  });

  it('returns true for 5xx status codes', () => {
    expect(isTransientError(new Error('RPC failed: 502'))).toBe(true);
    expect(isTransientError(new Error('RPC failed: 503'))).toBe(true);
  });

  it('returns false for 4xx status codes', () => {
    expect(isTransientError(new Error('RPC failed: 400'))).toBe(false);
    expect(isTransientError(new Error('RPC failed: 401'))).toBe(false);
  });

  it('returns false for non-transient errors', () => {
    expect(isTransientError(new Error('Unknown tool: foo'))).toBe(false);
    expect(isTransientError(new Error('Validation failed'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isTransientError('string')).toBe(false);
    expect(isTransientError(null)).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      return 'ok';
    }, { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 });

    expect(result).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries on transient errors', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new TypeError('Failed to fetch');
      return 'recovered';
    }, { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 });

    expect(result).toBe('recovered');
    expect(calls).toBe(3);
  });

  it('throws immediately on non-transient errors', async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw new Error('RPC failed: 400');
      }, { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 10 }),
    ).rejects.toThrow('400');

    expect(calls).toBe(1); // No retry for 4xx
  });

  it('throws after exhausting retries', async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw new TypeError('network error');
      }, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10 }),
    ).rejects.toThrow('network error');

    expect(calls).toBe(3); // 1 initial + 2 retries
  });
});

// ============================================================================
// JSON-RPC Schemas
// ============================================================================

describe('JSON-RPC Schemas', () => {
  describe('JsonRpcRequestSchema', () => {
    it('validates a correct request', () => {
      const result = JsonRpcRequestSchema.safeParse({
        jsonrpc: '2.0',
        id: 'req-1',
        method: 'tools/list',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing method', () => {
      const result = JsonRpcRequestSchema.safeParse({
        jsonrpc: '2.0',
        id: 'req-1',
      });
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// MCPHostManager
// ============================================================================

describe('MCPHostManager', () => {
  let host: MCPHostManager;

  beforeEach(() => {
    MCPHostManager.resetInstance();
    host = MCPHostManager.getInstance();
  });

  afterEach(() => {
    MCPHostManager.resetInstance();
  });

  describe('getInstance', () => {
    it('returns the same singleton', () => {
      const a = MCPHostManager.getInstance();
      const b = MCPHostManager.getInstance();
      expect(a).toBe(b);
    });

    it('returns new instance after reset', () => {
      const a = MCPHostManager.getInstance();
      MCPHostManager.resetInstance();
      const b = MCPHostManager.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('initialize', () => {
    it('loads servers and creates transports', () => {
      const count = host.initialize(makeTestConfig());
      expect(count).toBe(3);
      expect(host.registry.size).toBe(3);
    });

    it('creates transports only for enabled servers', () => {
      host.initialize(makeTestConfig());
      expect(host.getTransport('test-scraper')).toBeDefined();
      expect(host.getTransport('test-workspace')).toBeDefined();
      expect(host.getTransport('disabled-server')).toBeUndefined();
    });
  });

  describe('ToolInvocationSchema', () => {
    it('validates valid invocation', () => {
      const result = ToolInvocationSchema.safeParse({
        toolName: 'server.read_data',
        params: { query: 'test' },
        correlationId: 'corr-1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty toolName', () => {
      const result = ToolInvocationSchema.safeParse({
        toolName: '',
        params: {},
        correlationId: 'corr-1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('invokeTool', () => {
    it('returns error for unknown tool', async () => {
      host.initialize(makeTestConfig());
      const result = await host.invokeTool({
        toolName: 'nonexistent.tool',
        params: {},
        correlationId: 'corr-1',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
      expect(result.correlationId).toBe('corr-1');
    });

    it('denies risky tool when no approval callback set (fail-closed)', async () => {
      host.initialize(makeTestConfig());
      host.discovery.registerTools('test-scraper', makeTools('test-scraper'));

      const result = await host.invokeTool({
        toolName: 'test-scraper.write_data',
        params: { data: {} },
        correlationId: 'corr-2',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('denied');
    });

    it('respects approval callback decision', async () => {
      host.initialize(makeTestConfig());
      host.discovery.registerTools('test-scraper', makeTools('test-scraper'));

      // Approval denied
      host.setApprovalCallback(async () => false);
      const denied = await host.invokeTool({
        toolName: 'test-scraper.write_data',
        params: { data: {} },
        correlationId: 'corr-3',
      });
      expect(denied.success).toBe(false);
      expect(denied.error).toContain('denied');
    });
  });

  describe('MCPConfig', () => {
    it('validates test config schema', () => {
      const result = MCPConfigSchema.safeParse(makeTestConfig());
      expect(result.success).toBe(true);
    });

    it('keeps default MCP credentials out of the client config', () => {
      const config = getDefaultConfig();
      const envValues = Object.values(config.servers).flatMap((server) =>
        Object.entries(server.env),
      );

      expect(envValues).toHaveLength(0);
    });
  });

  // ==========================================================================
  // v1.1.0 — Audit Trail
  // ==========================================================================

  describe('audit trail', () => {
    it('emits audit entry on successful tool invocation path', async () => {
      host.initialize(makeTestConfig());
      host.discovery.registerTools('test-scraper', makeTools('test-scraper'));

      const entries: Array<Record<string, unknown>> = [];
      host.setAuditCallback((entry) => {
        entries.push(entry as unknown as Record<string, unknown>);
      });

      // Will fail because transport not connected, but audit should still fire
      await host.invokeTool({
        toolName: 'test-scraper.read_data',
        params: { query: 'test' },
        correlationId: 'audit-1',
      });

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        correlationId: 'audit-1',
        toolName: 'test-scraper.read_data',
        serverId: 'test-scraper',
        riskLevel: 'read',
      });
      expect(entries[0]).toHaveProperty('timestamp');
      expect(entries[0]).toHaveProperty('durationMs');
    });

    it('emits audit entry for unknown tools', async () => {
      host.initialize(makeTestConfig());

      const entries: Array<Record<string, unknown>> = [];
      host.setAuditCallback((entry) => {
        entries.push(entry as unknown as Record<string, unknown>);
      });

      await host.invokeTool({
        toolName: 'nonexistent.tool',
        params: {},
        correlationId: 'audit-2',
      });

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        success: false,
        approved: false,
        error: expect.stringContaining('Unknown tool'),
      });
    });

    it('emits audit entry when approval is denied', async () => {
      host.initialize(makeTestConfig());
      host.discovery.registerTools('test-scraper', makeTools('test-scraper'));
      host.setApprovalCallback(async () => false);

      const entries: Array<Record<string, unknown>> = [];
      host.setAuditCallback((entry) => {
        entries.push(entry as unknown as Record<string, unknown>);
      });

      await host.invokeTool({
        toolName: 'test-scraper.write_data',
        params: { data: {} },
        correlationId: 'audit-3',
      });

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        approved: false,
        success: false,
        riskLevel: 'write',
      });
    });



    it('fails closed for destructive tool names even when declared read-only', async () => {
      host.initialize(makeTestConfig());
      host.discovery.registerTools('test-scraper', [{
        name: 'test-scraper.delete_preview',
        description: 'Deletes a preview artifact',
        serverId: 'test-scraper',
        parameters: [],
        riskLevel: 'read',
      }]);

      const entries: Array<Record<string, unknown>> = [];
      host.setAuditCallback((entry) => {
        entries.push(entry as unknown as Record<string, unknown>);
      });

      const result = await host.invokeTool({
        toolName: 'test-scraper.delete_preview',
        params: {},
        correlationId: 'audit-destructive-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('denied');
      expect(entries[0]).toMatchObject({
        correlationId: 'audit-destructive-1',
        approved: false,
        riskLevel: 'destructive',
      });
    });

    it('audit callback failures do not throw', async () => {
      host.initialize(makeTestConfig());
      host.discovery.registerTools('test-scraper', makeTools('test-scraper'));

      host.setAuditCallback(() => {
        throw new Error('Audit storage down');
      });

      // Should not throw despite audit callback failure
      const result = await host.invokeTool({
        toolName: 'test-scraper.read_data',
        params: { query: 'test' },
        correlationId: 'audit-4',
      });

      expect(result.correlationId).toBe('audit-4');
    });
  });

  // ==========================================================================
  // v1.1.0 — Health Check
  // ==========================================================================

  describe('health check', () => {
    it('tracks health failures', () => {
      host.initialize(makeTestConfig());
      expect(host.getHealthFailures('test-scraper')).toBe(0);
      expect(host.getHealthFailures('nonexistent')).toBe(0);
    });

    it('accepts custom health config', () => {
      host.setHealthCheckConfig({ intervalMs: 5_000, maxFailures: 5 });
      // No throw — config accepted
      expect(host).toBeDefined();
    });
  });

  // ==========================================================================
  // v1.1.0 — Resource & Prompt Caches
  // ==========================================================================

  describe('resource and prompt caches', () => {
    it('resources map is initialized empty', () => {
      expect(host.resources.size).toBe(0);
    });

    it('prompts map is initialized empty', () => {
      expect(host.prompts.size).toBe(0);
    });

    it('disconnect clears resource and prompt caches', async () => {
      // Use a server that has no transport (never initialized) to avoid fetch
      host.resources.set('ghost-server', [
        { uri: 'test://data', name: 'Test', description: 'Test resource', serverId: 'ghost-server' },
      ]);
      host.prompts.set('ghost-server', [
        { name: 'greet', description: 'Greeting prompt', serverId: 'ghost-server', arguments: [] },
      ]);

      await host.disconnectServer('ghost-server');

      expect(host.resources.has('ghost-server')).toBe(false);
      expect(host.prompts.has('ghost-server')).toBe(false);
    });
  });
});
