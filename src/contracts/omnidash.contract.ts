/**
 * OMNIDASH CONTRACT — Single Source of Truth
 * @module src/contracts/omnidash.contract.ts
 *
 * LOCK 1: Every Omnidash surface imports from this file.
 *         Zero hardcoded literals permitted outside the contract.
 *
 * AGENT PREAMBLE (Lock 6):
 *   "You may not invent, remove, rename, reroute, or restatus Omnidash apps
 *    outside omnidash.contract.ts. Write failing tests first. One logical
 *    change only. If blast radius exceeds 5 files, stop and report
 *    architecture change."
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';

// ============================================================================
// Contract Types
// ============================================================================

/** Launch modality when a user clicks an Omnidash app tile. */
export type LaunchMode = 'navigate' | 'oauth' | 'modal' | 'widget';

/** Widget rendering strategy for apps that open within the canvas. */
export type WidgetType = 'module' | 'iframe' | 'native' | null;

/** Integration status from the AppRegistry dashboard field. */
export type IntegrationStatus = 'Live' | 'Partial';

/** App category taxonomy. */
export type AppCategory = 'control-plane' | 'security' | 'automation' | 'operations' | 'platform';

/** Bounding box dimensions for widget default placement. */
export interface DefaultBounds {
  readonly width: number;
  readonly height: number;
}

/**
 * Canonical Omnidash App definition — the frozen contract shape.
 * Every property is readonly. Mutations are architecturally illegal.
 */
export interface OmniDashApp {
  /** Unique key matching the AppRegistry key. */
  readonly id: string;
  /** Display title shown on tiles, sidebar, and modals. */
  readonly title: string;
  /** Route path — always starts with /omnidash. */
  readonly route: `/omnidash${string}`;
  /** Current integration status. */
  readonly integrationStatus: IntegrationStatus;
  /** How the app launches on click. */
  readonly launchMode: LaunchMode;
  /** Widget rendering type (null = not a widget). */
  readonly widgetType: WidgetType;
  /** Default widget bounding box on the canvas. */
  readonly defaultBounds: DefaultBounds;
  /** Z-layer priority (higher = above). */
  readonly zLayer: number;
  /** App category for grouping. */
  readonly category: AppCategory;
}

// ============================================================================
// Zod Schema — Runtime validation boundary
// ============================================================================

export const omniDashAppSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  route: z.string().startsWith('/omnidash'),
  integrationStatus: z.enum(['Live', 'Partial']),
  launchMode: z.enum(['navigate', 'oauth', 'modal', 'widget']),
  widgetType: z.enum(['module', 'iframe', 'native']).nullable(),
  defaultBounds: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  zLayer: z.number().int().nonnegative(),
  category: z.enum(['control-plane', 'security', 'automation', 'operations', 'platform']),
}) satisfies z.ZodType<OmniDashApp>;

export const omniDashContractSchema = omniDashAppSchema.array().length(14);

// ============================================================================
// Contract Constants
// ============================================================================

/** Exact number of apps that must exist. Tests assert against this. */
export const OMNIDASH_APP_COUNT = 14 as const;

/** Required app IDs that must always be present. Tests assert against this. */
export const REQUIRED_APP_IDS = ['orchestrator', 'fortress'] as const;

/**
 * Blast-radius surface categories.
 * Used by scripts/omnidash-blast-radius.ts to classify file changes.
 */
export const BLAST_RADIUS_SURFACES = [
  'registry',
  'tiles',
  'routes',
  'modal engine',
  'canvas',
  'floating windows',
  'styles',
  'provider/store',
] as const;

export type BlastRadiusSurface = typeof BLAST_RADIUS_SURFACES[number];

// ============================================================================
// The 14-App Contract — FROZEN
// ============================================================================

