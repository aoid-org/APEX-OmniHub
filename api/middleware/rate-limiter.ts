/**
 * api/middleware/rate-limiter.ts — Vercel Edge Rate Limiter
 * Fail-closed: denies on KV failure or nullish response.
 * APEX-OmniHub v1.3.0-RC  §Security Gate
 */

import { kv } from '@vercel/kv';

export async function rateLimitMiddleware(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "unknown_ip";

  try {
    // FAIL-CLOSED: Nullish coalescing directly to false.
    // If kv.checkLimit() returns null, undefined, or fails, access is denied.
    const allowed = (await kv.checkLimit(ip)) ?? false;

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "APEX API: Rate Limit Exceeded" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    return null; // Proceed to route handler
  } catch (error) {
    console.error("APEX Rate Limiter: Edge KV Subsystem Failure", error);

    // FAIL-CLOSED: Protect backend infrastructure during Edge outages.
    return new Response(
      JSON.stringify({ error: "APEX API: Service Unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
