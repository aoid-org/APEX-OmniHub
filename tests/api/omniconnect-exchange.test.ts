import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/omniconnect/exchange';

type EnvMap = Record<string, string | undefined>;

const originalEnv: EnvMap = {
  VITE_SUPABASE_URL: process.env['VITE_SUPABASE_URL'],
  VITE_SUPABASE_PUBLISHABLE_KEY: process.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
  VITE_SUPABASE_ANON_KEY: process.env['VITE_SUPABASE_ANON_KEY'],
};

afterEach(() => {
  vi.restoreAllMocks();
  process.env['VITE_SUPABASE_URL'] = originalEnv.VITE_SUPABASE_URL;
  process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] = originalEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
  process.env['VITE_SUPABASE_ANON_KEY'] = originalEnv.VITE_SUPABASE_ANON_KEY;
});

function buildRequest(body: Record<string, unknown>, token = 'jwt-token'): Request {
  return new Request('https://example.com/api/omniconnect/exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

describe('api/omniconnect/exchange', () => {
  it('returns 200 and normalized schema on successful upstream exchange', async () => {
    process.env['VITE_SUPABASE_URL'] = 'https://project.supabase.co';
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] = 'anon-key';

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ connector_id: 'c1', scopes: ['read', 'write'] }), { status: 200 }),
    );

    const response = await handler(buildRequest({ provider: 'salesforce', proxy_token: 'ptok', context: { region: 'us' } }));
    const payload = await response.json() as { scopes: string[]; data: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(payload.scopes).toEqual(['read', 'write']);
    expect(payload.data.connector_id).toBe('c1');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns 400 on invalid request body', async () => {
    process.env['VITE_SUPABASE_URL'] = 'https://project.supabase.co';
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] = 'anon-key';

    const response = await handler(buildRequest({ provider: '', proxy_token: '' }));
    expect(response.status).toBe(400);
  });

  it('returns upstream 500 as exchange failure', async () => {
    process.env['VITE_SUPABASE_URL'] = 'https://project.supabase.co';
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] = 'anon-key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'upstream-down' }), { status: 500 }),
    );

    const response = await handler(buildRequest({ provider: 'hubspot', proxy_token: 'ptok' }));
    const payload = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(payload.error).toBe('OmniConnect exchange failed');
  });

  it('returns 502 on offline fetch failure', async () => {
    process.env['VITE_SUPABASE_URL'] = 'https://project.supabase.co';
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] = 'anon-key';

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const response = await handler(buildRequest({ provider: 'stripe', proxy_token: 'ptok' }));
    expect(response.status).toBe(502);
  });
});
