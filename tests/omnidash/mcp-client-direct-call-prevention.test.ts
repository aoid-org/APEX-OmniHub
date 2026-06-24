import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { invokeMcpIntent } from '../../apps/omnihub-site/src/omnihub-gateway/mcp-client/index';
import { supabase } from '../../apps/omnihub-site/src/lib/supabase';

function mockJsonFetch(data: any) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: {}, // Not really used for JSON branch
    json: async () => data
  }));
}

function mockSseFetch(chunks: string[]) {
  let index = 0;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'content-type': 'text/event-stream' }),
    body: {
      getReader() {
        return {
          read: async () => {
            if (index >= chunks.length) {
              return { done: true, value: undefined };
            }
            const chunk = chunks[index++];
            return { done: false, value: new TextEncoder().encode(chunk) };
          },
          releaseLock: vi.fn(),
        }
      }
    },
    json: async () => ({})
  }));
}

describe('MCP Client Gateway Enforcement', () => {
  beforeEach(() => {
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
    mockJsonFetch({ status: 'completed', reply: 'Mock reply' });
    await invokeMcpIntent({ prompt: 'test' });
    
    expect(globalThis.fetch).toHaveBeenCalled();
    const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
    
    expect(calledUrl).toBe('/api/mcp/invoke');
  });

  it('preserves full context payload in the /api/mcp/invoke request body', async () => {
    mockJsonFetch({ status: 'completed', reply: 'Mock reply' });
    const payload = { prompt: 'test', context: { customField: 'value' } };
    await invokeMcpIntent(payload);

    const callArgs = (globalThis.fetch as any).mock.calls[0][1];
    expect(callArgs.body).toBe(JSON.stringify(payload));
  });

  it('JSON response missing terminal status is rejected', async () => {
    mockJsonFetch({ reply: 'I have no status' });
    await expect(invokeMcpIntent({ prompt: 'test' })).rejects.toThrow('JSON response missing terminal status');
  });

  it('JSON { status: "queued" } is rejected', async () => {
    mockJsonFetch({ status: 'queued' });
    await expect(invokeMcpIntent({ prompt: 'test' })).rejects.toThrow('JSON response returned non-terminal status: queued');
  });

  it('JSON { status: "running" } is rejected', async () => {
    mockJsonFetch({ status: 'running' });
    await expect(invokeMcpIntent({ prompt: 'test' })).rejects.toThrow('JSON response returned non-terminal status: running');
  });

  it('SSE stream ending without completed/failed/timeout/error fails closed', async () => {
    mockSseFetch([
      'event: running\n',
      'data: {"status":"running"}\n\n'
    ]);
    await expect(invokeMcpIntent({ prompt: 'test' })).rejects.toThrow('SSE stream ended without terminal event (completed/failed/timeout)');
  });

  it('SSE stream resolves when completed is reached', async () => {
    mockSseFetch([
      'event: running\n',
      'data: {"status":"running"}\n\n',
      'event: completed\n',
      'data: {"status":"completed", "reply":"Success"}\n\n'
    ]);
    const response = await invokeMcpIntent({ prompt: 'test' });
    expect(response.reply).toBe('Success');
  });
});
