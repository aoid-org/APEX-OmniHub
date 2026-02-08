/**
 * HMAC Request Signing for Edge → Orchestrator calls.
 *
 * Signs requests using ORCHESTRATOR_SHARED_SECRET with HMAC-SHA256.
 * Canonical string: METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + TRACE_ID + "\n" + SHA256_HEX(BODY)
 */

const encoder = new TextEncoder();

/** Compute SHA-256 hex digest of raw bytes. */
async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Compute HMAC-SHA256 and return hex string. */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Build signed headers for an orchestrator request.
 *
 * @param method - HTTP method (e.g. "POST")
 * @param path - URL path (e.g. "/api/v1/goals")
 * @param bodyRaw - exact JSON string used as fetch body
 * @param traceId - trace/correlation ID
 * @returns Headers object with Content-Type and signature headers
 */
export async function buildSignedHeaders(
  method: string,
  path: string,
  bodyRaw: string,
  traceId: string,
): Promise<Record<string, string>> {
  const secret = Deno.env.get('ORCHESTRATOR_SHARED_SECRET') ?? '';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = await sha256Hex(encoder.encode(bodyRaw));
  const canonical = `${method}\n${path}\n${timestamp}\n${traceId}\n${bodyHash}`;
  const signature = await hmacSha256Hex(secret, canonical);

  return {
    'Content-Type': 'application/json',
    'X-Omni-Timestamp': timestamp,
    'X-Omni-Trace-Id': traceId,
    'X-Omni-Signature': signature,
  };
}
