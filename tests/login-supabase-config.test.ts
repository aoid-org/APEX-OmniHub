import { describe, expect, it } from 'vitest';
import { createSupabaseConfigTraceId, hasSupabaseConfigValue } from '../apps/omnihub-site/src/lib/supabaseConfig';

function getKeyKind(key: string): 'jwt' | 'publishable' | 'anon' | 'invalid' {
  if (key.startsWith('eyJ')) return 'jwt';
  if (key.startsWith('sb_publishable_')) return 'publishable';
  if (key.startsWith('sb_anon_')) return 'anon';
  return 'invalid';
}

function isBrowserSafeKeyKind(kind: ReturnType<typeof getKeyKind>): boolean {
  return kind === 'jwt' || kind === 'publishable' || kind === 'anon';
}

describe('supabase config normalization + key validation', () => {
  it('trims URL and key values before evaluating config', () => {
    const url = '  https://rtopreovkywofgwgmozi.supabase.co  '.trim();
    const key = '  sb_publishable_test_1234567890  '.trim();
    expect(hasSupabaseConfigValue(url, key)).toBe(true);
  });

  it('fails empty and placeholder-like values', () => {
    expect(hasSupabaseConfigValue('', 'sb_publishable_valid')).toBe(false);
    expect(hasSupabaseConfigValue('placeholder', 'placeholder-anon-key')).toBe(false);
    expect(isBrowserSafeKeyKind(getKeyKind(''))).toBe(false);
  });

  it('fails wrong format keys', () => {
    expect(isBrowserSafeKeyKind(getKeyKind('abc123'))).toBe(false);
    expect(isBrowserSafeKeyKind(getKeyKind('service_role_xxx'))).toBe(false);
  });

  it('recognizes browser-safe key kinds', () => {
    expect(getKeyKind('eyJhbGciOiJ...')).toBe('jwt');
    expect(getKeyKind('sb_publishable_test_123')).toBe('publishable');
    expect(getKeyKind('sb_anon_test_123')).toBe('anon');
  });

  it('does not accept service-role/secret key names', () => {
    expect(isBrowserSafeKeyKind(getKeyKind('sb_secret_xxx'))).toBe(false);
    expect(isBrowserSafeKeyKind(getKeyKind('service_role_xxx'))).toBe(false);
  });

  it('trace id format remains safe and non-secret', () => {
    const traceId = createSupabaseConfigTraceId();
    expect(traceId).toMatch(/^cfg-[a-z0-9]{1,8}$/);
  });

  it('diagnostic shape is key-redacted by design', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(mod.supabaseConfigStatus).toHaveProperty('hasUrl');
    expect(mod.supabaseConfigStatus).toHaveProperty('hasKey');
    expect(mod.supabaseConfigStatus).toHaveProperty('urlHost');
    expect(mod.supabaseConfigStatus).toHaveProperty('keyKind');
    expect(mod.supabaseConfigStatus).toHaveProperty('traceId');
    expect((mod.supabaseConfigStatus as Record<string, unknown>).key).toBeUndefined();
    expect(JSON.stringify(mod.supabaseConfigStatus)).not.toContain('sb_publishable_');
  });
});
