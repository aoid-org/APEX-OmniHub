/**
 * Build-safe WebAuthn (passkey) client for the omnihub-site app.
 *
 * IMPORTANT (build-safety): the root WebAuthn lib `src/lib/biometric-auth.ts`
 * transitively imports `./monitoring`, which pulls in root `@/...`-aliased
 * modules. The site Vite build resolves `@` to apps/omnihub-site/src, so
 * importing that lib here would break the production build. This module
 * therefore mirrors only the navigator.credentials logic directly, with no
 * heavy deps and no root `@/...` imports.
 *
 * It talks to the `identity-webauthn` edge function (server-side challenge,
 * registration verification, assertion verification + sign-counter replay
 * protection). Only PUBLIC credential material is ever transmitted; private
 * keys and biometrics never leave the authenticator.
 */

import { supabase } from './supabase';

const RP_NAME = 'APEX OmniHub';

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/={1,2}$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = globalThis.atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** WebAuthn API availability (browser-only; honest false in SSR/unsupported). */
export function isWebAuthnSupported(): boolean {
  if (typeof globalThis.window === 'undefined') return false;
  return (
    typeof globalThis.PublicKeyCredential === 'function' &&
    typeof navigator !== 'undefined' &&
    navigator.credentials !== undefined
  );
}

/** True only when a real platform authenticator (e.g. Touch ID/Windows Hello) is present. */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await globalThis.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Stable per-browser device id used to key the device_registry row. */
export function getOrCreateDeviceId(): string {
  const KEY = 'omni_webauthn_device_id';
  let id = globalThis.localStorage?.getItem(KEY) ?? '';
  if (!id) {
    const buf = new Uint8Array(16);
    globalThis.crypto.getRandomValues(buf);
    id = base64UrlEncode(buf.buffer);
    globalThis.localStorage?.setItem(KEY, id);
  }
  return id;
}

async function requestChallenge(
  deviceId: string,
  purpose: 'register' | 'assert',
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('identity-webauthn', {
    body: { action: 'challenge', deviceId, purpose },
  });
  if (error) throw new Error(error.message || 'Failed to obtain challenge');
  if (data?.error) throw new Error(String(data.error));
  if (!data?.challenge) throw new Error('No challenge returned');
  return data.challenge as string;
}

export interface PasskeyResult {
  success: boolean;
  reason?: string;
}

/**
 * Register a passkey for the signed-in user on this device.
 * Server issues the challenge, browser creates the credential, server stores
 * only the public-key metadata + initial sign counter.
 */
export async function registerPasskey(userEmail: string): Promise<PasskeyResult> {
  if (!isWebAuthnSupported()) {
    return { success: false, reason: 'WebAuthn is not supported in this browser.' };
  }

  const deviceId = getOrCreateDeviceId();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, reason: 'You must be signed in to register a passkey.' };

  const challenge = base64UrlDecode(await requestChallenge(deviceId, 'register'));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge as unknown as BufferSource,
      rp: { name: RP_NAME, id: globalThis.location.hostname },
      user: {
        id: new TextEncoder().encode(user.id) as unknown as BufferSource,
        name: userEmail,
        displayName: userEmail,
      },
      // ES256-only: the server verifies ES256/P-256 assertion signatures
      // (see webauthn-core.ts). Advertising RS256 could yield a credential the
      // server cannot verify, so it is intentionally omitted.
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false,
      },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!credential) return { success: false, reason: 'Credential creation was cancelled.' };

  const response = credential.response as AuthenticatorAttestationResponse;
  const { data, error } = await supabase.functions.invoke('identity-webauthn', {
    body: {
      action: 'register',
      deviceId,
      credentialId: credential.id,
      // PUBLIC attestation object metadata only — never a private key.
      publicKey: base64UrlEncode(response.attestationObject),
      clientDataJSON: base64UrlEncode(response.clientDataJSON),
      authenticatorData: base64UrlEncode(response.getAuthenticatorData()),
    },
  });

  if (error) return { success: false, reason: error.message };
  if (data?.error) return { success: false, reason: String(data.reason ?? data.error) };
  return { success: true };
}

/**
 * Authenticate the current session with a previously-registered passkey.
 * Server verifies the assertion challenge + sign-counter replay watermark.
 */
export async function authenticateWithPasskey(): Promise<PasskeyResult> {
  if (!isWebAuthnSupported()) {
    return { success: false, reason: 'WebAuthn is not supported in this browser.' };
  }

  const deviceId = getOrCreateDeviceId();
  const challenge = base64UrlDecode(await requestChallenge(deviceId, 'assert'));

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: challenge as unknown as BufferSource,
      rpId: globalThis.location.hostname,
      userVerification: 'required',
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) return { success: false, reason: 'Authentication was cancelled.' };

  const response = assertion.response as AuthenticatorAssertionResponse;
  const { data, error } = await supabase.functions.invoke('identity-webauthn', {
    body: {
      action: 'assert',
      deviceId,
      credentialId: assertion.id,
      clientDataJSON: base64UrlEncode(response.clientDataJSON),
      authenticatorData: base64UrlEncode(response.authenticatorData),
      signature: base64UrlEncode(response.signature),
    },
  });

  if (error) return { success: false, reason: error.message };
  if (data?.error) return { success: false, reason: String(data.reason ?? data.error) };
  return { success: true };
}
