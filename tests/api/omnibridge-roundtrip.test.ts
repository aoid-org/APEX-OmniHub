/**
 * OmniBridge v1.6.0 round-trip simulation
 *
 * These tests exercise the BIDIRECTIONAL integration as a system:
 *
 *   (inbound)   SBBL-HQ signs a SyncPacket → POST /api/omnibridge/sync
 *               → signature verified → persisted → 202 returned
 *
 *   (outbound)  OmniHub control plane signs a command → POST to SBBL-HQ
 *               → SBBL-HQ verifies signature with same algorithm
 *
 * The signSyncPacketForTest implementation in syncPacketVerifier.ts is
 * byte-identical to sbbl-hq/src/lib/sync-packets.ts::signSyncPacket (verified
 * by reading the public repo at commit main on 2026-04-17). Using it here
 * simulates SBBL-HQ-produced traffic with high fidelity.
 *
 * The control-plane outbound caller uses the exact same primitive, so an
 * endpoint built on the SBBL-HQ side using `signSyncPacket`-style verification
 * will validate our outbound commands without modification.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/omnibridge/sync';
import { clearRegistryCache } from '../../src/lib/omnibridge/sourceRegistry';
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

let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  originalEnv = { ...process.env };
  clearRegistryCache();
  clearReplayStore();
  process.env['OMNIBRIDGE_M2M_CLIENTS'] = JSON.stringify([
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
  ]);
  process.env['OMNIBRIDGE_SBBL_NATIVE_SECRET'] = SBBL_SECRET;
});

afterEach(() => {
  process.env = { ...originalEnv };
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

describe('ROUND-TRIP: SBBL-HQ → OmniHub inbound persistence', () => {
  it('accepts a sequence of live-event-shaped packets and persists each one', async () => {
    const persistSpy = vi.spyOn(eventStore, 'persistEvent').mockImplementation(async (input) => ({
      ok: true,
      event_uuid: `uuid-${input.event_id}`,
      duplicate: false,
    }));

    const liveEventSequence = [
      makePacket('game.started', { home: 'Flames', away: 'Rockets', tip_off: '19:00' }),
      makePacket('game.score_update', { home_score: 10, away_score: 8, quarter: 1 }),
      makePacket('game.timeout', { team: 'Flames', reason: 'strategic' }),
      makePacket('game.score_update', { home_score: 24, away_score: 20, quarter: 2 }),
      makePacket('game.finalized', { winner: 'Flames', final_home: 89, final_away: 76 }),
    ];

    for (const packet of liveEventSequence) {
      const signature = await signSyncPacketForTest(packet, SBBL_SECRET);
      const req = new Request('https://omnihub.test/api/omnibridge/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Omni-Source': 'sbbl-hq',
        },
        body: JSON.stringify({ packet, signature }),
      });
      const res = await handler(req);
      expect(res.status).toBe(202);
      const body = await res.json() as Record<string, unknown>;
      expect(body.received).toBe(true);
      expect(body.packet_id).toBe(packet.packet_id);
    }

    // Every packet reached persistence, each with signature_verified=true.
    expect(persistSpy).toHaveBeenCalledTimes(liveEventSequence.length);
    for (const call of persistSpy.mock.calls) {
      expect(call[0].signature_verified).toBe(true);
      expect(call[0].profile).toBe('sync_packet');
      expect(call[0].source_id).toBe('sbbl-hq');
      expect(call[0].tenant_id).toBe('tenant_sbbl');
    }
  });

  it('detects and rejects in-flight tampering mid-stream', async () => {
    vi.spyOn(eventStore, 'persistEvent').mockResolvedValue({
      ok: true, event_uuid: 'u', duplicate: false,
    });

    const packet = makePacket('game.score_update', { home_score: 10, away_score: 8 });
    const validSig = await signSyncPacketForTest(packet, SBBL_SECRET);

    // Attacker flips the score after signing.
    const tamperedPacket = { ...packet, payload: { home_score: 999, away_score: 0 } };

    const req = new Request('https://omnihub.test/api/omnibridge/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Omni-Source': 'sbbl-hq' },
      body: JSON.stringify({ packet: tamperedPacket, signature: validSig }),
    });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('handles burst of 50 packets without dropping any', async () => {
    const persisted: string[] = [];
    vi.spyOn(eventStore, 'persistEvent').mockImplementation(async (input) => {
      persisted.push(input.event_id);
      return { ok: true, event_uuid: `u-${input.event_id}`, duplicate: false };
    });

    const burst = Array.from({ length: 50 }, (_, i) =>
      makePacket('game.score_update', { tick: i }),
    );

    const responses = await Promise.all(
      burst.map(async (packet) => {
        const sig = await signSyncPacketForTest(packet, SBBL_SECRET);
        const req = new Request('https://omnihub.test/api/omnibridge/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Omni-Source': 'sbbl-hq' },
          body: JSON.stringify({ packet, signature: sig }),
        });
        return handler(req);
      }),
    );

    expect(responses.every((r) => r.status === 202)).toBe(true);
    expect(persisted.length).toBe(50);
    expect(new Set(persisted).size).toBe(50); // all unique
  });
});

describe('ROUND-TRIP: OmniHub → SBBL-HQ outbound command signing', () => {
  it('signs a command with an algorithm that an SBBL-HQ-style verifier will accept', async () => {
    // The SBBL-HQ side will run signSyncPacket(...)-style verification.
    // We sign using the same primitive via outboundCaller.signCommand, then
    // use our own verifySyncPacket helper to confirm symmetry (proves a
    // SBBL-HQ-side handler implementing the same verify logic will accept).
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

    // Treat the command as if it were a SyncPacket body (same algorithm).
    // The SBBL-HQ verifier signs JSON.stringify(packet); we sign JSON.stringify(command).
    // Any SBBL-HQ-side handler that loads OMNIHUB_VERIFY_KEY and runs
    // crypto.subtle.verify on the same bytes will accept this signature.
    const verifyKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(CONTROL_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const sigBytes = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - signature.length % 4) % 4)),
      c => c.charCodeAt(0),
    );
    const ok = await crypto.subtle.verify(
      'HMAC', verifyKey, sigBytes,
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

    // Attacker expands the blast radius.
    const tampered = { ...command, payload: { stream_id: '*' } };

    const verifyKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(CONTROL_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const sigBytes = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - signature.length % 4) % 4)),
      c => c.charCodeAt(0),
    );
    const ok = await crypto.subtle.verify(
      'HMAC', verifyKey, sigBytes,
      new TextEncoder().encode(JSON.stringify(tampered)),
    );
    expect(ok).toBe(false);
  });
});

describe('ROUND-TRIP: contract compatibility with SBBL-HQ sync-packets.ts', () => {
  // Recreates sbbl-hq/src/lib/sync-packets.ts::signSyncPacket verbatim to
  // prove signature bytes are identical across both codebases.
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
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

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
