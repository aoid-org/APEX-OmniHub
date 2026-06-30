/**
 * OmniSentryWidget — Compact sidebar view of the OmniSentry self-healing monitor.
 * Drives the real circuit-breaker runtime (src/lib/omni-sentry).
 *
 * Wired capabilities:
 *   - initializeOmniSentry / shutdownOmniSentry  — toggle
 *   - getHealthStatus()                          — live 5 s poll
 *   - flushOfflineErrors()                       — flush button (visible when queue > 0)
 *   - withResilience(op, name)                   — circuit probe button (live pass/skip/fail)
 *
 * Preference persists to localStorage so the monitor survives reloads.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  initializeOmniSentry,
  shutdownOmniSentry,
  getHealthStatus,
  flushOfflineErrors,
  withResilience,
  type HealthStatus,
} from '@/lib/omni-sentry';

const STORAGE_KEY = 'omni_sentry_enabled';
const OFFLINE_KEY = 'omni_sentry_offline';

function readEnabled(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}
function persistEnabled(v: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, String(v)); } catch { /* ssr / private */ }
}

/** Read pending offline queue length from sessionStorage without touching lib internals. */
function readOfflineCount(): number {
  try {
    const raw = sessionStorage.getItem(OFFLINE_KEY);
    if (!raw) return 0;
    const arr = JSON.parse(raw) as unknown[];
    return Array.isArray(arr) ? arr.length : 0;
  } catch { return 0; }
}

const STATUS_COLOR: Record<HealthStatus['status'], string> = {
  healthy:  '#34d399',
  degraded: '#f59e0b',
  critical: '#ef4444',
};

const CIRCUIT_COLOR: Record<string, string> = {
  closed:      '#34d399',
  open:        '#ef4444',
  'half-open': '#f59e0b',
};

type ProbeResult = 'idle' | 'running' | 'passed' | 'skipped' | 'failed';

const PROBE_LABEL: Record<ProbeResult, string> = {
  idle:    'Probe Circuit',
  running: 'Probing…',
  passed:  '✓ Circuit Closed',
  skipped: '⚡ Circuit Open',
  failed:  '✗ Probe Failed',
};

const PROBE_COLOR: Record<ProbeResult, string> = {
  idle:    'var(--od-text-secondary)',
  running: '#f59e0b',
  passed:  '#34d399',
  skipped: '#ef4444',
  failed:  '#ef4444',
};

