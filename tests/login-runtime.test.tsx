/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { hasSupabaseConfigValue } from '../apps/omnihub-site/src/lib/supabaseConfig';

describe('supabase runtime exports', () => {
  const originalEnv = { ...import.meta.env };
  afterEach(() => {
    vi.resetModules();
    Object.keys(import.meta.env).forEach((key) => {
      if (!(key in originalEnv)) delete import.meta.env[key];
    });
    Object.assign(import.meta.env, originalEnv);
  });

  it('exports expected client bindings', async () => {
    const mod = await import('@omnihub/lib/supabase');
    expect(typeof mod.hasSupabaseConfig).toBe('boolean');
    expect(typeof mod.supabaseConfigTraceId).toBe('string');
    expect(mod.supabase).toBeDefined();
  });

  it('accepts valid URL/key values', () => {
    expect(hasSupabaseConfigValue('https://rtopreovkywofgwgmozi.supabase.co', 'sb_publishable_xxx')).toBe(true);
  });
});

describe('login invalid api key handling', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('shows admin-safe auth misconfigured message with trace id', async () => {

    vi.doMock('@omnihub/components/Layout', () => ({ Layout: ({ children }: { children: unknown }) => <div>{children}</div> }));
    vi.doMock('@omnihub/components/SEOMeta', () => ({ SEOMeta: () => null }));
    vi.doMock('@omnihub/components/Section', () => ({ Section: ({ children }: { children: unknown }) => <section>{children}</section> }));

    vi.doMock('@omnihub/lib/supabase', () => ({
      hasSupabaseConfig: true,
      supabaseConfigTraceId: 'cfg-test123',
      supabaseConfigStatus: { hasUrl: true, hasKey: true, urlHost: 'x.supabase.co', keyKind: 'publishable', traceId: 'cfg-test123' },
      supabase: {
        auth: {
          getSession: vi.fn(async () => ({ data: { session: null } })),
          signOut: vi.fn(async () => ({})),
          signInWithOAuth: vi.fn(async () => ({ error: null })),
          signInWithPassword: vi.fn(async () => ({ error: { message: 'Invalid API key' } })),
        },
      },
    }));

    const { LoginPage } = await import('@omnihub/pages/Login');
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByText(/Authentication is misconfigured\. Contact an administrator\./i);
    expect(alert.textContent).toContain('Trace: cfg-test123');
    expect(screen.queryByText('Invalid API key')).toBeNull();
  });
});
