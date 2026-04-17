import { describe, expect, it } from 'vitest';
import {
  verifySyncPacket,
  signSyncPacketForTest,
  isSyncPacketEnvelope,
  isEmittedAtValid,
  type SyncPacket,
} from '../../../src/lib/omnibridge/syncPacketVerifier';

const SECRET = 'sbbl-test-secret-abcdef1234567890';

function buildPacket(overrides: Partial<SyncPacket> = {}): SyncPacket {
  return {
    packet_id: '11111111-1111-4111-8111-111111111111',
    trace_id: '22222222-2222-4222-8222-222222222222',
    event_type: 'game.started',
    entity_type: 'game',
    entity_id: 'game-abc',
    league_id: 'wbl-2026',
    payload: { score: 0, quarter: 1 },
    emitted_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('isSyncPacketEnvelope', () => {
  it('accepts a well-formed envelope', () => {
    expect(isSyncPacketEnvelope({ packet: buildPacket(), signature: 'abc' })).toBe(true);
  });

  it('rejects null', () => {
    expect(isSyncPacketEnvelope(null)).toBe(false);
  });

  it('rejects missing signature', () => {
    expect(isSyncPacketEnvelope({ packet: buildPacket() })).toBe(false);
  });

  it('rejects missing packet_id', () => {
    const p = buildPacket();
    // @ts-expect-error deliberately malformed
    delete p.packet_id;
    expect(isSyncPacketEnvelope({ packet: p, signature: 'abc' })).toBe(false);
  });

  it('rejects non-object payload', () => {
    expect(isSyncPacketEnvelope({ packet: { ...buildPacket(), payload: 'bad' }, signature: 'abc' })).toBe(false);
  });

  it('rejects array payload (prototype-pollution vector)', () => {
    expect(isSyncPacketEnvelope({ packet: { ...buildPacket(), payload: [] }, signature: 'abc' })).toBe(false);
  });

  it('accepts null entity_id and league_id', () => {
    expect(isSyncPacketEnvelope({
      packet: buildPacket({ entity_id: null, league_id: null }),
      signature: 'abc',
    })).toBe(true);
  });
});

describe('isEmittedAtValid', () => {
  it('accepts a fresh timestamp', () => {
    expect(isEmittedAtValid(new Date().toISOString(), 300)).toBe(true);
  });

  it('rejects a timestamp 10 minutes old', () => {
    expect(isEmittedAtValid(new Date(Date.now() - 600_000).toISOString(), 300)).toBe(false);
  });

  it('rejects non-ISO string', () => {
    expect(isEmittedAtValid('not-a-date', 300)).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isEmittedAtValid('', 300)).toBe(false);
  });
});

describe('verifySyncPacket', () => {
  it('accepts a signature produced by the reference signer', async () => {
    const packet = buildPacket();
    const signature = await signSyncPacketForTest(packet, SECRET);
    const result = await verifySyncPacket({ packet, signature }, SECRET);
    expect(result.valid).toBe(true);
  });

  it('rejects when packet tampered after signing', async () => {
    const packet = buildPacket();
    const signature = await signSyncPacketForTest(packet, SECRET);
    const tampered = { ...packet, payload: { score: 999 } };
    const result = await verifySyncPacket({ packet: tampered, signature }, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('bad_signature');
  });

  it('rejects when signed with a different secret', async () => {
    const packet = buildPacket();
    const signature = await signSyncPacketForTest(packet, 'wrong-secret');
    const result = await verifySyncPacket({ packet, signature }, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('bad_signature');
  });

  it('rejects malformed signature (not base64url)', async () => {
    const packet = buildPacket();
    const result = await verifySyncPacket({ packet, signature: 'not-base64!!' }, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('bad_signature');
  });

  it('rejects expired packets (older than skew window)', async () => {
    const packet = buildPacket({ emitted_at: new Date(Date.now() - 600_000).toISOString() });
    const signature = await signSyncPacketForTest(packet, SECRET);
    const result = await verifySyncPacket({ packet, signature }, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('rejects future-dated packets beyond skew', async () => {
    const packet = buildPacket({ emitted_at: new Date(Date.now() + 600_000).toISOString() });
    const signature = await signSyncPacketForTest(packet, SECRET);
    const result = await verifySyncPacket({ packet, signature }, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('rejects malformed envelope', async () => {
    // @ts-expect-error deliberately malformed
    const result = await verifySyncPacket({ packet: null, signature: 'abc' }, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('malformed');
  });

  it('accepts with custom skew window', async () => {
    const packet = buildPacket({ emitted_at: new Date(Date.now() - 400_000).toISOString() });
    const signature = await signSyncPacketForTest(packet, SECRET);
    const result = await verifySyncPacket({ packet, signature }, SECRET, { maxSkewSeconds: 600 });
    expect(result.valid).toBe(true);
  });

  it('base64url decoder rejects padding characters', async () => {
    const packet = buildPacket();
    const result = await verifySyncPacket({ packet, signature: 'YWJjZA==' }, SECRET);
    // contains '=' which is rejected by base64UrlToBytes
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('bad_signature');
  });
});
