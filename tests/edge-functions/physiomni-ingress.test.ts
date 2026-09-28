// @vitest-environment node
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Behavior tests for the physiomni-ingress handler: the real handler runs against
// stubbed platform modules so auth ordering and fail-closed behavior are exercised.
const h = vi.hoisted(() => {
  const state = {
    calls: [] as Array<{ table: string; op: string; row?: unknown }>,
    device: null as { id: string } | null,
    deviceError: null as { message: string } | null,
    ipAllowed: true,
    deviceLimitAllowed: true,
    rateKeys: [] as string[],
  };
  const makeClient = () => ({
    from(table: string) {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.insert = (row: unknown) => {
        state.calls.push({ table, op: 'insert', row });
        return b;
      };
      b.update = (row: unknown) => {
        state.calls.push({ table, op: 'update', row });
        return b;
      };
      b.maybeSingle = async () => {
        state.calls.push({ table, op: 'lookup' });
        return { data: state.device, error: state.deviceError };
      };
      b.single = async () => ({ data: { id: 'alert-1' }, error: null });
      b.then = (resolveFn: (v: { error: null }) => unknown) => resolveFn({ error: null });
      return b;
    },
  });
  return { state, makeClient };
});

vi.mock('../../supabase/functions/_shared/cors.ts', () => ({
  buildCorsHeaders: () => ({}),
  handlePreflight: () => new Response(null, { status: 204 }),
}));
vi.mock('../../supabase/functions/_shared/rate-limiter.ts', () => ({
  RateLimiter: { checkLimit: vi.fn(async () => undefined) },
}));
vi.mock('../../supabase/functions/_shared/rate-limit.ts', () => ({
  RATE_LIMIT_CONFIGS: { physiomniIngress: { maxRequests: 120, windowMs: 60000, keyPrefix: 'physiomni-ingress' } },
  checkRateLimit: vi.fn(async (key: string) => {
    h.state.rateKeys.push(key);
    return { allowed: key.startsWith('ip:') ? h.state.ipAllowed : h.state.deviceLimitAllowed };
  }),
  rateLimitExceededResponse: () => new Response('{}', { status: 429 }),
}));
vi.mock('../../supabase/functions/_shared/supabaseClient.ts', () => ({
  createServiceClient: () => h.makeClient(),
}));

type Handler = (req: Request) => Promise<Response>;
let handler: Handler;
const env: Record<string, string | undefined> = {};

const SECRET = 'test-signing-secret';
const TENANT = '11111111-1111-4111-8111-111111111111';
const payload = {
  device_serial: 'dev-001',
  tenant_id: TENANT,
  vibration_x: 1,
  vibration_y: 1,
  vibration_z: 1,
  temperature_c: 20,
  timestamp: '2026-09-28T12:00:00.000Z',
};

function request(opts: { sign?: boolean; secret?: string; ts?: string; raw?: string } = {}): Request {
  const raw = opts.raw ?? JSON.stringify(payload);
  const ts = opts.ts ?? new Date().toISOString();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'cf-connecting-ip': '203.0.113.9',
  };
  if (opts.sign !== false) {
    headers['x-physiomni-timestamp'] = ts;
    headers['x-physiomni-signature'] = `sha256=${createHmac('sha256', opts.secret ?? SECRET).update(`${ts}.${raw}`).digest('hex')}`;
  }
  return new Request('https://example.test/functions/v1/physiomni-ingress', { method: 'POST', body: raw, headers });
}

beforeEach(async () => {
  h.state.calls = [];
  h.state.device = { id: 'device-1' };
  h.state.deviceError = null;
  h.state.ipAllowed = true;
  h.state.deviceLimitAllowed = true;
  h.state.rateKeys = [];
  for (const key of Object.keys(env)) delete env[key];
  env.PHYSIOMNI_INGRESS_HMAC_SECRET = SECRET;

  vi.resetModules();
  (globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (k: string) => env[k] },
    serve: (fn: Handler) => {
      handler = fn;
    },
  };
  await import('../../supabase/functions/physiomni-ingress/index.ts');
});

