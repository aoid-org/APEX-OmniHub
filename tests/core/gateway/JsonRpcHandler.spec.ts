import { describe, expect, it, vi } from 'vitest';
import type { GatewayContext } from '../../../src/omnihub-gateway/types';

vi.mock('../../../src/omnihub-gateway/TemporalBridge', () => ({
  executeToolViaWorkflow: vi.fn(async () => ({
    content: [{ type: 'text', text: 'ok' }],
    isError: false,
    workflowId: 'wf-tool-1',
    durationMs: 12,
  })),
  dispatchA2ATask: vi.fn(async (request: { taskId: string; context: GatewayContext }) => ({
    id: request.taskId,
    sessionId: request.taskId,
    state: 'submitted',
    artifacts: [
      { id: 'artifact-1' },
      { id: { nested: true }, name: { nested: true } },
    ],
    metadata: { workflowRunning: true },
    workflowId: `wf-${request.context.tenantId}-${request.taskId}`,
  })),
  queryA2ATask: vi.fn(async (taskId: string, tenantId: string) => ({
    id: taskId,
    sessionId: taskId,
    state: 'working',
    artifacts: [],
    metadata: {},
    workflowId: `wf-${tenantId}-${taskId}`,
  })),
  cancelA2ATask: vi.fn(async (taskId: string, tenantId: string) => ({
    id: taskId,
    sessionId: taskId,
    state: 'canceled',
    artifacts: [],
    metadata: {},
    workflowId: `wf-${tenantId}-${taskId}`,
  })),
}));

const context: GatewayContext = {
  requestId: 'req-1',
  correlationId: 'corr-1',
  tenantId: 'tenant-1',
  deviceId: 'device-1',
  trustTier: 'OPERATOR',
  idempotencyKey: 'idem-1',
  timestamp: new Date().toISOString(),
};

