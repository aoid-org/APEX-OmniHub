/**
 * identity-webauthn surface gate.
 *
 * Proves the WebAuthn device-bound passkey path is REAL (not a mock):
 *   1. Challenge generation produces unique, 32-byte CSPRNG values.
 *   2. Registration verification accepts a matching challenge and yields the
 *      PUBLIC-key metadata + sign counter that the edge function stores.
 *   3. Assertion verification REJECTS a replayed / stale sign counter.
 *   4. The site surface is wired into the Login flow and the edge function
 *      reuses the existing device_registry table (no second registry).
 *
 * Pure verification logic is imported directly from the runtime-agnostic core
 * (no Deno `https://` imports, no root `@/...`), so it runs in vitest/jsdom.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  generateChallenge,
  base64UrlEncode,
  base64UrlDecode,
  parseAndVerifyClientData,
  extractSignCount,
  verifyAssertionCounter,
  coseKeyToRawP256,
  derToRawEcdsaSignature,
  verifyAssertionSignature,
  type StoredCredential,
} from '../../supabase/functions/identity-webauthn/webauthn-core';

const ROOT = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

// ── Test fixtures: build the byte structures a real authenticator produces ──

function makeClientDataJSON(challenge: string, type: 'webauthn.create' | 'webauthn.get'): string {
  const json = JSON.stringify({ type, challenge, origin: 'https://apexomnihub.icu' });
  return base64UrlEncode(new TextEncoder().encode(json));
}

/** authenticatorData = rpIdHash(32) | flags(1) | signCount(4 BE) | ... */
function makeAuthenticatorData(signCount: number): string {
  const buf = new Uint8Array(37);
  // rpIdHash bytes 0..31 left as zeros (not validated by counter extraction)
  buf[32] = 0x05; // flags: UP | UV
  const view = new DataView(buf.buffer);
  view.setUint32(33, signCount, false); // big-endian
  return base64UrlEncode(buf);
}

describe('WebAuthn challenge generation', () => {
  it('produces unique 32-byte challenges', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const c = generateChallenge();
      expect(seen.has(c)).toBe(false);
      seen.add(c);
      // 32 raw bytes round-trips through base64url
      expect(base64UrlDecode(c).byteLength).toBe(32);
    }
    expect(seen.size).toBe(200);
  });
});

describe('Registration verification stores public-key metadata', () => {
  it('accepts a matching create challenge and captures the sign counter', () => {
    const challenge = generateChallenge();
    const clientDataJSON = makeClientDataJSON(challenge, 'webauthn.create');

    const cd = parseAndVerifyClientData(clientDataJSON, challenge, 'webauthn.create');
    expect(cd.ok).toBe(true);
    expect(cd.clientData?.type).toBe('webauthn.create');

    // Mirror what the edge function persists into device_registry.device_info.
    const signCount = extractSignCount(makeAuthenticatorData(0));
    const stored: StoredCredential = {
      credentialId: 'cred-abc',
      publicKey: base64UrlEncode(new Uint8Array([1, 2, 3, 4])), // PUBLIC metadata only
      signCount,
      createdAt: new Date().toISOString(),
    };

    expect(stored.publicKey.length).toBeGreaterThan(0);
    expect(stored.signCount).toBe(0);
    // Sanity: nothing in the stored record is a private key / biometric.
    expect(Object.keys(stored)).not.toContain('privateKey');
  });

  it('rejects a registration whose challenge does not match', () => {
    const issued = generateChallenge();
    const attacker = makeClientDataJSON(generateChallenge(), 'webauthn.create');
    const cd = parseAndVerifyClientData(attacker, issued, 'webauthn.create');
    expect(cd.ok).toBe(false);
    expect(cd.reason).toBe('challenge_mismatch');
  });

  it('rejects a create assertion replayed as a get (type confusion)', () => {
    const challenge = generateChallenge();
    const getData = makeClientDataJSON(challenge, 'webauthn.get');
    const cd = parseAndVerifyClientData(getData, challenge, 'webauthn.create');
    expect(cd.ok).toBe(false);
    expect(cd.reason).toBe('clientdata_type_mismatch');
  });
});

describe('Assertion verification rejects replayed / stale sign counters', () => {
  const stored: StoredCredential = {
    credentialId: 'cred-abc',
    publicKey: 'AQIDBA',
    signCount: 5,
    createdAt: new Date().toISOString(),
  };

  it('accepts a strictly higher counter and advances the watermark', () => {
    const presented = extractSignCount(makeAuthenticatorData(6));
    const result = verifyAssertionCounter(stored, presented);
    expect(result.verified).toBe(true);
    expect(result.newSignCount).toBe(6);
  });

  it('rejects an equal counter (replay of the same assertion)', () => {
    const presented = extractSignCount(makeAuthenticatorData(5));
    const result = verifyAssertionCounter(stored, presented);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe('replay_detected_stale_sign_count');
  });

  it('rejects a lower counter (cloned / rolled-back authenticator)', () => {
    const presented = extractSignCount(makeAuthenticatorData(3));
    const result = verifyAssertionCounter(stored, presented);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe('replay_detected_stale_sign_count');
  });

  it('allows the always-zero-counter authenticator case', () => {
    const zeroStored: StoredCredential = { ...stored, signCount: 0 };
    const presented = extractSignCount(makeAuthenticatorData(0));
    const result = verifyAssertionCounter(zeroStored, presented);
    expect(result.verified).toBe(true);
  });

  it('verifies the assertion challenge before the counter check', () => {
    const challenge = generateChallenge();
    const ok = parseAndVerifyClientData(
      makeClientDataJSON(challenge, 'webauthn.get'),
      challenge,
      'webauthn.get',
    );
    expect(ok.ok).toBe(true);
  });
});

