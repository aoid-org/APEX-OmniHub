import { OMNIDASH_NAV_ITEMS } from '@/omnidash/types';

import { OMNIDASH_FEATURE_REGISTRY } from './featureRegistry';
import { OMNIDASH_WIDGET_REGISTRY } from './widgetRegistry';

export interface HeaderAction {
  readonly id: 'connect-ai' | 'persona' | 'byom';
  readonly label: string;
  readonly required: boolean;
}

export interface RegisteredRoute {
  readonly path: string;
  readonly kind: 'page' | 'panel';
}

export const HEADER_ACTIONS: readonly HeaderAction[] = [
  { id: 'connect-ai', label: 'Connect AI', required: true },
  { id: 'persona', label: 'Persona', required: true },
] as const;

export const OMNIDASH_UI_REGISTRY = {
  features: OMNIDASH_FEATURE_REGISTRY,
  widgets: OMNIDASH_WIDGET_REGISTRY,
  navItems: OMNIDASH_NAV_ITEMS,
  routes: [
    { path: '/omnidash', kind: 'page' as const },
    ...OMNIDASH_NAV_ITEMS.filter((item) => item.to !== '/omnidash').map((item) => ({
      path: item.to,
      kind: 'panel' as const,
    })),
  ],
  headerActions: HEADER_ACTIONS,
};