describe('JsonRpcHandler MCP/A2A protocol bindings', () => {
  it('negotiates MCP initialize to the requested supported version', async () => {
    const { JsonRpcHandler, registerMCPMethods } = await import(
      '../../../src/omnihub-gateway/JsonRpcHandler'
    );
    const handler = new JsonRpcHandler();
    registerMCPMethods(handler);

    const response = await handler.handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'x' } },
    }, context);

    expect(response.result).toMatchObject({
      protocolVersion: '2025-06-18',
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: false, listChanged: true },
        prompts: { listChanged: true },
      },
    });
  });

  it('returns MCP registry-backed list envelopes with pagination-ready cursors', async () => {
    const { JsonRpcHandler, registerMCPMethods } = await import(
      '../../../src/omnihub-gateway/JsonRpcHandler'
    );
    const handler = new JsonRpcHandler();
    registerMCPMethods(handler, {
      listTools: () => [
        {
          name: 'docs.search',
          description: 'Search docs',
          serverId: 'docs-server',
          parameters: [
            { name: 'query', type: 'string', description: 'Search query', required: true },
          ],
          riskLevel: 'read',
        },
        {
          name: 'docs.update',
          description: 'Update docs',
          serverId: 'docs-server',
          parameters: [],
          riskLevel: 'write',
        },
      ],
      listResources: () => [{
        uri: 'resource://docs/1',
        name: 'Doc 1',
        description: 'First document',
        mimeType: 'text/plain',
        serverId: 'docs-server',
      }],
      listPrompts: () => [{
        name: 'summarize',
        description: 'Summarize a topic',
        serverId: 'docs-server',
        arguments: [{ name: 'topic', description: 'Topic', required: true }],
      }],
    });

    await expect(handler.handle({
      jsonrpc: '2.0',
      id: 'tools',
      method: 'tools/list',
      params: { limit: 1 },
    }, context)).resolves.toMatchObject({
      result: {
        tools: [{
          name: 'docs.search',
          inputSchema: {
            properties: { query: { type: 'string', description: 'Search query' } },
            required: ['query'],
          },
          _meta: { serverId: 'docs-server', riskLevel: 'read' },
        }],
        nextCursor: '1',
      },
    });

    await expect(handler.handle({
      jsonrpc: '2.0',
      id: 'resources',
      method: 'resources/list',
      params: {},
    }, context)).resolves.toMatchObject({
      result: {
        resources: [{ uri: 'resource://docs/1', _meta: { serverId: 'docs-server' } }],
      },
    });

    await expect(handler.handle({
      jsonrpc: '2.0',
      id: 'prompts',
      method: 'prompts/list',
      params: {},
    }, context)).resolves.toMatchObject({
      result: {
        prompts: [{ name: 'summarize', arguments: [{ name: 'topic', required: true }] }],
      },
    });
  });



  it('uses MCPHostManager caches as the default public registry source', async () => {
    const { MCPHostManager } = await import('../../../src/core/mcp/MCPHostManager');
    const { JsonRpcHandler, registerMCPMethods } = await import(
      '../../../src/omnihub-gateway/JsonRpcHandler'
    );
    MCPHostManager.resetInstance();
    const host = MCPHostManager.getInstance();
    host.discovery.registerTools('host-server', [{
      name: 'host.lookup',
      description: 'Lookup from host cache',
      serverId: 'host-server',
      parameters: [],
      riskLevel: 'read',
    }]);
    host.resources.set('host-server', [{
      uri: 'resource://host/1',
      name: 'Host Resource',
      description: 'Cached resource',
      serverId: 'host-server',
    }]);
    host.prompts.set('host-server', [{
      name: 'host_prompt',
      description: 'Cached prompt',
      serverId: 'host-server',
      arguments: [],
    }]);

    const handler = new JsonRpcHandler();
    registerMCPMethods(handler);

    await expect(handler.handle({
      jsonrpc: '2.0',
      id: 'host-tools',
      method: 'tools/list',
      params: {},
    }, context)).resolves.toMatchObject({ result: { tools: [{ name: 'host.lookup' }] } });

    await expect(handler.handle({
      jsonrpc: '2.0',
      id: 'host-resources',
      method: 'resources/list',
      params: {},
    }, context)).resolves.toMatchObject({
      result: { resources: [{ uri: 'resource://host/1' }] },
    });

    await expect(handler.handle({
      jsonrpc: '2.0',
      id: 'host-prompts',
      method: 'prompts/list',
      params: {},
    }, context)).resolves.toMatchObject({ result: { prompts: [{ name: 'host_prompt' }] } });
    MCPHostManager.resetInstance();
  });

  it('registers canonical A2A methods and isolates legacy aliases', async () => {
    const { JsonRpcHandler, registerA2AMethods } = await import(
      '../../../src/omnihub-gateway/JsonRpcHandler'
    );
    const handler = new JsonRpcHandler();
    registerA2AMethods(handler);

    expect(handler.listMethods()).toEqual(expect.arrayContaining([
      'SendMessage',
      'SendStreamingMessage',
      'GetTask',
      'ListTasks',
      'CancelTask',
      'SubscribeToTask',
      'GetExtendedAgentCard',
      'tasks/send',
      'tasks/get',
      'tasks/cancel',
      'tasks/sendSubscribe',
    ]));

    const canonical = await handler.handle({
      jsonrpc: '2.0',
      id: 'a2a-1',
      method: 'SendMessage',
      params: {
        taskId: 'task-1',
        message: { role: 'user', parts: [{ type: 'text', text: 'hello' }] },
      },
    }, context);

    expect(canonical.result).toMatchObject({
      id: 'task-1',
      metadata: {
        trace: {
          requestId: 'req-1',
          correlationId: 'corr-1',
          workflowId: 'wf-tenant-1-task-1',
          taskId: 'task-1',
          artifactIds: ['artifact-1'],
        },
      },
    });

    await expect(handler.handle({
      jsonrpc: '2.0',
      id: 'legacy-1',
      method: 'tasks/get',
      params: { id: 'task-1' },
    }, context)).resolves.toMatchObject({ result: { id: 'task-1', state: 'working' } });
  });
});
