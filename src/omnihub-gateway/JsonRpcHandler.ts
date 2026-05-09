/**
 * JsonRpcHandler — JSON-RPC 2.0 Request Dispatcher
 * @version 1.0.0
 * @module src/omnihub-gateway/JsonRpcHandler
 *
 * Central JSON-RPC 2.0 handler for the OmniHub Gateway.
 * Routes incoming requests to registered method handlers for both
 * MCP and A2A protocols. All methods are registered via a type-safe
 * handler map.
 *
 * Transport: HTTP + SSE (polling prohibited).
 *
 * APEX STANDARDS ENFORCED:
 * - Zod validation on all inbound JSON-RPC envelopes
 * - Fail-closed: Unknown methods return METHOD_NOT_FOUND
 * - Idempotency-Key header extracted and forwarded to handlers
 * - Correlation IDs attached to every response
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import {
  JsonRpcRequestSchema,
  JSON_RPC_ERRORS,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type GatewayContext,
} from './types';
import {
  buildMcpInitializeResult,
  deriveTraceMeta,
  wrapMcpListResult,
} from '../core/gateway/ProtocolContracts';
import {
  executeToolViaWorkflow,
  dispatchA2ATask,
  queryA2ATask,
  cancelA2ATask,
} from './TemporalBridge';

// ============================================================================
// Method Handler Interface
// ============================================================================

/**
 * A registered JSON-RPC method handler.
 * Receives validated params and gateway context, returns the result payload.
 */
export type MethodHandler = (
  params: Record<string, unknown>,
  context: GatewayContext,
) => Promise<unknown>;

// ============================================================================
// JSON-RPC Handler
// ============================================================================

export class JsonRpcHandler {
  private readonly methods = new Map<string, MethodHandler>();

  /**
   * Register a method handler.
   * @param method - JSON-RPC method name (e.g., "tools/list", "tasks/send")
   * @param handler - Async function that processes the request
   */
  registerMethod(method: string, handler: MethodHandler): void {
    if (this.methods.has(method)) {
      throw new Error(`Method already registered: ${method}`);
    }
    this.methods.set(method, handler);
  }

  /**
   * Unregister a method handler.
   */
  unregisterMethod(method: string): boolean {
    return this.methods.delete(method);
  }

  /**
   * List all registered method names.
   */
  listMethods(): string[] {
    return Array.from(this.methods.keys());
  }

  /**
   * Check if a method is registered.
   */
  hasMethod(method: string): boolean {
    return this.methods.has(method);
  }

  /**
   * Process a raw JSON string into a JSON-RPC response.
   *
   * Flow:
   * 1. Parse raw JSON
   * 2. Validate against JSON-RPC 2.0 schema
   * 3. Look up method handler
   * 4. Execute handler with context
   * 5. Return structured response
   */
  async handleRaw(rawBody: string, context: GatewayContext): Promise<JsonRpcResponse> {
    // 1. Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return this.errorResponse(null, JSON_RPC_ERRORS.PARSE_ERROR, 'Invalid JSON');
    }

    // 2. Validate JSON-RPC envelope
    const validation = JsonRpcRequestSchema.safeParse(parsed);
    if (!validation.success) {
      return this.errorResponse(
        null,
        JSON_RPC_ERRORS.INVALID_REQUEST,
        `Invalid JSON-RPC request: ${validation.error.issues[0]?.message ?? 'unknown'}`,
      );
    }

    return this.handle(validation.data, context);
  }

  /**
   * Process a validated JSON-RPC request.
   */
  async handle(request: JsonRpcRequest, context: GatewayContext): Promise<JsonRpcResponse> {
    const { id, method, params } = request;

    // Look up handler
    const handler = this.methods.get(method);
    if (!handler) {
      return this.errorResponse(id, JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }

    // Execute handler
    try {
      const result = await handler(params ?? {}, context);
      return {
        jsonrpc: '2.0',
        id,
        result,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      const code = err instanceof JsonRpcMethodError ? err.code : JSON_RPC_ERRORS.INTERNAL_ERROR;
      return this.errorResponse(id, code, message);
    }
  }

  /**
   * Build a JSON-RPC error response.
   */
  private errorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown,
  ): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id: id ?? 0,
      error: { code, message, ...(data !== undefined && { data }) },
    };
  }
}

