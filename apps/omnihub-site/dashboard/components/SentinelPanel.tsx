/**
 * SentinelPanel — Right sidebar intelligence panel for OmniDash
 * Displays: Security Audit, Analytics Metrics, OmniTrace Feed, Ops Controls
 *
 * Design: Stacked section cards with sentinel-class visual hierarchy.
 * No external API calls — reads from existing stores and props.
 */

import { memo, useMemo, useState, useCallback } from 'react';
import { Shield, RefreshCw, Activity, Zap, Eye } from 'lucide-react';

interface TraceEntry {
  readonly id: string;
  readonly message: string;
  readonly dotColor: string;
}

const TRACE_FEED: readonly TraceEntry[] = [
  { id: 't1', message: 'Salesforce sync completed — 48 records', dotColor: '#34d399' },
  { id: 't2', message: 'Invoice batch #1042 processed', dotColor: '#f97316' },
  { id: 't3', message: 'Workflow "Lead Nurture" triggered', dotColor: '#f97316' },
  { id: 't4', message: 'QuickBooks reconciliation done', dotColor: '#a78bfa' },
  { id: 't5', message: 'Ticket #7291 auto-resolved by agent', dotColor: '#34d399' },
];

export const SentinelPanel = memo(function SentinelPanel() {
  const [demoMode, setDemoMode] = useState(true);
  const lastScan = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }, []);

  const handleToggleDemo = useCallback(() => {
    setDemoMode(prev => !prev);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Security Audit ── */}
      <div className="sentinel-section">
        <div className="sentinel-section-title">
          <Shield style={{ width: 10, height: 10, color: 'var(--od-green)' }} />
          Security Audit
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'var(--od-green-bg)',
            border: '1px solid var(--od-green-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield style={{ width: 13, height: 13, color: 'var(--od-green)' }} />
          </div>
          <div>
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--od-text-primary)',
              letterSpacing: '-0.01em',
            }}>
              Zero Trust Active
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--od-text-tertiary)',
              fontWeight: 600,
            }}>
              All gateways secured
            </div>
          </div>
        </div>

        <div style={{
          fontSize: 10,
          color: 'var(--od-text-tertiary)',
          fontWeight: 600,
          letterSpacing: '0.04em',
          marginBottom: 10,
          textTransform: 'uppercase',
        }}>
          Last Check: {lastScan}
        </div>

        <button type="button" className="sentinel-action-btn" style={{ minHeight: 36 }}>
          <RefreshCw style={{ width: 12, height: 12 }} />
          Scan Now
        </button>
      </div>

      {/* ── Analytics ── */}
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

      {/* ── OmniTrace ── */}
      <div className="sentinel-section" style={{ flex: 1, minHeight: 0 }}>
        <div className="sentinel-section-title">
          <Zap style={{ width: 10, height: 10, color: '#a78bfa' }} />
          OmniTrace
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {TRACE_FEED.map(trace => (
            <div key={trace.id} className="sentinel-trace-item">
              <span
                className="sentinel-trace-dot"
                style={{ background: trace.dotColor, boxShadow: `0 0 6px ${trace.dotColor}40` }}
              />
              <span>{trace.message}</span>
            </div>
          ))}
        </div>

        <button type="button" className="sentinel-action-btn" style={{ marginTop: 12, minHeight: 36 }}>
          <Eye style={{ width: 12, height: 12 }} />
          Replay Workflows
        </button>
      </div>

      {/* ── Ops Controls ── */}
      <div className="sentinel-section">
        <div className="sentinel-section-title">
          Ops Controls
        </div>

        <div className="od-toggle-row" style={{ minHeight: 'auto' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Demo Mode</span>
          <button
            type="button"
            className={`od-toggle${demoMode ? ' on' : ''}`}
            onClick={handleToggleDemo}
            aria-label="Toggle demo mode"
            style={{ minHeight: 20 }}
          />
        </div>
      </div>
    </div>
  );
});
