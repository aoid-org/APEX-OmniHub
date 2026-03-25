import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  StdioTransport,
  StreamableHTTPTransport,
} from '@/core/mcp/MCPTransport';

describe('MCPTransport extended', () => {
  const originalToken = (globalThis as unknown as Record<string, unknown>)._supabaseAuthToken;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (globalThis as unknown as Record<string, unknown>)._supabaseAuthToken =
      originalToken;
    vi.restoreAllMocks();
  });

  it('connects stdio transport, injects auth headers, sends rpc, and disconnects', async () => {
    (globalThis as unknown as Record<string, unknown>)._supabaseAuthToken =
      'test-token';

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          id: 'corr-1',
          result: [{ name: 'ok' }],
        }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const transport = new StdioTransport('server-a', 'https://proxy.local');
    await transport.connect();
    expect(transport.status).toBe('connected');

    const response = await transport.send({
      jsonrpc: '2.0',
      id: 'corr-1',
      method: 'tools/list',
    });
    expect(response.result).toEqual([{ name: 'ok' }]);

    await transport.disconnect();
    expect(transport.status).toBe('disconnected');
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    const connectCall = fetchSpy.mock.calls[0];
    const sendCall = fetchSpy.mock.calls[1];
    expect(connectCall[1]?.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer test-token' }),
    );
    expect(sendCall[1]?.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer test-token' }),
    );
  });

  it('marks stdio transport as error when connect fails', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: false, status: 503 } as Response);

    const transport = new StdioTransport('server-a', 'https://proxy.local');
    await expect(transport.connect()).rejects.toThrow('Connect failed: 503');
    expect(transport.status).toBe('error');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('still disconnects stdio transport when disconnect request fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockRejectedValueOnce(new Error('disconnect-failed'));

    const transport = new StdioTransport('server-a', 'https://proxy.local');
    await transport.connect();
    await expect(transport.disconnect()).rejects.toThrow('disconnect-failed');
    expect(transport.status).toBe('disconnected');
  });

  it('connects streamable-http transport with 204 endpoint check and sends rpc', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 204 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          id: 'rpc-1',
          result: { ok: true },
        }),
      } as Response);

    const transport = new StreamableHTTPTransport(
      'https://mcp.example/rpc',
      { 'X-Test': '1' },
    );
    await transport.connect();
    expect(transport.status).toBe('connected');

    const response = await transport.send({
      jsonrpc: '2.0',
      id: 'rpc-1',
      method: 'ping',
    });
    expect(response.result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('marks streamable-http transport as error on bad endpoint check', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const transport = new StreamableHTTPTransport(
      'https://mcp.example/rpc',
      {},
      { maxRetries: 0 },
    );
    await expect(transport.connect()).rejects.toThrow(
      'Endpoint check failed: 500',
    );
    expect(transport.status).toBe('error');
  });

  it('throws streamable rpc errors when upstream responds non-ok', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 502 } as Response);

    const transport = new StreamableHTTPTransport(
      'https://mcp.example/rpc',
      {},
      { maxRetries: 0 },
    );
    await transport.connect();
    await expect(
      transport.send({
        jsonrpc: '2.0',
        id: 'rpc-2',
        method: 'tools/list',
      }),
    ).rejects.toThrow('RPC failed: 502');
  });
});