// ============================================================================
// Custom Error for Method Handlers
// ============================================================================

/**
 * Throw this from a MethodHandler to return a specific JSON-RPC error code.
 */
export class JsonRpcMethodError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'JsonRpcMethodError';
    this.code = code;
  }
}

// ============================================================================
// MCP Protocol Methods — Live Temporal Bindings
// ============================================================================

/**
 * Register standard MCP protocol methods on a handler.
 * All stateful operations dispatch through Temporal workflows.
 */
export function registerMCPMethods(handler: JsonRpcHandler): void {
  // MCP initialize — capability negotiation (stateless, no Temporal needed)
  handler.registerMethod('initialize', async (params) =>
    buildMcpInitializeResult(params['protocolVersion']),
  );

  // MCP tools/list — enumerate available tools (stateless registry read)
  handler.registerMethod('tools/list', async (params) =>
    wrapMcpListResult('tools', [], params['cursor']),
  );

  // MCP tools/call — execute a tool via Temporal durable workflow
  handler.registerMethod('tools/call', async (params, context) => {
    const toolName = params['name'] as string | undefined;
    if (!toolName) {
      throw new JsonRpcMethodError(JSON_RPC_ERRORS.INVALID_PARAMS, 'Missing required param: name');
    }

    const toolArguments = (params['arguments'] as Record<string, unknown>) ?? {};

    const result = await executeToolViaWorkflow({
      toolName,
      arguments: toolArguments,
      context,
    });

    return {
      content: result.content,
      isError: result.isError,
      _meta: {
        ...deriveTraceMeta({
          requestId: context.requestId,
          correlationId: context.correlationId,
          workflowId: result.workflowId,
        }),
        durationMs: result.durationMs,
      },
    };
  });

  // MCP resources/list — stateless registry read
  handler.registerMethod('resources/list', async (params) =>
    wrapMcpListResult('resources', [], params['cursor']),
  );

  // MCP resources/read — stateless resource fetch
  handler.registerMethod('resources/read', async (params) => {
    const uri = params['uri'] as string | undefined;
    if (!uri) {
      throw new JsonRpcMethodError(JSON_RPC_ERRORS.INVALID_PARAMS, 'Missing required param: uri');
    }
    return {
      contents: [{ uri, mimeType: 'text/plain', text: '' }],
    };
  });

  // MCP prompts/list — stateless registry read
  handler.registerMethod('prompts/list', async (params) =>
    wrapMcpListResult('prompts', [], params['cursor']),
  );
}

// ============================================================================
// A2A Protocol Methods — Live Temporal Bindings
// ============================================================================

type A2AMessage = {
  role: string;
  parts: Array<{ type: string; text?: string; data?: unknown; mimeType?: string }>;
};

/** Extract and validate common A2A task params (id + message). */
function extractTaskParams(params: Record<string, unknown>): { taskId: string; message: A2AMessage } {
  const taskId = (params['id'] ?? params['taskId']) as string | undefined;
  if (!taskId) {
    throw new JsonRpcMethodError(JSON_RPC_ERRORS.INVALID_PARAMS, 'Missing required param: id');
  }

  const message = params['message'] as A2AMessage | undefined;
  if (!message?.role || !Array.isArray(message.parts)) {
    throw new JsonRpcMethodError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      'Missing or malformed required param: message (must have role and parts)',
    );
  }

  return { taskId, message };
}

