/**
 * OmniDash Feature Registry
 * @version 1.0.0
 * @module src/omnidash/featureRegistry
 *
 * APEX STANDARDS ENFORCED:
 * - All features declared here; no ad-hoc feature checks in components
 * - Env-driven toggles via VITE_OMNIDASH_FEATURES_DISABLED (comma-separated disabled ids)
 * - requiredRole enforced by useAdminAccess() — never trust client-side only
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ============================================================================
// Types
// ============================================================================

export type OmniDashFeatureId =
  | 'omniboard'
  | 'omniskills'
  | 'physiomni'
  | 'audits'
  | 'links'
  | 'automations'
  | 'workflows'
  | 'files'
  | 'billing'
  | 'settings'
  // Header
  | 'connect_ai'
  | 'zero_trust_badge'
  | 'global_search'
  // Sidebar Ops
  | 'ops_controls'
  | 'omnitrace'
  | 'analytics_panel'
  // Center Panels
  | 'apex_agent'
  | 'omnislate'
  | 'top_outcomes'
  | 'integrated_apps';

export type OmniDashFeatureRole = 'admin' | 'user' | 'public';

export interface OmniDashFeature {
  readonly id: OmniDashFeatureId;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly requiredRole: OmniDashFeatureRole;
  readonly tags: readonly string[];
}

// ============================================================================
// Runtime Env
// ============================================================================

const _disabledIds: Set<string> = new Set(
  (import.meta.env.VITE_OMNIDASH_FEATURES_DISABLED ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean),
);

function _enabled(id: OmniDashFeatureId): boolean {
  return !_disabledIds.has(id);
}

// ============================================================================
// Registry
// ============================================================================

export const OMNIDASH_FEATURE_REGISTRY: Readonly<Record<OmniDashFeatureId, OmniDashFeature>> = {
  // Nav items mapped features
  omniboard: {
    id: 'omniboard',
    label: 'OmniBoard',
    description: 'The primary dashboard landing page with the Tri-Pane layout.',
    enabled: _enabled('omniboard'),
    requiredRole: 'user',
    tags: ['nav', 'dashboard'],
  },
  omniskills: {
    id: 'omniskills',
    label: 'OmniSkills',
    description: 'Task and skill execution capabilities.',
    enabled: _enabled('omniskills'),
    requiredRole: 'user',
    tags: ['nav', 'skills'],
  },
  physiomni: {
    id: 'physiomni',
    label: 'PhysiOmni',
    description: 'Physical integration runs and hardware telemetry view.',
    enabled: _enabled('physiomni'),
    requiredRole: 'user',
    tags: ['nav', 'hardware'],
  },
  audits: {
    id: 'audits',
    label: 'Audits',
    description: 'Compliance, security audits, and human-in-the-loop approvals.',
    enabled: _enabled('audits'),
    requiredRole: 'admin',
    tags: ['nav', 'security', 'governance'],
  },
  links: {
    id: 'links',
    label: 'Links',
    description: 'Third-party integration management and OAuth links.',
    enabled: _enabled('links'),
    requiredRole: 'user',
    tags: ['nav', 'integrations'],
  },
  automations: {
    id: 'automations',
    label: 'Automations',
    description: 'Pipeline of active triggers, triggers, and automated logic.',
    enabled: _enabled('automations'),
    requiredRole: 'user',
    tags: ['nav', 'automation'],
  },
  workflows: {
    id: 'workflows',
    label: 'Workflows',
    description: 'Visual workflow studio for APEX Agents.',
    enabled: _enabled('workflows'),
    requiredRole: 'user',
    tags: ['nav', 'workflows'],
  },
  files: {
    id: 'files',
    label: 'Files',
    description: 'Event and document file logs via OmniLink.',
    enabled: _enabled('files'),
    requiredRole: 'user',
    tags: ['nav', 'files'],
  },
  billing: {
    id: 'billing',
    label: 'Billing',
    description: 'Billing KPIs and metered usage analytics.',
    enabled: _enabled('billing'),
    requiredRole: 'admin',
    tags: ['nav', 'billing'],
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    description: 'Operational settings and system configurations.',
    enabled: _enabled('settings'),
    requiredRole: 'admin',
    tags: ['nav', 'ops'],
  },
  // Header components
  connect_ai: {
    id: 'connect_ai',
    label: 'Connect AI',
    description: 'Header action for BYOM OAuth AI connection.',
    enabled: _enabled('connect_ai'),
    requiredRole: 'admin',
    tags: ['header', 'ai'],
  },
  zero_trust_badge: {
    id: 'zero_trust_badge',
    label: 'Zero Trust Badge',
    description: 'Header indicator for zero-trust authorization context.',
    enabled: _enabled('zero_trust_badge'),
    requiredRole: 'user',
    tags: ['header', 'security'],
  },
  global_search: {
    id: 'global_search',
    label: 'Global Search',
    description: 'OmniSearch input for command node search.',
    enabled: _enabled('global_search'),
    requiredRole: 'user',
    tags: ['header', 'search'],
  },
  // Ops sidebar components
  ops_controls: {
    id: 'ops_controls',
    label: 'Ops Controls',
    description: 'Sidebar toggles for Demo Mode, Connected Ecosystem, and KPIs.',
    enabled: _enabled('ops_controls'),
    requiredRole: 'admin',
    tags: ['sidebar', 'ops'],
  },
  omnitrace: {
    id: 'omnitrace',
    label: 'OmniTrace',
    description: 'Live feed of workflow logs and system traces.',
    enabled: _enabled('omnitrace'),
    requiredRole: 'user',
    tags: ['sidebar', 'tracing'],
  },
  analytics_panel: {
    id: 'analytics_panel',
    label: 'Analytics Panel',
    description: 'Task status, success rate, and latency metric blocks.',
    enabled: _enabled('analytics_panel'),
    requiredRole: 'user',
    tags: ['sidebar', 'kpis'],
  },
  // Main Panel components
  apex_agent: {
    id: 'apex_agent',
    label: 'APEX Agent',
    description: 'Main AI Avatar display with session timer and media controls.',
    enabled: _enabled('apex_agent'),
    requiredRole: 'user',
    tags: ['main', 'ai'],
  },
  omnislate: {
    id: 'omnislate',
    label: 'OmniSlate',
    description: 'Interactive prompt area for contextual execution and quick-actions.',
    enabled: _enabled('omnislate'),
    requiredRole: 'user',
    tags: ['main', 'input'],
  },
  top_outcomes: {
    id: 'top_outcomes',
    label: 'Top 3 Outcomes',
    description: 'Top organizational priority cards with real-time financial metrics.',
    enabled: _enabled('top_outcomes'),
    requiredRole: 'user',
    tags: ['main', 'analytics'],
  },
  integrated_apps: {
    id: 'integrated_apps',
    label: 'Integrated Apps',
    description: 'Ecosystem grid displaying connected external services and sync status.',
    enabled: _enabled('integrated_apps'),
    requiredRole: 'user',
    tags: ['main', 'integrations'],
  },
} as const;

// ============================================================================
// Helpers
// ============================================================================

export function isFeatureEnabled(id: string): boolean {
  const feature = OMNIDASH_FEATURE_REGISTRY[id as OmniDashFeatureId];
  return feature?.enabled ?? false;
}

export function getFeaturesByRole(role: OmniDashFeatureRole): OmniDashFeature[] {
  const hierarchy: Record<OmniDashFeatureRole, OmniDashFeatureRole[]> = {
    admin: ['admin', 'user', 'public'],
    user: ['user', 'public'],
    public: ['public'],
  };
  const allowedRoles = hierarchy[role];
  return Object.values(OMNIDASH_FEATURE_REGISTRY).filter(
    (f) => f.enabled && allowedRoles.includes(f.requiredRole),
  );
}
