import { describe, it, expect, vi } from 'vitest';
import { collectDiagnostics } from '../../apps/omnihub-site/dashboard/lib/omnidashDiagnostics';

describe('omnidashDiagnostics', () => {
  it('returns a valid snapshot shape', () => {
    const snap = collectDiagnostics();
    expect(snap.timestamp).toBeTruthy();
    expect(snap.viewport).toHaveProperty('width');
    expect(snap.viewport).toHaveProperty('height');
    expect(snap.viewport).toHaveProperty('breakpoint');
    expect(snap.flags).toBeDefined();
    expect(snap.layout.storageKeyPattern).toContain('omnidash_layout_v2');
    expect(snap.deferrals.length).toBeGreaterThanOrEqual(2);
    expect(snap.media).toHaveProperty('catalogLoaded');
    expect(snap.gateway).toHaveProperty('classification');
  });

  it('defaults media to safe-off values', () => {
    const snap = collectDiagnostics();
    expect(snap.media.catalogLoaded).toBe(false);
    expect(snap.media.itemCount).toBe(0);
    expect(snap.media.errorState).toBeNull();
  });

  it('accepts overrides for runtime state', () => {
    const snap = collectDiagnostics({
      mediaCatalogLoaded: true,
      mediaItemCount: 42,
      mediaError: 'TIMEOUT',
      gatewayClassification: 'BLOCKED-CONFIG',
    });
    expect(snap.media.catalogLoaded).toBe(true);
    expect(snap.media.itemCount).toBe(42);
    expect(snap.media.errorState).toBe('TIMEOUT');
    expect(snap.gateway.classification).toBe('BLOCKED-CONFIG');
  });

  it('never exposes secrets, tokens, or signed URLs', () => {
    const snap = collectDiagnostics();
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toMatch(/service_role/i);
    expect(serialized).not.toMatch(/Bearer\s+[A-Za-z0-9]/);
    expect(serialized).not.toMatch(/token=[A-Za-z0-9]/);
    expect(serialized).not.toMatch(/supabase\.co\/storage/);
  });

  it('registers all known deferrals', () => {
    const snap = collectDiagnostics();
    const tickets = snap.deferrals.map((d) => d.ticket);
    expect(tickets).toContain('APEX-1202');
    expect(tickets).toContain('APEX-2011');
  });

  it('detects viewport breakpoint correctly in SSR/jsdom fallback', () => {
    const snap = collectDiagnostics();
    expect(['mobile', 'tablet', 'desktop']).toContain(snap.viewport.breakpoint);
  });

  it('flags all default to false (safe-off)', () => {
    vi.stubEnv('VITE_MAESTRO_ENABLED', 'false');
    vi.stubEnv('VITE_CONNECT_AI_ENABLED', 'false');
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    const snap = collectDiagnostics();
    for (const [, value] of Object.entries(snap.flags)) {
      expect(value).toBe(false);
    }
    vi.unstubAllEnvs();
  });
});
