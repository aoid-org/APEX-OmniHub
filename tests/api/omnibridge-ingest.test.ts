import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/omnibridge/ingest';
import { clearRegistryCache } from '../../src/lib/omnibridge/sourceRegistry';
import { clearReplayStore } from '../../src/lib/omnibridge/replayStore';
import { generateHMAC } from '../../src/lib/security/hmacValidator';

type EnvMap = Record<string, string | undefined>;

let originalEnv: EnvMap;

beforeEach(() => {
  originalEnv = { ...process.env };
  clearRegistryCache();
  clearReplayStore();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

async function buildHardenedSignature(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  traceId: string,
  sourceId: string,
  bodyRaw: string
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bodyRaw));
  const bodyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const canonicalStr = `${method}\n${path}\n${timestamp}\n${traceId}\n${sourceId}\n${bodyHash}`;
  return generateHMAC(canonicalStr, secret);
}

function buildLegacyRequest(body: Record<string, unknown>, signature: string): Request {
  return new Request('https://example.com/api/omnibridge/ingest', // NOSONAR
    {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OmniBridge-Signature': signature,
    },
    body: JSON.stringify(body),
  });
}

async function buildHardenedRequest(
  body: Record<string, unknown>,
  sourceId: string,
  keyId: string,
  traceId: string,
  secret: string,
  timestampOffsetSecs = 0,
  ip = '192.168.1.1' // NOSONAR
): Promise<Request> {
  const timestamp = Math.floor(Date.now() / 1000) + timestampOffsetSecs;
  const timestampStr = timestamp.toString();
  const bodyRaw = JSON.stringify(body);
  const method = 'POST';
  const path = '/api/omnibridge/ingest';

  const signature = await buildHardenedSignature(secret, method, path, timestampStr, traceId, sourceId, bodyRaw);

  return new Request(`https://example.com${path}`, // NOSONAR
  {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Omni-Source': sourceId,
      'X-Omni-Key-Id': keyId,
      'X-Omni-Timestamp': timestampStr,
      'X-Omni-Trace-Id': traceId,
      'X-Omni-Signature': signature,
      'X-Forwarded-For': ip, // For IP simulation
    },
    body: bodyRaw,
  });
}