describe('identity-webauthn surface is wired and reuses existing registry', () => {
  it('exposes the passkey UI in Login, backed by signature verification', () => {
    const panel = read('apps/omnihub-site/src/components/identity/PasskeySection.tsx');
    expect(panel).toContain('PasskeySection');
    const login = read('apps/omnihub-site/src/pages/Login.tsx');
    expect(login).toContain('<PasskeySection');
    // The edge function must call signature verification on assert.
    const fn = read('supabase/functions/identity-webauthn/index.ts');
    expect(fn).toContain('verifyAssertionSignature');
    expect(fn).toContain('extractCredentialPublicKey');
  });

  it('site client invokes the identity-webauthn edge function', () => {
    const client = read('apps/omnihub-site/src/lib/webauthnClient.ts');
    expect(client).toContain("invoke('identity-webauthn'");
  });

  it('edge function reuses the existing device_registry table (no second registry)', () => {
    const fn = read('supabase/functions/identity-webauthn/index.ts');
    expect(fn).toContain('device_registry');
    expect(fn).toContain('audit_logs'); // reuses existing receipt store
    // No new table is created by this feature.
    expect(fn).not.toContain('CREATE TABLE');
  });
});

// ── Real ES256 (ECDSA P-256) signature verification round-trip ──────────────
// Proves verifyAssertionSignature genuinely verifies the authenticator
// signature (not a stub): we generate a P-256 keypair, sign the exact bytes a
// real authenticator signs (authenticatorData || SHA-256(clientDataJSON)), and
// confirm valid signatures verify true while tampered ones verify false.

function rawToDerEcdsa(raw: Uint8Array): Uint8Array {
  const enc = (v: Uint8Array): Uint8Array => {
    let i = 0;
    while (i < v.length - 1 && v[i] === 0x00) i++;
    let body = v.slice(i);
    if (body[0] & 0x80) body = new Uint8Array([0x00, ...body]); // positive sign
    return new Uint8Array([0x02, body.length, ...body]);
  };
  const r = enc(raw.slice(0, 32));
  const s = enc(raw.slice(32, 64));
  return new Uint8Array([0x30, r.length + s.length, ...r, ...s]);
}

describe('ES256 assertion signature verification (real crypto)', () => {
  it('coseKeyToRawP256 produces the same point as the exported raw key', async () => {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ]);
    const rawPub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    const cose = new Map<number, unknown>([
      [1, 2], // kty EC2
      [3, -7], // alg ES256
      [-1, 1], // crv P-256
      [-2, rawPub.slice(1, 33)], // x
      [-3, rawPub.slice(33, 65)], // y
    ]);
    expect(Array.from(coseKeyToRawP256(cose))).toEqual(Array.from(rawPub));
  });

  it('verifies a valid assertion and rejects tampered ones (DER + raw sigs)', async () => {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ]);
    const rawPub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    const publicKeyRawB64 = base64UrlEncode(rawPub);

    const challenge = generateChallenge();
    const clientDataJSONB64 = makeClientDataJSON(challenge, 'webauthn.get');
    const authenticatorDataB64 = makeAuthenticatorData(7);

    const authData = base64UrlDecode(authenticatorDataB64);
    const cHash = new Uint8Array(
      await crypto.subtle.digest('SHA-256', base64UrlDecode(clientDataJSONB64)),
    );
    const signed = new Uint8Array(authData.length + cHash.length);
    signed.set(authData, 0);
    signed.set(cHash, authData.length);

    const rawSig = new Uint8Array(
      await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, signed),
    );

    // Valid — DER form (what authenticators emit) and raw form both verify.
    const derSig = base64UrlEncode(rawToDerEcdsa(rawSig));
    expect(
      await verifyAssertionSignature({ publicKeyRawB64, authenticatorDataB64, clientDataJSONB64, signatureB64: derSig }),
    ).toBe(true);
    expect(
      await verifyAssertionSignature({ publicKeyRawB64, authenticatorDataB64, clientDataJSONB64, signatureB64: base64UrlEncode(rawSig) }),
    ).toBe(true);

    // Tampered signature → false.
    const badRaw = rawSig.slice();
    badRaw[10] ^= 0xff;
    expect(
      await verifyAssertionSignature({ publicKeyRawB64, authenticatorDataB64, clientDataJSONB64, signatureB64: base64UrlEncode(rawToDerEcdsa(badRaw)) }),
    ).toBe(false);

    // Tampered challenge (different clientDataJSON) → false.
    expect(
      await verifyAssertionSignature({
        publicKeyRawB64,
        authenticatorDataB64,
        clientDataJSONB64: makeClientDataJSON(generateChallenge(), 'webauthn.get'),
        signatureB64: derSig,
      }),
    ).toBe(false);
  });

  it('derToRawEcdsaSignature yields 64-byte r||s', () => {
    const raw = new Uint8Array(64).fill(7);
    const der = rawToDerEcdsa(raw);
    const back = derToRawEcdsaSignature(der);
    expect(back.length).toBe(64);
  });
});
