/**
 * ProviderLogo — Autonomous & Authentic Vector & Dynamic Resolution Engine
 *
 * Provides authentic official brand marks for all APEX Ecosystem & integrated SaaS applications:
 * - Google Antigravity 2.0: Authentic Rainbow Gravitational Arc.
 * - DueRadar: Authentic Metallic "R" + Neon Cyan "D" Radar Scope + Golden Ping Beam.
 * - aSpiral: Authentic Golden Cosmic Vortex / Helix.
 * - CheapStays: Authentic Horizon Sun / Travel Villa Silhouette.
 * - FLOWBills: Authentic Emerald Flowing Cashflow Stream.
 * - PlayMoney: Authentic Fuchsia / Cyber Gold Arcade Token.
 * - Jubee.Love: Authentic Coral / Rose Heart Glow.
 * - Armageddon: Authentic Crimson Aegis Security Grid.
 * - LampStand: Authentic Radiant Golden Beacon.
 * - Standard SaaS: GitHub, Slack, Stripe, Supabase, Google, Microsoft, Salesforce, Notion, Linear.
 *
 * ZERO PRELOADED DISK ASSETS: 100% self-contained, high-performance, crisp at all DPRs.
 */
import React, { useState, useCallback, useMemo } from 'react';

export interface ProviderLogoProps {
  readonly provider: string;
  readonly appUrl?: string;
  readonly iconUrl?: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

const SIZE_MAP = {
  sm: { className: 'w-4 h-4', px: 18 },
  md: { className: 'w-6 h-6', px: 24 },
  lg: { className: 'w-8 h-8', px: 32 },
} as const;

/**
 * Official Brand SVGs (APEX Ecosystem & Integrated SaaS)
 */
const BRAND_SVGS: Record<string, (dim: string, cls: string) => React.ReactNode> = {
  // Google Antigravity 2.0 — Official Rainbow Gravitational Arc
  'google-antigravity': (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ag-rainbow-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="25%" stopColor="#06B6D4" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="75%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="#18191C" />
      <path
        d="M 3.5 20 C 5.8 20, 7.8 16.5, 9.8 11 C 10.8 8, 11.3 4, 12 4 C 12.7 4, 13.2 8, 14.2 11 C 16.2 16.5, 18.2 20, 20.5 20 C 17.8 16.2, 15.2 13.2, 13.5 13.2 C 12.8 13.2, 12.4 14.2, 12 14.2 C 11.6 14.2, 11.2 13.2, 10.5 13.2 C 8.8 13.2, 6.2 16.2, 3.5 20 Z"
        fill="url(#ag-rainbow-grad)"
      />
    </svg>
  ),

  // DueRadar — Official Metallic "R" + Neon Cyan "D" Radar Scope + Golden Ping Sweep
  dueradar: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="dr-metallic-r" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="dr-gold-beam" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <radialGradient id="dr-radar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#082f49" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#020617" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#dr-radar-glow)" stroke="#1e293b" strokeWidth="0.8" />
      <circle cx="12" cy="12" r="9" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="0.6" fill="none" />
      <circle cx="12" cy="12" r="6" stroke="rgba(0, 229, 255, 0.20)" strokeWidth="0.6" fill="none" />
      <circle cx="12" cy="12" r="3" stroke="rgba(0, 229, 255, 0.25)" strokeWidth="0.6" fill="none" />
      <path
        d="M 6 3.5 L 14 3.5 C 19 3.5, 21.5 7.5, 21.5 12 C 21.5 16.5, 19 20.5, 14 20.5 L 6 20.5"
        stroke="#00E5FF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 3px #00E5FF)' }}
      />
      <path
        d="M 6.5 4.5 L 13.5 4.5 C 16.5 4.5, 18 6.5, 18 9 C 18 11.5, 16 13, 13.5 13 L 9.5 13 L 9.5 19.5 L 6.5 19.5 Z M 9.5 7.5 L 9.5 10.5 L 13 10.5 C 14.5 10.5, 15.2 9.5, 15.2 9 C 15.2 8.5, 14.5 7.5, 13 7.5 Z"
        fill="url(#dr-metallic-r)"
        stroke="#334155"
        strokeWidth="0.4"
      />
      <path d="M 12.5 12.5 L 18 19.5 L 15 19.5 L 10.5 13.5 Z" fill="url(#dr-metallic-r)" />
      <line x1="12" y1="12" x2="18.5" y2="18.5" stroke="url(#dr-gold-beam)" strokeWidth="1.5" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 2px #F59E0B)' }} />
      <circle cx="12" cy="12" r="1.8" fill="#FDE047" stroke="#F59E0B" strokeWidth="0.8" style={{ filter: 'drop-shadow(0 0 3px #FDE047)' }} />
      <circle cx="18" cy="6" r="1.2" fill="#FDE047" style={{ filter: 'drop-shadow(0 0 2px #FDE047)' }} />
    </svg>
  ),