describe('api/omnibridge/ingest', () => {
  const validHardenedBody = {
    event_type: 'player.updated',
    payload: { player_id: 'p1', stat: 100 },
  };

  const validLegacyBody = {
    event_type: 'player.updated',
    tenant_id: 'tenant_legacy',
    timestamp: new Date().toISOString(),
    payload: { player_id: 'p1', stat: 100 },
  };

  const testSecret = 'super-secret-key-for-testing';
  const testSecretHash = 'fake-hash-for-testing'; // we don't validate the client secret in ingest

  beforeEach(() => {
    process.env['OMNIBRIDGE_M2M_CLIENTS'] = JSON.stringify([
      {
        client_id: 'sbbl-hq-client',
        client_secret_hash: testSecretHash,
        scopes: ['omnibridge:ingest'],
        tenant_id: 'tenant_123',
        webhook: {
          source_id: 'sbbl-hq',
          key_id: 'sbbl-hq-v1',
          secret_env: 'OMNIBRIDGE_SBBL_HQ_SECRET',
          status: 'active',
          allowed_ips: ['192.168.1.1'] // NOSONAR
        }
      },
      {
        client_id: 'inactive-client',
        client_secret_hash: testSecretHash,
        scopes: ['omnibridge:ingest'],
        tenant_id: 'tenant_inactive',
        webhook: {
          source_id: 'inactive-source',
          key_id: 'inactive-key',
          secret_env: 'INACTIVE_SECRET',
          status: 'inactive'
        }
      }
    ]);
    process.env['OMNIBRIDGE_SBBL_HQ_SECRET'] = testSecret;
    process.env['INACTIVE_SECRET'] = 'some-secret';
  });

  describe('Hardened Mode', () => {
    it('accepts valid hardened SBBL HQ request', async () => {
      const req = await buildHardenedRequest(validHardenedBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      const res = await handler(req);
      const data = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.event_id).toBeDefined();
    });

    it('rejects missing source', async () => {
      const req = await buildHardenedRequest(validHardenedBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      req.headers.delete('X-Omni-Source'); // Remove a hardened header

      const res = await handler(req);
      const data = await res.json() as Record<string, unknown>;

      // Because it falls through to legacy mode when hardened headers are incomplete,
      // and legacy mode is disabled by default, it should return legacy_mode_disabled
      // or missing_signature depending on the logic. The logic says missing_signature if any hardened header exists.
      expect(res.status).toBe(401);
      expect(data.error).toBe('missing_signature');
    });

    it('rejects unknown source', async () => {
      const req = await buildHardenedRequest(validHardenedBody, 'unknown', 'sbbl-hq-v1', 'trace-1', testSecret);
      const res = await handler(req);
      expect(res.status).toBe(401);
    });

    it('rejects disabled source', async () => {
      const req = await buildHardenedRequest(validHardenedBody, 'inactive-source', 'inactive-key', 'trace-1', 'some-secret');
      const res = await handler(req);
      expect(res.status).toBe(401);
    });

    it('rejects wrong key id', async () => {
      const req = await buildHardenedRequest(validHardenedBody, 'sbbl-hq', 'wrong-key', 'trace-1', testSecret);
      const res = await handler(req);
      expect(res.status).toBe(401);
    });

    it('rejects malformed timestamp', async () => {
      const req = await buildHardenedRequest(validHardenedBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      req.headers.set('X-Omni-Timestamp', 'not-a-number');
      const res = await handler(req);
      expect(res.status).toBe(400);
    });

    it('rejects expired timestamp', async () => {
      const req = await buildHardenedRequest(validHardenedBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret, -400); // 400s old
      const res = await handler(req);
      expect(res.status).toBe(400);
    });

    it('rejects invalid signature', async () => {
      const req = await buildHardenedRequest(validHardenedBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', 'wrong-secret');
      const res = await handler(req);
      expect(res.status).toBe(401);
    });

    it('rejects tenant mismatch (if body specifies wrong tenant)', async () => {
      const req = await buildHardenedRequest({ ...validHardenedBody, tenant_id: 'wrong-tenant' }, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      const res = await handler(req);
      expect(res.status).toBe(403);
    });

    it('rejects replayed trace id', async () => {
      const req1 = await buildHardenedRequest(validHardenedBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      await handler(req1);

      const req2 = await buildHardenedRequest(validHardenedBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      const res2 = await handler(req2);
      expect(res2.status).toBe(409); // Hardened mode replay is a strict conflict
    });

    it('rejects unauthorized IP', async () => {
      const req = await buildHardenedRequest(validHardenedBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret, 0, '10.0.0.1'); // NOSONAR
      const res = await handler(req);
      expect(res.status).toBe(403);
    });

    it('rejects malformed OMNIBRIDGE_M2M_CLIENTS config', async () => {
      process.env['OMNIBRIDGE_M2M_CLIENTS'] = 'not-json';
      clearRegistryCache();
      const req = await buildHardenedRequest(validHardenedBody, 'sbbl-hq', 'sbbl-hq-v1', 'trace-1', testSecret);
      const res = await handler(req);
      expect(res.status).toBe(500); // server_config_error
    });
  });

  describe('Legacy Mode', () => {
    beforeEach(() => {
      process.env['OMNIBRIDGE_WEBHOOK_SECRET'] = 'legacy-secret';
    });

    it('rejects legacy signature when flag is absent/false', async () => {
      const sig = await generateHMAC(JSON.stringify(validLegacyBody), 'legacy-secret');
      const req = buildLegacyRequest(validLegacyBody, sig);

      const res = await handler(req);
      expect(res.status).toBe(403);
    });

    it('accepts legacy signature only when OMNIBRIDGE_ALLOW_LEGACY_SINGLE_SECRET=true', async () => {
      process.env['OMNIBRIDGE_ALLOW_LEGACY_SINGLE_SECRET'] = 'true';
      const sig = await generateHMAC(JSON.stringify(validLegacyBody), 'legacy-secret');
      const req = buildLegacyRequest(validLegacyBody, sig);

      const res = await handler(req);
      const data = await res.json() as Record<string, unknown>;

      expect(res.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('preserves current sanitize behavior', async () => {
      process.env['OMNIBRIDGE_ALLOW_LEGACY_SINGLE_SECRET'] = 'true';
      const dirtyBody = {
        ...validLegacyBody,
        payload: {
          good: 'value',
          __proto__: { polluted: true },
          xss: '<script>alert(1)</script>'
        }
      };
      const sig = await generateHMAC(JSON.stringify(dirtyBody), 'legacy-secret');
      const req = buildLegacyRequest(dirtyBody, sig);

      const res = await handler(req);
      expect(res.status).toBe(200);

      // In a real test we'd inspect the result, but since ingest.ts doesn't return the sanitized payload,
      // we only ensure it succeeds parsing and sanitization without failing.
    });
  });
});