export function OmniSentryWidget() {
  const [enabled, setEnabled]           = useState(false);
  const [health, setHealth]             = useState<HealthStatus | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);
  const [flushState, setFlushState]     = useState<'idle' | 'flushing' | 'done'>('idle');
  const [flushedCount, setFlushedCount] = useState(0);
  const [probeResult, setProbeResult]   = useState<ProbeResult>('idle');

  const refresh = useCallback(() => {
    setHealth(getHealthStatus());
    setOfflineCount(readOfflineCount());
  }, []);

  // Hydrate from stored preference.
  useEffect(() => {
    const stored = readEnabled();
    setEnabled(stored);
    if (stored) { initializeOmniSentry(); refresh(); }
  }, [refresh]);

  // Live polling while active.
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
      setOfflineCount(readOfflineCount());
      return next;
    });
  }, []);

  // flushOfflineErrors — drains sessionStorage offline queue into error log.
  const handleFlush = useCallback(async () => {
    setFlushState('flushing');
    const n = await flushOfflineErrors();
    setFlushedCount(n);
    setFlushState('done');
    refresh();
    // Auto-reset label after 3 s.
    globalThis.setTimeout(() => setFlushState('idle'), 3000);
  }, [refresh]);

  // withResilience — live circuit probe: runs a real no-op through the breaker.
  const handleProbe = useCallback(async () => {
    setProbeResult('running');
    const result = await withResilience(
      async () => { /* intentional no-op health probe */ return true; },
      'sidebar-circuit-probe',
    );
    if (result === null) {
      setProbeResult('skipped'); // circuit was open — operation short-circuited
    } else {
      setProbeResult('passed');  // circuit closed, operation succeeded
    }
    refresh();
    globalThis.setTimeout(() => setProbeResult('idle'), 4000);
  }, [refresh]);

  const statusColor = health ? STATUS_COLOR[health.status] : '#6b7280';

  return (
    <div
      data-testid="omni-sentry-widget"
      style={{
        borderRadius: 10,
        border: `1px solid ${enabled ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}`,
        // +25% opacity bump (rail-widget transparency-reduction parity, owner P1).
        background: enabled ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color .2s, background .2s',
      }}
    >
      {/* ── Header row ───────────────────────────────────────── */}
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
            position: 'relative', cursor: 'pointer',
            transition: 'background .2s', flexShrink: 0,
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
        <>
          {/* ── Status badge ──────────────────────────────────── */}
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

          {/* ── Metrics grid ──────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {([
              { label: 'Circuit',    value: health.metrics.circuitState, color: CIRCUIT_COLOR[health.metrics.circuitState] ?? 'var(--od-text-primary)' },
              { label: 'Errors/min', value: String(health.metrics.errorRate),              color: 'var(--od-text-primary)' },
              { label: 'Memory',     value: `${Math.round(health.metrics.memoryUsage)}%`,  color: 'var(--od-text-primary)' },
              { label: 'Uptime',     value: `${Math.round(health.metrics.uptime / 1000)}s`,color: 'var(--od-text-primary)' },
            ] as const).map(({ label, value, color }) => (
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

          {/* ── Diagnostic ────────────────────────────────────── */}
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

          {/* ── Offline queue flush ───────────────────────────── */}
          {offlineCount > 0 && (
            <button
              type="button"
              data-testid="omni-sentry-flush-btn"
              disabled={flushState === 'flushing'}
              onClick={() => { void handleFlush(); }}
              style={{
                width: '100%', padding: '5px 0', borderRadius: 6, border: 'none',
                background: flushState === 'done'
                  ? 'rgba(52,211,153,0.12)'
                  : 'rgba(245,158,11,0.10)',
                color: flushState === 'done' ? '#34d399' : '#f59e0b',
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', cursor: flushState === 'flushing' ? 'not-allowed' : 'pointer',
                fontFamily: "'Space Grotesk',sans-serif",
                transition: 'background .15s, color .15s',
              }}
            >
              {flushState === 'idle'    && `Flush ${offlineCount} Offline Error${offlineCount !== 1 ? 's' : ''}`}
              {flushState === 'flushing' && 'Flushing…'}
              {flushState === 'done'    && `✓ Flushed ${flushedCount}`}
            </button>
          )}

          {/* ── Circuit probe (withResilience) ────────────────── */}
          <button
            type="button"
            data-testid="omni-sentry-probe-btn"
            disabled={probeResult === 'running'}
            onClick={() => { void handleProbe(); }}
            style={{
              width: '100%', padding: '5px 0', borderRadius: 6,
              border: `1px solid ${probeResult === 'idle' ? 'rgba(255,255,255,0.08)' : `${PROBE_COLOR[probeResult]}44`}`,
              background: probeResult === 'idle'
                ? 'rgba(255,255,255,0.03)'
                : `${PROBE_COLOR[probeResult]}10`,
              color: PROBE_COLOR[probeResult],
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase', cursor: probeResult === 'running' ? 'not-allowed' : 'pointer',
              fontFamily: "'Space Grotesk',sans-serif",
              transition: 'border-color .15s, background .15s, color .15s',
            }}
          >
            {PROBE_LABEL[probeResult]}
          </button>
        </>
      ) : (
        <p style={{ fontSize: 10, color: 'var(--od-text-tertiary)', margin: 0, lineHeight: 1.5 }}>
          {enabled ? 'Initializing…' : 'Enable to activate circuit-breaker monitoring.'}
        </p>
      )}
    </div>
  );
}
