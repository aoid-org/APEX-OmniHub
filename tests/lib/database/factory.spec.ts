import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseDatabaseCtor = vi.hoisted(() => vi.fn());
const supabaseDatabasePing = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock('@/lib/database/providers/supabase', () => {
  class MockSupabaseDatabase {
    ping = supabaseDatabasePing;
    // Minimal surface for proxy delegation tests
    findById = vi.fn();

    constructor(options: unknown) {
      supabaseDatabaseCtor(options);
    }
  }

  return { SupabaseDatabase: MockSupabaseDatabase };
});

describe('database factory', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    supabaseDatabaseCtor.mockClear();
    supabaseDatabasePing.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('creates supabase database only when required options are provided', async () => {
    const mod = await import('@/lib/database');

    expect(() =>
      mod.createDatabase({ provider: 'supabase' }),
    ).toThrow(/requires "url" and "apiKey"/i);

    expect(() =>
      mod.createDatabase({
        provider: 'supabase',
        url: 'https://demo.supabase.co',
        apiKey: 'anon-key',
      }),
    ).not.toThrow();
  });

  it('throws for unsupported providers', async () => {
    const mod = await import('@/lib/database');

    expect(() => mod.createDatabase({ provider: 'postgresql' })).toThrow(
      /not yet implemented/i,
    );
    expect(() => mod.createDatabase({ provider: 'planetscale' })).toThrow(
      /not yet implemented/i,
    );
  });

  it('builds singleton database from environment and memoizes it', async () => {
    vi.stubEnv('VITE_DATABASE_PROVIDER', 'supabase');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const mod = await import('@/lib/database');
    const first = mod.getDatabase();
    const second = mod.getDatabase();

    expect(first).toBe(second);
    expect(supabaseDatabaseCtor).toHaveBeenCalledTimes(1);
    expect(supabaseDatabaseCtor).toHaveBeenCalledWith(
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

    const mod = await import('@/lib/database');
    expect(() => mod.getDatabase()).toThrow(/database not configured/i);
  });

  it('delegates methods through db proxy', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    const mod = await import('@/lib/database');
    const ok = await (mod.db as unknown as { ping: () => Promise<boolean> }).ping();

    expect(ok).toBe(true);
    expect(supabaseDatabasePing).toHaveBeenCalledTimes(1);
  });
});

