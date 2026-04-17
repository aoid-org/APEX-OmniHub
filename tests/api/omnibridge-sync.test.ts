import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/omnibridge/sync';
import { clearRegistryCache } from '../../src/lib/omnibridge/sourceRegistry';
import { clearReplayStore } from '../../src/lib/omnibridge/replayStore';
import {
  signSyncPacketForTest,
  type SyncPacket,
} from '../../src/lib/omnibridge/syncPacketVerifier';
import * as eventStore from '../../src/lib/omnibridge/eventStore';

type EnvMap = Record<string, string | undefined>;

let originalEnv: EnvMap;

beforeEach(() => {
  originalEnv = { ...process.env };
  clearRegistryCache();
  clearReplayStore();
  process.env['OMNIBRIDGE_M2M_CLIENTS'] = JSON.stringify([
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
  ]);
  process.env['OMNIBRIDGE_SBBL_NATIVE_SECRET'] = 'native-test-secret-xyz';
  // Mock persistEvent to isolate endpoint behaviour from Supabase.
  vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({
    ok: true,
    event_uuid: 'uuid-xyz',
    duplicate: false,
  });
});

afterEach(() => {
  process.env = { ...originalEnv };
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
  };
  return new Request('https://example.com/api/omnibridge/sync', {
    method: 'POST',
    headers,
    body: JSON.stringify({ packet, signature }),
  });
}

describe('api/omnibridge/sync', () => {
  it('accepts a validly-signed SBBL-HQ native packet', async () => {
    const req = await buildRequest({});
    const res = await handler(req);
    expect(res.status).toBe(202);
    const body = await res.json() as Record<string, unknown>;
    expect(body.received).toBe(true);
    expect(body.event_uuid).toBe('uuid-xyz');
  });

  it('rejects non-POST methods', async () => {
    const res = await handler(new Request('https://example.com/api/omnibridge/sync', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('rejects when X-Omni-Source header is missing', async () => {
    const packet = buildPacket();
    const signature = await signSyncPacketForTest(packet, 'native-test-secret-xyz');
    const req = new Request('https://example.com/api/omnibridge/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packet, signature }),
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>).error).toBe('missing_source_header');
  });

  it('rejects unknown source', async () => {
    const req = await buildRequest({ sourceHeader: 'who-dis' });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('rejects IP not in allowlist', async () => {
    const req = await buildRequest({ ip: '10.0.0.1' });
    const res = await handler(req);
    expect(res.status).toBe(403);
  });

  it('rejects invalid signature', async () => {
    const packet = buildPacket();
    const signature = await signSyncPacketForTest(packet, 'wrong-secret');
    const req = await buildRequest({ packet, signature });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('rejects expired emitted_at', async () => {
    const packet = buildPacket({ emitted_at: new Date(Date.now() - 600_000).toISOString() });
    const req = await buildRequest({ packet });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it('rejects replayed packet_id (same packet sent twice)', async () => {
    const packet = buildPacket();
    const sig = await signSyncPacketForTest(packet, 'native-test-secret-xyz');
    const req1 = await buildRequest({ packet, signature: sig });
    const res1 = await handler(req1);
    expect(res1.status).toBe(202);

    const req2 = await buildRequest({ packet, signature: sig });
    const res2 = await handler(req2);
    expect(res2.status).toBe(409);
  });

  it('returns 400 on invalid JSON', async () => {
    const req = new Request('https://example.com/api/omnibridge/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Omni-Source': 'sbbl-hq', 'X-Forwarded-For': '198.51.100.10' },
      body: '{not-json',
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it('returns 413 on oversized body', async () => {
    const huge = 'x'.repeat(300_000);
    const req = new Request('https://example.com/api/omnibridge/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Omni-Source': 'sbbl-hq', 'X-Forwarded-For': '198.51.100.10' },
      body: JSON.stringify({ blob: huge }),
    });
    const res = await handler(req);
    expect(res.status).toBe(413);
  });

  it('returns 500 when persist fails with config_missing', async () => {
    vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({
      ok: false,
      reason: 'config_missing',
      detail: 'no env',
    });
    const req = await buildRequest({});
    const res = await handler(req);
    expect(res.status).toBe(500);
  });

  it('returns 502 when persist fails with upstream_error', async () => {
    vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({
      ok: false,
      reason: 'upstream_error',
      detail: 'db down',
    });
    const req = await buildRequest({});
    const res = await handler(req);
    expect(res.status).toBe(502);
  });

  it('sanitizes dunder keys from payload before persist', async () => {
    const persistSpy = vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({
      ok: true,
      event_uuid: 'uuid-sanit',
      duplicate: false,
    });
    const packet = buildPacket({
      payload: { good: 'val', __proto__polluted: 'yes', xss: '<script>alert(1)</script>' },
    });
    const req = await buildRequest({ packet });
    await handler(req);
    const callArg = persistSpy.mock.calls[0][0];
    const data = (callArg.payload as Record<string, unknown>).data as Record<string, unknown>;
    expect(data.good).toBe('val');
    expect('__proto__polluted' in data).toBe(false);
    expect('xss' in data).toBe(false);
  });
});
