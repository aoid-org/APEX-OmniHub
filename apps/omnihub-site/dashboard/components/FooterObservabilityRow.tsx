/**
 * FooterObservabilityRow — footer-only observability/status strip.
 *
 * Owner contract (OmniDash P1 regression repair): Observability is removed from
 * the main dashboard canvas and lives here instead — permanently fixed, clipped,
 * and immovable inside the static `.omni-footer-bar`. It is NOT a DraggableWidget
 * and carries no reorder affordance.
 *
 * The row shows real system/observability state already resolved by the shell
 * (useDashboardData): system health, SEV-1 incidents, open incidents (queue),
 * and live/demo/sync state. No decorative-only data, and NO business KPIs
 * (FlowBills demos/paid accounts) mislabelled as system telemetry.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo } from 'react';
import { T } from '../designSystem';
import { StatusDot } from './designComponents';
import type { KpiSummary, SystemHealthState } from '../types/dashboard.types';
import { useAppTranslation } from '../../src/i18n/useAppTranslation';

export interface FooterObservabilityRowProps {
  readonly demoMode: boolean;
  readonly kpi?: KpiSummary;
  readonly systemHealth?: SystemHealthState;
  readonly openIncidentsCount: number;
  readonly isLoading?: boolean;
  readonly error?: string | null;
}

function resolveHealth(demoMode: boolean, systemHealth: SystemHealthState | undefined, tx: (key: string) => string): { label: string; color: string } {
  if (demoMode) return { label: tx('dashboard.footer.healthy'), color: T.green };
  switch (systemHealth) {
    case 'healthy': return { label: tx('dashboard.footer.healthy'), color: T.green };
    case 'degraded': return { label: tx('dashboard.footer.degraded'), color: T.warn };
    case 'incident': return { label: tx('dashboard.footer.incident'), color: T.red };
    default: return { label: tx('dashboard.footer.unknown'), color: T.t3 };
  }
}

interface ChipProps {
  readonly label: string;
  readonly value: string | number;
  readonly color: string;
}

function Chip({ label, value, color }: ChipProps) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0 }}>
      <StatusDot color={color} pulse={false} />
      <span style={{ color: T.t3 }}>{label}</span>
      <span style={{ color: T.t2, fontWeight: 600 }}>{value}</span>
    </span>
  );
}

export const FooterObservabilityRow = memo(function FooterObservabilityRow({
  demoMode, kpi, systemHealth, openIncidentsCount, isLoading, error,
}: FooterObservabilityRowProps) {
  const { tx } = useAppTranslation();
  const health = resolveHealth(demoMode, systemHealth, tx);
  // Honest observability only — ops_sev1_incidents is a real system signal.
  // FlowBills demos/paid accounts are BUSINESS KPIs, not telemetry, so they are
  // deliberately NOT shown here as "Events"/"Loops" (reviewer item 4).
  const sev1 = demoMode ? 0 : (kpi?.ops_sev1_incidents ?? 0);
  const incidents = openIncidentsCount;

  let syncLabel: string = demoMode ? tx('dashboard.footer.syncDemo') : tx('dashboard.footer.syncLive');
  let syncColor: string = demoMode ? T.warn : T.green;
  if (isLoading) { syncLabel = tx('dashboard.footer.syncSyncing'); syncColor = T.blue; }
  else if (error) { syncLabel = tx('dashboard.footer.syncError'); syncColor = T.red; }

  return (
    <div
      data-testid="footer-observability"
      // Clipped to footer bounds — content never escapes the static footer height.
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        minWidth: 0, overflow: 'hidden', flex: 1,
        margin: '0 16px',
      }}
    >
      <Chip label={tx('dashboard.footer.health')} value={health.label} color={health.color} />
      <Chip label={tx('dashboard.footer.sev1')} value={sev1} color={sev1 === 0 ? T.green : T.warn} />
      <Chip label={tx('dashboard.footer.incidents')} value={incidents} color={incidents === 0 ? T.green : T.warn} />
      <Chip label={tx('dashboard.footer.sync')} value={syncLabel} color={syncColor} />
    </div>
  );
});
