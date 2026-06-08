/**
 * SentinelPanel — Right sidebar ops controls panel for OmniDash
 * Displays: Demo Mode, Auto-Pilot, Guardian Mode toggles with sublabels
 */

import { memo } from 'react';
import { useDemoMode } from '../../src/contexts/DemoModeContext';

interface OpsToggleProps {
  label: string;
  sublabel: string;
  enabled: boolean;
  onToggle: () => void;
  ariaLabel: string;
}

function OpsToggle({ label, sublabel, enabled, onToggle, ariaLabel }: OpsToggleProps) {
  return (
    <div className="od-toggle-row" style={{ minHeight: 'auto', marginBottom: 12, alignItems: 'flex-start' }}>
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
  const {
    demoMode, setDemoMode,
    autoPilot, setAutoPilot,
    guardianMode, setGuardianMode,
  } = useDemoMode();

  return (
    <div className="sentinel-section" style={{ paddingBottom: 16 }}>
      <div className="sentinel-section-title">Ops Controls</div>

      <OpsToggle
        label="Demo Mode"
        sublabel="Simulated data feed"
        enabled={demoMode}
        onToggle={() => setDemoMode(!demoMode)}
        ariaLabel="Toggle demo mode"
      />
      <OpsToggle
        label="Auto-Pilot"
        sublabel="Autonomous task handling"
        enabled={autoPilot}
        onToggle={() => setAutoPilot(!autoPilot)}
        ariaLabel="Toggle auto pilot"
      />
      <OpsToggle
        label="Guardian Mode"
        sublabel="AI policy enforcement"
        enabled={guardianMode}
        onToggle={() => setGuardianMode(!guardianMode)}
        ariaLabel="Toggle guardian mode"
      />
    </div>
  );
});
