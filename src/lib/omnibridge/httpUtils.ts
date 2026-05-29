/**
 * Shared HTTP utilities for OmniBridge CF Pages Functions.
 * Eliminates duplication between functions/api/omnibridge/sync.ts and ingest.ts.
 *
 * @module lib/omnibridge/httpUtils
 * @license Proprietary - APEX Business Systems Ltd.
 */

// Recursively strip stack-trace-bearing fields so internal error detail can never reach
// a client through a response body (defends the jsonResponse sink against info exposure).
const REDACTED_KEYS = new Set(['stack', 'stacktrace', 'stack_trace']);
function redactErrorDetail(value: unknown): unknown {
  if (value instanceof Error) return { name: value.name };
  if (Array.isArray(value)) return value.map(redactErrorDetail);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(k.toLowerCase())) continue;
      out[k] = redactErrorDetail(v);
    }
    return out;
  }
  return value;
}

export function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(redactErrorDetail(body)), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function makeLogger(module: string) {
  return (deny: boolean, reason: string, meta: Record<string, unknown>): void => {
    const line = `[${module}] ${deny ? 'DENY' : 'ACCEPT'}: ${reason} | ${JSON.stringify(meta)}`;
    if (deny) console.error(line); else console.warn(line);
  };
}

export function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('__')) continue;
    if (typeof v === 'string' && /<script/i.test(v)) continue;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitize(v as Record<string, unknown>);
    } else if (Array.isArray(v)) {
      out[k] = v
        .map((item) => {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            return sanitize(item as Record<string, unknown>);
          }
          if (typeof item === 'string' && /<script/i.test(item)) return undefined;
          return item;
        })
        .filter((item) => item !== undefined);
    } else {
      out[k] = v;
    }
  }
  return out;
}
