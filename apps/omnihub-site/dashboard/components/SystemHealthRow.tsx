import { memo } from 'react';
import { omniRgba } from '../omniSkinTokens';
import type { KpiSummary, SystemHealthState } from '../types/dashboard.types';
import { useAppTranslation } from '../../src/i18n/useAppTranslation';

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
  const { tx } = useAppTranslation();
  const flowbillsDemoCount = demoMode ? 0 : (kpi.flowbills_demos ?? 0);
  const healthDisplay = demoMode
    ? tx('dashboard.footer.healthy')
    : systemHealth
      ? tx(`dashboard.footer.${systemHealth}`, { defaultValue: systemHealth.charAt(0).toUpperCase() + systemHealth.slice(1) })
      : tx('dashboard.footer.unknown');
  const flowbillsPaidAccounts = demoMode ? 1 : (kpi.flowbills_paid_accounts ?? 0);
  const staleChecks = demoMode ? 0 : (kpi.ops_sev1_incidents ?? 0);
  const healthIsGreen = demoMode || systemHealth === 'healthy';
  const simSuffix = demoMode ? ` ${tx('dashboard.footer.simulated')}` : '';

  return (
    // Wrapped in the same card tile as the left-sidebar System KPIs widget
    // (SidebarKpiBar) for left/right-rail uniformity (owner request). No explicit
    // width — the rail's flex column stretches it to full rail width like its
    // siblings (OmniSentry / Ops Controls / OmniMedia).
    <div
      style={{
        borderRadius: 11,
        // Uniform rail/sidebar glassmorph tile — same orange border, fill opacity,
        // and blur as OmniTrace / OmniSentry / Ops Controls / OmniMedia (owner request).
        border: `1px solid ${omniRgba('orange', 0.25)}`,
        background: omniRgba('orange', 0.06),
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '6px 10px',
          color: 'var(--od-text-tertiary)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}
      >
        {tx('dashboard.systemHealth.title')}
      </div>
    <div data-testid="rt_analytics" className="sentinel-section" style={{ paddingBottom: 12, paddingTop: 0 }}>
      {/* Row 1 — FlowBills demos + Health */}
      <div className="sentinel-metric-row" style={{ marginBottom: 6 }}>
        <MetricCard
          value={flowbillsDemoCount}
          label={`${tx('dashboard.systemHealth.flowbillsDemoCount')}${simSuffix}`}
          valueColor="var(--od-text-primary)"
        />
        <MetricCard
          value={healthDisplay}
          label={`${tx('dashboard.systemHealth.systemHealth')}${simSuffix}`}
          valueColor={healthIsGreen ? 'var(--od-green)' : 'var(--od-warn)'}
        />
      </div>
      {/* Row 2 — FlowBills paid accounts + Stale */}
      <div className="sentinel-metric-row">
        <MetricCard
          value={flowbillsPaidAccounts}
          label={`${tx('dashboard.systemHealth.flowbillsPaidAccounts')}${simSuffix}`}
          valueColor="var(--od-accent)"
        />
        <MetricCard
          value={staleChecks === 0 ? tx('dashboard.systemHealth.clean') : String(staleChecks)}
          label={`${tx('dashboard.systemHealth.staleChecks')}${simSuffix}`}
          valueColor={staleChecks === 0 ? 'var(--od-green)' : 'var(--od-warn)'}
        />
      </div>
    </div>
    </div>
  );
});
