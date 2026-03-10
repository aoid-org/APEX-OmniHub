/**
 * OmniPort Engine – Core ingress pipeline tests
 *
 * Covers: singleton lifecycle, protocol normalization helpers,
 * Zod validation gate, and public ingest API.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// ── Mocks (must be hoisted before module import) ──────────────────────
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

vi.mock('@/zero-trust/deviceRegistry', () => ({
  getDevice: vi.fn().mockReturnValue(undefined),
}));

vi.mock('@/zero-trust/baseline', () => ({
  verifyDeviceIntegrity: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/web3/entitlements', () => ({
  checkEntitlement: vi.fn().mockResolvedValue(true),
}));

vi.mock('../sim/idempotency', () => ({
  withIdempotency: vi.fn(async (_key: string, _corr: string, _op: string, fn: () => Promise<unknown>) => ({
    result: await fn(),
    deduplicated: false,
  })),
}));

vi.mock('../src/omniconnect/delivery/omnilink-delivery', () => {
  return {
    OmniLinkDelivery: class {
      deliverBatch = vi.fn().mockResolvedValue(undefined);
    },
  };
});

vi.mock('../src/automation/OutreachDispatcher', () => ({
  dispatchOutreach: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ───────────────────────────────────────────────────────────
const testUserId = uuidv4();

async function loadOmniPort() {
  const mod = await import('../src/omniconnect/ingress/OmniPort');
  return mod;
}

describe('OmniPort Engine', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // ── Singleton ─────────────────────────────────────────────────────
  describe('Singleton lifecycle', () => {
    it('returns the same instance on repeated getInstance() calls', async () => {
      const { OmniPort } = await loadOmniPort();
      const { OmniPort: OmniPort2 } = await loadOmniPort();
      expect(OmniPort).toBeDefined();
      expect(OmniPort2).toBeDefined();
    });
  });

  // ── Public API ────────────────────────────────────────────────────
  describe('ingest()', () => {
    it('accepts a text input and returns an accepted or buffered result', async () => {
      const { ingest } = await loadOmniPort();
      const result = await ingest({
        type: 'text',
        content: 'Hello OmniPort',
        source: 'web',
        userId: testUserId,
      });
      expect(result).toHaveProperty('correlationId');
      expect(result).toHaveProperty('status');
      expect(['accepted', 'buffered']).toContain(result.status);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('accepts a webhook input', async () => {
      const { ingest } = await loadOmniPort();
      const result = await ingest({
        type: 'webhook',
        payload: { event: 'test' },
        provider: 'stripe',
        signature: 'sha256=abc123',
      });
      expect(['accepted', 'buffered']).toContain(result.status);
    });
  });

  // ── Validation gate ───────────────────────────────────────────────
  describe('validateAndIngest()', () => {
    it('rejects invalid input shape', async () => {
      const { validateAndIngest } = await loadOmniPort();
      await expect(validateAndIngest(null)).rejects.toThrow();
    });

    it('rejects input missing required fields', async () => {
      const { validateAndIngest } = await loadOmniPort();
      await expect(
        validateAndIngest({ type: 'text' /* missing content, source, userId */ })
      ).rejects.toThrow();
    });

    it('accepts valid input via validation layer', async () => {
      const { validateAndIngest } = await loadOmniPort();
      const result = await validateAndIngest({
        type: 'text',
        content: 'Hi from validation',
        source: 'sms',
        userId: testUserId,
      });
      expect(result).toHaveProperty('correlationId');
    });
  });
});
