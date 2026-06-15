/**
 * OmniHub Gateway — Barrel Export
 * @version 1.0.0
 * @module src/omnihub-gateway
 *
 * Centralized governance gateway for the APEX decentralized multi-agent ecosystem.
 * Implements MCP (Model Context Protocol) and A2A (Agent-to-Agent) over JSON-RPC 2.0.
 *
 * Transport: HTTP + Server-Sent Events (SSE). Polling is prohibited.
 *
 * Architecture:
 *   Client → TriforceGuardian → JsonRpcHandler → [MCP Host | A2A Router]
 *                                      ↕                    ↕
 *                              IdempotencyManager    TokenEconomicsRouter
 *                                      ↕                    ↕
 *                                SSEManager ←── AgentCardRegistry
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// Types
export type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  SSEEvent,
  SSEConnectionState,
  SSESubscription,
  AgentCard,
  AgentSkill,
  A2ATask,
  A2ATaskState,
  IdempotencyEntry,
  IdempotencyState,
  ModelProfile,
  ModelTier,
  RoutingDecision,
  GatewayContext,
} from './types';

export {
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
  JsonRpcErrorSchema,
  AgentCardSchema,
  AgentSkillSchema,
  A2ATaskSchema,
  JSON_RPC_ERRORS,
} from './types';

// JSON-RPC Handler
export {
  JsonRpcHandler,
  JsonRpcMethodError,
  registerMCPMethods,
  registerA2AMethods,
  type MethodHandler,
  type MCPRegistryProvider,
} from './JsonRpcHandler';

// SSE Manager
export {
  SSEChannel,
  SSEManager,
} from './SSEManager';

// Agent Card Registry (A2A)
export {
  AgentCardRegistry,
  type RegisteredAgent,
} from './AgentCard';

// Semantic Router (A2A + Solver Routing)
export {
  SemanticRouter,
  extractKeywords,
  routeToSolvers,
  type RoutingCandidate,
  type RoutingResult,
  type SolverType,
  type ExecutionPayload,
} from './SemanticRouter';

// Idempotency Manager
export {
  IdempotencyManager,
  InMemoryIdempotencyStore,
  generateUUIDv5,
  type IdempotencyStore,
} from './IdempotencyManager';
export { SupabaseIdempotencyStore } from './SupabaseIdempotencyStore';

// Token Economics Router
export {
  TokenEconomicsRouter,
  scoreComplexity,
  type ComplexityScore,
} from './TokenEconomicsRouter';

// Governance: Triforce Guardian
export {
  TriforceGuardian,
  SchemaRegistry,
  RBACEngine,
  createJWTInterceptor,
  createMTLSInterceptor,
  createSchemaInterceptor,
  createRBACInterceptor,
  mapRolesToTrustTier,
  extractBearerToken,
  registerDefaultGatewayPolicies,
  type GuardianResult,
  type GuardianVerdict,
  type GuardianInterceptor,
  type JWTConfig,
  type JWTClaims,
  type VerifiedIdentity,
  type MTLSConfig,
  type RBACPolicy,
  type RBACAction,
} from './middleware/TriforceGuardian';

// Governance: MAN Mode
export {
  ManModeController,
  registerDefaultTriggers,
  type SuspendedOperation,
  type ManModeAlert,
  type ManModeDecision,
  type ManModeRiskLevel,
  type ManModeTrigger,
  type AlertDispatcher,
} from './middleware/ManMode';

// Temporal Bridge — Durable Execution Bindings
export {
  executeToolViaWorkflow,
  dispatchA2ATask,
  queryA2ATask,
  cancelA2ATask,
  registerAgentViaWorkflow,
  dispatchRoutedTask,
  type ToolExecutionRequest,
  type ToolExecutionResponse,
  type A2ATaskRequest,
  type A2ATaskResponse,
} from './TemporalBridge';

// HTTP Router — REST API endpoints
export {
  handleTriggerLambda,
  broadcastWorkflowComplete,
  TriggerLambdaRequestSchema,
  type TriggerLambdaRequest,
  type TriggerLambdaResponse,
  type RouteErrorResponse,
} from './router';

// MCP Client — Frontend gateway bridge
export {
  triggerAsyncLambdaDemo,
  getGatewayBaseUrl,
  type LambdaDemoPayload,
} from './mcp-client';
