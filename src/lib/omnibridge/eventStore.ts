/**
 * OmniBridge Event Store — durable event persistence.
 *
 * Called by both the hardened and sync_packet ingress profiles after signature
 * verification succeeds.
 *
 * Design:
 *   - Writes every verified event to omnibridge_events (idempotent on
 *     (source_id, event_id)).
 *   - Edge-safe: uses fetch (no SDK). The service role key is provided via env
 *     and is never logged. Callers run on Cloudflare Pages Functions and POST
 *     to Supabase PostgREST directly.
 *
 * Fail-closed: a persistence failure surfaces to the caller so the partner
 * receives a 5xx and retries.
 *
 * Dispatch infrastructure: recordDispatchFailure() and updateDispatchState()
 * are implemented and available but are NOT wired in production ingress paths.
 * They must be called explicitly by an orchestrator dispatch layer when that
 * integration is activated.
 *
 * @module lib/omnibridge/eventStore
 * @license Proprietary - APEX Business Systems Ltd.
 */

export type PersistProfile = 'hardened' | 'sync_packet' | 'legacy';

/**
 * Platform-agnostic env bag. CF Pages Functions pass it via context.env.
 * Tests and Node code can pass process.env directly (string-indexable).
 */
export interface EventStoreEnv {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface PersistEventInput {
  event_id: string;
  source_id: string;
  tenant_id: string;
  profile: PersistProfile;
  event_type: string;
  trace_id?: string | null;
  idempotency_key?: string | null;
  payload: Record<string, unknown>;
  raw_headers?: Record<string, string> | null;
  signature_verified: boolean;
}

export interface PersistResult {
  ok: true;
  event_uuid: string;
  duplicate: boolean;
}

export interface PersistFailure {
  ok: false;
  reason: 'config_missing' | 'upstream_error' | 'conflict';
  detail?: string;
}

export type PersistOutcome = PersistResult | PersistFailure;

const HARDCODED_TIMEOUT_MS = 3_000;

function getProcessEnv(): EventStoreEnv {
  if (typeof process === 'undefined') {
    return {};
  }
  return process.env;
}

/**
 * Resolve Supabase config from an explicit env bag. On CF Pages Functions
 * callers pass context.env. On Node (tests) the caller may pass process.env.
 * Returns null when required values aren't set — caller decides how to fail.
 */
function readSupabaseConfig(env: EventStoreEnv | undefined): { url: string; serviceKey: string } | null {
  const source = env ?? getProcessEnv();
  const url = source.SUPABASE_URL ?? source.VITE_SUPABASE_URL;
  const serviceKey = source.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) return { url, serviceKey };
  return null;
}

/**
 * Insert a verified event. Uses ON CONFLICT DO NOTHING semantics via
 * PostgREST `Prefer: resolution=ignore-duplicates` so replays (same
 * source_id + event_id) return the existing row as duplicate=true.
 */
