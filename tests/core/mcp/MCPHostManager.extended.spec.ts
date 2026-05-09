import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MCPHostManager,
  resolveBridgeRiskLevel,
  type AuditEntry,
} from '@/core/mcp/MCPHostManager';
import { MCPConfigSchema } from '@/core/mcp/mcp.config';

type MutableTransport = {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  type: 'stdio' | 'streamable-http' | 'sse';
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  send: (request: {
    method: string;
    id: string | number;
    params?: Record<string, unknown>;
  }) => Promise<{
    jsonrpc: '2.0';
    id: string | number;
    result?: unknown;
    error?: { code: number; message: string };
  }>;
};

const makeConfig = (capabilities: Array<'tools' | 'resources' | 'prompts'>) =>
  MCPConfigSchema.parse({
    servers: {
      'test-server': {
        name: 'Test Server',
        command: 'npx',
        args: ['-y', 'test-mcp'],
        env: {},
        transport: 'stdio',
        capabilities,
        enabled: true,
      },
    },
  });

describe('MCPHostManager extended', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MCPHostManager.resetInstance();
  });

  afterEach(async () => {
    const host = MCPHostManager.getInstance();
    await host.disconnectServer('test-server').catch(() => undefined);
    MCPHostManager.resetInstance();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('resolves bridge risk levels from tool names', () => {
    expect(resolveBridgeRiskLevel('users.deleteAccount', 'read')).toBe(
      'destructive',
    );
    expect(resolveBridgeRiskLevel('users.updateProfile', 'read')).toBe('write');
    expect(resolveBridgeRiskLevel('users.list', 'read')).toBe('read');
  });

  it('connects server, discovers capabilities, and starts heartbeat', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize(makeConfig(['tools', 'resources', 'prompts']));
    host.setHealthCheckConfig({ intervalMs: 1_000, maxFailures: 2 });

    const transport: MutableTransport = {
      status: 'disconnected',
      type: 'stdio',
      connect: async () => {
        transport.status = 'connected';
      },
      disconnect: async () => {
        transport.status = 'disconnected';
      },
      send: async (request) => {
        if (request.method === 'tools/list') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: [
              {
                name: 123, // number -> coerceUnknownToString
                description: true, // boolean -> coerceUnknownToString
                parameters: [{ name: 'query', type: null, required: 1 }],
                riskLevel: 'read',
              },
              {
                name: null, // null -> filtered out
                description: {},
              },
            ],
          };
        }
        if (request.method === 'resources/list') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: [{ uri: 'resource://1', name: 'Resource 1', description: 'desc' }],
          };
        }
        if (request.method === 'prompts/list') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: [
              {
                name: 'prompt-1',
                description: 'Prompt 1',
                arguments: [{ name: 'topic', description: 'Topic', required: true }],
              },
            ],
          };
        }
        return { jsonrpc: '2.0', id: request.id, result: 'pong' };
      },
    };

    (
      host as unknown as {
        transports: Map<string, MutableTransport>;
      }
    ).transports.set('test-server', transport);

    await host.connectServer('test-server');

    expect(host.registry.getServer('test-server')?.status).toBe('connected');
    expect(host.discovery.getTool('123')).toBeDefined();
    expect(host.resources.get('test-server')).toHaveLength(1);
    expect(host.prompts.get('test-server')).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1_100);
    expect(host.getHealthFailures('test-server')).toBe(0);
  });

  it('marks server error when connection fails', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize(makeConfig(['tools']));

    const transport: MutableTransport = {
      status: 'disconnected',
      type: 'stdio',
      connect: async () => {
        throw new Error('connect-failed');
      },
      disconnect: async () => undefined,
      send: async (request) => ({ jsonrpc: '2.0', id: request.id, result: null }),
    };

    (
      host as unknown as {
        transports: Map<string, MutableTransport>;
      }
    ).transports.set('test-server', transport);

    await expect(host.connectServer('test-server')).rejects.toThrow('connect-failed');
    const entry = host.registry.getServer('test-server');
    expect(entry?.status).toBe('error');
    expect(entry?.lastError).toContain('connect-failed');
  });

  it('invokes tools for success, rpc error, and thrown transport error', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize(makeConfig(['tools']));

    const auditEntries: AuditEntry[] = [];
    host.setAuditCallback((entry) => {
      auditEntries.push(entry);
    });
    host.discovery.registerTools('test-server', [
      {
        name: 'test-server.read_data',
        description: 'Read',
        serverId: 'test-server',
        parameters: [],
        riskLevel: 'read',
      },
      {
        name: 'test-server.write_data',
        description: 'Write',
        serverId: 'test-server',
        parameters: [],
        riskLevel: 'write',
      },
    ]);
    host.setApprovalCallback(async () => true);

    const transport: MutableTransport = {
      status: 'connected',
      type: 'stdio',
      connect: async () => undefined,
      disconnect: async () => undefined,
      send: vi
        .fn()
        .mockResolvedValueOnce({
          jsonrpc: '2.0',
          id: 'corr-success',
          result: { ok: true },
        })
        .mockResolvedValueOnce({
          jsonrpc: '2.0',
          id: 'corr-rpc-error',
          error: { code: 500, message: 'server-error' },
        })
        .mockRejectedValueOnce(new Error('transport exploded')),
    };

    (
      host as unknown as {
        transports: Map<string, MutableTransport>;
      }
    ).transports.set('test-server', transport);

    const success = await host.invokeTool({
      toolName: 'test-server.read_data',
      params: { q: 'ok' },
      correlationId: 'corr-success',
    });
    expect(success.success).toBe(true);
    expect(success.data).toEqual({ ok: true });

    const rpcError = await host.invokeTool({
      toolName: 'test-server.read_data',
      params: { q: 'error' },
      correlationId: 'corr-rpc-error',
    });
    expect(rpcError.success).toBe(false);
    expect(rpcError.error).toBe('server-error');

    const thrown = await host.invokeTool({
      toolName: 'test-server.write_data',
      params: { q: 'throw' },
      correlationId: 'corr-throw',
    });
    expect(thrown.success).toBe(false);
    expect(thrown.error).toContain('transport exploded');

    expect(auditEntries.length).toBeGreaterThanOrEqual(3);
  });

  it('disconnects server and clears cached capabilities', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize(makeConfig(['tools']));
    host.discovery.registerTools('test-server', [
      {
        name: 'test-server.read_data',
        description: 'Read',
        serverId: 'test-server',
        parameters: [],
        riskLevel: 'read',
      },
    ]);
    host.resources.set('test-server', [
      { uri: 'resource://1', name: 'r1', description: 'd', serverId: 'test-server' },
    ]);
    host.prompts.set('test-server', [
      { name: 'p1', description: 'd', serverId: 'test-server', arguments: [] },
    ]);

    const disconnect = vi.fn().mockResolvedValue(undefined);
    (
      host as unknown as {
        transports: Map<string, MutableTransport>;
      }
    ).transports.set('test-server', {
      status: 'connected',
      type: 'stdio',
      connect: async () => undefined,
      disconnect,
      send: async (request) => ({ jsonrpc: '2.0', id: request.id, result: null }),
    });

    await host.disconnectServer('test-server');
    expect(disconnect).toHaveBeenCalled();
    expect(host.discovery.getTool('test-server.read_data')).toBeUndefined();
    expect(host.resources.has('test-server')).toBe(false);
    expect(host.prompts.has('test-server')).toBe(false);
    expect(host.registry.getServer('test-server')?.status).toBe('available');
  });

  it('marks server unhealthy after consecutive heartbeat failures', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize(makeConfig(['tools']));
    host.setHealthCheckConfig({ intervalMs: 1_000, maxFailures: 2 });

    const transport: MutableTransport = {
      status: 'disconnected',
      type: 'stdio',
      connect: async () => {
        transport.status = 'connected';
      },
      disconnect: async () => {
        transport.status = 'disconnected';
      },
      send: async () => {
        throw new Error('heartbeat-failed');
      },
    };

    (
      host as unknown as {
        transports: Map<string, MutableTransport>;
      }
    ).transports.set('test-server', transport);

    await host.connectServer('test-server');
    await vi.advanceTimersByTimeAsync(2_200);

    expect(host.registry.getServer('test-server')?.status).toBe('error');
    expect(host.registry.getServer('test-server')?.lastError).toContain(
      'Health check failed',
    );
  });
});

