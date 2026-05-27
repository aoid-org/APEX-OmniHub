/**
 * Round-trip simulation (CF Pages Functions target).
 *
 * Exercises both directions of the SBBL-HQ integration:
 *   (inbound)  SBBL-HQ signs a SyncPacket → POST functions/api/omnibridge/sync
 *   (outbound) OmniHub control plane signs a command, verifier symmetry confirmed
 *
 * The signSyncPacketForTest implementation is byte-identical to
 * sbbl-hq/src/lib/sync-packets.ts::signSyncPacket (verified against the
 * public repo main @ 2026-04-17). This test suite proves that cryptographic
 * contract compatibility holds end-to-end.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/api/omnibridge/sync';
import { clearReplayStore } from '../../src/lib/omnibridge/replayStore';
import {
  signSyncPacketForTest,
  verifySyncPacket,
  type SyncPacket,
} from '../../src/lib/omnibridge/syncPacketVerifier';
import {
  signCommand,
  type OutboundCommand,
} from '../../src/lib/omnibridge/outboundCaller';
import * as eventStore from '../../src/lib/omnibridge/eventStore';

const SBBL_SECRET = 'sbbl-native-round-trip-secret-abc123';
const CONTROL_SECRET = 'apex-control-round-trip-secret-def456';

interface TestEnv {
  OMNIBRIDGE_M2M_CLIENTS?: string;
  OMNIBRIDGE_SBBL_NATIVE_SECRET?: string;
  [key: string]: string | undefined;
}

function baseEnv(): TestEnv {
  return {
    OMNIBRIDGE_M2M_CLIENTS: JSON.stringify([
      {
        client_id: 'sbbl-hq-sync',
        client_secret_hash: 'n/a',
        scopes: ['omnibridge:ingest'],
        tenant_id: 'tenant_sbbl',
        webhook: {
          source_id: 'sbbl-hq',
          key_id: 'sbbl-hq-sync-v1',
          secret_env: 'OMNIBRIDGE_SBBL_NATIVE_SECRET',
          status: 'active',
          profile: 'sync_packet',
          allowed_ips: [],
        },
      },
    ]),
    OMNIBRIDGE_SBBL_NATIVE_SECRET: SBBL_SECRET,
  };
}

beforeEach(() => {
  clearReplayStore();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makePacket(eventType: string, payload: Record<string, unknown>): SyncPacket {
  return {
    packet_id: `pkt-${crypto.randomUUID()}`,
    trace_id: `trc-${crypto.randomUUID()}`,
    event_type: eventType,
    entity_type: 'game',
    entity_id: `g-${Math.floor(Math.random() * 1000)}`,
    league_id: 'wbl-2026',
    payload,
    emitted_at: new Date().toISOString(),
  };
}

function base64UrlToBytes(sig: string): Uint8Array {
  const padded = sig.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - sig.length % 4) % 4);
  return Uint8Array.from(atob(padded), (c) => c.codePointAt(0) ?? 0);
}

async function sbblNativeSign(packet: SyncPacket, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(JSON.stringify(packet)),
  );
  const bytes = new Uint8Array(sig);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCodePoint(b); });
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

describe('ROUND-TRIP: SBBL-HQ → OmniHub (CF Pages Function)', () => {
  it('persists a 5-packet live-event sequence', async () => {
    const env = baseEnv();
    const persistSpy = vi.spyOn(eventStore, 'persistEvent').mockImplementation(async (input) => ({
      ok: true,
      event_uuid: `uuid-${input.event_id}`,
      duplicate: false,
    }));
    const sequence = [
      makePacket('game.started', { home: 'Flames', away: 'Rockets' }),
      makePacket('game.score_update', { home_score: 10, away_score: 8, quarter: 1 }),
      makePacket('game.timeout', { team: 'Flames' }),
      makePacket('game.score_update', { home_score: 24, away_score: 20, quarter: 2 }),
      makePacket('game.finalized', { winner: 'Flames', final_home: 89, final_away: 76 }),
    ];
    for (const packet of sequence) {
      const signature = await signSyncPacketForTest(packet, SBBL_SECRET);
      const req = new Request('https://omnihub.test/api/omnibridge/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Omni-Source': 'sbbl-hq' },
        body: JSON.stringify({ packet, signature }),
      });
      const res = await onRequest({ request: req, env });
      expect(res.status).toBe(202);
    }
    expect(persistSpy).toHaveBeenCalledTimes(sequence.length);
    for (const call of persistSpy.mock.calls) {
      expect(call[0].signature_verified).toBe(true);
      expect(call[0].profile).toBe('sync_packet');
    }
  });

  it('detects in-flight tampering mid-stream', async () => {
    const env = baseEnv();
    vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({ ok: true, event_uuid: 'u', duplicate: false });
    const packet = makePacket('game.score_update', { home_score: 10, away_score: 8 });
    const validSig = await signSyncPacketForTest(packet, SBBL_SECRET);
    const tampered = { ...packet, payload: { home_score: 999, away_score: 0 } };
    const req = new Request('https://omnihub.test/api/omnibridge/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Omni-Source': 'sbbl-hq' },
      body: JSON.stringify({ packet: tampered, signature: validSig }),
    });
    const res = await onRequest({ request: req, env });
    expect(res.status).toBe(401);
  });

  it('handles 50-packet burst without drops', async () => {
    const env = baseEnv();
    const persisted: string[] = [];
    vi.spyOn(eventStore, 'persistEvent').mockImplementation(async (input) => {
      persisted.push(input.event_id);
      return { ok: true, event_uuid: `u-${input.event_id}`, duplicate: false };
    });
    const burst = Array.from({ length: 50 }, (_, i) => makePacket('game.score_update', { tick: i }));
    const responses = await Promise.all(burst.map(async (packet) => {
      const sig = await signSyncPacketForTest(packet, SBBL_SECRET);
      const req = new Request('https://omnihub.test/api/omnibridge/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Omni-Source': 'sbbl-hq' },
        body: JSON.stringify({ packet, signature: sig }),
      });
      return onRequest({ request: req, env });
    }));
    expect(responses.every((r) => r.status === 202)).toBe(true);
    expect(persisted.length).toBe(50);
    expect(new Set(persisted).size).toBe(50);
  });
});

describe('ROUND-TRIP: OmniHub → SBBL-HQ outbound command signing', () => {
  it('signs with an algorithm an SBBL-HQ-style verifier will accept', async () => {
    const command: OutboundCommand = {
      command_id: 'cmd-roundtrip-1',
      action: 'broadcast_message',
      target_source: 'sbbl-hq',
      target_entity_id: null,
      reason: 'live-event operator broadcast',
      issued_at: new Date().toISOString(),
      issued_by: 'operator-uuid',
      payload: { message: 'Welcome to the 2026 Spring Edition!' },
    };
    const signature = await signCommand(command, CONTROL_SECRET);
    const verifyKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(CONTROL_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const sigBytes = base64UrlToBytes(signature);
    const ok = await crypto.subtle.verify(
      'HMAC', verifyKey, sigBytes as any,
      new TextEncoder().encode(JSON.stringify(command)),
    );
    expect(ok).toBe(true);
  });

  it('detects tampering of outbound command', async () => {
    const command: OutboundCommand = {
      command_id: 'cmd-roundtrip-2',
      action: 'disable_stream',
      target_source: 'sbbl-hq',
      target_entity_id: 'stream-123',
      reason: 'abuse report confirmed',
      issued_at: new Date().toISOString(),
      issued_by: 'operator-uuid',
      payload: { stream_id: 'stream-123' },
    };
    const signature = await signCommand(command, CONTROL_SECRET);
    const tampered = { ...command, payload: { stream_id: '*' } };
    const verifyKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(CONTROL_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const sigBytes = base64UrlToBytes(signature);
    const ok = await crypto.subtle.verify(
      'HMAC', verifyKey, sigBytes as any,
      new TextEncoder().encode(JSON.stringify(tampered)),
    );
    expect(ok).toBe(false);
  });
});

describe('ROUND-TRIP: contract compatibility with SBBL-HQ sync-packets.ts', () => {
  it('produces byte-identical signatures to SBBL-HQ native signSyncPacket', async () => {
    const packet = makePacket('game.started', { game_id: 'test' });
    const sbblSig = await sbblNativeSign(packet, SBBL_SECRET);
    const ourSig = await signSyncPacketForTest(packet, SBBL_SECRET);
    expect(ourSig).toBe(sbblSig);
  });

  it('OmniHub verifier accepts SBBL-HQ native signatures', async () => {
    const packet = makePacket('game.finalized', { final_home: 100, final_away: 90 });
    const sbblSig = await sbblNativeSign(packet, SBBL_SECRET);
    const result = await verifySyncPacket({ packet, signature: sbblSig }, SBBL_SECRET);
    expect(result.valid).toBe(true);
  });
});
