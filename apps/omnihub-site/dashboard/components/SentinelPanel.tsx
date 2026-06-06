/**
 * SentinelPanel — Right sidebar intelligence panel for OmniDash
 * Displays: Ops Controls (Demo Mode, Auto-Pilot, Guardian Mode)
 */

import { memo } from 'react';
import { useDemoMode } from '../../src/contexts/DemoModeContext';

export const SentinelPanel = memo(function SentinelPanel() {
  const { 
    demoMode, setDemoMode,
    autoPilot, setAutoPilot,
    guardianMode, setGuardianMode
  } = useDemoMode();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Ops Controls ── */}
      <div className="sentinel-section">
        <div className="sentinel-section-title">
          Ops Controls
        </div>

        <div className="od-toggle-row" style={{ minHeight: 'auto', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Demo Mode</span>
          <button
            type="button"
            className={`od-toggle${demoMode ? ' on' : ''}`}
            onClick={() => setDemoMode(!demoMode)}
            aria-label="Toggle demo mode"
            style={{ minHeight: 20 }}
          />
        </div>

        <div className="od-toggle-row" style={{ minHeight: 'auto', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Auto-Pilot</span>
          <button
            type="button"
            className={`od-toggle${autoPilot ? ' on' : ''}`}
            onClick={() => setAutoPilot(!autoPilot)}
            aria-label="Toggle auto pilot"
            style={{ minHeight: 20 }}
          />
        </div>

        <div className="od-toggle-row" style={{ minHeight: 'auto' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Guardian Mode</span>
          <button
            type="button"
            className={`od-toggle${guardianMode ? ' on' : ''}`}
            onClick={() => setGuardianMode(!guardianMode)}
            aria-label="Toggle guardian mode"
            style={{ minHeight: 20 }}
          />
        </div>
      </div>
    </div>
  );
});
