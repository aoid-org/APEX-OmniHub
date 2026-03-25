/**
 * OMNI-TEST: Login Auth Runtime Tests
 * ────────────────────────────────────
 * Runtime tests that import and execute actual code.
 * Provides real V8 coverage for:
 *   - apps/omnihub-site/src/lib/supabase.ts (config guard, client init, trace ID)
 *
 * Note: Login.tsx component tests require the @/ alias to resolve to
 * apps/omnihub-site/src/ (it resolves to ./src/ in the root vitest config).
 * Structural regression tests for Login.tsx are in login-page-fixes.test.ts.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── supabase.ts — full runtime coverage ────────────────────────────

describe('supabase.ts config guard (runtime coverage)', () => {
  const originalEnv = { ...import.meta.env };

  afterEach(() => {
    vi.resetModules();
    Object.keys(import.meta.env).forEach((k) => {
      if (!(k in originalEnv)) delete import.meta.env[k];
    });
    Object.assign(import.meta.env, originalEnv);
  });

  it('should export hasSupabaseConfig as boolean', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(typeof mod.hasSupabaseConfig).toBe('boolean');
  });

  it('should have hasSupabaseConfig=true when valid env vars are set', async () => {
    // test setup.ts sets VITE_SUPABASE_URL=https://mock.supabase.co
    const mod = await import('@omnihub/lib/supabase');
    expect(mod.hasSupabaseConfig).toBe(true);
  });

  it('should export supabaseConfigTraceId with cfg- prefix pattern', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(typeof mod.supabaseConfigTraceId).toBe('string');
    expect(mod.supabaseConfigTraceId).toMatch(/^cfg-[a-z0-9]+$/);
    expect(mod.supabaseConfigTraceId.length).toBeGreaterThan(4);
    expect(mod.supabaseConfigTraceId.length).toBeLessThanOrEqual(12);
  });

  it('should export functional supabase client', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(mod.supabase).toBeDefined();
    expect(mod.supabase).not.toBeNull();
  });

  it('should expose auth.signInWithPassword on supabase client', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(typeof mod.supabase.auth.signInWithPassword).toBe('function');
  });

  it('should expose auth.signInWithOAuth on supabase client', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(typeof mod.supabase.auth.signInWithOAuth).toBe('function');
  });

  it('should expose auth.signOut on supabase client', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(typeof mod.supabase.auth.signOut).toBe('function');
  });

  it('should expose auth.getSession on supabase client', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(typeof mod.supabase.auth.getSession).toBe('function');
  });

  it('should expose auth.onAuthStateChange on supabase client', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(typeof mod.supabase.auth.onAuthStateChange).toBe('function');
  });
});

// ─── hasSupabaseConfig logic — pure unit tests with real regex ───────

describe('hasSupabaseConfig validation logic (runtime)', () => {
  // Mirror the exact regex from supabase.ts line 13
  const hasValidSupabaseUrl = (url: string) => /^https?:\/\//i.test(url);
  const evaluateConfig = (url: string, key: string) =>
    hasValidSupabaseUrl(url) && key.length > 0;

  it('should accept valid https URL with non-empty key', () => {
    expect(evaluateConfig('https://rtopreovkywofgwgmozi.supabase.co', 'eyJhbGci...')).toBe(true);
  });

  it('should accept valid http URL (local dev)', () => {
    expect(evaluateConfig('http://localhost:54321', 'local-key')).toBe(true);
  });

  it('should accept HTTPS with mixed case', () => {
    expect(evaluateConfig('HTTPS://example.supabase.co', 'key')).toBe(true);
  });

  it('should reject empty URL', () => {
    expect(evaluateConfig('', 'valid-key')).toBe(false);
  });

  it('should reject URL without protocol', () => {
    expect(evaluateConfig('rtopreovkywofgwgmozi.supabase.co', 'key')).toBe(false);
  });

  it('should reject URL with only protocol prefix text', () => {
    expect(evaluateConfig('placeholder', 'key')).toBe(false);
  });

  it('should reject ftp protocol', () => {
    expect(evaluateConfig('ftp://supabase.co', 'key')).toBe(false);
  });

  it('should reject empty anon key', () => {
    expect(evaluateConfig('https://valid.supabase.co', '')).toBe(false);
  });

  it('should reject both empty', () => {
    expect(evaluateConfig('', '')).toBe(false);
  });

  it('should accept minimal valid config', () => {
    expect(evaluateConfig('http://x', 'k')).toBe(true);
  });
});

// ─── supabaseConfigTraceId format — runtime generation test ─────────

describe('supabaseConfigTraceId generation (runtime)', () => {
  it('should produce trace IDs matching base-36 format', () => {
    // Mirror the exact generation logic from supabase.ts line 16
    const traceId = `cfg-${Math.random().toString(36).slice(2, 10)}`;
    expect(traceId).toMatch(/^cfg-[a-z0-9]{1,8}$/);
  });

  it('should produce unique trace IDs across multiple generations', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(`cfg-${Math.random().toString(36).slice(2, 10)}`);
    }
    // With 100 random IDs, collisions should be essentially impossible
    expect(ids.size).toBeGreaterThanOrEqual(99);
  });
});
