/**
 * api/cors.ts — Vercel Edge CORS Proxy
 * Range-request passthrough · WinterCG-safe header reconstruction
 * APEX-OmniHub v1.3.0-RC
 */

export const config = { runtime: 'edge' };

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(request: Request): Promise<Response> {
  // --- Preflight ---------------------------------------------------------
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // --- Source validation --------------------------------------------------
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');

  if (!source) {
    return new Response(
      JSON.stringify({ error: 'Missing required "source" query parameter.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      },
    );
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(source);
    new URL(decodedUrl); // validate
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid "source" URL.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      },
    );
  }

  // --- Proxy request ------------------------------------------------------
  try {
    const proxyHeaders = new Headers();

    // Passthrough Range header for media scrubbing
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      proxyHeaders.set('Range', rangeHeader);
    }

    // Forward Accept header
    const acceptHeader = request.headers.get('Accept');
    if (acceptHeader) {
      proxyHeaders.set('Accept', acceptHeader);
    }

    const upstreamResponse = await fetch(decodedUrl, {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'follow',
    });

    // --- WinterCG-safe header reconstruction ----------------------------
    // Original response.headers may be immutable in Edge runtimes.
    // Reconstruct into a new mutable Headers object.
    const responseHeaders = new Headers(upstreamResponse.headers);

    // Inject CORS headers
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(key, value);
    }

    // Expose Content-Length and Content-Range so client can read them
    responseHeaders.set(
      'Access-Control-Expose-Headers',
      'Content-Length, Content-Range, Content-Type',
    );

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown proxy error';
    return new Response(
      JSON.stringify({ error: `Proxy fetch failed: ${message}` }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      },
    );
  }
}
