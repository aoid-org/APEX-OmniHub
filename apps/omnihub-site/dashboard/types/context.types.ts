/**
 * OmniSlate Universal Context Engine Types
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/types/context.types
 */

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface ContextItem {
  readonly id: string;
  readonly name: string;
  readonly health: HealthStatus;
  readonly insight: string;
  readonly payload?: Record<string, unknown>;
  readonly sourceApp?: string; // Links to appIntegrationOwnership rules
}
