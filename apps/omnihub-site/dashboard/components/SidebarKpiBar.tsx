import { useState, useCallback } from 'react';
import { T, omniRgba } from '../omniSkinTokens';
import type { KpiSummary, SystemHealthState } from '../types/dashboard.types';
import { useAppTranslation } from '../../src/i18n/useAppTranslation';

const STORAGE_KEY = 'apex.sidebar.kpi.collapsed';

function getSavedCollapsed(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}

interface Tile {
  key: string;
  icon: string;
  value: string | number;
  label: string;
  color: string;
}

interface SidebarKpiBarProps {
  readonly kpi: KpiSummary;
  readonly systemHealth?: SystemHealthState;
  readonly demoMode: boolean;
}

export function SidebarKpiBar({ kpi, systemHealth, demoMode }: SidebarKpiBarProps) {
  const { tx } = useAppTranslation();
  const [collapsed, setCollapsed] = useState(getSavedCollapsed);

  const toggle = useCallback(() => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  const isHealthy = demoMode ? true : systemHealth === 'healthy';
  const events    = demoMode ? 0 : (kpi.flowbills_demos ?? 0);
  const guardian  = demoMode ? 1 : (kpi.flowbills_paid_accounts ?? 0);
  const stale     = demoMode ? 0 : (kpi.ops_sev1_incidents ?? 0);

  const tiles: Tile[] = [
    { key: 'events',   icon: '⚡', value: events,                    label: tx('dashboard.systemHealth.eventsTracked'),  color: T.t2 },
    { key: 'health',   icon: '🛡️', value: isHealthy ? '✓' : '!',   label: tx('dashboard.systemHealth.systemHealth'),   color: isHealthy ? T.green : T.warn },
    { key: 'guardian', icon: '🔄', value: guardian,                  label: tx('dashboard.systemHealth.guardianLoops'),  color: T.orange },
    { key: 'stale',    icon: '✅', value: stale === 0 ? '0' : stale, label: tx('dashboard.systemHealth.staleChecks'),    color: stale === 0 ? T.green : T.warn },
  ];

  return (
    <div
      data-testid="sidebar-kpi-bar"
      style={{
        margin: '0 0 8px',
        borderRadius: 11,
        // Same neutral fill as NavItem above it (0.14 white, not orange) —
        // an orange-tinted fill reads as warm brown against the right rail's
        // cool neutral-white cards (OmniSentry/Ops Controls), a real hue
        // mismatch measured on a live render. Border/blur stay matched to
        // the right rail; only the fill tint + alpha changed.
        border: `1px solid ${omniRgba('orange', 0.25)}`,
        background: 'rgba(255, 255, 255, 0.14)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-controls="sidebar-kpi-grid"
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '6px 10px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.t3, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
        }}
      >
        <span>{tx('dashboard.sidebar.systemKpis')}</span>
        <span aria-hidden="true" style={{ fontSize: 8 }}>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div
          id="sidebar-kpi-grid"
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 4, padding: '0 8px 8px',
          }}
        >
          {tiles.map(tile => (
            <div
              key={tile.key}
              title={tile.label}
              aria-label={`${tile.label}: ${tile.value}`}
              style={{
                // Matches .sentinel-metric — the equivalent stat tile inside the
                // right-rail System Status widget (owner request: uniform opacity).
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--od-border-subtle)',
                borderRadius: 7,
                padding: '5px 7px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2,
              }}
            >
              <span style={{ fontSize: 12 }}>{tile.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: tile.color, lineHeight: 1 }}>
                {tile.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
