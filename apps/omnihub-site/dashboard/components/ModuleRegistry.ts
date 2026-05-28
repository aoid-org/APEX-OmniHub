/**
 * ModuleRegistry — Functional data for OmniDash module modals.
 * Module data lives in moduleData.json (CPD-excluded);
 * this file owns only types and hydration logic.
 *
 * APEX STANDARDS: Data-driven, zero side-effects, fully typed.
 * OWNED BY: APEX Business Systems Ltd.
 */

import rawData from './moduleData.json';

// ── Public types ──────────────────────────────────────────────

type Trend = 'up' | 'down' | 'stable';
type ItemStatus = 'active' | 'inactive' | 'pending' | 'error';
type ActionVariant = 'primary' | 'secondary' | 'destructive';

export interface ModuleStatItem {
  readonly label: string;
  readonly value: string;
  readonly trend?: Trend;
}

export interface ModuleListItem {
  readonly id: string;
  readonly label: string;
  readonly status: ItemStatus;
  readonly detail?: string;
}

export interface ModuleAction {
  readonly id: string;
  readonly label: string;
  readonly variant: ActionVariant;
}

export interface ModuleContent {
  readonly moduleKey: string;
  readonly headline: string;
  readonly stats: readonly ModuleStatItem[];
  readonly items: readonly ModuleListItem[];
  readonly actions: readonly ModuleAction[];
  readonly stateKind?: 'live' | 'demo' | 'local' | 'unavailable';
  readonly isDemo?: boolean;
}

// ── Hydration ─────────────────────────────────────────────────

type RawModule = [string, string, string[][], string[][], string[][], boolean?];

function hydrate(raw: RawModule): ModuleContent {
  const [key, headline, stats, items, actions, isDemo] = raw;
  return {
    moduleKey: key,
    headline,
    stats: stats.map((s) => {
      const base: ModuleStatItem = { label: s[0], value: s[1] };
      return s[2] ? { ...base, trend: s[2] as Trend } : base;
    }),
    items: items.map((i) => {
      const base: ModuleListItem = { id: i[0], label: i[1], status: i[2] as ItemStatus };
      return i[3] ? { ...base, detail: i[3] } : base;
    }),
    actions: actions.map((a) => ({
      id: a[0], label: a[1], variant: a[2] as ActionVariant,
    })),
    isDemo: isDemo ?? false,
    stateKind: isDemo ? 'demo' : 'local',
  };
}

// ── Registry (built once at module load) ──────────────────────

const DATA = rawData as unknown as readonly RawModule[];

const MODULES: ReadonlyMap<string, ModuleContent> = new Map(
  DATA.map((m) => [m[0], hydrate(m)] as const),
);

export function getModuleContent(moduleKey: string): ModuleContent | undefined {
  return MODULES.get(moduleKey);
}

export function getAllModuleKeys(): readonly string[] {
  return DATA.map((m) => m[0]);
}
