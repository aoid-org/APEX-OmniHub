import {
  APP_REGISTRY,
  type AppRegistryEntry,
} from '../../../../../packages/core/src/registry';
import { LOGO, HIDDEN_APPS } from './constants';
import type { AppEntry } from './types';
import type { OmniSlateContextItem } from '../../types/context.types';

export const INITIAL_CONTEXT: readonly OmniSlateContextItem[] = APP_REGISTRY
  .filter((e: AppRegistryEntry) => !HIDDEN_APPS.has(e.label))
  .slice(0, 3)
  .map((e: AppRegistryEntry) => ({
    id: e.key,
    kind: 'apex_app',
    label: e.label,
    source: 'system',
    health: (e.healthContext.health === 'red' ? 'broken' : e.healthContext.health === 'yellow' ? 'warning' : 'healthy'),
    failureReason: e.healthContext.insight,
    metadata: {},
    droppedAt: new Date().toISOString()
  }));

export const APPS: readonly AppEntry[] = APP_REGISTRY
  .filter((e: AppRegistryEntry) => !HIDDEN_APPS.has(e.label))
  .map((e: AppRegistryEntry) => ({
    name: e.label,
    cat: e.category,
    logo: LOGO(e.logoDomain),
    synced: `${e.dashboard.syncedMinutesAgo}m`,
    status: e.dashboard.status,
  }));

export function deriveHealth(
  items: readonly OmniSlateContextItem[],
): 'green' | 'yellow' | 'red' {
  if (items.some(i => i.health === 'broken')) return 'red';
  if (items.some(i => i.health === 'warning')) return 'yellow';
  return 'green';
}
