import {
  APP_REGISTRY,
  type AppRegistryEntry,
} from '../../../../../packages/core/src/registry';
import { LOGO, HIDDEN_APPS } from './constants';
import type { AppEntry } from './types';
import type { ContextItem } from '../../types/context.types';

export const INITIAL_CONTEXT: readonly ContextItem[] = APP_REGISTRY
  .filter((e: AppRegistryEntry) => !HIDDEN_APPS.has(e.label))
  .slice(0, 3)
  .map((e: AppRegistryEntry) => ({
    id: e.key,
    name: e.label,
    health: e.healthContext.health,
    insight: e.healthContext.insight,
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

export const ECOSYSTEM = APPS.slice(0, 3);

export function deriveHealth(
  items: readonly ContextItem[],
): 'green' | 'yellow' | 'red' {
  if (items.some(i => i.health === 'red')) return 'red';
  if (items.some(i => i.health === 'yellow')) return 'yellow';
  return 'green';
}
