import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  persistEvent,
  recordDispatchFailure,
  updateDispatchState,
} from '../../../src/lib/omnibridge/eventStore';

const BASE_ENV = {
  SUPABASE_URL: 'https://project.supabase.test',
  SUPABASE_SERVICE_ROLE_KEY: 'sk-test-eventstore-NOSONAR', // NOSONAR
};

type FetchMock = ReturnType<typeof vi.fn>;
const originalFetch = globalThis.fetch;
let fetchMock: FetchMock;

function makeResponse(status: number, body: unknown = [], headers: Record<string, string> = {}): Response {
  // 204 cannot have a body per spec, so use null + no JSON stringify for 204
  const init: ResponseInit = { status, headers: { 'content-type': 'application/json', ...headers } };
  if (status === 204 || body === null) {
    return new Response(null, init);
  }
  return new Response(JSON.stringify(body), init);
}

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function buildInput() {
  return {
    event_id: 'evt-1',
    source_id: 'sbbl-hq',
    tenant_id: 'tenant_sbbl',
    profile: 'sync_packet' as const,
    event_type: 'game.started',
    trace_id: 'trc-1',
    idempotency_key: 'idem-1',
    payload: { score: 0 },
    signature_verified: true,
  };
}

describe('eventStore — persistEvent', () => {
  it('fails closed with config_missing when no env', async () => {
    const out = await persistEvent(buildInput(), {});
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('config_missing');
  });

  it('falls back to process.env when no env passed', async () => {
    const origUrl = process.env['SUPABASE_URL'];
    const origKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    delete process.env['SUPABASE_URL'];
    delete process.env['SUPABASE_SERVICE_ROLE_KEY'];
    try {
      const out = await persistEvent(buildInput());
      expect(out.ok).toBe(false);
    } finally {
      if (origUrl !== undefined) process.env['SUPABASE_URL'] = origUrl;
      if (origKey !== undefined) process.env['SUPABASE_SERVICE_ROLE_KEY'] = origKey;
    }
  });

  it('returns ok=true with event_uuid on successful insert', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, [{ id: 'db-uuid-123' }]));
    const out = await persistEvent(buildInput(), BASE_ENV);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.event_uuid).toBe('db-uuid-123');
      expect(out.duplicate).toBe(false);
    }
  });

  it('looks up existing row on duplicate (returns duplicate=true)', async () => {
    // First call: INSERT with ignore-duplicates returns empty array
    fetchMock.mockResolvedValueOnce(makeResponse(201, []));
    // Second call: follow-up GET for existing row
    fetchMock.mockResolvedValueOnce(makeResponse(200, [{ id: 'existing-uuid' }]));

    const out = await persistEvent(buildInput(), BASE_ENV);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.event_uuid).toBe('existing-uuid');
      expect(out.duplicate).toBe(true);
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns upstream_error on duplicate-lookup failure', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, []));
    fetchMock.mockResolvedValueOnce(makeResponse(500, { error: 'db down' }));
    const out = await persistEvent(buildInput(), BASE_ENV);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('upstream_error');
  });

  it('returns conflict when duplicate has no persisted row (shouldnt happen but handled)', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, []));
    fetchMock.mockResolvedValueOnce(makeResponse(200, []));
    const out = await persistEvent(buildInput(), BASE_ENV);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('conflict');
  });

  it('returns upstream_error on non-2xx insert', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(400, { error: 'bad' }));
    const out = await persistEvent(buildInput(), BASE_ENV);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('upstream_error');
  });

  it('returns upstream_error when fetch throws (network/abort)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network unreachable'));
    const out = await persistEvent(buildInput(), BASE_ENV);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('upstream_error');
  });

  it('uses the Authorization + apikey service-role headers', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, [{ id: 'ok' }]));
    await persistEvent(buildInput(), BASE_ENV);
    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['apikey']).toBe(BASE_ENV.SUPABASE_SERVICE_ROLE_KEY);
    expect(headers['Authorization']).toBe(`Bearer ${BASE_ENV.SUPABASE_SERVICE_ROLE_KEY}`);
    expect(headers['Prefer']).toMatch(/resolution=ignore-duplicates/);
  });

  it('targets on_conflict=source_id,event_id in URL', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, [{ id: 'ok' }]));
    await persistEvent(buildInput(), BASE_ENV);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/on_conflict=source_id%2Cevent_id|on_conflict=source_id,event_id/);
  });

  it('accepts VITE_SUPABASE_URL fallback when SUPABASE_URL is absent', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, [{ id: 'fallback-uuid' }]));
    const env = { VITE_SUPABASE_URL: 'https://vite-fallback.supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'k' };
    const out = await persistEvent(buildInput(), env);
    expect(out.ok).toBe(true);
  });
});

describe('eventStore — recordDispatchFailure', () => {
  it('silently no-ops when env missing (best-effort DLQ)', async () => {
    await expect(recordDispatchFailure({
      event_uuid: 'u', target_url: 'https://x', error_message: 'boom',
    }, {})).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs DLQ row with retry metadata', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, []));
    await recordDispatchFailure({
      event_uuid: 'u-1', target_url: 'https://orchestrator', error_message: 'connect refused',
      http_status: 503, retry_count: 2,
    }, BASE_ENV);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/rest/v1/omnibridge_events_dlq');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body[0]).toMatchObject({
      event_uuid: 'u-1',
      target_url: 'https://orchestrator',
      http_status: 503,
      retry_count: 2,
    });
    expect(body[0].next_retry_at).toBeDefined();
  });

  it('truncates long error messages to 2000 chars', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(201, []));
    const huge = 'e'.repeat(5000);
    await recordDispatchFailure({
      event_uuid: 'u', target_url: 'https://x', error_message: huge,
    }, BASE_ENV);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body[0].error_message.length).toBeLessThanOrEqual(2000);
  });

  it('swallows fetch errors (no throw)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('net down'));
    await expect(recordDispatchFailure({
      event_uuid: 'u', target_url: 'https://x', error_message: 'x',
    }, BASE_ENV)).resolves.toBeUndefined();
  });
});

describe('eventStore — updateDispatchState', () => {
  it('no-ops when env missing', async () => {
    await expect(updateDispatchState({ event_uuid: 'u', state: 'acknowledged' }, {})).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('PATCHes dispatch_state with dispatched_at for dispatched state', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(204, null));
    await updateDispatchState({ event_uuid: 'u-2', state: 'dispatched' }, BASE_ENV);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/id=eq.u-2/);
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.dispatch_state).toBe('dispatched');
    expect(body.dispatched_at).toBeDefined();
  });

  it('sets acknowledged_at for acknowledged state', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(204, null));
    await updateDispatchState({ event_uuid: 'u-3', state: 'acknowledged' }, BASE_ENV);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.acknowledged_at).toBeDefined();
  });

  it('truncates long error to 2000 chars', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(204, null));
    await updateDispatchState({ event_uuid: 'u', state: 'dlq', error: 'x'.repeat(5000) }, BASE_ENV);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.dispatch_last_error.length).toBeLessThanOrEqual(2000);
  });

  it('swallows fetch errors (best-effort)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('net'));
    await expect(updateDispatchState({ event_uuid: 'u', state: 'dlq' }, BASE_ENV)).resolves.toBeUndefined();
  });
});
