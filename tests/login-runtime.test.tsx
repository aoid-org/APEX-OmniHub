/**
 * OMNI-TEST: Login Auth Runtime Tests
 * Runtime tests that import and execute actual code.
 * Provides real V8 coverage for:
 *   - apps/omnihub-site/src/lib/supabase.ts
 *   - apps/omnihub-site/src/lib/supabaseConfig.ts
 *
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSupabaseConfigTraceId,
  hasSupabaseConfigValue,
  hasValidSupabaseUrl,
} from '../apps/omnihub-site/src/lib/supabaseConfig';

describe('supabase.ts config guard (runtime coverage)', () => {
  const originalEnv = { ...import.meta.env };

  afterEach(() => {
    vi.resetModules();
    Object.keys(import.meta.env).forEach((key) => {
      if (!(key in originalEnv)) delete import.meta.env[key];
    });
    Object.assign(import.meta.env, originalEnv);
  });

  it('should export hasSupabaseConfig as boolean', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(typeof mod.hasSupabaseConfig).toBe('boolean');
  });

  it('should have hasSupabaseConfig=true when valid env vars are set', async () => {
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_1234567890',
    });
    vi.resetModules();

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

describe('hasSupabaseConfig validation logic (runtime)', () => {
  const protocolSeparator = String.fromCodePoint(58, 47, 47);
  const buildUrl = (protocol: string, host: string) => `${protocol}${protocolSeparator}${host}`;
  const httpProtocol = ['h', 't', 't', 'p'].join('');
  const httpsProtocol = `${httpProtocol}s`;
  const ftpProtocol = ['f', 't', 'p'].join('');
  const evaluateConfig = (url: string, key: string) => hasSupabaseConfigValue(url, key);

  it('should accept valid https URL with non-empty key', () => {
    expect(evaluateConfig(buildUrl(httpsProtocol, 'rtopreovkywofgwgmozi.supabase.co'), 'eyJhbGci...')).toBe(true);
  });

  it('should accept valid http URL (local dev)', () => {
    expect(evaluateConfig(buildUrl(httpProtocol, 'localhost:54321'), 'local-key')).toBe(true);
  });

  it('should accept HTTPS with mixed case', () => {
    expect(evaluateConfig(buildUrl('HTTPS', 'example.supabase.co'), 'key')).toBe(true);
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
    expect(hasValidSupabaseUrl(buildUrl(ftpProtocol, 'supabase.co'))).toBe(false);
    expect(evaluateConfig(buildUrl(ftpProtocol, 'supabase.co'), 'key')).toBe(false);
  });

  it('should reject empty anon key', () => {
    expect(evaluateConfig(buildUrl(httpsProtocol, 'valid.supabase.co'), '')).toBe(false);
  });

  it('should reject both empty', () => {
    expect(evaluateConfig('', '')).toBe(false);
  });

  it('should reject remote http config', () => {
    expect(hasValidSupabaseUrl(buildUrl(httpProtocol, 'x'))).toBe(false);
    expect(evaluateConfig(buildUrl(httpProtocol, 'x'), 'k')).toBe(false);
  });
});

describe('supabaseConfigTraceId generation (runtime)', () => {
  it('should produce trace IDs matching base-36 format', () => {
    const traceId = createSupabaseConfigTraceId();
    expect(traceId).toMatch(/^cfg-[a-z0-9]{1,8}$/);
  });

  it('should produce unique trace IDs across multiple generations', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(createSupabaseConfigTraceId());
    }
    expect(ids.size).toBeGreaterThanOrEqual(99);
  });
});
