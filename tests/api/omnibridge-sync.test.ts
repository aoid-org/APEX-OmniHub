import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/api/omnibridge/sync';
import { clearReplayStore } from '../../src/lib/omnibridge/replayStore';
import {
  signSyncPacketForTest,
  type SyncPacket,
} from '../../src/lib/omnibridge/syncPacketVerifier';
import * as eventStore from '../../src/lib/omnibridge/eventStore';

interface TestEnv {
  OMNIBRIDGE_M2M_CLIENTS?: string;
  OMNIBRIDGE_SBBL_NATIVE_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  [key: string]: string | undefined;
}

function baseEnv(): TestEnv {
  return {
    OMNIBRIDGE_M2M_CLIENTS: JSON.stringify([
      {
        client_id: 'sbbl-hq-sync',
        client_secret_hash: 'hash-placeholder',
        scopes: ['omnibridge:ingest'],
        tenant_id: 'tenant_sbbl',
        webhook: {
          source_id: 'sbbl-hq',
          key_id: 'sbbl-hq-sync-v1',
          secret_env: 'OMNIBRIDGE_SBBL_NATIVE_SECRET',
          status: 'active',
          profile: 'sync_packet',
          allowed_ips: ['198.51.100.10'],
        },
      },
    ]),
    OMNIBRIDGE_SBBL_NATIVE_SECRET: 'native-test-secret-xyz',
  };
}

beforeEach(() => {
  clearReplayStore();
  vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({
    ok: true,
    event_uuid: 'uuid-xyz',
    duplicate: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function buildPacket(overrides: Partial<SyncPacket> = {}): SyncPacket {
  return {
    packet_id: `pkt-${crypto.randomUUID()}`,
    trace_id: `trc-${crypto.randomUUID()}`,
    event_type: 'game.started',
    entity_type: 'game',
    entity_id: 'g-001',
    league_id: 'wbl-2026',
    payload: { score: 0 },
    emitted_at: new Date().toISOString(),
    ...overrides,
  };
}

async function buildRequest(opts: {
  packet?: SyncPacket;
  signature?: string;
  sourceHeader?: string;
  ip?: string;
}): Promise<Request> {
  const packet = opts.packet ?? buildPacket();
  const signature = opts.signature ?? await signSyncPacketForTest(packet, 'native-test-secret-xyz');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Omni-Source': opts.sourceHeader ?? 'sbbl-hq',
    'X-Forwarded-For': opts.ip ?? '198.51.100.10',
    'CF-Connecting-IP': opts.ip ?? '198.51.100.10',
  };
  return new Request('https://example.com/api/omnibridge/sync', {
    method: 'POST',
    headers,
    body: JSON.stringify({ packet, signature }),
  });
}

describe('functions/api/omnibridge/sync', () => {
  it('accepts a validly-signed SBBL-HQ native packet', async () => {
    const env = baseEnv();
    const req = await buildRequest({});
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(202);
    const body = await res.json() as Record<string, unknown>;
    expect(body.received).toBe(true);
    expect(body.event_uuid).toBe('uuid-xyz');
  });

  it('rejects non-POST methods', async () => {
    const env = baseEnv();
    const res = await onRequest({
      request: new Request('https://example.com/api/omnibridge/sync', { method: 'GET' }),
      env,
    });
    expect(res.status).toBe(405);
  });

  it('rejects when X-Omni-Source header is missing', async () => {
    const env = baseEnv();
    const packet = buildPacket();
    const signature = await signSyncPacketForTest(packet, 'native-test-secret-xyz');
    const req = new Request('https://example.com/api/omnibridge/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packet, signature }),
    });
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>).error).toBe('missing_source_header');
  });

  it('rejects unknown source', async () => {
    const env = baseEnv();
    const req = await buildRequest({ sourceHeader: 'who-dis' });
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(401);
  });

  it('rejects IP not in allowlist', async () => {
    const env = baseEnv();
    const req = await buildRequest({ ip: '10.0.0.1' });
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(403);
  });

  it('rejects invalid signature', async () => {
    const env = baseEnv();
    const packet = buildPacket();
    const signature = await signSyncPacketForTest(packet, 'wrong-secret');
    const req = await buildRequest({ packet, signature });
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(401);
  });

  it('rejects expired emitted_at', async () => {
    const env = baseEnv();
    const packet = buildPacket({ emitted_at: new Date(Date.now() - 600_000).toISOString() });
    const req = await buildRequest({ packet });
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(400);
  });

  it('rejects replayed packet_id', async () => {
    const env = baseEnv();
    const packet = buildPacket();
    const sig = await signSyncPacketForTest(packet, 'native-test-secret-xyz');
    const r1 = await buildRequest({ packet, signature: sig });
    const res1 = await onRequest({ request: r1, env });
    expect(res1.status).toBe(202);
    const r2 = await buildRequest({ packet, signature: sig });
    const res2 = await onRequest({ request: r2, env });
    expect(res2.status).toBe(409);
  });

  it('returns 400 on invalid JSON', async () => {
    const env = baseEnv();
    const req = new Request('https://example.com/api/omnibridge/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Omni-Source': 'sbbl-hq', 'X-Forwarded-For': '198.51.100.10', 'CF-Connecting-IP': '198.51.100.10' },
      body: '{not-json',
    });
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(400);
  });

  it('returns 413 on oversized body', async () => {
    const env = baseEnv();
    const huge = 'x'.repeat(300_000);
    const req = new Request('https://example.com/api/omnibridge/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Omni-Source': 'sbbl-hq', 'X-Forwarded-For': '198.51.100.10', 'CF-Connecting-IP': '198.51.100.10' },
      body: JSON.stringify({ blob: huge }),
    });
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(413);
  });

  it('returns 500 when persist fails with config_missing', async () => {
    vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({
      ok: false, reason: 'config_missing', detail: 'no env',
    });
    const env = baseEnv();
    const req = await buildRequest({});
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(500);
  });

  it('returns 502 when persist fails with upstream_error', async () => {
    vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({
      ok: false, reason: 'upstream_error', detail: 'db down',
    });
    const env = baseEnv();
    const req = await buildRequest({});
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(502);
  });

  it('sanitizes dunder + XSS keys from payload before persist', async () => {
    const spy = vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({
      ok: true, event_uuid: 'uuid-sanit', duplicate: false,
    });
    const env = baseEnv();
    const packet = buildPacket({
      payload: { good: 'val', __proto__polluted: 'yes', xss: '<script>alert(1)</script>' },
    });
    const req = await buildRequest({ packet });
    await onRequest({ request: req, env });
    const call = spy.mock.calls[0][0];
    const data = call.payload.data as Record<string, unknown>;
    expect(data.good).toBe('val');
    expect('__proto__polluted' in data).toBe(false);
    expect('xss' in data).toBe(false);
  });
});
