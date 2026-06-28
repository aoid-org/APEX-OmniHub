import { memo } from 'react';
import { T } from '../designSystem';

/**
 * ObservabilityToggle — progressive-disclosure affordance for the M03 panels.
 *
 * Fixes the audit's "cognitive overload" finding: the seven observability
 * panels are collapsed by default and revealed on demand behind this single,
 * clearly-labelled control instead of crowding the default canvas.
 *
 * Accessible: real <button> with aria-expanded + aria-controls pointing at the
 * panel region, visible focus handled via the `omni-observability-toggle` CSS
 * class. Branding-preserving (T tokens only).
 */
export interface ObservabilityToggleProps {
  readonly shown: boolean;
  readonly panelCount: number;
  readonly controlsId: string;
  readonly onToggle: () => void;
}

export const ObservabilityToggle = memo(function ObservabilityToggle({
  shown, panelCount, controlsId, onToggle,
}: ObservabilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={shown}
      aria-controls={controlsId}
      data-testid="observability-toggle"
      className="omni-observability-toggle"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '10px 14px', borderRadius: 12,
        background: T.surface, border: `1px solid ${T.border}`,
        color: T.t2, cursor: 'pointer', font: 'inherit', textAlign: 'left',
        minHeight: 44,
      }}
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
        style={{ transform: shown ? 'rotate(90deg)' : 'none', transition: 'transform .18s ease', flexShrink: 0 }}
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
        {shown ? 'Hide Observability' : 'Show Observability'}
      </span>
      <span style={{ fontSize: 11, color: T.t3, marginLeft: 'auto' }}>
        {panelCount} {panelCount === 1 ? 'panel' : 'panels'}
      </span>
    </button>
  );
});
