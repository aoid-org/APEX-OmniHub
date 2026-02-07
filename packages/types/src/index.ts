/**
 * @apex/types - Shared TypeScript types for the APEX ecosystem
 *
 * Domain types used across apps and packages.
 */

// Semantic domain types - intentionally distinct from raw `string` for documentation and refactoring
export type UserId = string & {}; // NOSONAR - semantic domain alias
export type TenantId = string & {}; // NOSONAR - semantic domain alias
export type ConnectorId = string & {}; // NOSONAR - semantic domain alias
export type CorrelationId = string & {}; // NOSONAR - semantic domain alias

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: UserId;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type RiskLane = 'GREEN' | 'YELLOW' | 'RED' | 'BLOCKED';

export interface ManModeDecision {
  lane: RiskLane;
  tool: string;
  params: Record<string, unknown>;
  context: {
    userId: UserId;
    sessionId: string;
  };
  requiresApproval: boolean;
}

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastChecked: Date;
  details?: Record<string, unknown>;
}
