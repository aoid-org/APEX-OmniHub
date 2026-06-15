/**
 * OmniHub Gateway — Shared Type Definitions
 * @version 1.0.0
 * @module src/omnihub-gateway/types
 *
 * Canonical types for the OmniHub Gateway layer.
 * Covers JSON-RPC 2.0, SSE, A2A Agent Cards, idempotency,
 * and token economics routing.
 *
 * APEX STANDARDS ENFORCED:
 * - Zod boundary validation on all external inputs
 * - Readonly interfaces for immutable contracts
 * - Discriminated unions for exhaustive matching
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';

// ============================================================================
// JSON-RPC 2.0 (MCP + A2A shared transport)
// ============================================================================

export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string().min(1),
  params: z.record(z.unknown()).optional(),
});

export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;

export const JsonRpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

export type JsonRpcError = z.infer<typeof JsonRpcErrorSchema>;

export const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: JsonRpcErrorSchema.optional(),
});

export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;

/** Standard JSON-RPC 2.0 error codes */
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  /** A2A-specific: Task not found */
  TASK_NOT_FOUND: -32001,
  /** A2A-specific: Task not cancelable */
  TASK_NOT_CANCELABLE: -32002,
  /** Gateway-specific: Idempotency conflict */
  IDEMPOTENCY_CONFLICT: -32010,
  /** Gateway-specific: Rate limited */
  RATE_LIMITED: -32029,
  /** Gateway-specific: Unauthorized */
  UNAUTHORIZED: -32030,
} as const;

// ============================================================================
// SSE Event Types
// ============================================================================

export interface SSEEvent {
  readonly id: string;
  readonly event: string;
  readonly data: string;
  readonly retry?: number;
}

export type SSEConnectionState = 'connecting' | 'open' | 'closed' | 'error';

export interface SSESubscription {
  readonly subscriptionId: string;
  readonly channel: string;
  readonly createdAt: string;
  readonly state: SSEConnectionState;
}

// ============================================================================
// A2A Agent Card (Google A2A Protocol)
// ============================================================================

export const AgentSkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([]),
});

export type AgentSkill = z.infer<typeof AgentSkillSchema>;

export const AgentCardSchema = z.object({
  /** Agent display name */
  name: z.string().min(1),
  /** Human-readable description */
  description: z.string(),
  /** Agent endpoint URL */
  url: z.string().url(),
  /** Protocol version */
  version: z.string().default('1.0.0'),
  /** Agent capabilities */
  capabilities: z.object({
    streaming: z.boolean().default(false),
    pushNotifications: z.boolean().default(false),
    stateTransitionHistory: z.boolean().default(false),
  }).default({}),
  /** Authentication requirements */
  authentication: z.object({
    schemes: z.array(z.string()).default([]),
    credentials: z.string().optional(),
  }).default({}),
  /** Skills this agent can perform */
  skills: z.array(AgentSkillSchema).default([]),
  /** Default input modes */
  defaultInputModes: z.array(z.string()).default(['text/plain']),
  /** Default output modes */
  defaultOutputModes: z.array(z.string()).default(['text/plain']),
  /** Provider metadata */
  provider: z.object({
    organization: z.string(),
    url: z.string().url().optional(),
  }).optional(),
});

export type AgentCard = z.infer<typeof AgentCardSchema>;

// ============================================================================
// A2A Task Protocol
// ============================================================================

export type A2ATaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'canceled'
  | 'failed';

export const A2ATaskSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().optional(),
  state: z.enum(['submitted', 'working', 'input-required', 'completed', 'canceled', 'failed']),
  message: z.object({
    role: z.enum(['user', 'agent']),
    parts: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
      data: z.unknown().optional(),
      mimeType: z.string().optional(),
    })),
  }).optional(),
  artifacts: z.array(z.object({
    name: z.string(),
    parts: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
      data: z.unknown().optional(),
      mimeType: z.string().optional(),
    })),
  })).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export type A2ATask = z.infer<typeof A2ATaskSchema>;

// ============================================================================
// Idempotency
// ============================================================================

export type IdempotencyState = 'pending' | 'completed' | 'failed';

export interface IdempotencyEntry {
  readonly key: string;
  readonly namespace: string;
  readonly state: IdempotencyState;
  readonly createdAt: string;
  readonly completedAt?: string;
  readonly result?: unknown;
  readonly ttlMs: number;
  readonly tenantId?: string;
  readonly correlationId?: string;
  readonly eventType?: string;
}

// ============================================================================
// Token Economics
// ============================================================================

export type ModelTier = 'reasoning' | 'standard' | 'economy';

export interface ModelProfile {
  readonly modelId: string;
  readonly provider: string;
  readonly tier: ModelTier;
  readonly costPerInputToken: number;
  readonly costPerOutputToken: number;
  readonly maxContextTokens: number;
  readonly capabilities: readonly string[];
  readonly latencyClass: 'low' | 'medium' | 'high';
}

export interface RoutingDecision {
  readonly requestId: string;
  readonly selectedModel: ModelProfile;
  readonly reasoning: string;
  readonly estimatedCostUsd: number;
  readonly timestamp: string;
  /** Reasoning token budget assigned by assessTaskStakes. Present on enriched decisions. */
  readonly reasoning_budget?: number;
}

// ============================================================================
// Gateway Request Context
// ============================================================================

export interface GatewayContext {
  readonly requestId: string;
  readonly tenantId: string;
  readonly deviceId: string;
  readonly trustTier: string;
  readonly idempotencyKey: string;
  readonly timestamp: string;
  readonly correlationId: string;
}
