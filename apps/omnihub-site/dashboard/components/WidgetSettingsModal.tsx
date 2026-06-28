/**
 * WidgetSettingsModal — Canvas widget visibility and layout settings panel.
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/components/WidgetSettingsModal
 *
 * Renders the CONTENT of a settings panel (no Dialog wrapper — parent handles
 * the container/dropdown). Lets users toggle canvas widgets on/off, reverse the
 * sidebar layout, and reset widget positions.
 *
 * Uses inline styles only (no Tailwind) to match OmniDashShell styling.
 * Font: Space Grotesk. Colors: dark glass card palette.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { CSSProperties } from 'react';

// ─── Widget Manifest ──────────────────────────────────────────────────────────

const CANVAS_WIDGETS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'widget_agent', label: 'APEX Agent' },
  { id: 'widget_slate', label: 'OmniSlate AI' },
  { id: 'widget_eco', label: 'Ecosystem' },
  { id: 'widget_apps', label: 'Connections' },
  { id: 'm03_1', label: 'System Health Overview' },
  { id: 'm03_2', label: 'Agent Activity Timeline' },
  { id: 'm03_3', label: 'Guardian Alert Feed' },
  { id: 'm03_4', label: 'MAN Mode Review Queue' },
  { id: 'm03_5', label: 'OmniRoute Traffic' },
  { id: 'm03_6', label: 'Workflow Status Board' },
  { id: 'm03_7', label: 'System Sparklines' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WidgetSettingsPanelProps {
  hiddenWidgets: readonly string[];
  panelLayout: 'standard' | 'reversed';
  onToggleWidget: (id: string) => void;
  onSetPanelLayout: (l: 'standard' | 'reversed') => void;
  onResetPositions: () => void;
  onClose: () => void;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const panelStyle: CSSProperties = {
  background: 'rgba(15,23,41,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  color: '#e0e7ff',
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: 12,
  width: 280,
  maxHeight: 520,
  overflowY: 'auto',
  boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
};

const sectionHeaderStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(224,231,255,0.45)',
  padding: '10px 14px 6px',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '5px 14px',
  gap: 8,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: '#e0e7ff',
  fontWeight: 400,
  flex: 1,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const dividerStyle: CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.06)',
  margin: '6px 0',
};

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  const trackStyle: CSSProperties = {
    position: 'relative',
    width: 30,
    height: 17,
    borderRadius: 9,
    background: enabled ? 'rgba(249,115,22,0.85)' : 'rgba(255,255,255,0.12)',
    border: `1px solid ${enabled ? 'rgba(249,115,22,0.6)' : 'rgba(255,255,255,0.18)'}`,
    cursor: 'pointer',
    transition: 'background 0.18s, border-color 0.18s',
    flexShrink: 0,
    padding: 0,
    outline: 'none',
  };
  const thumbStyle: CSSProperties = {
    position: 'absolute',
    top: 2,
    left: enabled ? 13 : 2,
    width: 11,
    height: 11,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.18s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      style={trackStyle}
    >
      <div style={thumbStyle} />
    </button>
  );
}

// ─── Layout Option Button ─────────────────────────────────────────────────────

function LayoutOption({
  label,
  sublabel,
  active,
  onClick,
}: {
  label: string;
  sublabel: string;
  active: boolean;
  onClick: () => void;
}) {
  const btnStyle: CSSProperties = {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    border: active
      ? '1px solid rgba(249,115,22,0.7)'
      : '1px solid rgba(255,255,255,0.1)',
    background: active
      ? 'rgba(249,115,22,0.14)'
      : 'rgba(255,255,255,0.04)',
    color: active ? 'rgba(249,115,22,1)' : '#e0e7ff',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.15s',
    fontFamily: "'Space Grotesk', sans-serif",
  };
  return (
    <button type="button" onClick={onClick} style={btnStyle}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 10, color: active ? 'rgba(249,115,22,0.7)' : 'rgba(224,231,255,0.4)', lineHeight: 1.4 }}>
        {sublabel}
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WidgetSettingsPanel({
  hiddenWidgets,
  panelLayout,
  onToggleWidget,
  onSetPanelLayout,
  onResetPositions,
  onClose,
}: WidgetSettingsPanelProps) {
  return (
    <div style={panelStyle}>
      {/* Section 1 — Canvas Widgets */}
      <div style={sectionHeaderStyle}>Canvas Widgets</div>
      {CANVAS_WIDGETS.map((w) => {
        const isVisible = !hiddenWidgets.includes(w.id);
        return (
          <div key={w.id} style={rowStyle}>
            <span style={labelStyle}>{w.label}</span>
            <ToggleSwitch
              enabled={isVisible}
              onToggle={() => onToggleWidget(w.id)}
            />
          </div>
        );
      })}

      <div style={dividerStyle} />

      {/* Section 2 — Panel Layout */}
      <div style={sectionHeaderStyle}>Panel Layout</div>
      <div style={{ display: 'flex', gap: 8, padding: '4px 14px 10px' }}>
        <LayoutOption
          label="Standard"
          sublabel="Nav left, insights right"
          active={panelLayout === 'standard'}
          onClick={() => onSetPanelLayout('standard')}
        />
        <LayoutOption
          label="Reversed"
          sublabel="Insights left, nav right"
          active={panelLayout === 'reversed'}
          onClick={() => onSetPanelLayout('reversed')}
        />
      </div>

      <div style={dividerStyle} />

      {/* Section 3 — Layout Actions */}
      <div style={sectionHeaderStyle}>Layout</div>
      <div style={{ padding: '4px 14px 14px' }}>
        <button
          type="button"
          onClick={() => {
            onResetPositions();
            onClose();
          }}
          style={{
            width: '100%',
            padding: '8px 0',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: '#e0e7ff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '0.02em',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          Reset Widget Positions
        </button>
      </div>
    </div>
  );
}
