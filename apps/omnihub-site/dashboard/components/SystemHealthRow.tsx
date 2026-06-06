import { memo } from 'react';
import { Activity } from 'lucide-react';
import type { KpiSummary } from '../types/dashboard.types';

export const SystemHealthRow = memo(function SystemHealthRow({
  demoMode,
  kpi,
}: {
  demoMode: boolean;
  kpi: KpiSummary;
}) {
  const eventsTracked = demoMode ? 142 : (kpi.tradeline_paid_starts ?? 0);
  const systemHealth = demoMode ? '99.8%' : (kpi.ops_sev1_incidents > 0 ? '94.2%' : '100%');
  const guardianLoops = demoMode ? 4 : (kpi.tradeline_active_pilots ?? 0);
  const staleChecks = demoMode ? '0' : (kpi.tradeline_churn_risks ?? 0);

  return (
    <div className="sentinel-section">
      <div className="sentinel-section-title">
        <Activity style={{ width: 10, height: 10, color: 'var(--od-accent)' }} />
        Analytics
      </div>

      <div className="sentinel-metric-row">
        <div className="sentinel-metric">
          <div className="sentinel-metric-value" style={{ color: 'var(--od-text-primary)' }}>
            {eventsTracked}
          </div>
          <div className="sentinel-metric-label">Events Tracked</div>
        </div>
        <div className="sentinel-metric">
          <div className="sentinel-metric-value" style={{ color: systemHealth === '100%' ? 'var(--od-green)' : 'var(--od-warn)' }}>
            {systemHealth}
          </div>
          <div className="sentinel-metric-label">System Health</div>
        </div>
        <div className="sentinel-metric">
          <div className="sentinel-metric-value" style={{ color: 'var(--od-accent)' }}>
            {guardianLoops}
          </div>
          <div className="sentinel-metric-label">Guardian Loops</div>
        </div>
        <div className="sentinel-metric">
          <div className="sentinel-metric-value" style={{ color: 'var(--od-green)' }}>
            {staleChecks}
          </div>
          <div className="sentinel-metric-label">Stale Checks</div>
        </div>
      </div>
    </div>
  );
});


