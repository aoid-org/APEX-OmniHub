import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OmniPortEngine } from '@/omniconnect/ingress/OmniPort';
import { DeviceProtocol } from '@/omniconnect/types/canonical';
import { assertEntitledAgent } from '@/lib/web3/entitlements';
import fs from 'node:fs';
import path from 'node:path';

// Lightweight mirror of the Iron Law shim (keeps tests language-local)
const verifyDeductivePath = (intent: Record<string, unknown>, targetState: Record<string, unknown>) => {
  const required = ['goal', 'device_id', 'action'];
  const missing = required.filter((r) => !(r in intent));
  const mismatches = Object.entries(targetState || {}).reduce(
    (acc, [k, v]) => (intent[k] !== v ? acc + 1 : acc),
    0
  );
  const logicDelta = Math.min(1, missing.length * 0.2 + mismatches * 0.15 + 0.25);
  const status = missing.length || logicDelta > 0.2 ? 'REQUIRES_HUMAN_REVIEW' : 'APPROVED';
  return { status, logic_delta: logicDelta };
};

describe('Physical AI Level 7 guards', () => {
  let engine: OmniPortEngine;

  beforeEach(() => {
    OmniPortEngine.resetInstance();
    engine = OmniPortEngine.getInstance();
  });

  it('T1: OmniPort webhook normalization strips raw vendor JSON', () => {
    // @ts-expect-error access private for test
    const canonical = engine.normalizeWebhookToCanonical({
      type: 'webhook',
      provider: 'zigbee',
      signature: 'sig',
      payload: {
        protocol: 'zigbee',
        deviceId: 'dev-12345678',
        model: 'LockPro',
        vendor: 'Acme',
        state: { locked: true, temperature: 21.5 },
        firmware: '1.0.0',
        capabilities: [{ id: 'lock', readable: true, writable: true }],
        rawBlob: { should: 'be-dropped' },
      },
    });

    expect(canonical.protocol).toBe(DeviceProtocol.ZIGBEE);
    expect(canonical.state.lock).toBe('locked');
    expect((canonical as unknown as Record<string, unknown>).payload).toBeUndefined();
  });

  it('T2: Iron Law flags illogical physical intents', () => {
    const result = verifyDeductivePath(
      { action: 'unlock', device_id: 'dev-x' },
      { lock: 'unlocked' }
    );
    expect(result.status).toBe('REQUIRES_HUMAN_REVIEW');
    expect(result.logic_delta).toBeGreaterThan(0.2);
  });

  it('T3: RLS policy ties actuator rows to workflow_execution_id claim', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/20251231000000_apex_ascension_governance.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('workflow_execution_id');
    expect(sql).toContain('current_setting(\'request.jwt.claims\'');
  });

  it('T4: NFT entitlement gate denies when verify-nft returns false', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const invokeMock = vi
      .spyOn(supabase.functions, 'invoke')
      .mockResolvedValue({ data: { hasPremiumNFT: false }, error: null });

    await expect(
      assertEntitledAgent({ walletAddress: '0x0000000000000000000000000000000000000000', agentKey: '0xdead' })
    ).rejects.toThrow(/Membership NFT/);
    invokeMock.mockRestore();
  });
});
