/**
 * Core type definitions for APEX OmniHub Realtime System.
 *
 * Defines contracts for device classification, trust tiers,
 * tool manifests, and idempotency state management.
 *
 * @module core/types
 * @version 1.0.0
 * @date 2026-02-09
 */

/* ------------------------------------------------------------------ */
/*  Trust & Device Classification                                      */
/* ------------------------------------------------------------------ */

/**
 * Trust tiers aligned with ManLane risk classification.
 * Maps to AegisKernel permission enforcement.
 */
export enum TrustTier {
  /** Full system access — admin-only. */
  GOD_MODE = 'GOD_MODE',
  /** Operational access — deploy, file system, invoicing. */
  OPERATOR = 'OPERATOR',
  /** Peripheral access — audio, logging, read insight. */
  PERIPHERAL = 'PERIPHERAL',
  /** Minimal read-only access — unauthenticated or unknown. */
  PUBLIC = 'PUBLIC',
}

/** Capabilities a device may possess. */
export type DeviceCapability =
  | 'all'
  | 'audio_in'
  | 'audio_out'
  | 'log_insight'
  | 'file_system'
  | 'deploy_service'
  | 'create_invoice'
  | 'read_only';

/** Authenticated device profile attached to every connection. */
export interface DeviceProfile {
  readonly deviceId: string;
  readonly trustTier: TrustTier;
  readonly capabilities: ReadonlyArray<DeviceCapability>;
  readonly connectionId: string;
  readonly authenticatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Tool Manifest                                                      */
/* ------------------------------------------------------------------ */

/** OpenAI function-tool JSON Schema shape. */
export interface ToolFunctionSchema {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

/** Filtered manifest response returned to devices. */
export interface ToolManifestResponse {
  readonly tools: ReadonlyArray<ToolFunctionSchema>;
  readonly meta: {
    readonly device_id: string;
    readonly trust_tier: TrustTier;
    readonly count: number;
    readonly generated_at: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Idempotency / Chronos                                              */
/* ------------------------------------------------------------------ */

/** Idempotency lock states. */
export enum IdempotencyState {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

/** A single idempotency record managed by ChronosLock. */
export interface IdempotencyRecord {
  readonly key: string;
  readonly state: IdempotencyState;
  readonly createdAt: string;
  readonly completedAt?: string;
  readonly result?: unknown;
}

/* ------------------------------------------------------------------ */
/*  Realtime Events                                                    */
/* ------------------------------------------------------------------ */

/** Parsed tool call extracted from OpenAI Realtime events. */
export interface ParsedToolCall {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly callId: string;
  readonly idempotencyKey: string;
}

/** Safe error payload sent to clients (no stack traces). */
export interface SafeErrorPayload {
  readonly error: string;
  readonly correlationId: string;
  readonly timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Orchestrator Tool Execution                                        */
/* ------------------------------------------------------------------ */

/** Input contract for ApexOrchestrator.executeTool(). */
export interface ToolExecutionInput {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
  readonly device: DeviceProfile;
  readonly idempotencyKey: string;
  readonly callId: string;
}

/** Output contract from ApexOrchestrator.executeTool(). */
export interface ToolExecutionResult {
  readonly success: boolean;
  readonly callId: string;
  readonly output: unknown;
  readonly error?: string;
}
