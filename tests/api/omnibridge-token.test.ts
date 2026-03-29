import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import handler from '../../api/omnibridge/token';


type EnvMap = Record<string, string | undefined>;

let originalEnv: EnvMap;

beforeEach(() => {
  originalEnv = { ...process.env };
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('api/omnibridge/token', () => {
  it('loads config with webhook extensions safely', async () => {
    const rawSecret = 'client-secret-abc';
    const hash = await sha256Hex(rawSecret);

    process.env['OMNIBRIDGE_M2M_CLIENTS'] = JSON.stringify([
      {
        client_id: 'test-client',
        client_secret_hash: hash,
        scopes: ['test:scope'],
        tenant_id: 'tenant_123',
        webhook: {
          source_id: 'src1',
          key_id: 'key1',
          secret_env: 'SEC',
          status: 'active',
          allowed_ips: ['1.1.1.1']
        }
      }
    ]);
    process.env['OMNIBRIDGE_JWT_SECRET'] = 'jwt-secret-xyz';

    const req = new Request('https://example.com/api/omnibridge/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: 'test-client',
        client_secret: rawSecret
      })
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.access_token).toBeDefined();
  });
});
