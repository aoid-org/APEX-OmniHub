/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OmniPortEngine } from '@/omniconnect/ingress/OmniPort';
import { RawInput } from '@/omniconnect/types/ingress';

// Mock dependencies to isolate OmniPort logic
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock('@/zero-trust/deviceRegistry', () => ({
  getDevice: vi.fn().mockReturnValue({
    deviceId: 'test-device',
    status: 'trusted',
  }),
}));

vi.mock('../../../sim/idempotency', () => ({
  withIdempotency: vi.fn((_key, _correlationId, _name, fn) => {
    return { result: fn() };
  }),
}));

vi.mock('@/omniconnect/delivery/omnilink-delivery', () => ({
  OmniLinkDelivery: class {
    async deliverBatch() { return; }
  }
}));

vi.mock('../translation/translator', () => ({}));
vi.mock('@/zero-trust/baseline', () => ({
  verifyDeviceIntegrity: vi.fn().mockReturnValue(true),
}));
vi.mock('@/lib/web3/entitlements', () => ({
  checkEntitlement: vi.fn().mockResolvedValue({ hasEntitlement: true }),
}));

describe('OmniPort Logging Performance', () => {
  let omniPort: OmniPortEngine;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Access private constructor via getInstance (singleton)
    omniPort = OmniPortEngine.getInstance();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.todo('should log asynchronously and not block execution');
});
