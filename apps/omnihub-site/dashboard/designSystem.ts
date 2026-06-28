import type { ReactNode, CSSProperties } from 'react';

export { T, CHANNELS, omniRgba, NAV_BG, NAV_BORDER, NAV_SHADOW, HEALTH_PALETTE } from './omniSkinTokens';

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
