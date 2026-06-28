// ─── APEX OmniSkin Engine (OSE v1.0) — Token Forge (Layer 1) ───────────────
// Single canonical source for OmniDash design tokens. CSS var() references
// for cascade-aware (theme-swapping) properties; decimal RGB channels for
// the brand accent colors so call sites build rgba() instead of invalid
// var()+hex-alpha strings (e.g. `${T.orange}22`, which is not parseable CSS
// and silently drops the declaration).

export const CHANNELS = {
  orange: "249,115,22",
  blue:   "59,130,246",
  cyan:   "6,182,212",
  green:  "34,197,94",
  warn:   "234,179,8",
  red:    "239,68,68",
  purple: "168,85,247",
} as const;

export type ChannelName = keyof typeof CHANNELS;

export function omniRgba(channel: ChannelName, alpha: number): string {
  return `rgba(${CHANNELS[channel]},${alpha})`;
}

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
} as const;

export const NAV_BG = {
  active: `linear-gradient(135deg, ${omniRgba("orange", 0.22)} 0%, ${omniRgba("orange", 0.06)} 100%)`,
  hover:  `linear-gradient(135deg, ${omniRgba("orange", 0.16)} 0%, ${omniRgba("orange", 0.05)} 100%)`,
  idle:   `linear-gradient(135deg, ${omniRgba("orange", 0.10)} 0%, ${omniRgba("orange", 0.03)} 100%)`,
};

export const NAV_BORDER = {
  active: `1px solid ${omniRgba("orange", 0.60)}`,
  hover:  `1px solid ${omniRgba("orange", 0.40)}`,
  idle:   `1px solid ${omniRgba("orange", 0.18)}`,
};

export const NAV_SHADOW = {
  active: `0 0 10px ${omniRgba("orange", 0.19)}, 0 2px 8px rgba(0,0,0,0.5)`,
  idle:   `0 2px 6px rgba(0,0,0,0.4)`,
};

export const HEALTH_PALETTE = {
  red: {
    bg: omniRgba("red", 0.13),
    border: omniRgba("red", 0.40),
    color: T.red,
    channel: CHANNELS.red,
  },
  yellow: {
    bg: omniRgba("warn", 0.13),
    border: omniRgba("warn", 0.40),
    color: T.warn,
    channel: CHANNELS.warn,
  },
  green: {
    bg: omniRgba("green", 0.13),
    border: omniRgba("green", 0.40),
    color: T.green,
    channel: CHANNELS.green,
  },
} as const;
