import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/debug-logger', () => ({
  createDebugLogger: () => vi.fn(),
}));

import {
  getConfigValue,
  getEnvironment,
  getFeatureFlags,
  isDevelopment,
  isFeatureEnabled,
  isProduction,
  logConfiguration,
  validateEnvironment,
} from '@/lib/config';

describe('config', () => {
  const originalLocation = globalThis.location;

  const setHostname = (hostname: string) => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hostname,
        origin: `https://${hostname}`,
        href: `https://${hostname}/`,
      },
    });
  };

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  it('detects development, staging, and production environments', () => {
    setHostname('localhost');
    expect(getEnvironment()).toBe('development');
    expect(isDevelopment()).toBe(true);
    expect(isProduction()).toBe(false);

    setHostname('preview.omnihub.dev');
    expect(getEnvironment()).toBe('staging');

    setHostname('app.omnihub.com');
    expect(getEnvironment()).toBe('production');
    expect(isProduction()).toBe(true);
  });

  it('returns environment-specific feature flags and values', () => {
    setHostname('localhost');
    expect(getFeatureFlags().enableDebugMode).toBe(true);
    expect(isFeatureEnabled('enableAnalytics')).toBe(false);
    expect(getConfigValue('maxFileUploadSizeMB')).toBe(50);

    setHostname('app.omnihub.com');
    expect(getFeatureFlags().enableDebugMode).toBe(false);
    expect(isFeatureEnabled('enableAnalytics')).toBe(true);
    expect(getConfigValue('rateLimitEnabled')).toBe(true);
  });

  it('validates environment using anon key', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const result = validateEnvironment();
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('validates environment using publishable key fallback', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    const result = validateEnvironment();
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('reports missing critical variables', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');

    const result = validateEnvironment();
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('VITE_SUPABASE_URL');
    expect(result.missing).toContain(
      'VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY',
    );
  });

  it('logs configuration without throwing', () => {
    setHostname('localhost');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => logConfiguration()).not.toThrow();
  });
});
