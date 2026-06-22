import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseStorageCtor = vi.hoisted(() => vi.fn());
const supabaseStoragePing = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock('@/lib/storage/providers/supabase', () => {
  class MockSupabaseStorage {
    ping = supabaseStoragePing;
    upload = vi.fn();

    constructor(options: unknown) {
      supabaseStorageCtor(options);
    }
  }

  return { SupabaseStorage: MockSupabaseStorage };
});

describe('storage factory', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    supabaseStorageCtor.mockClear();
    supabaseStoragePing.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('creates supabase storage only when required options are provided', async () => {
    const mod = await import('@/lib/storage');

    expect(() =>
      mod.createStorage({ provider: 'supabase' }),
    ).toThrow(/requires "url" and "apiKey"/i);

    expect(() =>
      mod.createStorage({
        provider: 'supabase',
        url: 'https://demo.supabase.co',
        apiKey: 'anon-key',
      }),
    ).not.toThrow();
  });

  it('requires server-side credentials for s3/r2 providers', async () => {
    const mod = await import('@/lib/storage');

    // s3 and r2 are implemented but require AWS-style credentials.
    expect(() => mod.createStorage({ provider: 's3' })).toThrow(
      /accessKeyId and secretAccessKey/i,
    );
    expect(() => mod.createStorage({ provider: 'r2' })).toThrow(
      /accessKeyId and secretAccessKey/i,
    );
  });

  it('throws for not-yet-implemented providers', async () => {
    const mod = await import('@/lib/storage');

    expect(() => mod.createStorage({ provider: 'gcs' })).toThrow(
      /not yet implemented/i,
    );
    expect(() => mod.createStorage({ provider: 'azure' })).toThrow(
      /not yet implemented/i,
    );
  });

  it('builds singleton storage from environment and memoizes it', async () => {
    vi.stubEnv('VITE_STORAGE_PROVIDER', 'supabase');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const mod = await import('@/lib/storage');
    const first = mod.getStorage();
    const second = mod.getStorage();

    expect(first).toBe(second);
    expect(supabaseStorageCtor).toHaveBeenCalledTimes(1);
    expect(supabaseStorageCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://demo.supabase.co',
        apiKey: 'publishable-key',
      }),
    );
  });

  it('throws when singleton cannot read required env variables', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const mod = await import('@/lib/storage');
    expect(() => mod.getStorage()).toThrow(/storage not configured/i);
  });

  it('delegates methods through storage proxy', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    const mod = await import('@/lib/storage');
    const ok = await (mod.storage as unknown as { ping: () => Promise<boolean> }).ping();

    expect(ok).toBe(true);
    expect(supabaseStoragePing).toHaveBeenCalledTimes(1);
  });
});

