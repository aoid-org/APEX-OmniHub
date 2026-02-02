/**
 * APEX OmniHub Feature Registry
 * 
 * Single Source of Truth for all features, routes, and navigation.
 * NO GHOST FEATURES: Every visible feature must be registered here.
 * 
 * @example
 * {
 *   id: "omnidash.tasks",
 *   title: "Tasks",
 *   route: "/omnidash/tasks",
 *   nav: { section: "OmniDash", icon: ClipboardList, order: 20 },
 *   status: "demo",
 *   modeBehavior: { demo: "simulate", auth: "allow" },
 *   gateReason: "",
 *   dataDeps: ["demoStore:tasks", "supabase:tasks_table"]
 * }
 */

import {
  Home,
  LogIn,
  Shield,
  Heart,
  Languages,
  Bot,
  Settings,
  LayoutDashboard,
  Link2,
  FileText,
  Zap,
  Plug,
  MessageSquare,
  CheckSquare,
  Activity,
  Calendar,
  BarChart3,
  Gauge,
  Cpu,
  Users,
  ClipboardList,
  Play,
  ThumbsUp,
  Server,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type FeatureStatus = 'ready' | 'demo' | 'authOnly' | 'disabled';

export type ModeBehavior = {
  demo: 'allow' | 'simulate' | 'lock';
  auth: 'allow' | 'lock';
};

export type NavConfig = {
  section: string;
  icon: LucideIcon;
  order: number;
} | null;

export interface Feature {
  /** Unique identifier (dot-separated hierarchy) */
  id: string;
  /** User-facing title */
  title: string;
  /** Route path */
  route: string;
  /** Navigation config (null = not in nav) */
  nav: NavConfig;
  /** Feature status */
  status: FeatureStatus;
  /** Behavior in demo vs authenticated modes */
  modeBehavior: ModeBehavior;
  /** Reason for lock/disable (required when status !== 'ready') */
  gateReason: string;
  /** Data dependencies for this feature */
  dataDeps: string[];
  /** Parent feature ID for nested routes */
  parent?: string;
  /** Whether this is a public route (no auth required at all) */
  isPublic?: boolean;
}

// ============================================================================
// FEATURE REGISTRY
// ============================================================================

export const featureRegistry: Feature[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC ROUTES (No auth required)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'core.home',
    title: 'Home',
    route: '/',
    nav: null, // Entry gate, not in nav
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'core.auth',
    title: 'Sign In',
    route: '/auth',
    nav: null,
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: ['supabase:auth'],
    isPublic: true,
  },
  {
    id: 'core.login',
    title: 'Login',
    route: '/login',
    nav: null,
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: ['supabase:auth'],
    isPublic: true,
  },
  {
    id: 'core.privacy',
    title: 'Privacy Policy',
    route: '/privacy',
    nav: null,
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'core.health',
    title: 'Health Check',
    route: '/health',
    nav: null,
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'core.techSpecs',
    title: 'Tech Specs',
    route: '/tech-specs',
    nav: null,
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'core.marketing',
    title: 'Marketing',
    route: '/marketing',
    nav: null,
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },

  // ──────────────────────────────────────────────────────────────────────────
  // OMNILINK MOBILE ROUTES
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'omnilink.translation',
    title: 'Translation',
    route: '/translation',
    nav: { section: 'OmniLink', icon: Languages, order: 10 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:translations'],
  },
  {
    id: 'omnilink.agent',
    title: 'Agent',
    route: '/agent',
    nav: { section: 'OmniLink', icon: Bot, order: 20 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:agent'],
  },
  {
    id: 'omnilink.settings',
    title: 'Settings',
    route: '/settings',
    nav: { section: 'OmniLink', icon: Settings, order: 30 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:settings', 'supabase:user_settings'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // LEGACY DASHBOARD ROUTES
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'legacy.dashboard',
    title: 'Dashboard',
    route: '/dashboard',
    nav: { section: 'Legacy', icon: LayoutDashboard, order: 10 },
    status: 'authOnly',
    modeBehavior: { demo: 'lock', auth: 'allow' },
    gateReason: 'Requires authentication to view real data',
    dataDeps: ['supabase:links', 'supabase:files', 'supabase:automations', 'supabase:integrations'],
  },
  {
    id: 'legacy.links',
    title: 'Links',
    route: '/links',
    nav: { section: 'Legacy', icon: Link2, order: 20 },
    status: 'authOnly',
    modeBehavior: { demo: 'lock', auth: 'allow' },
    gateReason: 'Requires authentication',
    dataDeps: ['supabase:links'],
  },
  {
    id: 'legacy.files',
    title: 'Files',
    route: '/files',
    nav: { section: 'Legacy', icon: FileText, order: 30 },
    status: 'authOnly',
    modeBehavior: { demo: 'lock', auth: 'allow' },
    gateReason: 'Requires authentication',
    dataDeps: ['supabase:files'],
  },
  {
    id: 'legacy.automations',
    title: 'Automations',
    route: '/automations',
    nav: { section: 'Legacy', icon: Zap, order: 40 },
    status: 'authOnly',
    modeBehavior: { demo: 'lock', auth: 'allow' },
    gateReason: 'Requires authentication',
    dataDeps: ['supabase:automations'],
  },
  {
    id: 'legacy.integrations',
    title: 'Integrations',
    route: '/integrations',
    nav: { section: 'Legacy', icon: Plug, order: 50 },
    status: 'authOnly',
    modeBehavior: { demo: 'lock', auth: 'allow' },
    gateReason: 'Requires authentication',
    dataDeps: ['supabase:integrations'],
  },
  {
    id: 'legacy.apex',
    title: 'APEX Assistant',
    route: '/apex',
    nav: { section: 'Legacy', icon: MessageSquare, order: 60 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:apex', 'supabase:conversations'],
  },
  {
    id: 'legacy.todos',
    title: 'Todos',
    route: '/todos',
    nav: { section: 'Legacy', icon: CheckSquare, order: 70 },
    status: 'authOnly',
    modeBehavior: { demo: 'lock', auth: 'allow' },
    gateReason: 'Requires authentication',
    dataDeps: ['supabase:todos'],
  },
  {
    id: 'legacy.diagnostics',
    title: 'Diagnostics',
    route: '/diagnostics',
    nav: { section: 'Legacy', icon: Activity, order: 80 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:diagnostics'],
  },
  {
    id: 'legacy.omnitrace',
    title: 'OmniTrace',
    route: '/omnitrace',
    nav: { section: 'Legacy', icon: Play, order: 90 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:runs'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // OMNIDASH ROUTES
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'omnidash',
    title: 'OmniDash',
    route: '/omnidash',
    nav: { section: 'OmniDash', icon: Gauge, order: 0 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:today'],
  },
  {
    id: 'omnidash.today',
    title: 'Today',
    route: '/omnidash',
    nav: { section: 'OmniDash', icon: Calendar, order: 10 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:today', 'supabase:omnidash_today_items'],
    parent: 'omnidash',
  },
  {
    id: 'omnidash.pipeline',
    title: 'Pipeline',
    route: '/omnidash/pipeline',
    nav: { section: 'OmniDash', icon: BarChart3, order: 20 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:pipeline'],
    parent: 'omnidash',
  },
  {
    id: 'omnidash.kpis',
    title: 'KPIs',
    route: '/omnidash/kpis',
    nav: { section: 'OmniDash', icon: BarChart3, order: 30 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:kpis'],
    parent: 'omnidash',
  },
  {
    id: 'omnidash.ops',
    title: 'Ops',
    route: '/omnidash/ops',
    nav: { section: 'OmniDash', icon: Cpu, order: 40 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:ops'],
    parent: 'omnidash',
  },
  {
    id: 'omnidash.integrations',
    title: 'Integrations',
    route: '/omnidash/integrations',
    nav: { section: 'OmniDash', icon: Plug, order: 50 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:integrations'],
    parent: 'omnidash',
  },
  {
    id: 'omnidash.events',
    title: 'Events',
    route: '/omnidash/events',
    nav: { section: 'OmniDash', icon: Zap, order: 60 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:events'],
    parent: 'omnidash',
  },
  {
    id: 'omnidash.entities',
    title: 'Entities',
    route: '/omnidash/entities',
    nav: { section: 'OmniDash', icon: Users, order: 70 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:entities'],
    parent: 'omnidash',
  },
  {
    id: 'omnidash.runs',
    title: 'Runs',
    route: '/omnidash/runs',
    nav: { section: 'OmniDash', icon: Play, order: 80 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:runs'],
    parent: 'omnidash',
  },
  {
    id: 'omnidash.approvals',
    title: 'Approvals',
    route: '/omnidash/approvals',
    nav: { section: 'OmniDash', icon: ThumbsUp, order: 90 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:approvals'],
    parent: 'omnidash',
  },
  {
    id: 'omnidash.localAgents',
    title: 'Local Agents',
    route: '/omnidash/local-agents',
    nav: { section: 'OmniDash', icon: Server, order: 100 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:localAgents'],
    parent: 'omnidash',
  },
  {
    id: 'omnidash.tasks',
    title: 'Tasks',
    route: '/omnidash/tasks',
    nav: { section: 'OmniDash', icon: ClipboardList, order: 110 },
    status: 'demo',
    modeBehavior: { demo: 'simulate', auth: 'allow' },
    gateReason: '',
    dataDeps: ['demoStore:tasks', 'supabase:tasks_table'],
    parent: 'omnidash',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // APP ROUTES (External links / showcase)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'apps.tradeline247',
    title: 'TradeLine 24/7',
    route: '/apps/tradeline247',
    nav: { section: 'Apps', icon: Briefcase, order: 10 },
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'apps.autorepai',
    title: 'AutoRepAi',
    route: '/apps/autorepai',
    nav: { section: 'Apps', icon: Briefcase, order: 20 },
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'apps.keepsafe',
    title: 'KeepSafe',
    route: '/apps/keepsafe',
    nav: { section: 'Apps', icon: Shield, order: 30 },
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'apps.strideguide',
    title: 'StrideGuide',
    route: '/apps/strideguide',
    nav: { section: 'Apps', icon: Heart, order: 40 },
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'apps.robuxminerpro',
    title: 'RobuxMinerPro',
    route: '/apps/robuxminerpro',
    nav: { section: 'Apps', icon: Briefcase, order: 50 },
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'apps.flowbills',
    title: 'FLOWBills',
    route: '/apps/flowbills',
    nav: { section: 'Apps', icon: Briefcase, order: 60 },
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'apps.jubeelove',
    title: 'JubeeLove',
    route: '/apps/jubeelove',
    nav: { section: 'Apps', icon: Heart, order: 70 },
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
  {
    id: 'apps.builtCanadian',
    title: 'Built Canadian',
    route: '/apps/built-canadian',
    nav: { section: 'Apps', icon: Briefcase, order: 80 },
    status: 'ready',
    modeBehavior: { demo: 'allow', auth: 'allow' },
    gateReason: '',
    dataDeps: [],
    isPublic: true,
  },
];

// ============================================================================
// REGISTRY UTILITIES
// ============================================================================

/**
 * Get a feature by its ID
 */
export function getFeature(id: string): Feature | undefined {
  return featureRegistry.find((f) => f.id === id);
}

/**
 * Get a feature by its route path
 */
export function getFeatureByRoute(route: string): Feature | undefined {
  return featureRegistry.find((f) => f.route === route);
}

/**
 * Get all features for a specific section
 */
export function getFeaturesBySection(section: string): Feature[] {
  return featureRegistry
    .filter((f) => f.nav?.section === section)
    .sort((a, b) => (a.nav?.order ?? 0) - (b.nav?.order ?? 0));
}

/**
 * Get all navigable features (features that appear in nav)
 */
export function getNavigableFeatures(): Feature[] {
  return featureRegistry
    .filter((f) => f.nav !== null && f.status !== 'disabled')
    .sort((a, b) => (a.nav?.order ?? 0) - (b.nav?.order ?? 0));
}

/**
 * Get all unique navigation sections
 */
export function getNavSections(): string[] {
  const sections = new Set<string>();
  featureRegistry.forEach((f) => {
    if (f.nav?.section) {
      sections.add(f.nav.section);
    }
  });
  return Array.from(sections);
}

/**
 * Check if a feature is accessible in the current mode
 */
export function isFeatureAccessible(
  featureId: string,
  isDemo: boolean,
  isAuthenticated: boolean
): { accessible: boolean; reason: string } {
  const feature = getFeature(featureId);

  if (!feature) {
    return { accessible: false, reason: 'Feature not found in registry (fail-closed)' };
  }

  if (feature.status === 'disabled') {
    return { accessible: false, reason: feature.gateReason || 'Feature is disabled' };
  }

  if (feature.isPublic) {
    return { accessible: true, reason: '' };
  }

  if (isDemo) {
    if (feature.modeBehavior.demo === 'lock') {
      return { accessible: false, reason: feature.gateReason || 'Requires authentication' };
    }
    return { accessible: true, reason: '' };
  }

  if (isAuthenticated) {
    if (feature.modeBehavior.auth === 'lock') {
      return { accessible: false, reason: feature.gateReason || 'Feature locked' };
    }
    return { accessible: true, reason: '' };
  }

  // Not demo, not authenticated
  if (feature.status === 'authOnly') {
    return { accessible: false, reason: 'Sign in required' };
  }

  return { accessible: false, reason: 'Authentication required' };
}

/**
 * Get all registered routes (for router validation)
 */
export function getAllRoutes(): string[] {
  return featureRegistry.map((f) => f.route);
}

/**
 * Validate that a route exists in the registry
 */
export function isRouteRegistered(route: string): boolean {
  return featureRegistry.some((f) => f.route === route);
}
