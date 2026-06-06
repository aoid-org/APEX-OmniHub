import { memo } from 'react';
import { Activity } from 'lucide-react';

export const SystemHealthRow = memo(function SystemHealthRow() {
  return (
    <div className="sentinel-section">
      <div className="sentinel-section-title">
        <Activity style={{ width: 10, height: 10, color: 'var(--od-accent)' }} />
        Analytics
      </div>

      <div className="sentinel-metric-row">
        <div className="sentinel-metric">
          <div className="sentinel-metric-value" style={{ color: 'var(--od-text-primary)' }}>
            0
          </div>
          <div className="sentinel-metric-label">Events Tracked</div>
        </div>
        <div className="sentinel-metric">
          <div className="sentinel-metric-value" style={{ color: 'var(--od-green)' }}>
            100%
          </div>
          <div className="sentinel-metric-label">System Health</div>
        </div>
        <div className="sentinel-metric">
          <div className="sentinel-metric-value" style={{ color: 'var(--od-accent)' }}>
            1
          </div>
          <div className="sentinel-metric-label">Guardian Loops</div>
        </div>
        <div className="sentinel-metric">
          <div className="sentinel-metric-value" style={{ color: 'var(--od-green)' }}>
            Clean
          </div>
          <div className="sentinel-metric-label">Stale Checks</div>
        </div>
      </div>
    </div>
  );
});
