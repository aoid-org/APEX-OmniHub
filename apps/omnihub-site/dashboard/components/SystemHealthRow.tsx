import { memo } from 'react';
import type { KpiSummary } from '../types/dashboard.types';

function resolveSystemHealth(demoMode: boolean, kpi: KpiSummary): string {
  if (demoMode) return '100%';
  if (kpi.ops_sev1_incidents <= 0) return '100%';
  return `${Math.max(0, 100 - kpi.ops_sev1_incidents * 2.9).toFixed(1)}%`;
}

interface MetricCardProps {
  value: string | number;
  label: string;
  valueColor?: string;
  sublabel?: string;
}

function MetricCard({ value, label, valueColor, sublabel }: MetricCardProps) {
  return (
    <div className="sentinel-metric">
      <div className="sentinel-metric-value" style={{ color: valueColor }}>
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: 8.5, color: 'var(--od-text-tertiary)', letterSpacing: '0.06em', marginTop: 1, textTransform: 'uppercase' }}>
          {sublabel}
        </div>
      )}
      <div className="sentinel-metric-label">{label}</div>
    </div>
  );
}

export const SystemHealthRow = memo(function SystemHealthRow({
  demoMode,
  kpi,
}: {
  demoMode: boolean;
  kpi: KpiSummary;
}) {
  const eventsTracked = demoMode ? 0 : (kpi.tradeline_paid_starts ?? 0);
  const systemHealth = resolveSystemHealth(demoMode, kpi);
  const guardianLoops = demoMode ? 1 : (kpi.tradeline_active_pilots ?? 0);
  const staleChecks = demoMode ? 0 : (kpi.tradeline_churn_risks ?? 0);
  const healthIsGreen = systemHealth === '100%';

  return (
    <div data-testid="rt_analytics" className="sentinel-section" style={{ paddingBottom: 12 }}>
      {/* Row 1 — Events + Health */}
      <div className="sentinel-metric-row" style={{ marginBottom: 6 }}>
        <MetricCard
          value={eventsTracked}
          label="Events Tracked"
          valueColor="var(--od-text-primary)"
        />
        <MetricCard
          value={systemHealth}
          label="System Health"
          valueColor={healthIsGreen ? 'var(--od-green)' : 'var(--od-warn)'}
        />
      </div>
      {/* Row 2 — Guardian + Stale */}
      <div className="sentinel-metric-row">
        <MetricCard
          value={`${guardianLoops} loop`}
          label="Guardian Loops"
          valueColor="var(--od-accent)"
        />
        <MetricCard
          value={staleChecks === 0 ? 'Clean' : String(staleChecks)}
          label="Stale Checks"
          valueColor={staleChecks === 0 ? 'var(--od-green)' : 'var(--od-warn)'}
        />
      </div>
    </div>
  );
});
