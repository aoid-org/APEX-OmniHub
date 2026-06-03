/**
 * OmniBridge Control Plane — OmniHub → SBBL-HQ override & hotfix authority
 *
 * Privileged endpoint gated by:
 *   (1) Supabase JWT auth (via withHttp requireAuth:true)
 *   (2) RBAC check against user_roles table (super_admin | operator)
 *   (3) Risk-lane classification (GREEN auto-dispatch | RED requires MAN approval | BLOCKED rejected)
 *   (4) Hash-chained audit log (omnibridge_control_audit)
 *
 * Supported actions (see omnibridge_control_action enum):
 *   disable_stream, enable_stream, revoke_access, grant_access,
 *   emergency_halt, broadcast_message, force_man_review, hotfix_dispatch
 *
 * hotfix_dispatch is the highest-risk action: requires a file allowlist,
 * MAN approval, and is ALWAYS routed through RED lane.
 *
 * Operations (POST body.op):
 *   - "issue"  : create a new command (returns dispatched or awaiting_man_approval)
 *   - "approve": second-person approval for a pending RED command (MAN quorum)
 *   - "deny"   : reject a pending RED command
 *   - "list"   : list pending/recent commands (filterable)
 *
 * Deploy: supabase functions deploy omnibridge-control --no-verify-jwt=false
 */

import { withHttp, jsonResponse } from '../_shared/http.ts';
import { createSupabaseClient } from '../_shared/auth.ts';
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from '../_shared/rate-limit.ts';

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'operator']);
const APPROVER_ROLES = new Set(['admin', 'super_admin']);

type Action =
  | 'disable_stream'
  | 'enable_stream'
  | 'revoke_access'
  | 'grant_access'
  | 'emergency_halt'
  | 'broadcast_message'
  | 'force_man_review'
  | 'hotfix_dispatch';

type RiskLane = 'GREEN' | 'YELLOW' | 'RED' | 'BLOCKED';

const RED_ACTIONS = new Set<Action>([
  'emergency_halt',
  'revoke_access',
  'hotfix_dispatch',
  'force_man_review',
]);

const GREEN_ACTIONS = new Set<Action>([
  'broadcast_message',
  'enable_stream',
  'grant_access',
  'disable_stream', // graded: non-production streams are GREEN, live streams RED via payload heuristic
]);

const BLOCKED_PATTERNS: RegExp[] = [
  /drop\s+(table|schema|database)/i,
  /alter\s+role/i,
  /disable\s+rls/i,
  /truncate\s+\w/i,
  /grant\s+all\s+privileges/i,
];

function classifyRiskLane(action: Action, payload: Record<string, unknown>): RiskLane {
  const surface = `${action} ${JSON.stringify(payload)}`;
  if (BLOCKED_PATTERNS.some((p) => p.test(surface))) return 'BLOCKED';
  if (RED_ACTIONS.has(action)) return 'RED';
  if (action === 'disable_stream' && payload['is_live'] === true) return 'RED';
  if (GREEN_ACTIONS.has(action)) return 'GREEN';
  return 'YELLOW';
}

/** Compute SHA-256 hex of a string. */
async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function computeEntryHash(params: {
  prev_hash: string | null;
  command_id: string;
  action: Action;
  target_source: string;
  risk_lane: RiskLane;
  payload: Record<string, unknown>;
  reason: string;
  requested_by: string;
  created_at: string;
}): Promise<string> {
  const canonical = JSON.stringify({
    prev: params.prev_hash ?? '',
    id: params.command_id,
    a: params.action,
    t: params.target_source,
    r: params.risk_lane,
    p: params.payload,
    w: params.reason,
    u: params.requested_by,
    at: params.created_at,
  });
  return sha256Hex(canonical);
}

function generateCommandId(): string {
  return `cmd_${crypto.randomUUID()}`;
}

async function getUserRoles(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  if (error || !data) return [];
  return (data as Array<{ role: string }>).map((r) => r.role);
}

