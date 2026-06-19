import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { invokeMcpIntent } from '../../apps/omnihub-site/src/omnihub-gateway/mcp-client/index';
import { supabase } from '../../apps/omnihub-site/src/lib/supabase';

describe('MCP Client Gateway Enforcement', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ reply: 'Mock reply' })));
          controller.close();
        }
      }),
      json: async () => ({ reply: 'Mock reply' })
    }));
    vi.stubEnv('VITE_SUPABASE_URL', 'https://mock-supabase.co');
    
    // Mock supabase auth session
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { access_token: 'mock-token' } as any },
      error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('routes to same-origin /api/mcp/invoke even when VITE_SUPABASE_URL is set', async () => {
    await invokeMcpIntent({ prompt: 'test' });
    
    expect(global.fetch).toHaveBeenCalled();
    const calledUrl = (global.fetch as any).mock.calls[0][0];
    
    // This will FAIL initially because it calls functions/v1/apex-agent
    expect(calledUrl).toBe('/api/mcp/invoke');
  });
});
