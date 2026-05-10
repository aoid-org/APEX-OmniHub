import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getSiteUrl', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    Object.assign(import.meta.env, originalEnv);
  });

  it('should prioritize VITE_SITE_URL when set', async () => {
    import.meta.env.VITE_SITE_URL = 'https://custom-site.com';
    import.meta.env.VITE_CF_PAGES_URL = 'https://cf-preview.pages.dev';
    const { getSiteUrl } = await import('@/lib/site-url');
    expect(getSiteUrl()).toBe('https://custom-site.com');
  });

  it('should fall back to VITE_CF_PAGES_URL when VITE_SITE_URL is not set', async () => {
    import.meta.env.VITE_SITE_URL = '';
    import.meta.env.VITE_CF_PAGES_URL = 'https://preview.pages.dev';
    const { getSiteUrl } = await import('@/lib/site-url');
    expect(getSiteUrl()).toBe('https://preview.pages.dev');
  });

  it('should return production default when no env vars are set and not in DEV mode', async () => {
    import.meta.env.VITE_SITE_URL = '';
    import.meta.env.VITE_CF_PAGES_URL = '';
    import.meta.env.DEV = false;
    const { getSiteUrl } = await import('@/lib/site-url');
    expect(getSiteUrl()).toBe('https://apexomnihub.icu');
  });

  it('should return localhost in DEV mode when no env vars set', async () => {
    import.meta.env.VITE_SITE_URL = '';
    import.meta.env.VITE_CF_PAGES_URL = '';
    import.meta.env.DEV = true;
    const { getSiteUrl } = await import('@/lib/site-url');
    expect(getSiteUrl()).toBe('http://localhost:5173');
  });
});
