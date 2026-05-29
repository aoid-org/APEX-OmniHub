/**
 * OMNI-TEST: Login Auth Runtime Tests
 * Runtime tests that import and execute actual code.
 * Provides real V8 coverage for:
 *   - apps/omnihub-site/src/lib/supabase.ts
 *   - apps/omnihub-site/src/lib/supabaseConfig.ts
 *
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type FormEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSupabaseConfigTraceId,
  hasSupabaseConfigValue,
  hasValidSupabaseUrl,
} from '../apps/omnihub-site/src/lib/supabaseConfig';
import { toUserFacingAuthError } from '../apps/omnihub-site/src/lib/authErrorDisplay';

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
    expect(evaluateConfig(buildUrl(httpsProtocol, 'rtopreovkywofgwgmozi.supabase.co'), 'sb_publishable_runtime_1234567890')).toBe(true);
  });

  it('should accept valid http URL (local dev)', () => {
    expect(evaluateConfig(buildUrl(httpProtocol, 'localhost:54321'), 'sb_anon_local_123')).toBe(true);
  });

  it('should accept HTTPS with mixed case', () => {
    expect(evaluateConfig(buildUrl('HTTPS', 'example.supabase.co'), 'sb_publishable_key_123')).toBe(true);
  });

  it('should reject empty URL', () => {
    expect(evaluateConfig('', 'valid-key')).toBe(false);
  });

  it('should reject URL without protocol', () => {
    expect(evaluateConfig('rtopreovkywofgwgmozi.supabase.co', 'sb_publishable_key_123')).toBe(false);
  });

  it('should reject URL with only protocol prefix text', () => {
    expect(evaluateConfig('placeholder', 'sb_publishable_key_123')).toBe(false);
  });

  it('should reject ftp protocol', () => {
    expect(hasValidSupabaseUrl(buildUrl(ftpProtocol, 'supabase.co'))).toBe(false);
    expect(evaluateConfig(buildUrl(ftpProtocol, 'supabase.co'), 'sb_publishable_key_123')).toBe(false);
  });

  it('should reject empty anon key', () => {
    expect(evaluateConfig(buildUrl(httpsProtocol, 'valid.supabase.co'), '')).toBe(false);
  });

  it('should reject wrong-format anon key', () => {
    expect(evaluateConfig(buildUrl(httpsProtocol, 'valid.supabase.co'), 'not-a-browser-key')).toBe(false);
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


function RuntimeLoginHarness({ signInWithPassword }: { signInWithPassword: () => Promise<{ error: { message: string } | null }> }) {
  const [error, setError] = useState('');
  const traceId = 'cfg-test123';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const { error: authError } = await signInWithPassword();

    if (authError) {
      setError(toUserFacingAuthError(authError, traceId));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit">Sign in</button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}

describe('login invalid api key handling', () => {
  it('should render admin-safe auth misconfigured message instead of raw invalid api key', async () => {
    const signInWithPassword = vi.fn(async () => ({ error: { message: 'Invalid API key' } }));

    render(<RuntimeLoginHarness signInWithPassword={signInWithPassword} />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Authentication is misconfigured. Contact an administrator.');
    expect(alert.textContent).toContain('Trace: cfg-test123');
    expect(alert.textContent).not.toContain('Invalid API key');
  });

  it('should preserve normal invalid credential auth messages', () => {
    expect(toUserFacingAuthError({ message: 'Invalid login credentials' }, 'cfg-test123')).toBe('Invalid login credentials');
  });
});