describe('MCPHostManager canonical list discovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MCPHostManager.resetInstance();
  });

  afterEach(async () => {
    const host = MCPHostManager.getInstance();
    await host.disconnectServer('test-server').catch(() => undefined);
    MCPHostManager.resetInstance();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('parses wrapped MCP list envelopes and tool inputSchema parameters', async () => {
    const host = MCPHostManager.getInstance();
    host.initialize(makeConfig(['tools', 'resources', 'prompts']));

    const transport: MutableTransport = {
      status: 'disconnected',
      type: 'stdio',
      connect: async () => {
        transport.status = 'connected';
      },
      disconnect: async () => {
        transport.status = 'disconnected';
      },
      send: async (request) => {
        if (request.method === 'tools/list') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              tools: [{
                name: 'search_docs',
                description: 'Search documents',
                inputSchema: {
                  type: 'object',
                  properties: { query: { type: 'string', description: 'Query' } },
                  required: ['query'],
                },
                riskLevel: 'read',
              }],
              nextCursor: 'next-tool-page',
            },
          };
        }
        if (request.method === 'resources/list') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              resources: [{ uri: 'resource://1', name: 'Resource 1', description: 'desc' }],
              nextCursor: 'next-resource-page',
            },
          };
        }
        if (request.method === 'prompts/list') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              prompts: [{ name: 'prompt-1', description: 'Prompt 1', arguments: [] }],
              nextCursor: 'next-prompt-page',
            },
          };
        }
        return { jsonrpc: '2.0', id: request.id, result: 'pong' };
      },
    };

    (
      host as unknown as {
        transports: Map<string, MutableTransport>;
      }
    ).transports.set('test-server', transport);

    await host.connectServer('test-server');

    expect(host.discovery.getTool('search_docs')?.parameters).toEqual([
      { name: 'query', type: 'string', description: 'Query', required: true },
    ]);
    expect(host.resources.get('test-server')).toHaveLength(1);
    expect(host.prompts.get('test-server')).toHaveLength(1);
  });
});
