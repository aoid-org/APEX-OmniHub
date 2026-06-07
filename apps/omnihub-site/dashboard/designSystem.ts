import type { ReactNode, CSSProperties } from 'react';

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

export interface StatusDotProps {
  color?: string;
  pulse?: boolean;
}

export interface GlassCardProps {
  children?: ReactNode;
  style?: CSSProperties;
  glow?: boolean;
  onClick?: () => void;
}

export interface SectionLabelProps {
  children: ReactNode;
}