const OMNIDASH_CONTRACT_SOURCE: readonly OmniDashApp[] = [
  {
    id: 'omniboard',
    title: 'OmniBoard',
    route: '/omnidash',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: null,
    defaultBounds: { width: 1200, height: 800 },
    zLayer: 0,
    category: 'control-plane',
  },
  {
    id: 'omniport',
    title: 'OmniPort',
    route: '/omnidash/omniport',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: 'module',
    defaultBounds: { width: 900, height: 600 },
    zLayer: 10,
    category: 'platform',
  },
  {
    id: 'maestro',
    title: 'Maestro',
    route: '/omnidash/maestro',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: 'module',
    defaultBounds: { width: 900, height: 600 },
    zLayer: 10,
    category: 'automation',
  },
  {
    id: 'fortress',
    title: 'Fortress',
    route: '/omnidash/fortress',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: 'module',
    defaultBounds: { width: 900, height: 600 },
    zLayer: 10,
    category: 'security',
  },
  {
    id: 'orchestrator',
    title: 'Orchestrator',
    route: '/omnidash/orchestrator',
    integrationStatus: 'Partial',
    launchMode: 'oauth',
    widgetType: null,
    defaultBounds: { width: 900, height: 600 },
    zLayer: 10,
    category: 'control-plane',
  },
  {
    id: 'omniskills',
    title: 'OmniSkills',
    route: '/omnidash/omniskills',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: 'module',
    defaultBounds: { width: 800, height: 500 },
    zLayer: 10,
    category: 'platform',
  },
  {
    id: 'physiomni',
    title: 'PhysiOmni',
    route: '/omnidash/physiomni',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: 'module',
    defaultBounds: { width: 800, height: 500 },
    zLayer: 10,
    category: 'operations',
  },
  {
    id: 'audits',
    title: 'Audits',
    route: '/omnidash/audits',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: 'module',
    defaultBounds: { width: 900, height: 600 },
    zLayer: 10,
    category: 'security',
  },
  {
    id: 'links',
    title: 'Links',
    route: '/omnidash/links',
    integrationStatus: 'Partial',
    launchMode: 'oauth',
    widgetType: 'module',
    defaultBounds: { width: 800, height: 500 },
    zLayer: 10,
    category: 'platform',
  },
  {
    id: 'automations',
    title: 'Automations',
    route: '/omnidash/automations',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: 'module',
    defaultBounds: { width: 900, height: 600 },
    zLayer: 10,
    category: 'automation',
  },
  {
    id: 'workflows',
    title: 'Workflows',
    route: '/omnidash/workflows',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: 'module',
    defaultBounds: { width: 900, height: 600 },
    zLayer: 10,
    category: 'automation',
  },
  {
    id: 'files',
    title: 'Files',
    route: '/omnidash/files',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: 'module',
    defaultBounds: { width: 800, height: 500 },
    zLayer: 10,
    category: 'operations',
  },
  {
    id: 'billing',
    title: 'Billing',
    route: '/omnidash/billing',
    integrationStatus: 'Partial',
    launchMode: 'oauth',
    widgetType: 'module',
    defaultBounds: { width: 800, height: 500 },
    zLayer: 10,
    category: 'operations',
  },
  {
    id: 'settings',
    title: 'Settings',
    route: '/omnidash/settings',
    integrationStatus: 'Live',
    launchMode: 'navigate',
    widgetType: 'native',
    defaultBounds: { width: 900, height: 600 },
    zLayer: 10,
    category: 'control-plane',
  },
];

// ============================================================================
// Runtime Validation + Export
// ============================================================================

/** Parse and validate the contract at module load time. */
const validated = omniDashContractSchema.parse(OMNIDASH_CONTRACT_SOURCE);

/**
 * THE FROZEN CONTRACT.
 * Every Omnidash surface must derive its data from this array.
 * No additions, removals, renames, or reroutes outside this file.
 */
export const OMNIDASH_CONTRACT: readonly OmniDashApp[] = Object.freeze(validated) as readonly OmniDashApp[];

// Runtime assertion: required IDs must be present
for (const requiredId of REQUIRED_APP_IDS) {
  if (!OMNIDASH_CONTRACT.some(app => app.id === requiredId)) {
    throw new Error(
      `OMNIDASH CONTRACT VIOLATION: Required app "${requiredId}" is missing from OMNIDASH_CONTRACT.`,
    );
  }
}

// ============================================================================
// Utility Exports
// ============================================================================

/** Lookup a single app by id. Returns undefined if not found. */
export const getOmniDashApp = (id: string): OmniDashApp | undefined =>
  OMNIDASH_CONTRACT.find(app => app.id === id);

/** Get all app IDs as a typed array. */
export const getOmniDashAppIds = (): readonly string[] =>
  OMNIDASH_CONTRACT.map(app => app.id);

/** Get apps filtered by category. */
export const getOmniDashAppsByCategory = (category: AppCategory): readonly OmniDashApp[] =>
  OMNIDASH_CONTRACT.filter(app => app.category === category);

/** Get apps filtered by launch mode. */
export const getOmniDashAppsByLaunchMode = (mode: LaunchMode): readonly OmniDashApp[] =>
  OMNIDASH_CONTRACT.filter(app => app.launchMode === mode);