export async function persistEvent(
  input: PersistEventInput,
  env?: EventStoreEnv,
): Promise<PersistOutcome> {
  const cfg = readSupabaseConfig(env);
  if (cfg === null) {
    return { ok: false, reason: 'config_missing', detail: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set' };
  }

  const body = [{
    event_id: input.event_id,
    source_id: input.source_id,
    tenant_id: input.tenant_id,
    profile: input.profile,
    event_type: input.event_type,
    trace_id: input.trace_id ?? null,
    idempotency_key: input.idempotency_key ?? null,
    payload: input.payload,
    raw_headers: input.raw_headers ?? null,
    signature_verified: input.signature_verified,
  }];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HARDCODED_TIMEOUT_MS);

  try {
    const res = await fetch(`${cfg.url}/rest/v1/omnibridge_events?on_conflict=source_id,event_id`, {
      method: 'POST',
      headers: {
        'apikey': cfg.serviceKey,
        'Authorization': `Bearer ${cfg.serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=ignore-duplicates',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.ok === false) {
      const text = await res.text().catch(() => '');
      return { ok: false, reason: 'upstream_error', detail: `${res.status} ${text.slice(0, 200)}` };
    }

    const rows = await res.json() as Array<{ id: string }>;
    if (!Array.isArray(rows) || rows.length === 0) {
      // resolution=ignore-duplicates returns [] when the row already existed.
      // We still need the id of the existing row for dispatch linking.
      const lookup = await fetch(
        `${cfg.url}/rest/v1/omnibridge_events?source_id=eq.${encodeURIComponent(input.source_id)}&event_id=eq.${encodeURIComponent(input.event_id)}&select=id`,
        { headers: { 'apikey': cfg.serviceKey, 'Authorization': `Bearer ${cfg.serviceKey}` } },
      );
      if (lookup.ok === false) {
        return { ok: false, reason: 'upstream_error', detail: `duplicate lookup failed: ${lookup.status}` };
      }
      const existing = await lookup.json() as Array<{ id: string }>;
      if (existing[0] === undefined) {
        return { ok: false, reason: 'conflict', detail: 'duplicate with no persisted row' };
      }
      return { ok: true, event_uuid: existing[0].id, duplicate: true };
    }

    return { ok: true, event_uuid: rows[0].id, duplicate: false };
  } catch (e) {
    return { ok: false, reason: 'upstream_error', detail: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Record a dispatch failure to the DLQ. Exponential-backoff next_retry_at
 * computed from retry_count: 30s, 2m, 10m, 1h, 6h, 24h (capped).
 */
const BACKOFF_MINUTES = [0.5, 2, 10, 60, 360, 1440];

export async function recordDispatchFailure(
  input: {
    event_uuid: string;
    target_url: string;
    error_message: string;
    http_status?: number;
    retry_count?: number;
  },
  env?: EventStoreEnv,
): Promise<void> {
  const cfg = readSupabaseConfig(env);
  if (cfg === null) return;

  const retryCount = input.retry_count ?? 0;
  const backoffIdx = Math.min(retryCount, BACKOFF_MINUTES.length - 1);
  const nextRetryAt = new Date(Date.now() + BACKOFF_MINUTES[backoffIdx] * 60_000).toISOString();

  try {
    await fetch(`${cfg.url}/rest/v1/omnibridge_events_dlq`, {
      method: 'POST',
      headers: {
        'apikey': cfg.serviceKey,
        'Authorization': `Bearer ${cfg.serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        event_uuid: input.event_uuid,
        target_url: input.target_url,
        error_message: input.error_message.slice(0, 2000),
        http_status: input.http_status ?? null,
        retry_count: retryCount,
        next_retry_at: nextRetryAt,
        last_attempted_at: new Date().toISOString(),
      }]),
    });
  } catch {
    // Swallow — DLQ is best-effort, primary event row is already durable.
  }
}

/**
 * Mark an event row as dispatched/acknowledged. Best-effort.
 */
export async function updateDispatchState(
  input: {
    event_uuid: string;
    state: 'accepted' | 'normalized' | 'persisted' | 'dispatching' | 'dispatched' | 'acknowledged' | 'dlq' | 'failed_retryable' | 'failed_terminal';
    error?: string;
    attempts_delta?: number;
    dispatch_target?: string;
  },
  env?: EventStoreEnv,
): Promise<void> {
  const cfg = readSupabaseConfig(env);
  if (cfg === null) return;

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = { dispatch_state: input.state };
  if (input.state === 'dispatched') patch.dispatched_at = nowIso;
  if (input.state === 'acknowledged') patch.acknowledged_at = nowIso;
  if (input.error) patch.dispatch_last_error = input.error.slice(0, 2000);
  if (input.dispatch_target) patch.dispatch_target = input.dispatch_target;

  try {
    await fetch(`${cfg.url}/rest/v1/omnibridge_events?id=eq.${encodeURIComponent(input.event_uuid)}`, {
      method: 'PATCH',
      headers: {
        'apikey': cfg.serviceKey,
        'Authorization': `Bearer ${cfg.serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });
  } catch {
    // Swallow — downstream correctness does not depend on state log.
  }
}
