import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createSupabaseConfigTraceId,
  hasSupabaseConfigValue,
} from '../apps/omnihub-site/src/lib/supabaseConfig';

function buildUrlWithProtocol(baseUrl: string, protocol: string): string {
  const url = new URL(baseUrl);
  url.protocol = `${protocol}:`;
  return url.toString();
}

describe('hasSupabaseConfig guard', () => {
  it('returns true for a valid HTTPS Supabase URL with an anon key', () => {
    expect(
      hasSupabaseConfigValue(
        'https://rtopreovkywofgwgmozi.supabase.co',
        'eyJhbGciOiJ...',
      ),
    ).toBe(true);
  });

  it('returns true for a loopback HTTP URL with an anon key', () => {
    expect(
      hasSupabaseConfigValue(
        buildUrlWithProtocol('https://localhost:54321', 'http'),
        'some-local-key',
      ),
    ).toBe(true);
  });

  it('returns false for a remote HTTP URL', () => {
    expect(
      hasSupabaseConfigValue(
        buildUrlWithProtocol('https://valid.supabase.co', 'http'),
        'some-remote-key',
      ),
    ).toBe(false);
  });

  it('returns false when the URL is empty', () => {
    expect(hasSupabaseConfigValue('', 'valid-key')).toBe(false);
  });

  it('returns false when the anon key is empty', () => {
    expect(hasSupabaseConfigValue('https://valid.supabase.co', '')).toBe(false);
  });

  it('returns false when both values are empty', () => {
    expect(hasSupabaseConfigValue('', '')).toBe(false);
  });

  it('returns false when the URL has no protocol', () => {
    expect(
      hasSupabaseConfigValue('rtopreovkywofgwgmozi.supabase.co', 'valid-key'),
    ).toBe(false);
  });

  it('returns false for unsupported protocols', () => {
    expect(
      hasSupabaseConfigValue(
        'mailto:supabase@example.com',
        'valid-key',
      ),
    ).toBe(false);
  });

  it('returns false for placeholder text', () => {
    expect(hasSupabaseConfigValue('placeholder', 'placeholder-anon-key')).toBe(false);
  });
});

describe('supabaseConfigTraceId generation', () => {
  it('produces trace IDs matching the runtime format', () => {
    expect(createSupabaseConfigTraceId()).toMatch(/^cfg-[a-f0-9]{8}$/);
  });

  it('produces unique trace IDs across multiple generations', () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i += 1) {
      ids.add(createSupabaseConfigTraceId());
    }

    expect(ids.size).toBe(100);
  });
});

describe('vite.config.ts envDir fix', () => {
  const viteConfigPath = resolve(__dirname, '../apps/omnihub-site/vite.config.ts');

  it('points envDir at the monorepo root', () => {
    expect(existsSync(viteConfigPath)).toBe(true);
    const content = readFileSync(viteConfigPath, 'utf-8');
    expect(content).toContain('envDir');
    expect(content).toMatch(/envDir.*['"]\.\.\/\.\.\/['"]/);
  });

  it('keeps node:path imports for __dirname usage', () => {
    const content = readFileSync(viteConfigPath, 'utf-8');
    expect(content).toContain("from 'node:path'");
    expect(content).toContain('__dirname');
  });
});

describe('monorepo root .env contains Supabase credentials', () => {
  const envPath = resolve(__dirname, '../.env');

  it('has VITE_SUPABASE_URL with an HTTPS value when .env exists', () => {
    if (!existsSync(envPath)) {
      return;
    }

    const content = readFileSync(envPath, 'utf-8');
    expect(content).toMatch(/^VITE_SUPABASE_URL=https:\/\//m);
  });

  it('has VITE_SUPABASE_PUBLISHABLE_KEY with a nonempty value when .env exists', () => {
    if (!existsSync(envPath)) {
      return;
    }

    const content = readFileSync(envPath, 'utf-8');
    expect(content).toMatch(/^VITE_SUPABASE_PUBLISHABLE_KEY=.{10,}/m);
  });
});
