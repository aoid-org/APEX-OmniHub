/**
 * OmniDash Widget Registry
 * @version 1.0.0
 * @module src/omnidash/widgetRegistry
 *
 * APEX STANDARDS ENFORCED:
 * - Every dashboard widget panel (mapped to a nav key) must be registered here
 * - Strict alignment with OmniDashLayout.tsx architecture
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { OmniDashFeatureId, OmniDashFeatureRole } from './featureRegistry';

// ============================================================================
// Types
// ============================================================================

export type OmniDashWidgetId =
  | 'omniboard'
  | 'omniskills'
  | 'physiomni'
  | 'audits'
  | 'links'
  | 'automations'
  | 'workflows'
  | 'files'
  | 'billing'
  | 'settings';

export interface OmniDashWidgetDef {
  readonly id: OmniDashWidgetId;
  readonly label: string;
  readonly featureId: OmniDashFeatureId;
  readonly component: string;
  readonly navKey: string;
  readonly route: string;
  readonly lazy: boolean;
  readonly permissions: OmniDashFeatureRole;
  readonly tags: readonly string[];
}

// ============================================================================
// Registry
// ============================================================================

export const OMNIDASH_WIDGET_REGISTRY: Readonly<Record<OmniDashWidgetId, OmniDashWidgetDef>> = {
  omniboard: {
    id: 'omniboard',
    label: 'OmniBoard',
    featureId: 'omniboard',
    component: 'Today.tsx',
    navKey: 'omniboard',
    route: '/omnidash',
    lazy: false,
    permissions: 'user',
    tags: ['dashboard'],
  },
  omniskills: {
    id: 'omniskills',
    label: 'OmniSkills',
    featureId: 'omniskills',
    component: 'Tasks.tsx',
    navKey: 'omniskills',
    route: '/omnidash/tasks',
    lazy: true,
    permissions: 'user',
    tags: ['execution'],
  },
  physiomni: {
    id: 'physiomni',
    label: 'PhysiOmni',
    featureId: 'physiomni',
    component: 'Runs.tsx',
    navKey: 'physiomni',
    route: '/omnidash/runs',
    lazy: true,
    permissions: 'user',
    tags: ['runs', 'hardware'],
  },
  audits: {
    id: 'audits',
    label: 'Audits',
    featureId: 'audits',
    component: 'Approvals.tsx',
    navKey: 'audits',
    route: '/omnidash/approvals',
    lazy: true,
    permissions: 'admin',
    tags: ['governance', 'security'],
  },
  links: {
    id: 'links',
    label: 'Links',
    featureId: 'links',
    component: 'Integrations.tsx',
    navKey: 'links',
    route: '/omnidash/integrations',
    lazy: true,
    permissions: 'user',
    tags: ['omnilink', 'connections'],
  },
  automations: {
    id: 'automations',
    label: 'Automations',
    featureId: 'automations',
    component: 'Pipeline.tsx',
    navKey: 'automations',
    route: '/omnidash/pipeline',
    lazy: true,
    permissions: 'user',
    tags: ['triggers', 'pipeline'],
  },
  workflows: {
    id: 'workflows',
    label: 'Workflows',
    featureId: 'workflows',
    component: 'WorkflowStudio.tsx',
    navKey: 'workflows',
    route: '/omnidash/workflows',
    lazy: true,
    permissions: 'user',
    tags: ['builder'],
  },
  files: {
    id: 'files',
    label: 'Files',
    featureId: 'files',
    component: 'Events.tsx',
    navKey: 'files',
    route: '/omnidash/events',
    lazy: true,
    permissions: 'user',
    tags: ['documents', 'logs'],
  },
  billing: {
    id: 'billing',
    label: 'Billing',
    featureId: 'billing',
    component: 'Kpis.tsx',
    navKey: 'billing',
    route: '/omnidash/kpis',
    lazy: true,
    permissions: 'admin',
    tags: ['finance', 'metrics'],
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    featureId: 'settings',
    component: 'Ops.tsx',
    navKey: 'settings',
    route: '/omnidash/ops',
    lazy: true,
    permissions: 'admin',
    tags: ['configuration', 'ops'],
  },
} as const;

// ============================================================================
// Helpers
// ============================================================================

export function getWidgetForNavKey(navKey: string): OmniDashWidgetDef | null {
  return (
    Object.values(OMNIDASH_WIDGET_REGISTRY).find((w) => w.navKey === navKey) ?? null
  );
}

export function getWidgetsByPermission(role: OmniDashFeatureRole): OmniDashWidgetDef[] {
  const hierarchy: Record<OmniDashFeatureRole, OmniDashFeatureRole[]> = {
    admin: ['admin', 'user', 'public'],
    user: ['user', 'public'],
    public: ['public'],
  };
  const allowedRoles = hierarchy[role];
  return Object.values(OMNIDASH_WIDGET_REGISTRY).filter(
    (w) => allowedRoles.includes(w.permissions),
  );
}
