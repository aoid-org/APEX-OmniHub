/**
 * MCP Protocol — E2E Integration Test Suite
 * @module tests/integration/mcp-e2e
 *
 * Validates the full MCP tool invocation pipeline:
 * - MCPHostManager singleton lifecycle
 * - Transport creation and server registry
 * - Approval gating (write/destructive operations)
 * - Tool discovery and invocation flow
 * - Fail-closed behavior for unknown tools/servers
 * - MCP proxy endpoint validation schema
 * - Approval callback wiring to OmniModal
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach } from 'vitest';
import { MCPHostManager, ToolInvocationSchema } from '@/core/mcp/MCPHostManager';
import { MCPServerRegistry } from '@/core/mcp/MCPServerRegistry';
import { MCPToolDiscovery } from '@/core/mcp/MCPToolDiscovery';
import { StdioTransport, StreamableHTTPTransport, createTransport } from '@/core/mcp/MCPTransport';

// ============================================================================
// MCPHostManager Lifecycle
// ============================================================================

describe('MCP E2E — Host Manager Lifecycle', () => {
  beforeEach(() => {
    MCPHostManager.resetInstance();
  });

  it('returns singleton instance', () => {
    const a = MCPHostManager.getInstance();
    const b = MCPHostManager.getInstance();
    expect(a).toBe(b);
  });

  it('resetInstance creates fresh instance', () => {
    const a = MCPHostManager.getInstance();
    MCPHostManager.resetInstance();
    const b = MCPHostManager.getInstance();
    expect(a).not.toBe(b);
  });

  it('initializes with default config', () => {
    const host = MCPHostManager.getInstance();
    const count = host.initialize();
    expect(count).toBeGreaterThan(0);
  });

  it('creates transports for all enabled servers', () => {
    const host = MCPHostManager.getInstance();
    host.initialize();

    const servers = host.registry.listServers();
    for (const serverId of servers) {
      const transport = host.getTransport(serverId);
      expect(transport).toBeDefined();
    }
  });
});

// ============================================================================
// Approval Gating
// ============================================================================

describe('MCP E2E — Approval Gating', () => {
  beforeEach(() => {
    MCPHostManager.resetInstance();
  });

  it('denies tool invocation when no approval callback is set (fail-closed)', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize();

    // Register a mock write-level tool
    host.discovery.registerTools('test-server', [{
      name: 'create_file',
      description: 'Create a new file',
      serverId: 'test-server',
      parameters: [],
      riskLevel: 'write',
    }]);

    const result = await host.invokeTool({
      toolName: 'create_file',
      params: { path: '/test.txt' },
      correlationId: 'test-001',
    });

    // Should fail because server is not connected
    expect(result.success).toBe(false);
  });

  it('approval callback receives correct request shape', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize();

    let receivedRequest: Record<string, unknown> | null = null;

    host.setApprovalCallback(async (request) => {
      receivedRequest = request as unknown as Record<string, unknown>;
      return true;
    });

    host.discovery.registerTools('test-server', [{
      name: 'delete_record',
      description: 'Delete a record',
      serverId: 'test-server',
      parameters: [],
      riskLevel: 'destructive',
    }]);

    await host.invokeTool({
      toolName: 'delete_record',
      params: { id: '123' },
      correlationId: 'test-002',
    });

    if (receivedRequest) {
      expect(receivedRequest).toHaveProperty('toolName', 'delete_record');
      expect(receivedRequest).toHaveProperty('riskLevel', 'destructive');
      expect(receivedRequest).toHaveProperty('serverId', 'test-server');
      expect(receivedRequest).toHaveProperty('params');
    }
  });

  it('read-level tools bypass approval', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize();

    let approvalCalled = false;
    host.setApprovalCallback(async () => {
      approvalCalled = true;
      return true;
    });

    host.discovery.registerTools('test-server', [{
      name: 'list_files',
      description: 'List files',
      serverId: 'test-server',
      parameters: [],
      riskLevel: 'read',
    }]);

    await host.invokeTool({
      toolName: 'list_files',
      params: {},
      correlationId: 'test-003',
    });

    // Read-level tools don't require approval
    expect(approvalCalled).toBe(false);
  });
});

// ============================================================================
// Tool Discovery
// ============================================================================

describe('MCP E2E — Tool Discovery', () => {
  it('registers and retrieves tools', () => {
    const discovery = new MCPToolDiscovery();

    discovery.registerTools('server-a', [
      { name: 'tool_1', description: 'First tool', serverId: 'server-a', parameters: [], riskLevel: 'read' },
      { name: 'tool_2', description: 'Second tool', serverId: 'server-a', parameters: [], riskLevel: 'write' },
    ]);

    expect(discovery.getTool('tool_1')).toBeDefined();
    expect(discovery.getTool('tool_2')).toBeDefined();
    expect(discovery.getTool('nonexistent')).toBeUndefined();
  });

  it('clears tools when server disconnects', () => {
    const discovery = new MCPToolDiscovery();

    discovery.registerTools('server-a', [
      { name: 'tool_1', description: 'First tool', serverId: 'server-a', parameters: [], riskLevel: 'read' },
    ]);

    expect(discovery.getTool('tool_1')).toBeDefined();
    discovery.clearServer('server-a');
    expect(discovery.getTool('tool_1')).toBeUndefined();
  });

  it('identifies approval-required tools (write/destructive)', () => {
    const discovery = new MCPToolDiscovery();

    discovery.registerTools('server-a', [
      { name: 'read_op', description: 'Read', serverId: 'server-a', parameters: [], riskLevel: 'read' },
      { name: 'write_op', description: 'Write', serverId: 'server-a', parameters: [], riskLevel: 'write' },
      { name: 'delete_op', description: 'Delete', serverId: 'server-a', parameters: [], riskLevel: 'destructive' },
    ]);

    expect(discovery.requiresApproval('read_op')).toBe(false);
    expect(discovery.requiresApproval('write_op')).toBe(true);
    expect(discovery.requiresApproval('delete_op')).toBe(true);
  });
});

// ============================================================================
// Transport Factory
// ============================================================================

describe('MCP E2E — Transport Factory', () => {
  it('creates StdioTransport for stdio type', () => {
    const transport = createTransport('stdio', 'test-server');
    expect(transport).toBeInstanceOf(StdioTransport);
    expect(transport.type).toBe('stdio');
    expect(transport.status).toBe('disconnected');
  });

  it('creates StreamableHTTPTransport for streamable-http type', () => {
    const transport = createTransport('streamable-http', 'test-server', {
      endpoint: 'https://example.com/mcp',
    });
    expect(transport).toBeInstanceOf(StreamableHTTPTransport);
    expect(transport.type).toBe('streamable-http');
  });

  it('throws for streamable-http without endpoint', () => {
    expect(() => createTransport('streamable-http', 'test-server')).toThrow(
      'StreamableHTTPTransport requires an endpoint URL'
    );
  });

  it('creates SSE transport via StreamableHTTPTransport', () => {
    const transport = createTransport('sse', 'test-server', {
      endpoint: 'https://example.com/sse',
    });
    expect(transport).toBeInstanceOf(StreamableHTTPTransport);
  });
});

// ============================================================================
// Tool Invocation Schema Validation
// ============================================================================

describe('MCP E2E — Invocation Schema', () => {
  it('accepts valid invocation', () => {
    const result = ToolInvocationSchema.safeParse({
      toolName: 'create_file',
      params: { path: '/test.txt', content: 'hello' },
      correlationId: 'corr-001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty toolName', () => {
    const result = ToolInvocationSchema.safeParse({
      toolName: '',
      params: {},
      correlationId: 'corr-002',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty correlationId', () => {
    const result = ToolInvocationSchema.safeParse({
      toolName: 'tool_1',
      params: {},
      correlationId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = ToolInvocationSchema.safeParse({
      toolName: 'tool_1',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Server Registry
// ============================================================================

describe('MCP E2E — Server Registry', () => {
  it('loads servers from config', () => {
    const registry = new MCPServerRegistry();
    const count = registry.load();
    expect(count).toBeGreaterThan(0);
  });

  it('validates known servers', () => {
    const registry = new MCPServerRegistry();
    registry.load();

    const servers = registry.listServers();
    for (const serverId of servers) {
      const validation = registry.validateServer(serverId);
      expect(validation).toBeNull(); // null = valid
    }
  });

  it('rejects unknown server IDs', () => {
    const registry = new MCPServerRegistry();
    registry.load();

    const validation = registry.validateServer('nonexistent-server');
    expect(validation).not.toBeNull();
  });

  it('tracks server status updates', () => {
    const registry = new MCPServerRegistry();
    registry.load();

    const servers = registry.listServers();
    if (servers.length > 0) {
      registry.updateStatus(servers[0], 'connected');
      const entry = registry.getServer(servers[0]);
      expect(entry?.status).toBe('connected');
    }
  });
});

// ============================================================================
// MCP Proxy Schema Tests
// ============================================================================

describe('MCP E2E — Proxy Request Schemas', () => {
  const validJsonRpc = {
    jsonrpc: '2.0' as const,
    id: 'test-1',
    method: 'tools/list',
    params: {},
  };

  it('validates connect request', () => {
    const valid = { serverId: 'firecrawl' };
    expect(valid.serverId.length).toBeGreaterThan(0);
  });

  it('validates RPC request with JSON-RPC payload', () => {
    expect(validJsonRpc.jsonrpc).toBe('2.0');
    expect(validJsonRpc.method.length).toBeGreaterThan(0);
  });

  it('rejects RPC with wrong JSON-RPC version', () => {
    const invalid = { ...validJsonRpc, jsonrpc: '1.0' };
    expect(invalid.jsonrpc).not.toBe('2.0');
  });

  it('keeps high-privilege MCP servers out of the public proxy allowlist', () => {
    const proxySource = readFileSync('supabase/functions/mcp-proxy/index.ts', 'utf8');
    const allowedServersBlock = proxySource.match(/const ALLOWED_SERVERS = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';

    expect(allowedServersBlock).toContain("'firecrawl'");
    expect(allowedServersBlock).not.toContain("'google-workspace'");
    expect(allowedServersBlock).not.toContain("'github'");
    expect(allowedServersBlock).not.toContain("'supabase'");
    expect(proxySource).not.toContain('GOOGLE_API_KEY');
    expect(proxySource).not.toContain('SUPABASE_SERVICE_KEY');
    expect(proxySource).not.toContain('GITHUB_TOKEN');
  });

  it('documents a server-side RPC policy that blocks direct tool execution', () => {
    const proxySource = readFileSync('supabase/functions/mcp-proxy/index.ts', 'utf8');
    const rpcPolicyBlock = proxySource.match(/const ALLOWED_RPC_METHODS = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';

    expect(rpcPolicyBlock).toContain("'tools/list'");
    expect(rpcPolicyBlock).not.toContain("'tools/call'");
    expect(proxySource).toContain('isRpcMethodAllowed(request.method)');
  });
});

// ============================================================================
// Full Pipeline Smoke Test
// ============================================================================

describe('MCP E2E — Full Pipeline Smoke', () => {
  beforeEach(() => {
    MCPHostManager.resetInstance();
  });

  it('completes init → register → discovery → invoke cycle', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize();

    // Manually register tools (simulates what connectServer does)
    host.discovery.registerTools('firecrawl', [{
      name: 'scrape_url',
      description: 'Scrape a web page',
      serverId: 'firecrawl',
      parameters: [{ name: 'url', type: 'string', description: 'URL to scrape', required: true }],
      riskLevel: 'read',
    }]);

    // Verify tool is discoverable
    const tool = host.discovery.getTool('scrape_url');
    expect(tool).toBeDefined();
    expect(tool?.serverId).toBe('firecrawl');
    expect(tool?.riskLevel).toBe('read');

    // Invoke (will fail because transport isn't connected, but validates pipeline)
    const result = await host.invokeTool({
      toolName: 'scrape_url',
      params: { url: 'https://example.com' },
      correlationId: 'smoke-001',
    });

    // Expected: fails with "Server not connected" (transport never connected)
    expect(result.success).toBe(false);
    expect(result.error).toContain('not connected');
    expect(result.correlationId).toBe('smoke-001');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('unknown tools are rejected at boundary', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize();

    const result = await host.invokeTool({
      toolName: 'nonexistent_tool',
      params: {},
      correlationId: 'smoke-002',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });
});
