import { memo } from 'react';
import type { KpiSummary } from '../types/dashboard.types';
import { T } from '../designSystem';
import { GlassCard, SectionLabel } from './designComponents';

/**
 * PrimaryKpiBand — above-the-fold business KPI band (information-hierarchy Zone 2).
 *
 * Fixes the audit's "KPIs buried" finding: the primary business metrics
 * (FLOWBills demos/paid, days-to-cash, Sev-1 incidents) are surfaced at the top
 * of the canvas with honest units/timeframes instead of living only in the
 * right-rail (mislabeled) and the hidden M03 observability panel.
 *
 * Honest-state contract (no fake production data):
 *   loading → aria-busy skeletons · error → message + Retry ·
 *   demo     → real demo values tagged "Simulated" ·
 *   no data  → actionable empty state (never silent zeros in production).
 *
 * Branding-preserving: reuses GlassCard / SectionLabel / `T` tokens only.
 * Responsive: fluid auto-fit grid (no fixed column count) per the all-viewport mandate.
 */

type Tone = 'neutral' | 'info' | 'accent' | 'good' | 'warn';

interface KpiDef {
  readonly key: keyof KpiSummary;
  readonly label: string;
  /** Unit + timeframe shown beneath the value, e.g. "incidents · 24h". */
  readonly unit: string;
  readonly tone: Tone;
}

// Order encodes priority left→right (Z-pattern): revenue signals first, risk last.
const KPI_DEFS: readonly KpiDef[] = [
  { key: 'flowbills_paid_accounts', label: 'FLOWBills Paid', unit: 'accounts · latest', tone: 'info' },
  { key: 'flowbills_demos', label: 'FLOWBills Demos', unit: 'demos · latest', tone: 'accent' },
  { key: 'cash_days_to_cash', label: 'Days to Cash', unit: 'days · current', tone: 'neutral' },
  { key: 'ops_sev1_incidents', label: 'Ops Sev-1', unit: 'incidents · 24h', tone: 'warn' },
];

const numberFmt = new Intl.NumberFormat();

function toneColor(tone: Tone, value: number): string {
  switch (tone) {
    case 'info': return T.blue;
    case 'accent': return T.orange;
    case 'good': return T.green;
    case 'warn': return value > 0 ? T.warn : T.green; // healthy when zero incidents
    default: return T.t1;
  }
}

export interface PrimaryKpiBandProps {
  readonly kpi: KpiSummary;
  /** True when at least one real KPI history row exists (distinguishes real-zero from no-data). */
  readonly hasData: boolean;
  readonly isLoading: boolean;
  readonly error: unknown;
  /** Demo/simulated mode — values are illustrative, not production truth. */
  readonly demoMode: boolean;
  readonly onRetry: () => void;
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
  marginTop: 12,
};

function MetricTile({ def, value, simulated }: { def: KpiDef; value: number; simulated: boolean }) {
  return (
    <div
      data-testid={`kpi-${def.key}`}
      className="omni-kpi-tile"
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: T.t2 }}>
        {def.label}
      </div>
      <div
        data-testid={`kpi-${def.key}-value`}
        style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, color: toneColor(def.tone, value) }}
      >
        {numberFmt.format(value)}
      </div>
      <div style={{ fontSize: 11, color: T.t3 }}>
        {def.unit}{simulated ? ' · simulated' : ''}
      </div>
    </div>
  );
}

export const PrimaryKpiBand = memo(function PrimaryKpiBand({
  kpi, hasData, isLoading, error, demoMode, onRetry,
}: PrimaryKpiBandProps) {
  const heading = `Primary Metrics${demoMode ? ' (Simulated)' : ''}`;

  if (isLoading) {
    return (
      <GlassCard style={{ padding: 16 }}>
        <SectionLabel>{heading}</SectionLabel>
        <div style={GRID} aria-busy="true" role="status" aria-label="Loading primary metrics">
          {KPI_DEFS.map(d => (
            <div
              key={d.key}
              style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, height: 78, animation: 'apexPulse 1.5s ease-in-out infinite' }}
            />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard style={{ padding: 16 }}>
        <SectionLabel>{heading}</SectionLabel>
        <div role="alert" style={{ fontSize: 13, color: T.t2, padding: '12px 0' }}>
          Couldn’t load your metrics.{' '}
          <button
            type="button"
            onClick={onRetry}
            className="omni-link-btn"
            style={{ color: T.orange, background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
          >
            Retry
          </button>
        </div>
      </GlassCard>
    );
  }

  if (!demoMode && !hasData) {
    return (
      <GlassCard style={{ padding: 16 }}>
        <SectionLabel>{heading}</SectionLabel>
        <p style={{ fontSize: 13, color: T.t2, margin: '10px 0 2px' }}>
          No KPI data yet — your metrics populate after the first daily KPI sync.
        </p>
        <p style={{ fontSize: 12, color: T.t3, margin: 0 }}>
          Run a workflow or connect a data source to start tracking demos, paid accounts, days-to-cash, and Sev-1 incidents here.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={{ padding: 16 }}>
      <SectionLabel>{heading}</SectionLabel>
      <section data-testid="primary-kpi-band" aria-label="Primary business metrics" style={GRID}>
        {KPI_DEFS.map(def => (
          <MetricTile key={def.key} def={def} value={kpi[def.key] ?? 0} simulated={demoMode} />
        ))}
      </section>
    </GlassCard>
  );
});
