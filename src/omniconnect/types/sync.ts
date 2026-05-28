/**
 * Universal Synchronized Orchestrator (USO) - Sync Contract
 * 
 * Purpose: Define canonical sync envelope and statuses for legacy and external integrations.
 * 
 * Author: OmniLink APEX
 * Date: 2026-05-28
 */

export enum SyncStatus {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  DUPLICATE = 'duplicate',
  CONFLICT_PENDING_REVIEW = 'conflict_pending_review',
  APPLIED = 'applied',
  FAILED_RETRYABLE = 'failed_retryable',
  FAILED_TERMINAL = 'failed_terminal',
}

export enum SyncOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',
}

export interface SyncPolicyResult {
  allowed: boolean;
  reason?: string;
  ruleId?: string;
}

export interface UniversalSyncEnvelope<T = unknown> {
  sourceSystem: string;
  tenantId: string;
  actorId: string;
  objectType: string;
  operation: SyncOperation;
  
  beforePayload?: T;
  afterPayload?: T;
  eventPayload?: unknown;
  
  causalTraceId: string;
  idempotencyKey: string;
  
  policyResult?: SyncPolicyResult;
  syncStatus: SyncStatus;
  
  timestamp: string;
  auditId?: string;
}