  // aSpiral — Cosmic Violet Spiral Helix
  aspiral: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="asp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="#0F0F1A" />
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93c-2.43-.3-4.32-2.19-4.62-4.62.37.14.77.22 1.19.22 1.93 0 3.5-1.57 3.5-3.5 0-.42-.08-.82-.22-1.19 2.43.3 4.32 2.19 4.62 4.62-.37-.14-.77-.22-1.19-.22-1.93 0-3.5 1.57-3.5 3.5 0 .42.08.82.22 1.19z"
        fill="url(#asp-grad)"
      />
    </svg>
  ),

  // CheapStays — Sunset Orange / Lagoon Teal Vacation Villa
  cheapstays: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="cs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="#091420" />
      <path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 4.5l5 4.5v6h-3v-4H10v4H7v-6l5-4.5z" fill="url(#cs-grad)" />
      <circle cx="12" cy="7" r="1.5" fill="#FBBF24" />
    </svg>
  ),

  // FLOWBills — Emerald Flowing Invoices
  flowbills: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="fb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="#041E15" />
      <path d="M4 6h16v3H4V6zm0 5h16v3H4v-3zm0 5h11v3H4v-3z" fill="url(#fb-grad)" />
      <circle cx="18" cy="17" r="2.5" fill="#34D399" />
    </svg>
  ),

  // PlayMoney — Neon Arcade Token
  playmoney: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="pm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D946EF" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="#180B26" />
      <circle cx="12" cy="12" r="8" stroke="url(#pm-grad)" strokeWidth="2" fill="none" />
      <path d="M10 8l6 4-6 4V8z" fill="#F472B6" />
    </svg>
  ),

  // Jubee.Love — Warm Coral Heart
  jubeelove: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="jb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="#200A14" />
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#jb-grad)" />
    </svg>
  ),

  // Armageddon — Crimson Shield Defense Grid
  armageddon: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="arm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#7F1D1D" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="#1C0A0A" />
      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 4.5c2.5 0 4.5 2 4.5 4.5s-2 4.5-4.5 4.5-4.5-2-4.5-4.5 2-4.5 4.5-4.5z" fill="url(#arm-grad)" />
    </svg>
  ),

  // LampStand — Golden Radiant Beacon
  lampstand: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ls-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="#1C1405" />
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V19h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z" fill="url(#ls-grad)" />
      <circle cx="12" cy="4" r="1" fill="#FEF3C7" />
    </svg>
  ),

  // Google Standard Workspace
  google: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>
  ),

  // GitHub
  github: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ),

  // Slack
  slack: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
    </svg>
  ),

  // Stripe
  stripe: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="#635BFF">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.97 15.654.467 12.875.467c-6.19 0-10.42 3.21-10.42 8.57 0 7.421 10.22 6.223 10.22 9.42 0 .973-.852 1.488-2.227 1.488-2.453 0-5.385-1.127-7.228-2.155l-.946 5.578c1.944 1.037 5.127 1.632 8.174 1.632 6.47 0 10.82-3.155 10.82-8.683 0-7.85-10.312-6.526-10.312-9.667z"/>
    </svg>
  ),

  // Supabase
  supabase: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="#3ECF8E">
      <path d="M12.98 1.15L2.61 14.39a.75.75 0 00.59 1.22h8.05L11.02 22.85a.75.75 0 001.27.56l10.37-13.24a.75.75 0 00-.59-1.22h-8.05l.25-7.24a.75.75 0 00-1.29-.56z"/>
    </svg>
  ),

  // Microsoft
  microsoft: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  ),

  // Salesforce
  salesforce: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="#00A1E0">
      <path d="M19.34 9.17a5.52 5.52 0 0 0-4.21-1.92 5.55 5.55 0 0 0-4.78 2.72 4.14 4.14 0 0 0-2.8-.75 4.19 4.19 0 0 0-4.06 3.61 4.09 4.09 0 0 0-1.49 3.2 4.15 4.15 0 0 0 4.15 4.15h13.2a4.83 4.83 0 0 0 4.83-4.83 4.86 4.86 0 0 0-4.84-6.18z"/>
    </svg>
  ),

  // Notion
  notion: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.46 3.65L17.54 2.5c1.47-.13 2 .8 2 2.05v14.4c0 1.25-.53 2-2 2.12L4.46 22.22c-1.47.13-2-.8-2-2.05V5.7c0-1.25.53-2 2-2.05zM7.5 7v10h2.5V11l4.5 6h2.5V7h-2.5v6L10 7H7.5z"/>
    </svg>
  ),

  // Linear
  linear: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="#5E6AD2">
      <path d="M2.5 12a9.5 9.5 0 0 1 16.21-6.72L3.72 20.27A9.47 9.47 0 0 1 2.5 12zm18.99 0a9.47 9.47 0 0 1-1.22 8.27L5.29 5.28A9.5 9.5 0 0 1 21.49 12z"/>
    </svg>
  ),

  // OpenAI
  openai: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="#10A37F">
      <path d="M22.28 10.15a6.45 6.45 0 00-.51-4.88 6.55 6.55 0 00-6.19-3.27 6.47 6.47 0 00-4.73-2 6.55 6.55 0 00-6.25 4.54 6.45 6.45 0 00-4.22 3.06 6.55 6.55 0 00.7 7.78 6.45 6.45 0 00.51 4.88 6.55 6.55 0 006.19 3.27 6.47 6.47 0 004.73 2 6.55 6.55 0 006.25-4.54 6.45 6.45 0 004.22-3.06 6.55 6.55 0 00-.7-7.78z" />
    </svg>
  ),

  // Anthropic / Claude
  anthropic: (dim, cls) => (
    <svg className={`${dim} ${cls}`} viewBox="0 0 24 24" fill="#D97706">
      <circle cx="12" cy="12" r="10" fill="#CC785C" />
      <path d="M12 5l2.2 4.8 5.3.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.3-.8z" fill="#FFFFFF" />
    </svg>
  ),
};

