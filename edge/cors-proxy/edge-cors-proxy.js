/**
 * APEX EdgeCORSProxy — Stateless Edge Worker
 * @version 1.0.0
 * @module edge/cors-proxy/edge-cors-proxy
 *
 * Deployed to: https://cors.apexomnihub.icu/
 * Usage:       https://cors.apexomnihub.icu/?source=<encoded-media-url>
 *
 * Force-injects Access-Control-Allow-Origin on proxied media responses
 * to guarantee Web Audio API interception for the OmniMedia Engine.
 *
 * APEX STANDARDS ENFORCED:
 * - Stateless: No server-side storage — pure stream proxy
 * - Fail-Closed: Missing source param → 400, bad upstream → propagated status
 * - Security: Only GET/HEAD/OPTIONS methods permitted
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

export default {
  /**
   * @param {Request} request - Incoming edge request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    // Handle preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('source');

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'APEX OmniMedia: Missing source parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }

    // Validate URL format before proxying
    try {
      new URL(targetUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'APEX OmniMedia: Invalid source URL' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }

    try {
      // Proxy the request to the target media source
      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'APEX-OmniMedia-EdgeProxy/1.0',
          Range: request.headers.get('Range') || '',
        },
      });

      // Clone response to mutate headers
      const proxyResponse = new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: upstream.headers,
      });

      // Force-inject CORS headers to authorize Web Audio API interception
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        proxyResponse.headers.set(key, value);
      }

      return proxyResponse;
    } catch {
      return new Response(
        JSON.stringify({ error: 'APEX OmniMedia: Upstream fetch failed' }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }
  },
};
