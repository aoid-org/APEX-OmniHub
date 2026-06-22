// ─── OmniDash Design System ──────────────────────────────────────────────────
// Shared visual primitives for the M03 dashboard shell and its panels.
// Extracted from OmniDashShell.tsx so panel modules (e.g. M03Panels.tsx) can
// consume the same tokens/components without creating a circular import back
// into the shell. Keyframe animations referenced by name (e.g. "apexPulse")
// are injected globally by OmniDashShell.
import type { CSSProperties, ReactNode } from "react";

interface StatusDotProps {
  color?: string;
  pulse?: boolean;
}

interface GlassCardProps {
  children?: ReactNode;
  style?: CSSProperties;
  glow?: boolean;
  onClick?: () => void;
}

interface SectionLabelProps {
  children: ReactNode;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const T = {
  bg:        "var(--omni-bg)",
  surface:   "var(--omni-surface)",
  card:      "var(--omni-card)",
  cardHover: "var(--omni-card-hover)",
  border:    "var(--omni-border)",
  borderGlow:"var(--omni-border-glow)",
  orange:    "var(--omni-orange)",
  orangeDim: "var(--omni-orange-dim)",
  orangeGlow:"var(--omni-orange-glow)",
  blue:      "var(--omni-blue)",
  blueDim:   "var(--omni-blue-dim)",
  blueGlow:  "var(--omni-blue-glow)",
  cyan:      "var(--omni-cyan)",
  green:     "var(--omni-green)",
  warn:      "var(--omni-warn)",
  red:       "var(--omni-red)",
  purple:    "var(--omni-purple)",
  t1:        "var(--omni-t1)",
  t2:        "var(--omni-t2)",
  t3:        "var(--omni-t3)",
  t4:        "var(--omni-t4)",
};

export const StatusDot = ({ color = T.green, pulse: doPulse = true }: StatusDotProps) => (
  <div style={{
    width:8, height:8, borderRadius:"50%", backgroundColor:color,
    flexShrink:0, boxShadow:`0 0 6px ${color}`,
    animation: doPulse ? "apexPulse 2s ease-in-out infinite" : "none",
  }} />
);

export const GlassCard = ({ children, style={}, glow = true, onClick }: GlassCardProps) => {
  const cardStyle: CSSProperties = {
    background: T.card,
    border: `1px solid ${glow ? T.borderGlow : T.border}`,
    borderRadius: 16,
    boxShadow: glow
      ? `0 0 24px ${T.orangeGlow}, 0 4px 24px rgba(0,0,0,.5)`
      : `0 4px 24px rgba(0,0,0,.4)`,
    backdropFilter: "blur(12px)",
    transition: "all .2s ease",
    ...style,
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={{ ...cardStyle, cursor: "pointer" }}>
        {children}
      </button>
    );
  }

  return (
    <div style={cardStyle}>
      {children}
    </div>
  );
};

export const SectionLabel = ({ children }: SectionLabelProps) => (
  <div style={{
    fontSize:9.8, fontWeight:800, letterSpacing:"0.14em",
    color: T.t3, textTransform:"uppercase", marginBottom:8,
  }}>{children}</div>
);