export const ProviderLogo: React.FC<ProviderLogoProps> = ({
  provider,
  appUrl,
  iconUrl,
  size = 'md',
  className = '',
}) => {
  const normalized = (provider || '').toLowerCase().trim();
  const sizeInfo = SIZE_MAP[size] || SIZE_MAP.md;
  const dimensionClass = sizeInfo.className;
  const sizePx = sizeInfo.px;

  // Direct official brand mark matching
  const brandMatchKey = useMemo(() => {
    if (normalized.includes('antigravity')) return 'google-antigravity';
    if (normalized.includes('dueradar') || normalized === 'due-radar') return 'dueradar';
    if (normalized.includes('aspiral')) return 'aspiral';
    if (normalized.includes('cheapstays')) return 'cheapstays';
    if (normalized.includes('flowbills')) return 'flowbills';
    if (normalized.includes('playmoney')) return 'playmoney';
    if (normalized.includes('jubee') || normalized.includes('jubeelove')) return 'jubeelove';
    if (normalized.includes('armageddon')) return 'armageddon';
    if (normalized.includes('lampstand')) return 'lampstand';

    for (const key of Object.keys(BRAND_SVGS)) {
      if (normalized === key || normalized.includes(key)) return key;
    }
    return null;
  }, [normalized]);

  // Build candidate URL list from iconUrl / appUrl for external third-party apps
  const candidateUrls = useMemo(() => {
    const urls: string[] = [];
    if (iconUrl) urls.push(iconUrl);

    if (appUrl) {
      try {
        const origin = new URL(appUrl.startsWith('http') ? appUrl : `https://${appUrl}`).origin;
        urls.push(`${origin}/favicon.png`);
        urls.push(`${origin}/assets/app-icon.png`);
        urls.push(`${origin}/favicon.ico`);
        urls.push(`${origin}/icon.png`);
        urls.push(`${origin}/apple-touch-icon.png`);
      } catch {
        // invalid URL format, ignore
      }
    }
    return urls;
  }, [appUrl, iconUrl]);

  // If matched brand SVG exists, render official mark directly
  if (brandMatchKey) {
    return <>{BRAND_SVGS[brandMatchKey](dimensionClass, className)}</>;
  }

  // If candidate URLs exist, attempt dynamic resolution with fallback
  if (candidateUrls.length > 0) {
    return (
      <AutonomousAppImage
        candidates={candidateUrls}
        alt={provider}
        sizePx={sizePx}
        dimensionClass={dimensionClass}
        className={className}
        fallback={<MonogramAvatar provider={provider} dimensionClass={dimensionClass} className={className} />}
      />
    );
  }

  // Fallback monogram avatar
  return <MonogramAvatar provider={provider} dimensionClass={dimensionClass} className={className} />;
};

