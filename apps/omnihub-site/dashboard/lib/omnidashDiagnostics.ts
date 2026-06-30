import { flag } from './featureFlags';

export interface DiagnosticSnapshot {
  readonly timestamp: string;
  readonly viewport: { width: number; height: number; breakpoint: string };
  readonly flags: Record<string, boolean>;
  readonly layout: { storageKeyPattern: string; breakpoint: string };
  readonly deferrals: readonly { ticket: string; summary: string }[];
  readonly media: { catalogLoaded: boolean; itemCount: number; errorState: string | null };
  readonly gateway: { classification: string };
}

function detectBreakpoint(width: number): string {
  if (width <= 640) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

export function collectDiagnostics(overrides?: {
  mediaCatalogLoaded?: boolean;
  mediaItemCount?: number;
  mediaError?: string | null;
  gatewayClassification?: string;
}): DiagnosticSnapshot {
  const w = typeof globalThis !== 'undefined' && globalThis.innerWidth ? globalThis.innerWidth : 1440;
  const h = typeof globalThis !== 'undefined' && globalThis.innerHeight ? globalThis.innerHeight : 900;
  const bp = detectBreakpoint(w);

  return {
    timestamp: new Date().toISOString(),
    viewport: { width: w, height: h, breakpoint: bp },
    flags: {
      VITE_MAESTRO_ENABLED: flag('VITE_MAESTRO_ENABLED'),
      VITE_CONNECT_AI_ENABLED: flag('VITE_CONNECT_AI_ENABLED'),
      VITE_DEMO_MODE: flag('VITE_DEMO_MODE'),
    },
    layout: {
      storageKeyPattern: 'omnidash_layout_v2:{userId}:{breakpoint}',
      breakpoint: bp,
    },
    deferrals: [
      { ticket: 'APEX-1202', summary: 'Performance threshold deferred — SOFT/main-only' },
      { ticket: 'APEX-2011', summary: 'Links module sync — honest unavailable state' },
    ],
    media: {
      catalogLoaded: overrides?.mediaCatalogLoaded ?? false,
      itemCount: overrides?.mediaItemCount ?? 0,
      errorState: overrides?.mediaError ?? null,
    },
    gateway: {
      classification: overrides?.gatewayClassification ?? 'UNKNOWN',
    },
  };
}
