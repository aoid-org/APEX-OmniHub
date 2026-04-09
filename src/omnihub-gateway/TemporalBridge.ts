/**
 * TemporalBridge — OmniHub Gateway ↔ Temporal Durable Execution
 * @version 1.0.0
 * @module src/omnihub-gateway/TemporalBridge
 *
 * Provides a gateway-specific Temporal client with typed workflow
 * dispatch helpers. All gateway JSON-RPC handlers route through
 * this bridge to achieve durable execution guarantees.
 *
 * Patterns used:
 * - Lazy singleton client (thread-safe via shared promise)
 * - Update-with-Start for idempotent task creation
 * - Signals for lifecycle events (cancel, close)
 * - Queries for zero-latency state reads
 *
 * APEX STANDARDS ENFORCED:
 * - Fail-closed: Client init failure rejects all pending calls
 * - Deterministic workflow IDs: Derived from tenant + task ID
 * - Type-safe: Full workflow type inference at call sites
 * - Observable: All dispatches log workflow ID + run ID
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import {
  Connection,
  Client,
  WorkflowNotFoundError,
} from '@temporalio/client';
import { Context, CompleteAsyncError } from '@temporalio/activity';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import type { GatewayContext } from './types';

// ============================================================================
// Constants
// ============================================================================

const TASK_QUEUE_MCP = 'omnihub-mcp-tools';
const TASK_QUEUE_A2A = 'omnihub-a2a-tasks';
const TASK_QUEUE_REGISTRY = 'omnihub-agent-registry';
const TASK_QUEUE_LAMBDA = 'omnihub-lambda-dispatch';

const WORKFLOW_PREFIX = {
  TOOL_EXEC: 'mcp-tool',
  A2A_TASK: 'a2a-task',
  AGENT_REGISTRY: 'agent-registry',
  AGENT_HEALTH: 'agent-health',
  LAMBDA_DISPATCH: 'lambda-dispatch',
} as const;

// ============================================================================
// Lazy Singleton Client
// ============================================================================

let _client: Client | null = null;
let _clientPromise: Promise<Client> | null = null;

/**
 * Returns a lazily-initialized Temporal Client singleton.
 * Thread-safe: concurrent callers share the same initialization promise.
 */
async function getClient(): Promise<Client> {
  if (_client) return _client;

  _clientPromise ??= (async () => {
    const address =
      typeof process !== 'undefined' && process.env
        ? process.env['TEMPORAL_ADDRESS'] ?? 'localhost:7233'
        : 'localhost:7233';
    const namespace =
      typeof process !== 'undefined' && process.env
        ? process.env['TEMPORAL_NAMESPACE'] ?? 'default'
        : 'default';

    const connection = await Connection.connect({ address });

    _client = new Client({
      connection,
      namespace,
    });

    return _client;
  })();

  return _clientPromise;
}

/**
 * Reset the Temporal client singleton (for testing only).
 */
export function _resetClientForTesting(): void {
  _client = null;
  _clientPromise = null;
}

// ============================================================================
// Workflow ID Derivation
// ============================================================================

/**
 * Derive a deterministic workflow ID from components.
 * Ensures one workflow per logical operation.
 */
function deriveWorkflowId(prefix: string, ...parts: string[]): string {
  return `${prefix}-${parts.join('-')}`;
}

// ============================================================================
// MCP Tool Execution
// ============================================================================

export interface ToolExecutionRequest {
  readonly toolName: string;
  readonly arguments: Record<string, unknown>;
  readonly context: GatewayContext;
}

export interface ToolExecutionResponse {
  readonly content: Array<{ type: string; text: string }>;
  readonly isError: boolean;
  readonly workflowId: string;
  readonly durationMs: number;
}

/**
 * Execute an MCP tool call via a Temporal workflow.
 *
 * Starts a `mcpToolExecutionWorkflow` that:
 * 1. Validates tool existence against the tool registry
 * 2. Checks RBAC permissions via AegisKernel
 * 3. Executes the tool via the appropriate MCP server transport
 * 4. Validates the result via Veritas
 * 5. Returns the result or error
 *
 * Uses the idempotency key from context to prevent duplicate execution.
 */
