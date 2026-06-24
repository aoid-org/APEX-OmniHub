/**
 * OmniDash Dashboard — Shared Type Definitions
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/types/dashboard.types
 *
 * Canonical types for the OmniDash data layer.
 * Mirrors src/omnidash/types.ts for cross-layer type safety.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ── Navigation ──────────────────────────────────────────────────────────────

export type DashboardNavSection =
  | 'OmniBoard'
  | 'Today'
  | 'Pipeline'
  | 'KPIs'
  | 'Events'
  | 'Ops'
  | 'Runs'
  | 'Integrations';

// ── Health State ───────────────────────────────────────────────────────────────

export type SystemHealthState = 'healthy' | 'degraded' | 'incident' | 'unknown';

export interface SliceStatus {
  key: string;
  state: SystemHealthState;
  updatedAt: number;
}

// ── Ops State ────────────────────────────────────────────────────────────────

export interface OmniDashOpsState {
  demo: boolean;
  autoPilot: boolean;
  guardian: boolean;
  live: boolean;
}

export const DEFAULT_OPS_STATE: OmniDashOpsState = {
  demo: true,
  autoPilot: false,
  guardian: true,
  live: false,
};

// ── KPI Summary ──────────────────────────────────────────────────────────────

export interface KpiSummary {
  tradeline_paid_starts: number;
  tradeline_active_pilots: number;
  tradeline_churn_risks: number;
  flowbills_demos: number;
  flowbills_paid_accounts: number;
  cash_days_to_cash: number;
  ops_sev1_incidents: number;
}

export const EMPTY_KPI_SUMMARY: KpiSummary = {
  tradeline_paid_starts: 0,
  tradeline_active_pilots: 0,
  tradeline_churn_risks: 0,
  flowbills_demos: 0,
  flowbills_paid_accounts: 0,
  cash_days_to_cash: 0,
  ops_sev1_incidents: 0,
};

// ── Pane Registration ─────────────────────────────────────────────────────────

export interface PaneDescriptor {
  readonly id: string;
  readonly title: string;
  readonly component: string;
  readonly defaultPosition?: { x: number; y: number };
  readonly defaultSize?: { width: number; height: number };
}

// ── Panel Layout ─────────────────────────────────────────────────────────────

export type PanelLayout = 'standard' | 'reversed';

// ── Layout Persistence ────────────────────────────────────────────────────────

export interface PersistedLayoutState {
  readonly activeNav: DashboardNavSection;
  readonly isDark: boolean;
  readonly ops: OmniDashOpsState;
  readonly panelLayout: 'standard' | 'reversed';  // 'reversed' = left-nav on right, right-panel on left
  readonly hiddenWidgets: readonly string[];  // widget IDs to hide on canvas
}

export const DEFAULT_PERSISTED_LAYOUT: PersistedLayoutState = {
  activeNav: 'OmniBoard',
  isDark: true,
  ops: DEFAULT_OPS_STATE,
  panelLayout: 'standard',
  hiddenWidgets: ['m03_1', 'm03_2', 'm03_3', 'm03_4', 'm03_5', 'm03_6', 'm03_7'],
};

export const LAYOUT_STORAGE_KEY = 'omnidash:layout:v2';
