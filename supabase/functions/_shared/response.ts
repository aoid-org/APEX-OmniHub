/**
 * Standardized Edge Function Response Helpers
 * @module supabase/functions/_shared/response
 *
 * Canonical response envelope for all APEX Edge Functions.
 * Ensures every response carries: ok, data|error, ts.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { buildCorsHeaders } from './cors.ts';

// ── Envelope Types ──────────────────────────────────────────────────────────

interface SuccessEnvelope<T = unknown> {
  ok: true;
  data: T;
  ts: string;
}

interface ErrorEnvelope {
  ok: false;
  error: { code: string; message: string };
  ts: string;
}

type ResponseEnvelope<T = unknown> = SuccessEnvelope<T> | ErrorEnvelope;

// ── Helpers ─────────────────────────────────────────────────────────────────

function envelope<T>(data: T): SuccessEnvelope<T> {
  return { ok: true, data, ts: new Date().toISOString() };
}

function errorEnvelope(code: string, message: string): ErrorEnvelope {
  return { ok: false, error: { code, message }, ts: new Date().toISOString() };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Return a 200 JSON response with the standard envelope.
 */
export function okResponse<T = unknown>(
  data: T,
  origin?: string | null,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(envelope(data)), {
    status,
    headers: {
      ...buildCorsHeaders(origin ?? ''),
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

/**
 * Return a structured error response with the standard envelope.
 */
export function errResponse(
  code: string,
  message: string,
  status = 400,
  origin?: string | null,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(errorEnvelope(code, message)), {
    status,
    headers: {
      ...buildCorsHeaders(origin ?? ''),
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

export type { ResponseEnvelope, SuccessEnvelope, ErrorEnvelope };
