/**
 * OmniSlate Universal Context Engine Types
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/types/context.types
 */

export type OmniSlateContextKind =
  | 'apex_app'
  | 'third_party_app'
  | 'widget'
  | 'panel'
  | 'file'
  | 'link'
  | 'text'
  | 'media'
  | 'workflow'
  | 'incident'
  | 'unknown';

export type OmniSlateHealth = 'healthy' | 'warning' | 'broken' | 'unknown';

export interface OmniSlateContextItem {
  readonly id: string;
  readonly kind: OmniSlateContextKind;
  readonly label: string;
  readonly iconUrl?: string;
  readonly iconKey?: string;
  readonly source: 'drag' | 'paste' | 'upload' | 'system';
  readonly health: OmniSlateHealth;
  readonly status?: string;
  readonly failureReason?: string;
  readonly metadata: Record<string, unknown>;
  readonly droppedAt: string;
}
