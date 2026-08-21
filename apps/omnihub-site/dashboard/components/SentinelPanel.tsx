/**
 * SentinelPanel — Right sidebar ops controls panel for OmniDash
 * Displays: Demo Mode, Auto-Pilot, Guardian Mode toggles with sublabels
 */

import { memo } from 'react';
import { useDemoMode } from '../../src/contexts/DemoModeContext';
import { useAppTranslation } from '../../src/i18n/useAppTranslation';

interface OpsToggleProps {
  label: string;
  sublabel: string;
  enabled: boolean;
  onToggle: () => void;
  ariaLabel: string;
}

function OpsToggle({ label, sublabel, enabled, onToggle, ariaLabel }: OpsToggleProps) {
  return (
    <div className="od-toggle-row" style={{ minHeight: 'auto', marginBottom: 6, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--od-text-primary)', lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: 10, color: 'var(--od-text-tertiary)', marginTop: 2, lineHeight: 1.3 }}>{sublabel}</div>
      </div>
      <button
        type="button"
        className={`od-toggle${enabled ? ' on' : ''}`}
        onClick={onToggle}
        aria-label={ariaLabel}
        style={{ minHeight: 20, marginTop: 2, flexShrink: 0 }}
      />
    </div>
  );
}

export const SentinelPanel = memo(function SentinelPanel() {
  const { tx } = useAppTranslation();
  const {
    demoMode, setDemoMode,
    autoPilot, setAutoPilot,
    guardianMode, setGuardianMode,
  } = useDemoMode();

  return (
    <div
      style={{
        borderRadius: 10,
        // Orange rail-card border — right-rail uniformity with OmniSentry/OmniMedia (owner request).
        border: '1px solid rgba(249,115,22,0.25)',
        // Uniform rail/sidebar glassmorph tile fill opacity (owner request).
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        padding: '10px 12px',
      }}
    >
    <div data-testid="rt_ops" className="sentinel-section" style={{ paddingBottom: 4 }}>
      <div className="sentinel-section-title">{tx('dashboard.ops.title')}</div>

      {/* Demo Mode is not exposed in production builds — no demo state ships. */}
      {!import.meta.env.PROD && (
        <OpsToggle
          label={tx('dashboard.ops.demoMode')}
          sublabel={tx('dashboard.ops.demoModeSub')}
          enabled={demoMode}
          onToggle={() => setDemoMode(!demoMode)}
          ariaLabel={tx('dashboard.ops.toggleDemoMode', { defaultValue: 'Toggle demo mode' })}
        />
      )}
      <OpsToggle
        label={tx('dashboard.ops.autoPilot')}
        sublabel={tx('dashboard.ops.autoPilotSub')}
        enabled={autoPilot}
        onToggle={() => setAutoPilot(!autoPilot)}
        ariaLabel={tx('dashboard.ops.toggleAutoPilot', { defaultValue: 'Toggle auto pilot' })}
      />
      <OpsToggle
        label={tx('dashboard.ops.guardianMode')}
        sublabel={tx('dashboard.ops.guardianModeSub')}
        enabled={guardianMode}
        onToggle={() => setGuardianMode(!guardianMode)}
        ariaLabel={tx('dashboard.ops.toggleGuardianMode', { defaultValue: 'Toggle guardian mode' })}
      />
    </div>
    </div>
  );
});
