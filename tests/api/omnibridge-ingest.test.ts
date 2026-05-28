/**
 * Tests for functions/api/omnibridge/ingest.ts (CF Pages Function).
 *
 * Migrated from the previous Vercel-Edge api/omnibridge/ingest.ts. The
 * signature verification logic is unchanged; only the handler shape
 * changed (onRequestPost({request, env}) vs default(request) + process.env).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/api/omnibridge/ingest';
import { clearReplayStore } from '../../src/lib/omnibridge/replayStore';
import { generateHMAC } from '../../src/lib/security/hmacValidator';
import * as eventStore from '../../src/lib/omnibridge/eventStore';

interface TestEnv {
  OMNIBRIDGE_M2M_CLIENTS?: string;
  OMNIBRIDGE_ALLOW_LEGACY_SINGLE_SECRET?: string;
  OMNIBRIDGE_WEBHOOK_SECRET?: string;
  OMNIBRIDGE_SBBL_HQ_SECRET?: string;
  INACTIVE_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  [key: string]: string | undefined;
}

function baseEnv(): TestEnv {
  return {
    OMNIBRIDGE_M2M_CLIENTS: JSON.stringify([
      {
        client_id: 'sbbl-hq-client',
        client_secret_hash: 'fake-hash-for-testing',
        scopes: ['omnibridge:ingest'],
        tenant_id: 'tenant_123',
        webhook: {
          source_id: 'sbbl-hq',
          key_id: 'sbbl-hq-v1',
          secret_env: 'OMNIBRIDGE_SBBL_HQ_SECRET',
          status: 'active',
          allowed_ips: ['192.168.1.1'],
        },
      },
      {
        client_id: 'inactive-client',
        client_secret_hash: 'fake-hash-for-testing',
        scopes: ['omnibridge:ingest'],
        tenant_id: 'tenant_inactive',
        webhook: {
          source_id: 'inactive-source',
          key_id: 'inactive-key',
          secret_env: 'INACTIVE_SECRET',
          status: 'inactive',
        },
      },
    ]),
    OMNIBRIDGE_SBBL_HQ_SECRET: 'super-secret-key-for-testing',
    INACTIVE_SECRET: 'some-secret',
  };
}

beforeEach(() => {
  clearReplayStore();
  // Default: config_missing so tests see the soft-accept 200 path without Supabase.
  vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({
    ok: false,
    reason: 'config_missing',
    detail: 'tests: no Supabase configured',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function buildHardenedSignature(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  traceId: string,
  sourceId: string,
  bodyRaw: string,
): Promise<string> {
  const canonical = `${method}\n${path}\n${timestamp}\n${traceId}\n${sourceId}\n${bodyRaw}`;
  return generateHMAC(canonical, secret);
}

async function buildHardenedRequest(
  body: Record<string, unknown>,
  sourceId: string,
  keyId: string,
  traceId: string,
  secret: string,
  timestampOffsetSecs = 0,
  ip = '192.168.1.1',
): Promise<Request> {
  const timestamp = (Math.floor(Date.now() / 1000) + timestampOffsetSecs).toString();
  const bodyRaw = JSON.stringify(body);
  const method = 'POST';
  const path = '/api/omnibridge/ingest';
  const signature = await buildHardenedSignature(secret, method, path, timestamp, traceId, sourceId, bodyRaw);
  return new Request(`https://example.com${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Omni-Source': sourceId,
      'X-Omni-Key-Id': keyId,
      'X-Omni-Timestamp': timestamp,
      'X-Omni-Trace-Id': traceId,
      'X-Omni-Signature': signature,
      'X-Forwarded-For': ip,
      'CF-Connecting-IP': ip,
    },
    body: bodyRaw,
  });
}

describe('functions/api/omnibridge/ingest', () => {
  const validBody = {
    event_type: 'player.updated',
    payload: { player_id: 'p1', stat: 100 },
  };
  const testSecret = 'super-secret-key-for-testing';

  describe('Hardened Mode', () => {
    it('accepts valid hardened SBBL HQ request', async () => {
      const env = baseEnv();
      const req = await buildHardenedRequest(validBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      const res = await onRequest({ request: req, env });
      const data = await res.json() as Record<string, unknown>;
      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('rejects missing source header (falls through to legacy which is disabled)', async () => {
      const env = baseEnv();
      const req = await buildHardenedRequest(validBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      req.headers.delete('X-Omni-Source');
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(401); // missing_signature when other hardened headers present
    });

    it('rejects unknown source', async () => {
      const env = baseEnv();
      const req = await buildHardenedRequest(validBody, 'unknown', 'sbbl-hq-v1', 'trace-1', testSecret);
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(401);
    });

    it('rejects disabled source', async () => {
      const env = baseEnv();
      const req = await buildHardenedRequest(validBody, 'inactive-source', 'inactive-key', 'trace-1', 'some-secret');
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(401);
    });

    it('rejects wrong key id', async () => {
      const env = baseEnv();
      const req = await buildHardenedRequest(validBody, 'sbbl-hq', 'wrong-key', 'trace-1', testSecret);
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(401);
    });

    it('rejects malformed timestamp', async () => {
      const env = baseEnv();
      const req = await buildHardenedRequest(validBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      req.headers.set('X-Omni-Timestamp', 'not-a-number');
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(400);
    });

    it('rejects expired timestamp', async () => {
      const env = baseEnv();
      const req = await buildHardenedRequest(validBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret, -400);
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(400);
    });

    it('rejects invalid signature', async () => {
      const env = baseEnv();
      const req = await buildHardenedRequest(validBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', 'wrong-secret');
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(401);
    });

    it('rejects tenant mismatch', async () => {
      const env = baseEnv();
      const req = await buildHardenedRequest({ ...validBody, tenant_id: 'wrong-tenant' }, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(403);
    });

    it('rejects replayed trace id', async () => {
      const env = baseEnv();
      const r1 = await buildHardenedRequest(validBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      await onRequest({ request: r1, env });
      const r2 = await buildHardenedRequest(validBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      const res2 = await onRequest({ request: r2, env });
      expect(res2.status).toBe(409);
    });

    it('rejects unauthorized IP', async () => {
      const env = baseEnv();
      const req = await buildHardenedRequest(validBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret, 0, '10.0.0.1');
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(403);
    });

    it('rejects malformed OMNIBRIDGE_M2M_CLIENTS config', async () => {
      const env: TestEnv = { ...baseEnv(), OMNIBRIDGE_M2M_CLIENTS: 'not-json' };
      const req = await buildHardenedRequest(validBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(500);
    });
  });

  describe('Legacy Mode', () => {
    it('rejects legacy signature when flag is absent/false', async () => {
      const env: TestEnv = { ...baseEnv(), OMNIBRIDGE_WEBHOOK_SECRET: 'legacy-secret' };
      const sig = await generateHMAC(JSON.stringify({ ...validBody, tenant_id: 't', timestamp: new Date().toISOString() }), 'legacy-secret');
      const req = new Request('https://example.com/api/omnibridge/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-OmniBridge-Signature': sig },
        body: JSON.stringify({ ...validBody, tenant_id: 't', timestamp: new Date().toISOString() }),
      });
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(403);
    });

    it('accepts legacy when OMNIBRIDGE_ALLOW_LEGACY_SINGLE_SECRET=true', async () => {
      const env: TestEnv = {
        ...baseEnv(),
        OMNIBRIDGE_WEBHOOK_SECRET: 'legacy-secret',
        OMNIBRIDGE_ALLOW_LEGACY_SINGLE_SECRET: 'true',
      };
      const body = { ...validBody, tenant_id: 't', timestamp: new Date().toISOString() };
      const sig = await generateHMAC(JSON.stringify(body), 'legacy-secret');
      const req = new Request('https://example.com/api/omnibridge/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-OmniBridge-Signature': sig },
        body: JSON.stringify(body),
      });
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(200);
    });
  });

  describe('Method gating', () => {
    it('rejects GET with 405', async () => {
      const env = baseEnv();
      const req = new Request('https://example.com/api/omnibridge/ingest', { method: 'GET' });
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(405);
    });
  });
});
