import type { OmniDashNavItem } from '@/omnidash/types';
import { OMNIDASH_NAV_ITEMS } from '@/omnidash/types';

export interface HeaderAction {
  readonly id: 'connect-ai' | 'persona';
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

export const OMNIDASH_UI_REGISTRY: {
  readonly navItems: readonly OmniDashNavItem[];
  readonly routes: readonly RegisteredRoute[];
  readonly headerActions: readonly HeaderAction[];
} = {
  navItems: OMNIDASH_NAV_ITEMS,
  routes: [
    { path: '/omnidash', kind: 'page' },
    ...OMNIDASH_NAV_ITEMS.filter((item) => item.to !== '/omnidash').map((item) => ({
      path: item.to,
      kind: 'panel' as const,
    })),
  ],
  headerActions: HEADER_ACTIONS,
};
