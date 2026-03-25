import { describe, expect, it, vi } from 'vitest';

const { singleton } = vi.hoisted(() => ({
  singleton: {
    auth: { getUser: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: singleton,
}));

import { createSupabaseClient, supabase } from '@/lib/supabase/client';

describe('createSupabaseClient', () => {
  it('returns the singleton instance by default', () => {
    expect(createSupabaseClient()).toBe(singleton);
    expect(supabase).toBe(singleton);
  });

  it('warns about ignored options and service-role misuse in the browser', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const client = createSupabaseClient({
      url: 'https://example.supabase.co',
      apiKey: 'anon-key',
      serviceRoleKey: 'service-role-key',
      debug: true,
    });

    expect(client).toBe(singleton);
    expect(warnSpy).toHaveBeenCalledWith(
      '[SupabaseClient] createSupabaseClient called with options, but returning singleton instance to enforce Source of Truth.',
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'CRITICAL SECURITY WARNING: Service Role Key passed to client factory in browser environment. It is ignored, but this is a security risk.',
    );

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
