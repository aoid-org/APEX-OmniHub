/**
 * HMAC-SHA256 Signature Validation Utility
 *
 * Edge-compatible (Web Crypto API only) HMAC generation and validation
 * with constant-time comparison to prevent timing attacks.
 *
 * @module lib/security/hmacValidator
 * @license Proprietary - APEX Business Systems Ltd.
 */

const encoder = new TextEncoder();

/**
 * Import a string secret as a CryptoKey for HMAC-SHA256 operations.
 */
async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Convert an ArrayBuffer to a hex-encoded string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a hex-encoded string to a Uint8Array.
 */
function hexToBuffer(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * Compares every character regardless of mismatch position, ensuring
 * the function execution time does not leak information about which
 * characters differ.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Even on length mismatch we do work proportional to the longer string
    // to avoid leaking length information via timing.
    // However, we still return false since lengths differ.
    let mismatch = 1;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const ac = a.codePointAt(i % a.length) ?? 0;
      const bc = b.codePointAt(i % b.length) ?? 0;
      mismatch |= ac ^ bc;
    }
    // Always returns false for length mismatch, but takes constant time
    // relative to the longer input. mismatch is always >= 1 here.
    return mismatch === 0;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= (a.codePointAt(i) ?? 0) ^ (b.codePointAt(i) ?? 0);
  }
  return mismatch === 0;
}

/**
 * Generate a hex-encoded HMAC-SHA256 signature for the given payload.
 *
 * @param payload - The raw string payload to sign
 * @param secret  - The signing secret
 * @returns Hex-encoded HMAC-SHA256 signature
 */
export async function generateHMAC(payload: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bufferToHex(signature);
}

/**
 * Validate an HMAC-SHA256 signature against a payload using constant-time comparison.
 *
 * Uses `crypto.subtle.verify` which provides native constant-time comparison
 * for the cryptographic verification step.
 *
 * @param payload   - The raw string payload that was signed
 * @param signature - The hex-encoded signature to validate
 * @param secret    - The signing secret
 * @returns True if the signature is valid
 */
export async function validateHMAC(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    // Validate hex format
    if (!/^[0-9a-f]{64}$/i.test(signature)) {
      return false;
    }

    const key = await importKey(secret);
    const signatureBytes = hexToBuffer(signature);

    return crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payload));
  } catch {
    return false;
  }
}