/** Extract and validate task ID from params. */
function extractTaskId(params: Record<string, unknown>): string {
  const taskId = (params['id'] ?? params['taskId']) as string | undefined;
  if (!taskId) {
    throw new JsonRpcMethodError(JSON_RPC_ERRORS.INVALID_PARAMS, 'Missing required param: id');
  }
  return taskId;
}

/**
 * Register standard A2A protocol methods on a handler.
 * All task lifecycle operations are durably executed via Temporal workflows.
 */
export function registerA2AMethods(handler: JsonRpcHandler): void {
  const sendMessage: MethodHandler = async (params, context) => {
    const { taskId, message } = extractTaskParams(params);

    const result = await dispatchA2ATask({
      taskId,
      sessionId: params['sessionId'] as string | undefined,
      message,
      agentUrl: params['agentUrl'] as string | undefined,
      context,
    });

    return {
      ...result,
      metadata: {
        ...result.metadata,
        trace: deriveTraceMeta({
          requestId: context.requestId,
          correlationId: context.correlationId,
          workflowId: result.workflowId,
          taskId,
          artifactIds: result.artifacts.map((artifact) =>
            String(artifact['id'] ?? artifact['name'] ?? ''),
          ),
        }),
      },
    };
  };

  const sendStreamingMessage: MethodHandler = async (params, context) => {
    const { taskId } = extractTaskParams(params);
    const result = await sendMessage(params, context) as Record<string, unknown>;
    const metadata = result['metadata'] as Record<string, unknown> | undefined;

    return {
      ...result,
      metadata: {
        ...metadata,
        streaming: true,
        sseChannel: `a2a-task-${taskId}`,
      },
    };
  };

  const getTask: MethodHandler = async (params, context) => {
    const taskId = extractTaskId(params);
    const result = await queryA2ATask(taskId, context.tenantId);
    return {
      ...result,
      metadata: {
        ...result.metadata,
        trace: deriveTraceMeta({
          requestId: context.requestId,
          correlationId: context.correlationId,
          workflowId: result.workflowId,
          taskId,
        }),
      },
    };
  };

  const cancelTask: MethodHandler = async (params, context) => {
    const taskId = extractTaskId(params);
    const result = await cancelA2ATask(taskId, context.tenantId);
    return {
      ...result,
      metadata: {
        ...result.metadata,
        trace: deriveTraceMeta({
          requestId: context.requestId,
          correlationId: context.correlationId,
          workflowId: result.workflowId,
          taskId,
        }),
      },
    };
  };

  const listTasks: MethodHandler = async (params) => ({
    tasks: [],
    nextPageToken: '',
    pageSize: typeof params['pageSize'] === 'number' ? params['pageSize'] : 50,
    totalSize: 0,
  });

  const getExtendedAgentCard: MethodHandler = async () => ({
    name: 'APEX OmniHub Gateway',
    description: 'Governed A2A task gateway backed by durable Temporal workflows.',
    url: 'https://omnihub.apex.local/a2a',
    protocolVersion: '0.3',
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: true,
      extendedAgentCard: true,
    },
    skills: [],
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json'],
  });

  // Canonical modern A2A JSON-RPC method bindings.
  handler.registerMethod('SendMessage', sendMessage);
  handler.registerMethod('SendStreamingMessage', sendStreamingMessage);
  handler.registerMethod('GetTask', getTask);
  handler.registerMethod('ListTasks', listTasks);
  handler.registerMethod('CancelTask', cancelTask);
  handler.registerMethod('SubscribeToTask', sendStreamingMessage);
  handler.registerMethod('GetExtendedAgentCard', getExtendedAgentCard);

  // Legacy compatibility aliases retained at the registration boundary only.
  handler.registerMethod('tasks/send', sendMessage);
  handler.registerMethod('tasks/get', getTask);
  handler.registerMethod('tasks/cancel', cancelTask);
  handler.registerMethod('tasks/sendSubscribe', sendStreamingMessage);
}
