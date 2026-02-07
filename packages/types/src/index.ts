/**
 * @apex/types - Shared TypeScript types for the APEX ecosystem
 *
 * Domain types used across apps and packages.
 */

// Common types used across the APEX platform

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
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
    userId: string;
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
