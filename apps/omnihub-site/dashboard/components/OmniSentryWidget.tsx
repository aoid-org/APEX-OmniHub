/**
 * OmniSentryWidget — Compact sidebar view of the OmniSentry self-healing monitor.
 * Drives the real circuit-breaker runtime (src/lib/omni-sentry).
 * Health metrics poll every 5 s while enabled. Preference persists to localStorage.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  initializeOmniSentry,
  shutdownOmniSentry,
  getHealthStatus,
  type HealthStatus,
} from '../../../../src/lib/omni-sentry';

const STORAGE_KEY = 'omni_sentry_enabled';

function readEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}
function persistEnabled(v: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, String(v)); } catch { /* ssr / private */ }
}

const STATUS_COLOR: Record<HealthStatus['status'], string> = {
  healthy:  '#34d399',
  degraded: '#f59e0b',
  critical: '#ef4444',
};

const CIRCUIT_COLOR: Record<string, string> = {
  closed:    '#34d399',
  open:      '#ef4444',
  'half-open': '#f59e0b',
};

export function OmniSentryWidget() {
  const [enabled, setEnabled] = useState(false);
  const [health, setHealth]   = useState<HealthStatus | null>(null);

  const refresh = useCallback(() => setHealth(getHealthStatus()), []);

  useEffect(() => {
    const stored = readEnabled();
    setEnabled(stored);
    if (stored) { initializeOmniSentry(); refresh(); }
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = globalThis.setInterval(refresh, 5000);
    return () => globalThis.clearInterval(id);
  }, [enabled, refresh]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      persistEnabled(next);
      if (next) { initializeOmniSentry(); setHealth(getHealthStatus()); }
      else       { shutdownOmniSentry();  setHealth(null); }
      return next;
    });
  }, []);

  const statusColor = health ? STATUS_COLOR[health.status] : '#6b7280';

  return (
    <div
      data-testid="omni-sentry-widget"
      style={{
        borderRadius: 10,
        border: `1px solid ${enabled ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}`,
        background: enabled ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.02)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color .2s, background .2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: statusColor,
          boxShadow: enabled ? `0 0 6px ${statusColor}99` : 'none',
          transition: 'background .3s, box-shadow .3s',
        }} />
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--od-text-secondary)', flex: 1,
        }}>
          OmniSentry
        </span>
        <button
          type="button"
          aria-label={enabled ? 'Disable OmniSentry' : 'Enable OmniSentry'}
          aria-pressed={enabled}
          onClick={toggle}
          style={{
            width: 34, height: 18, borderRadius: 9, border: 'none',
            background: enabled ? '#34d399' : 'rgba(255,255,255,0.12)',
            position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: 2,
            left: enabled ? 18 : 2,
            width: 14, height: 14, borderRadius: '50%',
            background: '#fff',
            transition: 'left .18s',
            boxShadow: '0 1px 3px rgba(0,0,0,.4)',
          }} />
        </button>
      </div>

      {enabled && health ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Status badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: STATUS_COLOR[health.status],
            padding: '2px 7px', borderRadius: 4,
            background: `${STATUS_COLOR[health.status]}18`,
            border: `1px solid ${STATUS_COLOR[health.status]}44`,
            alignSelf: 'flex-start',
          }}>
            {health.status}
          </div>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[
              { label: 'Circuit', value: health.metrics.circuitState, color: CIRCUIT_COLOR[health.metrics.circuitState] },
              { label: 'Errors/min', value: String(health.metrics.errorRate), color: 'var(--od-text-primary)' },
              { label: 'Memory', value: `${Math.round(health.metrics.memoryUsage)}%`, color: 'var(--od-text-primary)' },
              { label: 'Uptime', value: `${Math.round(health.metrics.uptime / 1000)}s`, color: 'var(--od-text-primary)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '5px 8px',
              }}>
                <div style={{ fontSize: 9, color: 'var(--od-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {label}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 1, textTransform: 'capitalize' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {health.diagnostics.length > 0 && (
            <div style={{
              fontSize: 10, color: '#f59e0b', lineHeight: 1.4,
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 6, padding: '5px 8px',
            }}>
              {health.diagnostics[0]}
            </div>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 10, color: 'var(--od-text-tertiary)', margin: 0, lineHeight: 1.5 }}>
          {enabled ? 'Initializing…' : 'Enable to activate circuit-breaker monitoring.'}
        </p>
      )}
    </div>
  );
}
