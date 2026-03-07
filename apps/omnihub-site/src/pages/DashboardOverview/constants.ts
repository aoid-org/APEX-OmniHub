/* ── Real app logos via Clearbit ── */
export const LOGO = (domain: string) =>
  `https://logo.clearbit.com/${domain}`;

/* ── Hidden apps ── */
export const HIDDEN_APPS = new Set(['OmniBoard', 'OmniPort', 'Maestro']);

/* ── Framer Motion spring config (reused, no inline duplication) ── */
export const SPRING = {
  type: 'spring',
  stiffness: 170,
  damping: 26,
  mass: 1,
} as const;

/* ── Health colour map ── */
export const HC = {
  green: {
    border: 'rgba(52,211,153,0.5)',
    bg: 'rgba(52,211,153,0.06)',
    text: '#34d399',
    shadow: '0 0 12px rgba(52,211,153,0.25)',
  },
  yellow: {
    border: 'rgba(250,204,21,0.5)',
    bg: 'rgba(250,204,21,0.06)',
    text: '#facc15',
    shadow: '0 0 12px rgba(250,204,21,0.25)',
  },
  red: {
    border: 'rgba(239,68,68,0.5)',
    bg: 'rgba(239,68,68,0.06)',
    text: '#ef4444',
    shadow: '0 0 12px rgba(239,68,68,0.25)',
  },
} as const;

/* ── Design tokens ── */
export const APEX_ORANGE = '#c2501f';
export const FONT_SG = 'Space Grotesk, sans-serif';

/* ── Shared glass tile surface ── */
export const GLASS_TILE = {
  borderRadius: 24,
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(32px) saturate(180%)',
  WebkitBackdropFilter: 'blur(32px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxShadow:
    'inset 0 1px 1px rgba(255,255,255,0.25),' +
    ' 0 10px 30px rgba(0,0,0,0.2)',
};

/* ── Shared button style variants ── */
export const CTRL_BTN = {
  background: 'rgba(249,115,22,0.1)',
  border: '1px solid rgba(249,115,22,0.3)',
  color: '#f97316',
  transition: 'all 0.2s',
};

export const ORANGE_GHOST = {
  background: 'rgba(194,80,31,0.06)',
  border: '1px solid rgba(194,80,31,0.2)',
  color: '#f97316',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

/* ── Static listening-bar geometry ── */
export const BARS = [
  { id: 'b0', h: 6 },
  { id: 'b1', h: 10 },
  { id: 'b2', h: 16 },
  { id: 'b3', h: 10 },
  { id: 'b4', h: 6 },
] as const;

/* ── Prompt bar style ── */
export const PROMPT_STYLE_BASE = {
  height: 44,
  borderRadius: 12,
  padding: '0 20px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#dfe6fe',
  fontSize: 15,
  outline: 'none',
  fontFamily: 'inherit',
  fontWeight: 500,
  transition: 'all 0.3s ease',
  flex: 1,
};

/* ── Ecosystem row styles ── */
export const ECO_ROW_STYLE = {
  background: 'rgba(0,0,0,0.20)',
  border: '1px solid rgba(255,255,255,0.05)',
  cursor: 'grab',
  touchAction: 'none' as const,
};

export const CAT_BADGE_STYLE = {
  background: 'rgba(249,115,22,0.1)',
  color: '#f97316',
  border: '1px solid rgba(249,115,22,0.25)',
  fontWeight: 800,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

/* ── App tile styles ── */
export const APP_TILE_SURFACE = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '16px 20px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)',
  cursor: 'grab',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.05),' +
    ' 0 4px 15px rgba(0,0,0,0.4)',
  touchAction: 'none' as const,
  transition: 'all 0.3s ease-out',
  position: 'relative' as const,
};

export const APP_LOGO_STYLE = {
  width: 44,
  height: 44,
  borderRadius: 12,
  flexShrink: 0,
  background: '#09090b',
  objectFit: 'contain' as const,
  padding: 6,
  border: '1px solid rgba(255,255,255,0.1)',
};

export const APP_LOGO_FALLBACK = {
  width: 44,
  height: 44,
  borderRadius: 12,
  flexShrink: 0,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#f97316',
};

export const APP_TILE_HOVER = {
  scale: 1.03,
  borderColor: 'rgba(255,255,255,0.15)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.1),' +
    ' 0 8px 25px rgba(0,0,0,0.6)',
  translateY: -2,
};

export const PARTIAL_CHIP = {
  background: 'rgba(250,204,21,0.12)',
  color: '#facc15',
  borderColor: 'rgba(250,204,21,0.3)',
};

export const SYNC_BTN_STYLE = {
  position: 'absolute' as const,
  bottom: 16,
  right: 16,
  fontSize: 10.7,
  fontWeight: 800,
  padding: '6px 14px',
  borderRadius: 8,
  background: 'rgba(249,115,22,0.1)',
  border: '1px solid rgba(249,115,22,0.3)',
  color: '#f97316',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};