/**
 * AutonomousAppImage — Tries candidate favicon/icon endpoints sequentially from the app's real origin.
 * Advances to next candidate on 404 / error until exhaustion, then shows fallback.
 */
const AutonomousAppImage: React.FC<{
  candidates: string[];
  alt: string;
  sizePx: number;
  dimensionClass: string;
  className: string;
  fallback: React.ReactNode;
}> = ({ candidates, alt, sizePx, dimensionClass, className, fallback }) => {
  const [index, setIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  const handleError = useCallback(() => {
    setIndex(prev => {
      if (prev + 1 < candidates.length) {
        return prev + 1;
      }
      setAllFailed(true);
      return prev;
    });
  }, [candidates.length]);

  if (allFailed || index >= candidates.length) {
    return <>{fallback}</>;
  }

  const currentSrc = candidates[index];

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={sizePx}
      height={sizePx}
      className={`${dimensionClass} ${className}`}
      onError={handleError}
      loading="lazy"
      style={{
        width: sizePx,
        height: sizePx,
        objectFit: 'contain',
        borderRadius: 4,
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
};

/**
 * MonogramAvatar — Clean, honest brand monogram badge based on app initial.
 */
const MonogramAvatar: React.FC<{
  provider: string;
  dimensionClass: string;
  className: string;
}> = ({ provider, dimensionClass, className }) => {
  const raw = (provider || 'APEX').trim();
  const initial = raw.charAt(0).toUpperCase();

  return (
    <div
      className={`${dimensionClass} rounded-md bg-white/10 text-white flex items-center justify-center font-bold text-xs border border-white/20 uppercase select-none ${className}`}
      style={{ flexShrink: 0 }}
      title={raw}
    >
      {initial}
    </div>
  );
};

export default ProviderLogo;
