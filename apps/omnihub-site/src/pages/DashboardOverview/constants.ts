/* ── Real app logos via Clearbit ── */
export const LOGO = (domain: string) =>
  `https://logo.clearbit.com/${domain}`;

/* ── Hidden apps ── */
export const HIDDEN_APPS = new Set(['OmniBoard', 'OmniPort', 'Maestro']);

/* ── Framer Motion spring config ── */
export const SPRING = {
  type: 'spring',
  stiffness: 200,
  damping: 28,
  mass: 0.8,
} as const;

/* ── Health colour map ── */
export const HC = {
  green: {
    border: 'rgba(52,211,153,0.35)',
    bg: 'rgba(52,211,153,0.05)',
    text: '#34d399',
    shadow: '0 0 12px rgba(52,211,153,0.15)',
  },
  yellow: {
    border: 'rgba(250,204,21,0.35)',
    bg: 'rgba(250,204,21,0.05)',
    text: '#facc15',
    shadow: '0 0 12px rgba(250,204,21,0.15)',
  },
  red: {
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.05)',
    text: '#ef4444',
    shadow: '0 0 12px rgba(239,68,68,0.15)',
  },
} as const;

/* ── Design tokens ── */
export const APEX_ORANGE = '#c2501f';
export const FONT_SG = '"Space Grotesk", sans-serif';

/* ── Shared glass tile surface — refined depth ── */
export const GLASS_TILE = {
  borderRadius: 20,
  backgroundColor: 'rgba(8, 12, 21, 0.65)',
  backdropFilter: 'blur(40px) saturate(160%)',
  WebkitBackdropFilter: 'blur(40px) saturate(160%)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.05),' +
    ' 0 8px 32px rgba(0,0,0,0.3)',
};

/* ── Shared button style variants ── */
export const CTRL_BTN = {
  background: 'rgba(249,115,22,0.08)',
  border: '1px solid rgba(249,115,22,0.20)',
  color: '#f97316',
  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
};

export const ORANGE_GHOST = {
  background: 'rgba(194,80,31,0.05)',
  border: '1px solid rgba(194,80,31,0.15)',
  color: '#f97316',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

/* ── Static listening-bar geometry ── */
export const BARS = [
  { id: 'b0', h: 5 },
  { id: 'b1', h: 9 },
  { id: 'b2', h: 14 },
  { id: 'b3', h: 9 },
  { id: 'b4', h: 5 },
] as const;

/* ── Prompt bar style ── */
export const PROMPT_STYLE_BASE = {
  height: 42,
  borderRadius: 12,
  padding: '0 18px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e8ecf4',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  fontWeight: 500,
  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  flex: 1,
};

/* ── Ecosystem row styles ── */
export const ECO_ROW_STYLE = {
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.05)',
  cursor: 'grab',
  touchAction: 'none' as const,
};

export const CAT_BADGE_STYLE = {
  background: 'rgba(249,115,22,0.08)',
  color: '#f97316',
  border: '1px solid rgba(249,115,22,0.20)',
  fontWeight: 800,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

/* ── App tile styles — refined surfaces ── */
export const APP_TILE_SURFACE = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '14px 18px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.05)',
  cursor: 'grab',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.03),' +
    ' 0 4px 16px rgba(0,0,0,0.3)',
  touchAction: 'none' as const,
  transition: 'all 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
  position: 'relative' as const,
};

export const APP_LOGO_STYLE = {
  width: 40,
  height: 40,
  borderRadius: 10,
  flexShrink: 0,
  background: 'rgba(6, 10, 19, 0.8)',
  objectFit: 'contain' as const,
  padding: 5,
  border: '1px solid rgba(255,255,255,0.08)',
};

export const APP_LOGO_FALLBACK = {
  width: 40,
  height: 40,
  borderRadius: 10,
  flexShrink: 0,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#f97316',
};

export const APP_TILE_HOVER = {
  scale: 1.02,
  borderColor: 'rgba(194,80,31,0.25)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.06),' +
    ' 0 8px 28px rgba(0,0,0,0.4),' +
    ' 0 0 20px rgba(249,115,22,0.06)',
  translateY: -2,
};

export const PARTIAL_CHIP = {
  background: 'rgba(250,204,21,0.08)',
  color: '#facc15',
  borderColor: 'rgba(250,204,21,0.25)',
};

export const SYNC_BTN_STYLE = {
  position: 'absolute' as const,
  bottom: 14,
  right: 14,
  fontSize: 10,
  fontWeight: 800,
  padding: '5px 12px',
  borderRadius: 8,
  background: 'rgba(249,115,22,0.08)',
  border: '1px solid rgba(249,115,22,0.20)',
  color: '#f97316',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};
