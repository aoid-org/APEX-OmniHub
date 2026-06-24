import { z } from 'zod';

export const config = { runtime: 'edge' };

/** Allowed origins for CORS — fail-closed (no wildcard). */
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  'https://apexomnihub.com',
  'https://www.apexomnihub.com',
  'https://apex-omnihub.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]);

function buildExchangeCorsHeaders(origin: string | null): Record<string, string> {
  const resolvedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

const requestSchema = z.object({
  provider: z.string().min(1),
  proxy_token: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional().default({}),
});

const responseSchema = z.object({
  scopes: z.array(z.string()).default([]),
  data: z.record(z.string(), z.unknown()).default({}),
});

function jsonResponse(status: number, payload: Record<string, unknown>, origin: string | null = null): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...buildExchangeCorsHeaders(origin) },
  });
}

function requiredConfig(): { supabaseUrl: string; publishableKey: string } {
  const supabaseUrl = process.env['VITE_SUPABASE_URL'] ?? '';
  const publishableKey =
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ??
    process.env['VITE_SUPABASE_ANON_KEY'] ??
    '';

  if (!supabaseUrl || !publishableKey) {
    throw new Error('exchange_config_missing');
  }

  return { supabaseUrl, publishableKey };
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('Origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: buildExchangeCorsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, origin);
  }

  const traceId = crypto.randomUUID();

  try {
    const parsedBody = requestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return jsonResponse(400, {
        error: 'Invalid request body',
        trace_id: traceId,
        details: parsedBody.error.flatten(),
      }, origin);
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Missing bearer token', trace_id: traceId }, origin);
    }

    const { supabaseUrl, publishableKey } = requiredConfig();
    const upstream = await fetch(`${supabaseUrl}/functions/v1/apex-agent`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        apikey: publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'oauth_exchange',
        provider: parsedBody.data.provider,
        auth_payload: {
          proxy_token: parsedBody.data.proxy_token,
          context: parsedBody.data.context,
        },
      }),
    });

    const upstreamJsonRaw = (await upstream.json().catch(() => ({}))) as unknown;
    const upstreamJson = (upstreamJsonRaw as { ok?: boolean; data?: unknown }).ok === true
      ? (upstreamJsonRaw as { data: unknown }).data
      : upstreamJsonRaw;

    if (!upstream.ok) {
      return jsonResponse(upstream.status, {
        error: 'OmniConnect exchange failed',
        trace_id: traceId,
        upstream: upstreamJson,
      }, origin);
    }

    const normalized = responseSchema.safeParse({
      scopes: (upstreamJson as Record<string, unknown>)['scopes'],
      data: upstreamJson,
    });

    if (!normalized.success) {
      return jsonResponse(502, {
        error: 'Invalid upstream response schema',
        trace_id: traceId,
      }, origin);
    }

    return jsonResponse(200, normalized.data, origin);
  } catch (error) {
    if (error instanceof Error && error.message === 'exchange_config_missing') {
      return jsonResponse(503, {
        error: 'Exchange API unavailable: missing Supabase configuration',
        trace_id: traceId,
      }, origin);
    }

    return jsonResponse(502, {
      error: 'Exchange API request failed',
      trace_id: traceId,
    }, origin);
  }
}
