/**
 * OmniSentryPanel — live, user-controllable surface for the OmniSentry
 * self-healing monitor.
 *
 * This is NOT a mock. It drives the real OmniSentry runtime
 * (`src/lib/omni-sentry.ts`): a circuit-breaker + self-healing error monitor.
 *
 * Wired capabilities (all real, no stubs):
 *   - initializeOmniSentry / shutdownOmniSentry  — enable/disable toggle
 *   - getHealthStatus()                          — live 5 s poll
 *   - flushOfflineErrors()                       — drains sessionStorage offline queue
 *   - withResilience(op, name)                   — live circuit probe through breaker
 *   - clearAllData()                             — wipe all persisted sentry data
 *
 * Preference persists to localStorage under the same key the startup
 * initializer reads, so the monitor stays active across reloads.
 */
import { useCallback, useEffect, useState } from 'react';
// Relative import: the OmniSentry runtime lives in the root package `src/lib`,
// which the Vite `@` alias (→ apps/omnihub-site/src) does not cover.
import {
  initializeOmniSentry,
  shutdownOmniSentry,
  getHealthStatus,
  flushOfflineErrors,
  withResilience,
  clearAllData,
  type HealthStatus,
} from '../../../../src/lib/omni-sentry';

export const OMNI_SENTRY_STORAGE_KEY = 'omni_sentry_enabled';
const OFFLINE_KEY = 'omni_sentry_offline';

