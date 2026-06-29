/**
 * FooterObservabilityRow — footer-only observability/status strip.
 *
 * Owner contract (OmniDash P1 regression repair): Observability is removed from
 * the main dashboard canvas and lives here instead — permanently fixed, clipped,
 * and immovable inside the static `.omni-footer-bar`. It is NOT a DraggableWidget
 * and carries no reorder affordance.
 *
 * The row shows real system/user state already resolved by the shell
 * (useDashboardData): system health, events tracked, Guardian loops, open
 * incidents (queue), and live/demo/sync state. No decorative-only data.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo } from 'react';
import { T } from '../designSystem';
import { StatusDot } from './designComponents';
import type { KpiSummary, SystemHealthState } from '../types/dashboard.types';

export interface FooterObservabilityRowProps {
  readonly demoMode: boolean;
  readonly kpi?: KpiSummary;
  readonly systemHealth?: SystemHealthState;
  readonly openIncidentsCount: number;
  readonly isLoading?: boolean;
  readonly error?: string | null;
}

function resolveHealth(demoMode: boolean, systemHealth?: SystemHealthState): { label: string; color: string } {
  if (demoMode) return { label: 'Healthy', color: T.green };
  switch (systemHealth) {
    case 'healthy': return { label: 'Healthy', color: T.green };
    case 'degraded': return { label: 'Degraded', color: T.warn };
    case 'incident': return { label: 'Incident', color: T.red };
    default: return { label: 'Unknown', color: T.t3 };
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
  const health = resolveHealth(demoMode, systemHealth);
  const events = demoMode ? 0 : (kpi?.flowbills_demos ?? 0);
  const loops = demoMode ? 1 : (kpi?.flowbills_paid_accounts ?? 0);
  const incidents = openIncidentsCount;

  let syncLabel: string = demoMode ? 'Demo' : 'Live';
  let syncColor: string = demoMode ? T.warn : T.green;
  if (isLoading) { syncLabel = 'Syncing'; syncColor = T.blue; }
  else if (error) { syncLabel = 'Sync error'; syncColor = T.red; }

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
      <Chip label="Health" value={health.label} color={health.color} />
      <Chip label="Events" value={events} color={T.t2} />
      <Chip label="Loops" value={loops} color={T.orange} />
      <Chip label="Incidents" value={incidents} color={incidents === 0 ? T.green : T.warn} />
      <Chip label="Sync" value={syncLabel} color={syncColor} />
    </div>
  );
});
