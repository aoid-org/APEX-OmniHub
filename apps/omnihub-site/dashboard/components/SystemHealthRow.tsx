import { memo } from 'react';
import type { KpiSummary, SystemHealthState } from '../types/dashboard.types';

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
  systemHealth,
}: {
  demoMode: boolean;
  kpi: KpiSummary;
  systemHealth?: SystemHealthState;
}) {
  const eventsTracked = demoMode ? 0 : (kpi.tradeline_paid_starts ?? 0);
  const healthDisplay = demoMode ? 'Healthy' : systemHealth ? systemHealth.charAt(0).toUpperCase() + systemHealth.slice(1) : 'Unknown';
  const guardianLoops = demoMode ? 1 : (kpi.tradeline_active_pilots ?? 0);
  const staleChecks = demoMode ? 0 : (kpi.tradeline_churn_risks ?? 0);
  const healthIsGreen = demoMode || systemHealth === 'healthy';

  return (
    <div data-testid="rt_analytics" className="sentinel-section" style={{ paddingBottom: 12 }}>
      {/* Row 1 — Events + Health */}
      <div className="sentinel-metric-row" style={{ marginBottom: 6 }}>
        <MetricCard
          value={eventsTracked}
          label={`Events Tracked${demoMode ? ' (Simulated)' : ''}`}
          valueColor="var(--od-text-primary)"
        />
        <MetricCard
          value={healthDisplay}
          label={`System Health${demoMode ? ' (Simulated)' : ''}`}
          valueColor={healthIsGreen ? 'var(--od-green)' : 'var(--od-warn)'}
        />
      </div>
      {/* Row 2 — Guardian + Stale */}
      <div className="sentinel-metric-row">
        <MetricCard
          value={`${guardianLoops} loop`}
          label={`Guardian Loops${demoMode ? ' (Simulated)' : ''}`}
          valueColor="var(--od-accent)"
        />
        <MetricCard
          value={staleChecks === 0 ? 'Clean' : String(staleChecks)}
          label={`Stale Checks${demoMode ? ' (Simulated)' : ''}`}
          valueColor={staleChecks === 0 ? 'var(--od-green)' : 'var(--od-warn)'}
        />
      </div>
    </div>
  );
});