function readEnabled(): boolean {
  try {
    return localStorage.getItem(OMNI_SENTRY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(OMNI_SENTRY_STORAGE_KEY, String(enabled));
  } catch {
    // Storage unavailable (private mode / SSR) — degrade silently.
  }
}

/** Read pending offline queue length from sessionStorage without touching lib internals. */
function readOfflineCount(): number {
  try {
    const raw = sessionStorage.getItem(OFFLINE_KEY);
    if (!raw) return 0;
    const arr = JSON.parse(raw) as unknown[];
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

const STATUS_LABEL: Readonly<Record<HealthStatus['status'], string>> = {
  healthy:  'Healthy',
  degraded: 'Degraded',
  critical: 'Critical',
};

const STATUS_COLOR: Readonly<Record<HealthStatus['status'], string>> = {
  healthy:  'var(--color-success, #34d399)',
  degraded: 'var(--color-warning, #f59e0b)',
  critical: 'var(--color-error,   #ef4444)',
};

const CIRCUIT_COLOR: Readonly<Record<string, string>> = {
  closed:      'var(--color-success, #34d399)',
  open:        'var(--color-error,   #ef4444)',
  'half-open': 'var(--color-warning, #f59e0b)',
};

type ProbeResult = 'idle' | 'running' | 'passed' | 'skipped' | 'failed';

const PROBE_LABEL: Readonly<Record<ProbeResult, string>> = {
  idle:    'Run Circuit Probe',
  running: 'Probing circuit…',
  passed:  '✓ Circuit closed — probe passed',
  skipped: '⚡ Circuit open — probe short-circuited',
  failed:  '✗ Probe failed — circuit tripped',
};

export function OmniSentryPanel() {
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

  // Hydrate from stored preference and activate the monitor if enabled.
  useEffect(() => {
    const stored = readEnabled();
    setEnabled(stored);
    if (stored) {
      initializeOmniSentry();
      refresh();
    }
  }, [refresh]);

  // Live polling while active.
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = globalThis.setInterval(refresh, 5000);
    return () => globalThis.clearInterval(id);
  }, [enabled, refresh]);

  const handleToggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      persistEnabled(next);
      if (next) {
        initializeOmniSentry();
        setHealth(getHealthStatus());
      } else {
        shutdownOmniSentry();
        setHealth(null);
      }
      setOfflineCount(readOfflineCount());
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    clearAllData();
    setHealth(getHealthStatus());
    setOfflineCount(0);
    setFlushedCount(0);
    setFlushState('idle');
  }, []);

  // flushOfflineErrors — drains sessionStorage offline queue into error log.
  const handleFlush = useCallback(async () => {
    setFlushState('flushing');
    const n = await flushOfflineErrors();
    setFlushedCount(n);
    setFlushState('done');
    refresh();
    globalThis.setTimeout(() => setFlushState('idle'), 4000);
  }, [refresh]);

  // withResilience — live circuit probe: runs a real no-op through the breaker.
  const handleProbe = useCallback(async () => {
    setProbeResult('running');
    const result = await withResilience(
      async () => { /* intentional no-op health probe */ return true; },
      'panel-circuit-probe',
    );
    if (result === null) {
      setProbeResult('skipped'); // circuit open — operation short-circuited
    } else {
      setProbeResult('passed');  // circuit closed, operation succeeded
    }
    refresh();
    globalThis.setTimeout(() => setProbeResult('idle'), 5000);
  }, [refresh]);

  // Formatting helpers to avoid nested ternaries and negated conditions in JSX
  const offlineErrorSuffix = offlineCount === 1 ? '' : 's';
  const offlineDescription = offlineCount > 0
    ? `${offlineCount} error${offlineErrorSuffix} queued while circuit was open. Flush to move them into the error log.`
    : 'No errors queued offline. Errors captured while the circuit is open will appear here.';

  const flushButtonIdleText = offlineCount > 0 ? `Flush Offline Errors (${offlineCount})` : 'Flush Offline Errors';
  const flushedErrorSuffix = flushedCount === 1 ? '' : 's';
  const flushButtonDoneText = `✓ Flushed ${flushedCount} error${flushedErrorSuffix}`;

  return (
    <div className="card" style={{ maxWidth: '720px', margin: '0 auto' }}>

      {/* ── Header + toggle ──────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 className="heading-3">Self-Healing Monitor</h3>
          <p className="text-secondary mt-4">
            Circuit-breaker protection with automatic recovery, offline error
            queuing, and live health diagnostics.
          </p>
        </div>
        <button
          type="button"
          className={enabled ? 'btn btn--secondary' : 'btn btn--primary'}
          onClick={handleToggle}
          aria-pressed={enabled}
        >
          {enabled ? 'Disable' : 'Enable'}
        </button>
      </div>

      {enabled && health ? (
        <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* ── Health metrics ─────────────────────────────────────── */}
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            <Metric
              label="Status"
              value={STATUS_LABEL[health.status]}
              color={STATUS_COLOR[health.status]}
            />
            <Metric
              label="Circuit"
              value={health.metrics.circuitState}
              color={CIRCUIT_COLOR[health.metrics.circuitState]}
            />
            <Metric label="Error Rate"   value={`${health.metrics.errorRate}/min`} />
            <Metric label="Memory"       value={`${Math.round(health.metrics.memoryUsage)}%`} />
            <Metric label="Uptime"       value={`${Math.round(health.metrics.uptime / 1000)}s`} />
            <Metric label="Offline Queue" value={String(offlineCount)} color={offlineCount > 0 ? 'var(--color-warning, #f59e0b)' : undefined} />
          </dl>

          {/* ── Diagnostics ────────────────────────────────────────── */}
          {health.diagnostics.length > 0 && (
            <ul className="fortress-list">
              {health.diagnostics.map((d) => (
                <li key={d} className="fortress-list__item">
                  {d}
                </li>
              ))}
            </ul>
          )}

          {/* ── Flush offline errors ───────────────────────────────── */}
          <div>
            <h4 className="heading-3" style={{ fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>
              Offline Error Queue
            </h4>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginBottom: 'var(--space-3)' }}>
              {offlineDescription}
            </p>
            <button
              type="button"
              data-testid="omni-sentry-panel-flush-btn"
              className="btn btn--secondary"
              disabled={offlineCount === 0 || flushState === 'flushing'}
              onClick={() => { void handleFlush(); }}
            >
              {flushState === 'idle'     && flushButtonIdleText}
              {flushState === 'flushing' && 'Flushing…'}
              {flushState === 'done'     && flushButtonDoneText}
            </button>
          </div>

          {/* ── Circuit probe (withResilience) ─────────────────────── */}
          <div>
            <h4 className="heading-3" style={{ fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>
              Circuit Probe
            </h4>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginBottom: 'var(--space-3)' }}>
              Runs a real no-op operation through the circuit breaker via{' '}
              <code>withResilience()</code>. Reports whether the circuit is
              closed (operation executes), open (operation short-circuits), or
              if the breaker trips on failure.
            </p>
            <button
              type="button"
              data-testid="omni-sentry-panel-probe-btn"
              className="btn btn--secondary"
              disabled={probeResult === 'running'}
              onClick={() => { void handleProbe(); }}
            >
              {PROBE_LABEL[probeResult]}
            </button>
          </div>

          {/* ── Clear all data ─────────────────────────────────────── */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleClear}
            >
              Clear all monitor data
            </button>
          </div>

        </div>
      ) : (
        <p className="text-secondary" style={{ marginTop: 'var(--space-6)' }}>
          Enable to activate self-healing error monitoring with circuit-breaker
          protection, offline queuing, and resilience probing. Health metrics
          update live while active.
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  color,
}: Readonly<{ label: string; value: string; color?: string }>) {
  return (
    <div>
      <dt className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
        {label}
      </dt>
      <dd
        className="heading-3"
        style={{ marginTop: 'var(--space-2)', ...(color ? { color } : {}), textTransform: 'capitalize' }}
      >
        {value}
      </dd>
    </div>
  );
}