async function getPrevHash(
  supabase: ReturnType<typeof createSupabaseClient>,
): Promise<string | null> {
  const { data } = await supabase
    .from('omnibridge_control_audit')
    .select('entry_hash')
    .order('created_at', { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return null;
  return (data[0] as { entry_hash: string }).entry_hash;
}

interface IssueInput {
  action: Action;
  target_source: string;
  target_entity_id?: string | null;
  reason: string;
  payload: Record<string, unknown>;
  target_file_allowlist?: string[];
}

function validateHotfixAllowlist(b: Record<string, unknown>): string | null {
  const allowlist = b.target_file_allowlist;
  if (!Array.isArray(allowlist) || allowlist.length === 0) {
    return 'hotfix_requires_file_allowlist';
  }
  for (const entry of allowlist) {
    if (typeof entry !== 'string' || entry.length === 0) {
      return 'hotfix_allowlist_entry_invalid';
    }
    if (entry.includes('..')) {
      return 'hotfix_allowlist_path_traversal';
    }
  }
  return null;
}

function validateIssueInput(body: unknown): { ok: true; input: IssueInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid_body' };
  const b = body as Record<string, unknown>;
  const action = b.action;
  const actionList: Action[] = ['disable_stream','enable_stream','revoke_access','grant_access','emergency_halt','broadcast_message','force_man_review','hotfix_dispatch'];
  if (typeof action !== 'string' || !actionList.includes(action as Action)) {
    return { ok: false, error: 'invalid_action' };
  }
  if (typeof b.target_source !== 'string' || b.target_source.length === 0) {
    return { ok: false, error: 'missing_target_source' };
  }
  if (typeof b.reason !== 'string' || b.reason.length < 5) {
    return { ok: false, error: 'reason_too_short' };
  }
  if (!b.payload || typeof b.payload !== 'object' || Array.isArray(b.payload)) {
    return { ok: false, error: 'invalid_payload' };
  }
  if (action === 'hotfix_dispatch') {
    const hotfixErr = validateHotfixAllowlist(b);
    if (hotfixErr) return { ok: false, error: hotfixErr };
  }
  return {
    ok: true,
    input: {
      action: action as Action,
      target_source: b.target_source,
      target_entity_id: typeof b.target_entity_id === 'string' ? b.target_entity_id : null,
      reason: b.reason,
      payload: b.payload as Record<string, unknown>,
      target_file_allowlist: Array.isArray(b.target_file_allowlist) ? (b.target_file_allowlist as string[]) : undefined,
    },
  };
}

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCodePoint(b); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function dispatchApproved(
  supabase: ReturnType<typeof createSupabaseClient>,
  commandId: string,
): Promise<{ ok: boolean; error?: string; response?: unknown; http_status?: number }> {
  const { data: auditRows } = await supabase
    .from('omnibridge_control_audit')
    .select('*')
    .eq('command_id', commandId)
    .limit(1);

  const audit = auditRows?.[0] as
    | {
        command_id: string;
        action: Action;
        target_source: string;
        payload: Record<string, unknown>;
        reason: string;
        target_file_allowlist: string[] | null;
        requested_by: string;
      }
    | undefined;

  if (!audit) return { ok: false, error: 'audit_not_found' };

  const targetUrl = Deno.env.get(`CONTROL_TARGET_URL_${audit.target_source.toUpperCase().replaceAll('-', '_')}`);
  const secret = Deno.env.get(`CONTROL_SIGNING_SECRET_${audit.target_source.toUpperCase().replaceAll('-', '_')}`);

  if (!targetUrl || !secret) {
    return { ok: false, error: 'control_target_not_configured' };
  }

  const command = {
    command_id: audit.command_id,
    action: audit.action,
    target_source: audit.target_source,
    target_entity_id: null,
    reason: audit.reason,
    issued_at: new Date().toISOString(),
    issued_by: audit.requested_by,
    target_file_allowlist: audit.target_file_allowlist ?? undefined,
    payload: audit.payload,
  };

  // Sign using the same HMAC-SHA256 base64url algorithm SBBL-HQ uses for its
  // own signSyncPacket, keeping both directions symmetrical.
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(JSON.stringify(command)),
  );
  const signature = base64UrlFromBytes(new Uint8Array(sigBuf));

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Omni-Command-Id': command.command_id,
      'X-Omni-Signature': signature,
      'X-Omni-Action': command.action,
    },
    body: JSON.stringify({ command, signature }),
  });

  let responseBody: unknown = null;
  try { responseBody = await res.json(); } catch { responseBody = null; }

  await supabase
    .from('omnibridge_control_audit')
    .update({
      state: res.ok ? 'dispatched' : 'failed',
      dispatched_at: new Date().toISOString(),
      response_payload: responseBody,
    })
    .eq('command_id', commandId);

  return { ok: res.ok, response: responseBody, http_status: res.status };
}

async function handleIssue(
  body: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createSupabaseClient>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const validated = validateIssueInput(body);
  if (!validated.ok) {
    return jsonResponse({ error: validated.error }, 400, corsHeaders);
  }
  const { input } = validated;
  const risk = classifyRiskLane(input.action, input.payload);
  if (risk === 'BLOCKED') {
    return jsonResponse({ error: 'blocked_pattern_detected', risk }, 403, corsHeaders);
  }

  const commandId = generateCommandId();
  const createdAt = new Date().toISOString();
  const prevHash = await getPrevHash(supabase);
  const entryHash = await computeEntryHash({
    prev_hash: prevHash,
    command_id: commandId,
    action: input.action,
    target_source: input.target_source,
    risk_lane: risk,
    payload: input.payload,
    reason: input.reason,
    requested_by: userId,
    created_at: createdAt,
  });

  const initialState = risk === 'RED' ? 'awaiting_man_approval' : 'approved';

  const { error: insErr } = await supabase.from('omnibridge_control_audit').insert({
    command_id: commandId,
    target_source: input.target_source,
    action: input.action,
    risk_lane: risk,
    state: initialState,
    requested_by: userId,
    reason: input.reason,
    payload: input.payload,
    target_file_allowlist: input.target_file_allowlist ?? null,
    prev_hash: prevHash,
    entry_hash: entryHash,
    created_at: createdAt,
  });
  if (insErr) {
    return jsonResponse({ error: 'audit_insert_failed', detail: insErr.message }, 500, corsHeaders);
  }

  if (initialState === 'approved') {
    const dispatch = await dispatchApproved(supabase, commandId);
    return jsonResponse({
      command_id: commandId,
      state: dispatch.ok ? 'dispatched' : 'failed',
      risk_lane: risk,
      dispatch,
    }, dispatch.ok ? 200 : 502, corsHeaders);
  }

  return jsonResponse({
    command_id: commandId,
    state: initialState,
    risk_lane: risk,
    message: 'Command recorded. Awaiting second-party MAN approval before dispatch.',
  }, 202, corsHeaders);
}