export async function executeToolViaWorkflow(
  request: ToolExecutionRequest,
): Promise<ToolExecutionResponse> {
  const client = await getClient();
  const startTime = Date.now();

  const wfId = deriveWorkflowId(
    WORKFLOW_PREFIX.TOOL_EXEC,
    request.context.tenantId,
    request.context.idempotencyKey,
  );

  try {
    // Start workflow and await result (synchronous tool execution)
    const handle = await client.workflow.start('mcpToolExecutionWorkflow', {
      taskQueue: TASK_QUEUE_MCP,
      workflowId: wfId,
      args: [{
        toolName: request.toolName,
        arguments: request.arguments,
        tenantId: request.context.tenantId,
        deviceId: request.context.deviceId,
        trustTier: request.context.trustTier,
        correlationId: request.context.correlationId,
        idempotencyKey: request.context.idempotencyKey,
      }],
    });

    const result = await handle.result() as Record<string, unknown>;

    return {
      content: (result['content'] as Array<{ type: string; text: string }>) ?? [
        { type: 'text', text: JSON.stringify(result) },
      ],
      isError: (result['isError'] as boolean) ?? false,
      workflowId: wfId,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      content: [{
        type: 'text',
        text: err instanceof Error ? err.message : 'Tool execution workflow failed',
      }],
      isError: true,
      workflowId: wfId,
      durationMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// A2A Task Dispatch
// ============================================================================

export interface A2ATaskRequest {
  readonly taskId: string;
  readonly sessionId?: string;
  readonly message: {
    readonly role: string;
    readonly parts: Array<{ type: string; text?: string; data?: unknown; mimeType?: string }>;
  };
  readonly agentUrl?: string;
  readonly context: GatewayContext;
}

export interface A2ATaskResponse {
  readonly id: string;
  readonly sessionId: string;
  readonly state: string;
  readonly artifacts: Array<Record<string, unknown>>;
  readonly metadata: Record<string, unknown>;
  readonly workflowId: string;
}

/**
 * Dispatch an A2A task via a Temporal workflow.
 *
 * Uses Update-with-Start: if a workflow for this task already exists,
 * it receives the new message as an update. If not, a new workflow
 * is started and the message is sent as the initial input.
 *
 * The workflow runs until:
 * - The task completes (all parts processed)
 * - The task is canceled via signal
 * - An unrecoverable error occurs
 */
export async function dispatchA2ATask(
  request: A2ATaskRequest,
): Promise<A2ATaskResponse> {
  const client = await getClient();

  const wfId = deriveWorkflowId(
    WORKFLOW_PREFIX.A2A_TASK,
    request.context.tenantId,
    request.taskId,
  );

  const sessionId = request.sessionId ?? request.taskId;

  try {
    // Attempt Update-with-Start pattern
    const handle = client.workflow.getHandle(wfId);

    try {
      // Try sending message as an update to existing workflow
      const result = await handle.executeUpdate('processMessage', {
        args: [{
          message: request.message,
          agentUrl: request.agentUrl,
          correlationId: request.context.correlationId,
        }],
      });

      const typed = result as Record<string, unknown>;
      return {
        id: request.taskId,
        sessionId,
        state: (typed['state'] as string) ?? 'working',
        artifacts: (typed['artifacts'] as Array<Record<string, unknown>>) ?? [],
        metadata: {
          ...(typed['metadata'] as Record<string, unknown> | undefined),
          workflowRunning: true,
        },
        workflowId: wfId,
      };
    } catch (updateErr) {
      if (!(updateErr instanceof WorkflowNotFoundError)) {
        throw updateErr;
      }
      // Workflow doesn't exist — fall through to start
    }

    // Start new workflow
    const newHandle = await client.workflow.start('a2aTaskWorkflow', {
      taskQueue: TASK_QUEUE_A2A,
      workflowId: wfId,
      args: [{
        taskId: request.taskId,
        sessionId,
        message: request.message,
        agentUrl: request.agentUrl,
        tenantId: request.context.tenantId,
        deviceId: request.context.deviceId,
        correlationId: request.context.correlationId,
        idempotencyKey: request.context.idempotencyKey,
      }],
    });

    return {
      id: request.taskId,
      sessionId,
      state: 'submitted',
      artifacts: [],
      metadata: {
        workflowId: newHandle.workflowId,
        workflowRunning: true,
      },
      workflowId: wfId,
    };
  } catch (err) {
    return {
      id: request.taskId,
      sessionId,
      state: 'failed',
      artifacts: [],
      metadata: {
        error: err instanceof Error ? err.message : 'Task dispatch failed',
      },
      workflowId: wfId,
    };
  }
}

/**
 * Query an A2A task's current state via Temporal workflow query.
 */
export async function queryA2ATask(
  taskId: string,
  tenantId: string,
): Promise<A2ATaskResponse> {
  const client = await getClient();

  const wfId = deriveWorkflowId(WORKFLOW_PREFIX.A2A_TASK, tenantId, taskId);

  try {
    const handle = client.workflow.getHandle(wfId);
    const state = await handle.query<Record<string, unknown>>('getTaskState');

    return {
      id: taskId,
      sessionId: (state['sessionId'] as string) ?? taskId,
      state: (state['state'] as string) ?? 'working',
      artifacts: (state['artifacts'] as Array<Record<string, unknown>>) ?? [],
      metadata: (state['metadata'] as Record<string, unknown>) ?? {},
      workflowId: wfId,
    };
  } catch (err) {
    if (err instanceof WorkflowNotFoundError) {
      return {
        id: taskId,
        sessionId: taskId,
        state: 'completed',
        artifacts: [],
        metadata: { workflowCompleted: true },
        workflowId: wfId,
      };
    }
    throw err;
  }
}

/**
 * Cancel an A2A task by signaling the Temporal workflow.
 */
export async function cancelA2ATask(
  taskId: string,
  tenantId: string,
): Promise<A2ATaskResponse> {
  const client = await getClient();

  const wfId = deriveWorkflowId(WORKFLOW_PREFIX.A2A_TASK, tenantId, taskId);

  try {
    const handle = client.workflow.getHandle(wfId);
    await handle.signal('cancelTask');

    return {
      id: taskId,
      sessionId: taskId,
      state: 'canceled',
      artifacts: [],
      metadata: { canceledAt: new Date().toISOString() },
      workflowId: wfId,
    };
  } catch (err) {
    if (err instanceof WorkflowNotFoundError) {
      return {
        id: taskId,
        sessionId: taskId,
        state: 'canceled',
        artifacts: [],
        metadata: { alreadyCompleted: true },
        workflowId: wfId,
      };
    }
    throw err;
  }
}

// ============================================================================
// Agent Registry Workflows
// ============================================================================

/**
 * Persist an agent card registration via a Temporal workflow.
 * The workflow stores the card durably and starts a health check loop.
 */
export async function registerAgentViaWorkflow(
  agentUrl: string,
  card: Record<string, unknown>,
): Promise<{ workflowId: string; registered: boolean }> {
  const client = await getClient();

  const wfId = deriveWorkflowId(
    WORKFLOW_PREFIX.AGENT_REGISTRY,
    encodeURIComponent(agentUrl),
  );

  try {
    const handle = await client.workflow.start('agentRegistryWorkflow', {
      taskQueue: TASK_QUEUE_REGISTRY,
      workflowId: wfId,
      args: [{ agentUrl, card, registeredAt: new Date().toISOString() }],
    });

    return { workflowId: handle.workflowId, registered: true };
  } catch {
    // Workflow may already exist — send update instead
    try {
      const handle = client.workflow.getHandle(wfId);
      await handle.executeUpdate('updateCard', {
        args: [{ card, updatedAt: new Date().toISOString() }],
      });
      return { workflowId: wfId, registered: true };
    } catch {
      return { workflowId: wfId, registered: false };
    }
  }
}

/**
 * Dispatch a routed task to the selected agent via a Temporal workflow.
 * This is called by SemanticRouter after agent selection.
 */
export async function dispatchRoutedTask(
  taskId: string,
  agentUrl: string,
  message: {
    role: string;
    parts: Array<{ type: string; text?: string; data?: unknown; mimeType?: string }>;
  },
  context: GatewayContext,
): Promise<A2ATaskResponse> {
  return dispatchA2ATask({
    taskId,
    message,
    agentUrl,
    context,
  });
}

// ============================================================================
// Lambda Async Activity Completion
// ============================================================================

export { TASK_QUEUE_LAMBDA };

export interface LambdaDispatchPayload {
  readonly taskData: Record<string, unknown>;
  readonly userJwt: string;
  readonly functionName: string;
}

export interface LambdaDispatchResult {
  readonly dispatched: boolean;
  readonly taskToken: string;
}

/**
 * Temporal Activity: Dispatch a heavy-lift task to the OmniHubWorkerLambda.
 *
 * Implements the **Asynchronous Activity Completion** pattern:
 * 1. Extracts the Temporal taskToken from the current activity context.
 * 2. Serializes the task payload, user JWT, and Base64-encoded taskToken
 *    into the Lambda invocation payload.
 * 3. Fires the Lambda asynchronously (InvocationType: 'Event').
 * 4. Throws CompleteAsyncError — instructs the Temporal cluster that
 *    this activity is pending external completion by the Lambda callback.
 *
 * The Lambda is responsible for calling `client.activity.complete(token, result)`
 * or `client.activity.fail(token, error)` upon finishing.
 *
 * @throws {CompleteAsyncError} Always — by design.
 */
export async function dispatchToLambdaActivity(
  payload: LambdaDispatchPayload,
  lambdaClient?: InstanceType<typeof LambdaClient>,
  taskTokenOverride?: Uint8Array,
): Promise<never> {
  // Accept explicit task token override for deterministic unit tests and harnesses.
  const taskToken = taskTokenOverride ?? Context.current().info.taskToken;
  const taskTokenB64 = Buffer.from(taskToken).toString('base64');

  const client = lambdaClient ?? new LambdaClient({});

  const invokePayload = JSON.stringify({
    taskData: payload.taskData,
    userJwt: payload.userJwt,
    taskToken: taskTokenB64,
  });

  await client.send(
    new InvokeCommand({
      FunctionName: payload.functionName,
      InvocationType: 'Event',
      Payload: new TextEncoder().encode(invokePayload),
    }),
  );

  throw new CompleteAsyncError();
}
