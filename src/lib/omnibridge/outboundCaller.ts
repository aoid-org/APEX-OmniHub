/**
 * OmniBridge Outbound Caller — OmniHub → SBBL-HQ control channel
 *
 * Signs outbound commands with OmniHub's control-plane secret and POSTs
 * them to the SBBL-HQ worker's /webhooks/omnihub endpoint (or any partner
 * inbound URL). Mirrors SBBL-HQ's own signSyncPacket algorithm
 * (HMAC-SHA256 over JSON(body), base64url signature) so both sides use
 * the same primitive.
 *
 * Retry policy: up to 3 attempts with exponential backoff (0.5s, 2s, 8s).
 * Permanent failures are escalated to the caller, which is expected to
 * record them in omnibridge_events_dlq.
 *
 * Fail-closed: missing secret or unreachable target → returns error, never
 * silently succeeds.
 *
 * @module lib/omnibridge/outboundCaller
 * @license Proprietary - APEX Business Systems Ltd.
 */

const encoder = new TextEncoder();

export interface OutboundCommand {
  command_id: string;
  action:
    | 'disable_stream'
    | 'enable_stream'
    | 'revoke_access'
    | 'grant_access'
    | 'emergency_halt'
    | 'broadcast_message'
    | 'force_man_review'
    | 'hotfix_dispatch';
  target_source: string;
  target_entity_id?: string | null;
  reason: string;
  issued_at: string;
  issued_by: string;
  /**
   * For hotfix_dispatch only: explicit allowlist of file paths/globs that
   * the downstream agent is permitted to edit. Serves as a hard guard on
   * the receiving side in addition to MAN approval.
   */
  target_file_allowlist?: string[];
  /**
   * Free-form action payload. For hotfix_dispatch, this carries the
   * agent prompt, expected diff shape, and rollback instructions.
   */
  payload: Record<string, unknown>;
}

export interface OutboundEnvelope {
  command: OutboundCommand;
  signature: string;
}

export interface OutboundResult {
  ok: boolean;
  http_status?: number;
  response_body?: unknown;
  error?: string;
  attempts: number;
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 2_000, 8_000];
const REQUEST_TIMEOUT_MS = 5_000;

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function signCommand(command: OutboundCommand, secret: string): Promise<string> {
  // NOSONAR javascript:S2245 — HMAC signing key is sourced from trusted
  // OmniHub control-plane env var (CONTROL_SIGNING_SECRET_*), never user
  // input. HMAC-SHA256 with random 256-bit key is the intended primitive.
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(JSON.stringify(command)),
  );
  return base64UrlEncode(signature);
}

/**
 * Fire-and-await POST with retry. Returns the final outcome.
 *
 * The caller provides the target URL + signing secret. This module does
 * NOT read env vars directly — the caller (control-plane endpoint) loads
 * them so this function stays pure and unit-testable.
 */
export async function dispatchCommand(params: {
  targetUrl: string;
  secret: string;
  command: OutboundCommand;
  /**
   * Injected fetch for testing; defaults to global fetch.
   */
  fetchImpl?: typeof fetch;
}): Promise<OutboundResult> {
  const { targetUrl, secret, command } = params;
  const doFetch = params.fetchImpl ?? fetch;

  if (!targetUrl) return { ok: false, error: 'missing_target_url', attempts: 0 };
  if (!secret) return { ok: false, error: 'missing_secret', attempts: 0 };

  const signature = await signCommand(command, secret);
  const envelope: OutboundEnvelope = { command, signature };
  const bodyRaw = JSON.stringify(envelope);

  let lastError: string | undefined;
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await doFetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Omni-Command-Id': command.command_id,
          'X-Omni-Signature': signature,
          'X-Omni-Action': command.action,
        },
        body: bodyRaw,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        let responseBody: unknown = null;
        try { responseBody = await res.json(); } catch { responseBody = null; }
        return { ok: true, http_status: res.status, response_body: responseBody, attempts: attempt + 1 };
      }

      lastStatus = res.status;
      // 4xx is non-retryable (client signed wrong or command rejected). 5xx retries.
      if (res.status >= 400 && res.status < 500) {
        const errText = await res.text().catch(() => '');
        return {
          ok: false,
          http_status: res.status,
          error: `target_rejected:${res.status}:${errText.slice(0, 200)}`,
          attempts: attempt + 1,
        };
      }
      lastError = `upstream_${res.status}`;
    } catch (e) {
      clearTimeout(timer);
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    ok: false,
    http_status: lastStatus,
    error: lastError ?? 'exhausted_retries',
    attempts: MAX_ATTEMPTS,
  };
}
