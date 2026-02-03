/**
 * Feature Registry - Central source of truth for all OmniDash features
 * 
 * Each feature has:
 * - Unique ID and path
 * - Display metadata (label, icon, description)
 * - Access control (requiredScopes)
 * - Category for grouping
 */

import type { LucideIcon } from 'lucide-react';
import {
  Home,
  LayoutDashboard,
  Calendar,
  ListChecks,
  Play,
  Building2,
  Zap,
  Activity,
  Workflow,
  CheckSquare,
  Settings,
  Shield,
  Bot,
  MessageSquare,
  Link2,
  FileText,
  Heart,
  Wrench,
  Globe,
  Lock,
  BarChart3,
  Cpu,
  Network,
  Layers,
  Code,
  Eye,
  RefreshCw,
  Fingerprint,
  Target,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type FeatureCategory =
  | 'core'
  | 'operations'
  | 'integrations'
  | 'security'
  | 'monitoring'
  | 'development'
  | 'settings';

export type AccessScope =
  | 'public'
  | 'authenticated'
  | 'admin'
  | 'developer'
  | 'demo';

export interface FeatureDefinition {
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly category: FeatureCategory;
  readonly requiredScopes: readonly AccessScope[];
  readonly isEnabled: boolean;
  readonly order: number;
}

// ============================================================================
// Feature Registry
// ============================================================================

export const FEATURE_REGISTRY: readonly FeatureDefinition[] = [
  // Core Features
  {
    id: 'home',
    path: '/',
    label: 'Home',
    description: 'Landing page and overview',
    icon: Home,
    category: 'core',
    requiredScopes: ['public'],
    isEnabled: true,
    order: 0,
  },
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Main dashboard overview',
    icon: LayoutDashboard,
    category: 'core',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 1,
  },
  {
    id: 'omnidash-today',
    path: '/omnidash/today',
    label: 'Today',
    description: 'Daily overview and tasks',
    icon: Calendar,
    category: 'core',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 2,
  },
  {
    id: 'omnidash-tasks',
    path: '/omnidash/tasks',
    label: 'Tasks',
    description: 'Task management',
    icon: ListChecks,
    category: 'core',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 3,
  },
  {
    id: 'omnidash-runs',
    path: '/omnidash/runs',
    label: 'Runs',
    description: 'Workflow execution history',
    icon: Play,
    category: 'core',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 4,
  },
  {
    id: 'omnidash-entities',
    path: '/omnidash/entities',
    label: 'Entities',
    description: 'Entity management',
    icon: Building2,
    category: 'core',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 5,
  },
  {
    id: 'omnidash-events',
    path: '/omnidash/events',
    label: 'Events',
    description: 'Event stream viewer',
    icon: Zap,
    category: 'core',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 6,
  },

  // Operations
  {
    id: 'omnidash-kpis',
    path: '/omnidash/kpis',
    label: 'KPIs',
    description: 'Key performance indicators',
    icon: BarChart3,
    category: 'operations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 10,
  },
  {
    id: 'omnidash-ops',
    path: '/omnidash/ops',
    label: 'Ops',
    description: 'Operations dashboard',
    icon: Activity,
    category: 'operations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 11,
  },
  {
    id: 'omnidash-pipeline',
    path: '/omnidash/pipeline',
    label: 'Pipeline',
    description: 'Sales and lead pipeline',
    icon: Workflow,
    category: 'operations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 12,
  },
  {
    id: 'omnidash-approvals',
    path: '/omnidash/approvals',
    label: 'Approvals',
    description: 'Pending approvals queue',
    icon: CheckSquare,
    category: 'operations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 13,
  },
  {
    id: 'automations',
    path: '/automations',
    label: 'Automations',
    description: 'Automation workflows',
    icon: RefreshCw,
    category: 'operations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 14,
  },

  // Integrations
  {
    id: 'omnidash-integrations',
    path: '/omnidash/integrations',
    label: 'Integrations',
    description: 'Third-party integrations',
    icon: Link2,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 20,
  },
  {
    id: 'integrations-page',
    path: '/integrations',
    label: 'All Integrations',
    description: 'Integration marketplace',
    icon: Network,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 21,
  },
  {
    id: 'links',
    path: '/links',
    label: 'Links',
    description: 'External links management',
    icon: Globe,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 22,
  },
  {
    id: 'files',
    path: '/files',
    label: 'Files',
    description: 'File storage and management',
    icon: FileText,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 23,
  },

  // AI & Agents
  {
    id: 'omnidash-local-agents',
    path: '/omnidash/local-agents',
    label: 'Local Agents',
    description: 'AI agent management',
    icon: Bot,
    category: 'core',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 7,
  },
  {
    id: 'agent',
    path: '/agent',
    label: 'Agent',
    description: 'AI agent interface',
    icon: MessageSquare,
    category: 'core',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 8,
  },
  {
    id: 'apex-assistant',
    path: '/apex',
    label: 'APEX Assistant',
    description: 'AI-powered assistant',
    icon: Sparkles,
    category: 'core',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 9,
  },
  {
    id: 'omnitrace',
    path: '/omnitrace',
    label: 'OmniTrace',
    description: 'Trace execution history',
    icon: Activity,
    category: 'monitoring',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 9,
  },
  {
    id: 'translation',
    path: '/translation',
    label: 'Translation',
    description: 'Semantic translation engine',
    icon: Layers,
    category: 'core',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 15,
  },

  // Security
  {
    id: 'auth',
    path: '/auth',
    label: 'Authentication',
    description: 'Login and signup',
    icon: Lock,
    category: 'security',
    requiredScopes: ['public'],
    isEnabled: true,
    order: 30,
  },
  {
    id: 'login',
    path: '/login',
    label: 'Login',
    description: 'Login alias',
    icon: Lock,
    category: 'security',
    requiredScopes: ['public'],
    isEnabled: true,
    order: 30,
  },
  {
    id: 'health',
    path: '/health',
    label: 'Health',
    description: 'System health status',
    icon: Heart,
    category: 'monitoring',
    requiredScopes: ['public'],
    isEnabled: true,
    order: 31,
  },
  {
    id: 'diagnostics',
    path: '/diagnostics',
    label: 'Diagnostics',
    description: 'System diagnostics',
    icon: Wrench,
    category: 'monitoring',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 32,
  },

  // Settings
  {
    id: 'settings',
    path: '/settings',
    label: 'Settings',
    description: 'Application settings',
    icon: Settings,
    category: 'settings',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 40,
  },
  {
    id: 'privacy',
    path: '/privacy',
    label: 'Privacy',
    description: 'Privacy policy',
    icon: Shield,
    category: 'settings',
    requiredScopes: ['public'],
    isEnabled: true,
    order: 41,
  },
  {
    id: 'tech-specs',
    path: '/tech-specs',
    label: 'Tech Specs',
    description: 'Technical specifications',
    icon: Code,
    category: 'development',
    requiredScopes: ['public'],
    isEnabled: true,
    order: 42,
  },

  // Development

  // Apps
  {
    id: 'apps-tradeline',
    path: '/apps/tradeline247',
    label: 'TradeLine 24/7',
    description: 'TradeLine 24/7 integration',
    icon: Target,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 60,
  },
  {
    id: 'apps-autorepai',
    path: '/apps/autorepai',
    label: 'AutoRep AI',
    description: 'AutoRep AI App',
    icon: Cpu,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 61,
  },
  {
    id: 'apps-keepsafe',
    path: '/apps/keepsafe',
    label: 'KeepSafe',
    description: 'KeepSafe App',
    icon: Shield,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 62,
  },
  {
    id: 'apps-strideguide',
    path: '/apps/strideguide',
    label: 'StrideGuide',
    description: 'StrideGuide App',
    icon: Play,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 63,
  },
  {
    id: 'apps-robuxminerpro',
    path: '/apps/robuxminerpro',
    label: 'RobuxMinerPro',
    description: 'RobuxMinerPro App',
    icon: Zap,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 64,
  },
  {
    id: 'apps-flowbills',
    path: '/apps/flowbills',
    label: 'FLOWBills',
    description: 'FLOWBills App',
    icon: FileText,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 65,
  },
  {
    id: 'apps-jubeelove',
    path: '/apps/jubeelove',
    label: 'JubeeLove',
    description: 'JubeeLove App',
    icon: Heart,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 66,
  },
  {
    id: 'apps-built-canadian',
    path: '/apps/built-canadian',
    label: 'Built Canadian',
    description: 'Built Canadian App',
    icon: Globe,
    category: 'integrations',
    requiredScopes: ['authenticated'],
    isEnabled: true,
    order: 67,
  },

  // Guardian & Security
  {
    id: 'guardian-status',
    path: '/guardian/status',
    label: 'Guardian Status',
    description: 'Guardian loop monitoring',
    icon: Eye,
    category: 'monitoring',
    requiredScopes: ['admin'],
    isEnabled: true,
    order: 70,
  },
  {
    id: 'zero-trust',
    path: '/zero-trust',
    label: 'Zero Trust',
    description: 'Zero trust security baseline',
    icon: Fingerprint,
    category: 'security',
    requiredScopes: ['admin'],
    isEnabled: true,
    order: 71,
  },

  // Dev Tools
  {
    id: 'todos',
    path: '/todos',
    label: 'Todos',
    description: 'Development todos',
    icon: ListChecks,
    category: 'development',
    requiredScopes: ['developer'],
    isEnabled: true,
    order: 80,
  },
] as const;

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Get feature by ID
 */
