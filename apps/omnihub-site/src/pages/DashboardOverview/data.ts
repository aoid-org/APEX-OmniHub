import {
  EXTERNAL_INTEGRATIONS,
  type ExternalIntegrationEntry,
} from '../../../../../packages/core/src/omniBoardIntegrations';
import { LOGO } from './constants';
import type { ContextItem, AppEntry } from './types';

export const INITIAL_CONTEXT: readonly ContextItem[] = EXTERNAL_INTEGRATIONS
  .slice(0, 3)
  .map((e: ExternalIntegrationEntry) => ({
    name: e.label,
    health: e.healthContext.health,
    insight: e.healthContext.insight,
  }));

export const APPS: readonly AppEntry[] = EXTERNAL_INTEGRATIONS
  .map((e: ExternalIntegrationEntry) => ({
    name: e.label,
    cat: e.category,
    logo: LOGO(e.logoDomain),
    synced: `${e.dashboard.syncedMinutesAgo}m`,
    status: e.dashboard.status,
  }));

export const ECOSYSTEM = APPS.slice(0, 3);

export function deriveHealth(
  items: readonly ContextItem[],
): 'green' | 'yellow' | 'red' {
  if (items.some(i => i.health === 'red')) return 'red';
  if (items.some(i => i.health === 'yellow')) return 'yellow';
  return 'green';
}
