/**
 * Hardened Request Verification Pipeline
 *
 * Implements the source-aware signed ingress logic for SBBL HQ and future
 * partners in a Vercel Edge compatible way.
 *
 * @module lib/omnibridge/verifySignedIngress
 * @license Proprietary - APEX Business Systems Ltd.
 */


const encoder = new TextEncoder();

export interface HardenedHeaders {
  sourceId: string;
  keyId: string;
  timestamp: string;
  traceId: string;
  signature: string;
}

/**
 * Extracts hardened headers from a Request object.
 * Returns null if any header is completely missing.
 */
export function extractHardenedHeaders(request: Request): HardenedHeaders | null {
  const sourceId = request.headers.get('X-Omni-Source');
  const keyId = request.headers.get('X-Omni-Key-Id');
  const timestamp = request.headers.get('X-Omni-Timestamp');
  const traceId = request.headers.get('X-Omni-Trace-Id');
  const signature = request.headers.get('X-Omni-Signature');

  if (!sourceId || !keyId || !timestamp || !traceId || !signature) {
    return null;
  }

  return { sourceId, keyId, timestamp, traceId, signature };
}

/**
 * Computes SHA-256 hex digest of a raw string body.
 */
async function sha256Hex(data: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes the canonical signature string for hardened mode.
 * HMAC must use raw request bytes to prevent bypasses via whitespace manipulation.
 */
export async function computeCanonicalString(
  method: string,
  path: string,
  timestamp: string,
  traceId: string,
  sourceId: string,
  bodyRaw: string
): Promise<string> {
  return `${method}\n${path}\n${timestamp}\n${traceId}\n${sourceId}\n${bodyRaw}`;
}

/**
 * Validates the timestamp string.
 * Returns true if the timestamp is valid and within ±300s of now.
 */
export function isTimestampValid(timestampStr: string, maxSkewSeconds = 300): boolean {
  const ts = Number.parseInt(timestampStr, 10); // NOSONAR
  if (Number.isNaN(ts) || ts <= 0) return false; // NOSONAR

  const nowSeconds = Math.floor(Date.now() / 1000);
  const diff = Math.abs(nowSeconds - ts);

  return diff <= maxSkewSeconds;
}

/**
 * Validates IP address against a list of allowed CIDR/IP strings.
 * For now, this just supports direct string matching.
 */
export function isIpAllowed(ip: string, allowedIps: string[] | undefined): boolean {
  if (!allowedIps || allowedIps.length === 0) return true; // Empty means allow all
  return allowedIps.includes(ip);
}

/**
 * Extracts the real client IP.
 * Does not trust X-Forwarded-For unless explicitly configured, to prevent IP spoofing.
 */
export function extractClientIp(request: Request, trustProxy = false): string {
  if (trustProxy) {
    const xff = request.headers.get('X-Forwarded-For');
    if (xff) {
      // Return the first IP in the chain (original client) or last?
      // Vercel / CF usually appends. The safest is to take the CF-Connecting-IP or real IP.
      const ips = xff.split(',');
      const last = ips.pop()?.trim();
      if (last) return last;
    }
  }
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || 'unknown';
}
