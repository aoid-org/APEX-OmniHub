/**
 * PhysiOmni Ingress: HMAC signature helpers.
 * Zero imports so both Deno and Vitest can load it.
 * The signed message is `${timestamp}.${rawBody}`, HMAC-SHA-256 keyed with
 * PHYSIOMNI_INGRESS_HMAC_SECRET, encoded as hex or base64url.
 */

export function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let i = 0; i < maxLength; i += 1) {
    // Compare every position so mismatched lengths do not leak early-exit timing.
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }

  return diff === 0;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCodePoint(byte);

  let encoded = btoa(binary);
  const base64PaddingCodePoint = '='.codePointAt(0);
  let unpaddedLength = encoded.length;
  while (
    unpaddedLength > 0 &&
    encoded.codePointAt(unpaddedLength - 1) === base64PaddingCodePoint
  ) {
    // Trim fixed-width base64 padding with a linear scan to avoid regex DoS hotspots.
    unpaddedLength -= 1;
  }

  encoded = encoded.slice(0, unpaddedLength);
  let base64url = '';
  for (const char of encoded) {
    let safeChar = char;
    if (char === '+') {
      safeChar = '-';
    } else if (char === '/') {
      safeChar = '_';
    }
    // Convert the only two non-URL-safe base64 characters without regex backtracking.
    base64url += safeChar;
  }

  return base64url;
}

export function normalizeTelemetrySignatureHeader(value: string): string {
  return value.toLowerCase().startsWith('sha256=') ? value.slice(7) : value;
}

export async function computeTelemetrySignature(secret: string, timestamp: string, rawBody: string): Promise<{ hex: string; base64url: string }> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${rawBody}`));
  const bytes = new Uint8Array(signature);
  return { hex: bytesToHex(bytes), base64url: bytesToBase64Url(bytes) };
}