export function getFeatureById(id: string): FeatureDefinition | undefined {
  return FEATURE_REGISTRY.find((f) => f.id === id);
}

/**
 * Get feature by path
 */
export function getFeatureByPath(path: string): FeatureDefinition | undefined {
  return FEATURE_REGISTRY.find((f) => f.path === path);
}

/**
 * Get features by category
 */
export function getFeaturesByCategory(category: FeatureCategory): readonly FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((f) => f.category === category);
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): readonly FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((f) => f.isEnabled);
}

/**
 * Get features accessible with given scopes
 */
export function getAccessibleFeatures(userScopes: readonly AccessScope[]): readonly FeatureDefinition[] {
  return FEATURE_REGISTRY.filter((f) => 
    f.isEnabled && 
    f.requiredScopes.every((scope) => userScopes.includes(scope) || scope === 'public')
  );
}

/**
 * Check if user can access a feature
 */
export function canAccessFeature(featureId: string, userScopes: readonly AccessScope[]): boolean {
  const feature = getFeatureById(featureId);
  if (!feature || !feature.isEnabled) return false;
  return feature.requiredScopes.every(
    (scope) => userScopes.includes(scope) || scope === 'public'
  );
}

/**
 * Get all navigable routes (for route sweeping)
 */
export function getAllRoutes(): readonly string[] {
  return FEATURE_REGISTRY.filter((f) => f.isEnabled).map((f) => f.path);
}