async function handleApproveOrDeny(
  op: string,
  body: Record<string, unknown>,
  userId: string,
  isApprover: boolean,
  supabase: ReturnType<typeof createSupabaseClient>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (!isApprover) {
    return jsonResponse({ error: 'forbidden', reason: 'not_approver' }, 403, corsHeaders);
  }
  const commandId = body.command_id;
  if (typeof commandId !== 'string' || commandId.length === 0) {
    return jsonResponse({ error: 'missing_command_id' }, 400, corsHeaders);
  }

  const { data: rows } = await supabase
    .from('omnibridge_control_audit')
    .select('command_id, state, requested_by')
    .eq('command_id', commandId)
    .limit(1);

  const current = rows?.[0] as { command_id: string; state: string; requested_by: string } | undefined;
  if (!current) return jsonResponse({ error: 'command_not_found' }, 404, corsHeaders);
  if (current.state !== 'awaiting_man_approval') {
    return jsonResponse({ error: 'invalid_state_transition', current_state: current.state }, 409, corsHeaders);
  }
  // Enforce two-party: approver must be different from requester
  if (current.requested_by === userId) {
    return jsonResponse({ error: 'two_party_required', detail: 'approver cannot be requester' }, 403, corsHeaders);
  }

  if (op === 'deny') {
    await supabase
      .from('omnibridge_control_audit')
      .update({ state: 'denied', approved_by: userId, approved_at: new Date().toISOString() })
      .eq('command_id', commandId);
    return jsonResponse({ command_id: commandId, state: 'denied' }, 200, corsHeaders);
  }

  await supabase
    .from('omnibridge_control_audit')
    .update({ state: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
    .eq('command_id', commandId);

  const dispatch = await dispatchApproved(supabase, commandId);
  return jsonResponse({
    command_id: commandId,
    state: dispatch.ok ? 'dispatched' : 'failed',
    dispatch,
  }, dispatch.ok ? 200 : 502, corsHeaders);
}

async function handleList(
  body: Record<string, unknown>,
  supabase: ReturnType<typeof createSupabaseClient>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const stateFilter = body.state;
  let query = supabase.from('omnibridge_control_audit').select('*').order('created_at', { ascending: false }).limit(100);
  if (typeof stateFilter === 'string') query = query.eq('state', stateFilter);
  const { data, error } = await query;
  if (error) return jsonResponse({ error: 'list_failed', detail: error.message }, 500, corsHeaders);
  return jsonResponse({ commands: data ?? [] }, 200, corsHeaders);
}

export default Deno.serve(withHttp(async (req, ctx) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, ctx.corsHeaders);
  }
  const body = ctx.body as { op?: unknown } | null;
  if (!body || typeof body !== 'object' || typeof body.op !== 'string') {
    return jsonResponse({ error: 'missing_op' }, 400, ctx.corsHeaders);
  }

  const userId = ctx.user!.id;

  // Distributed rate limiting — per authenticated user, before any business logic
  const rl = await checkRateLimit(userId, RATE_LIMIT_CONFIGS.omnibridgeControl);
  if (!rl.allowed) {
    return rateLimitExceededResponse(req.headers.get('origin'), rl);
  }

  const supabase = createSupabaseClient();
  const roles = await getUserRoles(supabase, userId);
  const isAdmin = roles.some((r) => ADMIN_ROLES.has(r));
  const isApprover = roles.some((r) => APPROVER_ROLES.has(r));

  if (!isAdmin) {
    return jsonResponse({ error: 'forbidden', reason: 'insufficient_role' }, 403, ctx.corsHeaders);
  }

  const op = body.op;
  const bodyRecord = body as Record<string, unknown>;

  if (op === 'issue') return handleIssue(bodyRecord, userId, supabase, ctx.corsHeaders);
  if (op === 'approve' || op === 'deny') return handleApproveOrDeny(op, bodyRecord, userId, isApprover, supabase, ctx.corsHeaders);
  if (op === 'list') return handleList(bodyRecord, supabase, ctx.corsHeaders);

  return jsonResponse({ error: 'unknown_op', op }, 400, ctx.corsHeaders);
}, { requireAuth: true, maxBodySizeBytes: 512 * 1024 }));
