/**
 * OmniSentryPanel — live, user-controllable surface for the OmniSentry
 * self-healing monitor.
 *
 * This is NOT a mock. It drives the real OmniSentry runtime
 * (`src/lib/omni-sentry.ts`): a circuit-breaker + self-healing error monitor.
 * Enabling the panel calls `initializeOmniSentry()` and the displayed health is
 * read live from `getHealthStatus()`. Preference persists to localStorage under
 * the same key the startup initializer reads, so the monitor stays active
 * across reloads.
 */
import { useCallback, useEffect, useState } from 'react';
// Relative import: the OmniSentry runtime lives in the root package `src/lib`,
// which the Vite `@` alias (→ apps/omnihub-site/src) does not cover.
import {
  initializeOmniSentry,
  shutdownOmniSentry,
  getHealthStatus,
  clearAllData,
  type HealthStatus,
} from '../../../../src/lib/omni-sentry';

export const OMNI_SENTRY_STORAGE_KEY = 'omni_sentry_enabled';

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

const STATUS_LABEL: Readonly<Record<HealthStatus['status'], string>> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  critical: 'Critical',
};

export function OmniSentryPanel() {
  const [enabled, setEnabled] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const refresh = useCallback(() => {
    setHealth(getHealthStatus());
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
    if (!enabled) {
      return;
    }
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
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    clearAllData();
    setHealth(getHealthStatus());
  }, []);

  return (
    <div className="card" style={{ maxWidth: '720px', margin: '0 auto' }}>
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
            Circuit-breaker protection with automatic recovery and live health diagnostics.
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
        <div style={{ marginTop: 'var(--space-6)' }}>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            <Metric label="Status" value={STATUS_LABEL[health.status]} />
            <Metric label="Circuit" value={health.metrics.circuitState} />
            <Metric label="Error Rate" value={`${health.metrics.errorRate}/min`} />
            <Metric label="Memory" value={`${Math.round(health.metrics.memoryUsage)}%`} />
            <Metric label="Uptime" value={`${Math.round(health.metrics.uptime / 1000)}s`} />
          </dl>

          {health.diagnostics.length > 0 && (
            <ul className="fortress-list" style={{ marginTop: 'var(--space-4)' }}>
              {health.diagnostics.map((d) => (
                <li key={d} className="fortress-list__item">
                  {d}
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: 'var(--space-6)' }}>
            <button type="button" className="btn btn--secondary" onClick={handleClear}>
              Clear monitor data
            </button>
          </div>
        </div>
      ) : (
        <p className="text-secondary" style={{ marginTop: 'var(--space-6)' }}>
          Enable to activate self-healing error monitoring with circuit-breaker protection. Health
          metrics update live while active.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="text-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
        {label}
      </dt>
      <dd className="heading-3" style={{ marginTop: 'var(--space-2)' }}>
        {value}
      </dd>
    </div>
  );
}