describe('physiomni-ingress authentication', () => {
  it('refuses unsigned requests before any database access', async () => {
    const res = await handler(request({ sign: false }));
    expect(res.status).toBe(401);
    expect(h.state.calls).toEqual([]);
  });

  it('fails closed when the signing secret is unset, whatever the mode flags say', async () => {
    delete env.PHYSIOMNI_INGRESS_HMAC_SECRET;
    for (const flags of [{}, { PHYSIOMNI_LIVE_ENABLED: 'false', PHYSIOMNI_DEMO_ENABLED: 'true' }]) {
      Object.assign(env, flags);
      const res = await handler(request());
      expect(res.status).toBe(503);
    }
    expect(h.state.calls).toEqual([]);
  });

  it('rejects a wrong signature and a stale timestamp', async () => {
    expect((await handler(request({ secret: 'not-the-secret' }))).status).toBe(401);
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect((await handler(request({ ts: stale }))).status).toBe(401);
    expect(h.state.calls).toEqual([]);
  });

  it('rejects a tampered body even with a genuine signature header', async () => {
    const good = request();
    const tampered = new Request(good.url, {
      method: 'POST',
      headers: good.headers,
      body: JSON.stringify({ ...payload, vibration_x: 99 }),
    });
    expect((await handler(tampered)).status).toBe(401);
    expect(h.state.calls).toEqual([]);
  });
});

describe('physiomni-ingress device registry', () => {
  it('rejects a pair that is not a registered, active device', async () => {
    h.state.device = null;
    const res = await handler(request());
    expect(res.status).toBe(403);
    expect(h.state.calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('fails closed when the registry lookup errors', async () => {
    h.state.deviceError = { message: 'boom' };
    const res = await handler(request());
    expect(res.status).toBe(503);
    expect(h.state.calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('ingests telemetry for a registered device with a valid signature', async () => {
    const res = await handler(request());
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe('ingested');
    const insert = h.state.calls.find((c) => c.table === 'physiomni_telemetry' && c.op === 'insert');
    expect(insert?.row).toMatchObject({ tenant_id: TENANT, device_serial: 'dev-001' });
  });
});

describe('physiomni-ingress limits', () => {
  it('applies the per-IP limit before any signature or database work', async () => {
    h.state.ipAllowed = false;
    const res = await handler(request({ sign: false }));
    expect(res.status).toBe(429);
    expect(h.state.rateKeys).toEqual(['ip:203.0.113.9']);
    expect(h.state.calls).toEqual([]);
  });

  it('applies the per-device limit only after authentication', async () => {
    h.state.deviceLimitAllowed = false;
    expect((await handler(request({ sign: false }))).status).toBe(401);
    expect(h.state.rateKeys).toEqual(['ip:203.0.113.9']);

    h.state.rateKeys = [];
    expect((await handler(request())).status).toBe(429);
    expect(h.state.rateKeys).toEqual(['ip:203.0.113.9', 'dev-001']);
    expect(h.state.calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('caps the request body', async () => {
    const res = await handler(request({ raw: JSON.stringify({ ...payload, pad: 'x'.repeat(5000) }) }));
    expect(res.status).toBe(413);
    expect(h.state.calls).toEqual([]);
  });

  it('keeps the explicit kill switch', async () => {
    env.PHYSIOMNI_DEMO_ENABLED = 'false';
    const res = await handler(request());
    expect(res.status).toBe(403);
  });
});

describe('physiomni-ingress source guards', () => {
  const src = readFileSync(resolve(process.cwd(), 'supabase/functions/physiomni-ingress/index.ts'), 'utf8');
  it('has no live-mode bypass on the signature path', () => {
    expect(src).not.toContain('requiresLiveSignature');
    expect(src.match(/PHYSIOMNI_LIVE_ENABLED/g)?.length).toBe(1);
  });
  it('authenticates before validating or touching the database', () => {
    const sig = src.indexOf('await requireSignedTelemetry(');
    expect(sig).toBeGreaterThan(src.indexOf('await checkRateLimit(`ip:'));
    expect(sig).toBeLessThan(src.indexOf('validatePayload(body)'));
    expect(src.indexOf('await requireRegisteredDevice(')).toBeLessThan(src.indexOf(".from('physiomni_telemetry')"));
  });
});
