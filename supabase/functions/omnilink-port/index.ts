import { encodeBase64Url } from 'https://deno.land/std@0.224.0/encoding/base64url.ts';
import { buildCorsHeaders, corsErrorResponse, handlePreflight, isOriginAllowed } from '../_shared/cors.ts';
import { allowAdapter, allowWorkflow, enforceEnvAllowlist, enforcePermission, type OmniLinkScopes } from '../_shared/omnilinkScopes.ts';
import { createAnonClient, createServiceClient } from '../_shared/supabaseClient.ts';
import { normalizeOmniPortIntent, type SOmniPortInput } from '../_shared/omniport-normalize.ts';
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from '../_shared/rate-limit.ts';

// ── Constants ─────────────────────────────────────────────────────────────────

const OMNILINK_ENABLED = (Deno.env.get('OMNILINK_ENABLED') ?? '').toLowerCase() === 'true';
const MAX_SINGLE_PAYLOAD_BYTES = 256 * 1024;
const MAX_BATCH_PAYLOAD_BYTES = 1024 * 1024;
const MAX_BATCH_ITEMS = 50;
const DEFAULT_MAX_CONCURRENCY = 5;

const inflight = new Map<string, number>();
const textEncoder = new TextEncoder();

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiKeyRecord {
  id: string;
  tenant_id: string;
  integration_id: string;
  key_hash: string;
  key_prefix: string;
  scopes: OmniLinkScopes;
  integrations?: { status: string } | { status: string }[];
}

/** Canonical response shape for every module-state call */
interface ModuleStateResponse {
  State: string;
  items: unknown[];
  actions: string[];
  count: number;
  message?: string;
}

// ── Utility helpers ───────────────────────────────────────────────────────────

function parseBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  return authHeader.replace('Bearer ', '').trim();
}

function parseRoute(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const portIndex = segments.indexOf('omnilink-port');
  if (portIndex === -1) return '';
  return segments.slice(portIndex + 1).join('/');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

async function hashKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function generateKey(): { secret: string; key: string; prefix: string } {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const secret = encodeBase64Url(raw);
  const prefix = secret.slice(0, 8);
  return { secret, prefix, key: `omni.${prefix}.${secret}` };
}

function getConstraints(scopes: OmniLinkScopes): Required<NonNullable<OmniLinkScopes['constraints']>> {
  return {
    env_allowlist: scopes.constraints?.env_allowlist ?? [],
    max_rpm: scopes.constraints?.max_rpm ?? 60,
    max_concurrency: scopes.constraints?.max_concurrency ?? DEFAULT_MAX_CONCURRENCY,
    max_payload_kb: scopes.constraints?.max_payload_kb ?? 256,
    allowed_adapters: scopes.constraints?.allowed_adapters ?? [],
    allowed_workflows: scopes.constraints?.allowed_workflows ?? [],
    approvals_required_for: scopes.constraints?.approvals_required_for ?? [],
  };
}

async function enforceConcurrency(keyId: string, limit: number): Promise<boolean> {
  const current = inflight.get(keyId) ?? 0;
  if (current >= limit) return false;
  inflight.set(keyId, current + 1);
  return true;
}

function releaseConcurrency(keyId: string): void {
  const current = inflight.get(keyId) ?? 0;
  if (current <= 1) {
    inflight.delete(keyId);
  } else {
    inflight.set(keyId, current - 1);
  }
}

async function loadApiKey(token: string, supabase = createServiceClient()): Promise<ApiKeyRecord | null> {
  const parts = token.split('.');
  if (parts.length < 3 || parts[0] !== 'omni') return null;
  const prefix = parts[1];
  const { data, error } = await supabase
    .from('omnilink_api_keys')
    .select('id, tenant_id, integration_id, key_hash, key_prefix, scopes, integrations(status)')
    .eq('key_prefix', prefix)
    .is('revoked_at', null);

  if (error || !data?.length) return null;
  const hashed = await hashKey(token);
  const hashedBytes = hexToBytes(hashed);

  for (const record of data as ApiKeyRecord[]) {
    const recordBytes = hexToBytes(record.key_hash);
    if (timingSafeEqual(recordBytes, hashedBytes)) {
      const integration = Array.isArray(record.integrations) ? record.integrations[0] : record.integrations;
      if (integration?.status && integration.status !== 'active') {
        return null;
      }
      await supabase
        .from('omnilink_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', record.id);
      return record;
    }
  }
  return null;
}

function validateEnvelope(payload: Record<string, unknown>, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!payload[field]) return field;
  }
  return null;
}

async function parseJsonBody(req: Request): Promise<{ raw: string; body: unknown }> {
  const buffer = await req.arrayBuffer();
  const raw = new TextDecoder().decode(buffer);
  return { raw, body: raw ? JSON.parse(raw) : null };
}

function getRequestSize(raw: string): number {
  return textEncoder.encode(raw).length;
}

function resolvePayloadId(payload: Record<string, unknown>, fallbackIndex: number): string {
  const candidate = payload.id;
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return String(candidate);
  }
  return String(fallbackIndex);
}

function jsonResponse(data: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

// ── Module-state resolvers ────────────────────────────────────────────────────
//
// ALL resolvers use the user-JWT client (anonClient) so Postgres RLS enforces
// tenant isolation automatically — no manual user_id filter is ever passed.
//
// VERIFIED table map (cross-referenced against supabase/migrations/):
//   audits      → audit_logs          (actor_id = auth.uid() via RLS)
//   links       → integrations        (user_id  = auth.uid() via RLS)
//   automations → automations         (user_id  = auth.uid() via RLS)
//   workflows   → workflows + workflow_runs  (confirmed 20260220000003)
//   files       → Storage bucket 'omnihub-files' (NO SQL TABLE — path: {userId}/)
//   billing     → subscriptions       (user_id  = auth.uid() via RLS)
//   settings    → omnidash_settings   (user_id  = auth.uid() via RLS)
//   physiomni   → physiomni_devices   (tenant_id = auth.uid() via RLS)
//   omnitrace   → omnitrace_events    (user_id  = auth.uid() via RLS)
//   agent       → agent_sessions      (user_id  = auth.uid() via RLS)
//   dashboard   → omnidash_kpi_daily + omnidash_incidents
//   omniskills  → skillforge_entitlements (graceful fallback if absent)
//   integrations→ connector_sessions  (tenant_id::text = auth.uid()::text via RLS)

function fallbackState(_moduleKey: string): ModuleStateResponse {
  return { State: 'Online', items: [], actions: [], count: 0 };
}

async function resolveAudits(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Table: audit_logs — RLS policy: actor_id = auth.uid()
  const { data, error } = await anonClient
    .from('audit_logs')
    .select('id, action_type, resource_type, resource_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error('audit_query_failed');

  const rows = (data ?? []) as Array<{
    id: string;
    action_type: string;
    resource_type: string | null;
    resource_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>;

  return {
    State: 'Online',
    items: rows.map((r) => ({
      id: r.id,
      action: r.action_type,
      resource: r.resource_type ?? 'unknown',
      resource_id: r.resource_id,
      metadata: r.metadata,
      at: r.created_at,
    })),
    actions: ['export-audit', 'run-compliance'],
    count: rows.length,
  };
}

function resolveLinks(
  _anonClient: ReturnType<typeof createAnonClient>
): ModuleStateResponse {
  // Links collect URLs/reference sources for OmniSlate & agent context — they
  // are NOT app integrations. There is intentionally no link-context
  // persistence table yet (no migration is created here; that is gated on JR
  // approval), so reading the integrations table would hydrate Links as app
  // integrations and is forbidden. We return an honest, empty link-context
  // state with safe actions only — no integration-only verbs. add-link and
  // send-to-omnislate are handled locally in LinksModule and never dispatched
  // to trigger-workflow.
  return {
    State: 'Online',
    items: [],
    actions: ['add-link', 'send-to-omnislate'],
    count: 0,
  };
}

async function resolveAutomations(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Table: automations — RLS policy: user_id = auth.uid()
  const { data, error } = await anonClient
    .from('automations')
    .select('id, name, trigger_type, action_type, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw new Error('automations_query_failed');

  const autos = (data ?? []) as Array<{
    id: string;
    name: string;
    trigger_type: string;
    action_type: string;
    is_active: boolean;
    created_at: string;
  }>;

  return {
    State: 'Online',
    items: autos.map((a) => ({
      id: a.id,
      name: a.name,
      trigger: a.trigger_type,
      action: a.action_type,
      active: a.is_active,
      created_at: a.created_at,
    })),
    actions: ['create-automation', 'view-logs'],
    count: autos.length,
  };
}

async function resolveWorkflows(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Tables: workflows (definitions) + workflow_runs (execution state)
  // Both confirmed in 20260220000003_workflow_studio.sql
  // RLS policy on each: user_id = auth.uid()
  const [wfRes, runRes] = await Promise.allSettled([
    anonClient
      .from('workflows')
      .select('id, name, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    anonClient
      .from('workflow_runs')
      .select('id, workflow_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (wfRes.status === 'rejected' || runRes.status === 'rejected') {
    return { State: 'Error', message: 'Failed to load workflow data', items: [], actions: [], count: 0 };
  }

  const defs = (wfRes.value.data ?? []) as Array<{
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
  }>;

  const runs = (runRes.value.data ?? []) as Array<{
    id: string;
    workflow_id: string;
    status: string;
    created_at: string;
  }>;

  return {
    State: 'Online',
    items: defs.map((w) => ({
      ...w,
      recentRun: runs.find((r) => r.workflow_id === w.id) ?? null,
    })),
    actions: ['create_workflow', 'trigger_run'],
    count: defs.length,
  };
}

async function resolveFiles(
  anonClient: ReturnType<typeof createAnonClient>,
  userId: string
): Promise<ModuleStateResponse> {
  // NO SQL TABLE — files live in Supabase Storage bucket 'omnihub-files'.
  // Path prefix = {userId}/ — Storage RLS policy (20260531000002) enforces
  // that the authenticated user can only list their own prefix.
  const { data, error } = await anonClient.storage
    .from('omnihub-files')
    .list(userId, {
      limit: 50,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    return { State: 'Error', message: 'Storage unavailable', items: [], actions: [], count: 0 };
  }

  const files = (data ?? []) as Array<{
    name: string;
    created_at: string;
    updated_at: string;
    last_accessed_at: string;
    metadata: Record<string, unknown> | null;
  }>;

  return {
    State: 'Online',
    items: files.map((f) => ({
      name: f.name,
      size: (f.metadata?.size as number | undefined) ?? 0,
      mime: (f.metadata?.mimetype as string | undefined) ?? null,
      created_at: f.created_at,
    })),
    actions: ['upload_file', 'delete_file'],
    count: files.length,
  };
}

async function resolveBilling(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Table: subscriptions — RLS policy: user_id = auth.uid()
  const { data, error } = await anonClient
    .from('subscriptions')
    .select('id, tier, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, trial_end')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error('billing_query_failed');

  const sub = data as {
    id: string;
    tier: string;
    status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_end: string | null;
  } | null;

  const items = sub ? [
    {
      id: sub.id,
      tier: sub.tier,
      status: sub.status,
      period_end: sub.current_period_end,
      trial_end: sub.trial_end,
    },
  ] : [];

  return {
    State: sub ? 'Online' : 'NoSubscription',
    items,
    actions: ['manage-plan', 'billing-portal'],
    count: items.length,
  };
}

async function resolveSettings(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Table: omnidash_settings — RLS policy: user_id = auth.uid()
  const { data, error } = await anonClient
    .from('omnidash_settings')
    .select('demo_mode, anonymize_kpis, freeze_mode, show_connected_ecosystem, updated_at')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error('settings_query_failed');

  const s = data as {
    demo_mode: boolean;
    anonymize_kpis: boolean;
    freeze_mode: boolean;
    show_connected_ecosystem: boolean;
    updated_at: string;
  } | null;

  // Defaults from migration 20260205000001: demo_mode=false, anonymize_kpis=true,
  // freeze_mode=false, show_connected_ecosystem=false.
  const SETTINGS_LABELS: Record<string, string> = {
    demo_mode:                'Demo Mode',
    anonymize_kpis:           'Anonymize KPIs',
    freeze_mode:              'Freeze Mode',
    show_connected_ecosystem: 'Show Connected Ecosystem',
  };
  const items = s ? [
    { id: 'demo_mode',                label: SETTINGS_LABELS['demo_mode'],                status: s.demo_mode                ? 'active' : 'inactive' },
    { id: 'anonymize_kpis',           label: SETTINGS_LABELS['anonymize_kpis'],           status: s.anonymize_kpis           ? 'active' : 'inactive' },
    { id: 'freeze_mode',              label: SETTINGS_LABELS['freeze_mode'],              status: s.freeze_mode              ? 'active' : 'inactive' },
    { id: 'show_connected_ecosystem', label: SETTINGS_LABELS['show_connected_ecosystem'], status: s.show_connected_ecosystem ? 'active' : 'inactive' },
  ] : [];

  return {
    State: 'Online',
    items,
    actions: ['save-settings', 'reset-defaults'],
    count: items.length,
  };
}

async function resolvePhysioMni(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Table: physiomni_devices — RLS policy: tenant_id = auth.uid()
  const { data, error } = await anonClient
    .from('physiomni_devices')
    .select('id, device_serial, device_name, firmware_version, is_active, last_seen_at, location_tag')
    .order('last_seen_at', { ascending: false })
    .limit(20);

  if (error) throw new Error('physiomni_query_failed');

  const rows = (data ?? []) as Array<{
    id: string;
    device_serial: string;
    device_name: string | null;
    firmware_version: string | null;
    is_active: boolean;
    last_seen_at: string | null;
    location_tag: string | null;
  }>;

  return {
    State: 'Online',
    items: rows.map((d) => ({
      id: d.id,
      serial: d.device_serial,
      name: d.device_name,
      firmware: d.firmware_version,
      active: d.is_active,
      last_seen: d.last_seen_at,
      location: d.location_tag,
    })),
    actions: ['provision-device', 'export-telemetry'],
    count: rows.length,
  };
}

async function resolveOmniTrace(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Table: omnitrace_events — RLS policy: user_id = auth.uid()
  const { data, error } = await anonClient
    .from('omnitrace_events')
    .select('id, event_type, event_text, severity, color_token, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw new Error('omnitrace_query_failed');

  const events = (data ?? []) as Array<{
    id: string;
    event_type: string;
    event_text: string;
    severity: string;
    color_token: string;
    created_at: string;
  }>;

  return {
    State: 'Online',
    items: events.map((e) => ({
      id: e.id,
      type: e.event_type,
      text: e.event_text,
      severity: e.severity,
      color: e.color_token,
      at: e.created_at,
    })),
    actions: ['search-traces', 'export-spans'],
    count: events.length,
  };
}

async function resolveAgent(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Table: agent_sessions — RLS policy: user_id = auth.uid()
  const { data, error } = await anonClient
    .from('agent_sessions')
    .select('id, status, started_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) throw new Error('agent_query_failed');

  const rows = (data ?? []) as Array<{
    id: string;
    status: string;
    started_at: string;
    updated_at: string;
  }>;

  return {
    State: 'Online',
    items: rows.map((s) => ({
      id: s.id,
      status: s.status,
      started_at: s.started_at,
      updated_at: s.updated_at,
    })),
    actions: ['new-session', 'view-history'],
    count: rows.length,
  };
}

async function resolveDashboard(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Tables: omnidash_kpi_daily + omnidash_incidents — both RLS on user_id
  const [kpiRes, incidentRes] = await Promise.allSettled([
    anonClient
      .from('omnidash_kpi_daily')
      .select('tradeline_paid_starts, tradeline_active_pilots, ops_sev1_incidents')
      .order('day', { ascending: false })
      .limit(1)
      .maybeSingle(),
    anonClient
      .from('omnidash_incidents')
      .select('id, severity, status, title, occurred_at')
      .eq('status', 'open')
      .limit(5),
  ]);

  const kpi = (kpiRes.status === 'fulfilled' ? kpiRes.value.data : null) as {
    tradeline_paid_starts: number | null;
    tradeline_active_pilots: number | null;
    ops_sev1_incidents: number | null;
  } | null;

  const incidents = (incidentRes.status === 'fulfilled' ? incidentRes.value.data ?? [] : []) as Array<{
    id: string;
    severity: string;
    status: string;
    title: string;
    occurred_at: string;
  }>;

  const items = [
    { metric: 'paid_starts', value: kpi?.tradeline_paid_starts ?? 0 },
    { metric: 'active_pilots', value: kpi?.tradeline_active_pilots ?? 0 },
    { metric: 'sev1_incidents', value: kpi?.ops_sev1_incidents ?? 0 },
    ...incidents.map((i) => ({
      id: i.id,
      type: 'incident',
      severity: i.severity,
      title: i.title,
      occurred_at: i.occurred_at,
    })),
  ];

  return {
    State: 'Online',
    items,
    actions: [],
    count: items.length,
  };
}

async function resolveOmniSkills(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Table: skillforge_entitlements — graceful fallback if table absent
  try {
    const { data } = await anonClient
      .from('skillforge_entitlements')
      .select('tier, free_skills_used, free_skills_limit, total_skills_created')
      .limit(1)
      .maybeSingle();

    const e = data as {
      tier: string;
      free_skills_used: number;
      free_skills_limit: number;
      total_skills_created: number;
    } | null;

    return {
      State: 'Online',
      items: e ? [
        { key: 'tier', value: e.tier },
        { key: 'used', value: e.free_skills_used },
        { key: 'limit', value: e.free_skills_limit },
        { key: 'total', value: e.total_skills_created },
      ] : [],
      actions: ['forge-skill', 'manage-bundles'],
      count: e ? e.total_skills_created : 0,
    };
  } catch {
    return { State: 'Online', items: [], actions: ['forge-skill'], count: 0 };
  }
}

async function resolveIntegrations(
  anonClient: ReturnType<typeof createAnonClient>
): Promise<ModuleStateResponse> {
  // Table: connector_sessions — RLS policy: tenant_id = auth.uid()::text
  const { data, error } = await anonClient
    .from('connector_sessions')
    .select('id, connector_id, provider, scopes, last_sync_at, created_at')
    .order('last_sync_at', { ascending: false })
    .limit(10);

  if (error) throw new Error('integrations_query_failed');

  const rows = (data ?? []) as Array<{
    id: string;
    connector_id: string;
    provider: string;
    scopes: string[];
    last_sync_at: string | null;
    created_at: string;
  }>;

  return {
    State: 'Online',
    items: rows.map((c) => ({
      id: c.id,
      connector: c.connector_id,
      provider: c.provider,
      scopes: c.scopes,
      last_sync: c.last_sync_at,
    })),
    actions: ['add-integration', 'sync-all'],
    count: rows.length,
  };
}

// ── Module router ─────────────────────────────────────────────────────────────

async function resolveModuleState(
  moduleKey: string,
  authHeader: string,
  userId: string
): Promise<ModuleStateResponse> {
  // All data queries use the user-JWT client so RLS enforces tenant isolation.
  // Service role key is NEVER used for data reads here.
  const anonClient = createAnonClient(authHeader);

  switch (moduleKey) {
    case 'audits':       return await resolveAudits(anonClient);
    case 'links':        return await resolveLinks(anonClient);
    case 'automations':  return await resolveAutomations(anonClient);
    case 'workflows':    return await resolveWorkflows(anonClient);
    case 'files':        return await resolveFiles(anonClient, userId);
    case 'billing':      return await resolveBilling(anonClient);
    case 'settings':     return await resolveSettings(anonClient);
    case 'physiomni':    return await resolvePhysioMni(anonClient);
    case 'omnitrace':    return await resolveOmniTrace(anonClient);
    case 'agent':        return await resolveAgent(anonClient);
    case 'dashboard':    return await resolveDashboard(anonClient);
    case 'omniskills':   return await resolveOmniSkills(anonClient);
    case 'integrations': return await resolveIntegrations(anonClient);
    default:             return fallbackState(moduleKey);
  }
}

// ── Module-state handler ──────────────────────────────────────────────────────

async function handleModuleState(req: Request, corsHeaders: HeadersInit): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);

  // Resolve user to validate JWT (don't pass uid manually — RLS handles it)
  const userClient = createAnonClient(authHeader);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);

  // API-key path: check omnilink key, verify module_state:read permission
  const token = authHeader.replace('Bearer ', '').trim();
  const apiKey = await loadApiKey(token);
  if (apiKey && !enforcePermission(apiKey.scopes ?? {}, 'module_state:read')) {
    return jsonResponse({ error: 'permission_denied' }, 403, corsHeaders);
  }

  const { body } = await parseJsonBody(req).catch(() => ({ body: null, raw: '' }));
  const payload = (body ?? {}) as Record<string, unknown>;
  const moduleKey = payload.module_key as string | undefined;
  if (!moduleKey) return jsonResponse({ error: 'module_key_required' }, 400, corsHeaders);

  try {
    // Pass user.id so file resolver can scope storage list to the correct prefix
    const data = await resolveModuleState(moduleKey, authHeader, user.id);
    return jsonResponse(data, 200, corsHeaders);
  } catch (err) {
    // Sanitize — never leak raw DB errors to the client
    const sanitized = err instanceof Error ? err.message : 'module_error';
    return jsonResponse({ State: 'Error', message: sanitized, items: [], actions: [], count: 0 }, 500, corsHeaders);
  }
}

// ── API key management handlers ───────────────────────────────────────────────

async function handleKeyCreation(req: Request, corsHeaders: HeadersInit): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);
  }

  const serviceClient = createServiceClient();
  const userClient = createAnonClient(authHeader);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);
  }

  const { data: roles } = await serviceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .limit(1);

  if (!roles?.length) {
    return jsonResponse({ error: 'forbidden' }, 403, corsHeaders);
  }

  const { body } = await parseJsonBody(req);
  const payload = body as Record<string, unknown>;
  const integrationId = payload?.integration_id as string | undefined;
  if (!integrationId) {
    return jsonResponse({ error: 'invalid_request', message: 'integration_id is required' }, 400, corsHeaders);
  }

  const { key, prefix } = generateKey();
  const keyHash = await hashKey(key);
  const scopes = payload?.scopes ?? {};

  const { error } = await serviceClient
    .from('omnilink_api_keys')
    .insert({
      tenant_id: user.id,
      integration_id: integrationId,
      name: payload?.name ?? null,
      key_prefix: prefix,
      key_hash: keyHash,
      scopes,
    });

  if (error) {
    return jsonResponse({ error: 'server_error', message: error instanceof Error ? error.message : String(error) }, 500, corsHeaders);
  }

  return jsonResponse(
    {
      status: 'created',
      key,
      key_prefix: prefix,
      warning: 'This key is shown once. Store it securely.',
    },
    201,
    corsHeaders
  );
}

async function handleKeyList(req: Request, corsHeaders: HeadersInit): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);
  const userClient = createAnonClient(authHeader);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('omnilink_api_keys')
    .select('id, name, key_prefix, created_at, expires_at, scopes, revoked_at, last_used_at, integration_id')
    .eq('tenant_id', user.id);

  if (error) return jsonResponse({ error: 'server_error' }, 500, corsHeaders);
  return jsonResponse({ keys: data }, 200, corsHeaders);
}

async function handleKeyRevoke(req: Request, corsHeaders: HeadersInit): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);
  const userClient = createAnonClient(authHeader);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);

  const { body } = await parseJsonBody(req).catch(() => ({ body: null, raw: '' }));
  const payload = (body ?? {}) as Record<string, unknown>;
  const keyId = payload.key_id as string | undefined;
  if (!keyId) return jsonResponse({ error: 'key_id_required' }, 400, corsHeaders);

  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from('omnilink_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('tenant_id', user.id);

  if (error) return jsonResponse({ error: 'server_error' }, 500, corsHeaders);
  return jsonResponse({ status: 'revoked' }, 200, corsHeaders);
}

async function handleKeyRotate(req: Request, corsHeaders: HeadersInit): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);
  const userClient = createAnonClient(authHeader);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);

  const { body } = await parseJsonBody(req).catch(() => ({ body: null, raw: '' }));
  const payload = (body ?? {}) as Record<string, unknown>;
  const keyId = payload.key_id as string | undefined;
  if (!keyId) return jsonResponse({ error: 'key_id_required' }, 400, corsHeaders);

  const serviceClient = createServiceClient();
  const { data: existing, error: fetchErr } = await serviceClient
    .from('omnilink_api_keys')
    .select('*')
    .eq('id', keyId)
    .eq('tenant_id', user.id)
    .single();

  if (fetchErr || !existing) return jsonResponse({ error: 'key_not_found' }, 404, corsHeaders);

  const { key, prefix } = generateKey();
  const keyHash = await hashKey(key);

  const { error: insertErr } = await serviceClient
    .from('omnilink_api_keys')
    .insert({
      tenant_id: existing.tenant_id,
      integration_id: existing.integration_id,
      name: existing.name ? `${existing.name} (Rotated)` : null,
      key_prefix: prefix,
      key_hash: keyHash,
      scopes: existing.scopes,
    });

  if (insertErr) return jsonResponse({ error: 'server_error' }, 500, corsHeaders);

  await serviceClient
    .from('omnilink_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId);

  return jsonResponse({ status: 'rotated', key, key_prefix: prefix }, 201, corsHeaders);
}

// ── Batch event / orchestration handlers ─────────────────────────────────────

interface ProcessItemContext {
  route: string;
  apiKey: ApiKeyRecord;
  constraints: Required<NonNullable<OmniLinkScopes['constraints']>>;
  idempotencyHeader: string;
  serviceClient: ReturnType<typeof createServiceClient>;
}

function getRequiredFields(route: string): string[] {
  if (route === 'events') {
    return ['specversion', 'id', 'source', 'type', 'time', 'data'];
  } else if (route === 'commands') {
    return ['specversion', 'id', 'source', 'type', 'time', 'params'];
  } else if (route === 'tasks') {
    return ['specversion', 'id', 'source', 'type', 'time', 'params'];
  }
  return ['specversion', 'id', 'source', 'type', 'time', 'workflow', 'input'];
}

function validatePermissions(
  route: string,
  payload: Record<string, unknown>,
  apiKey: ApiKeyRecord,
  constraints: Required<NonNullable<OmniLinkScopes['constraints']>>
): { valid: boolean; error?: string; permission?: string; requestType?: string } {
  let permissionRequired = 'events:write';
  let requestType = 'event';

  if (route === 'commands') {
    requestType = 'command';
    permissionRequired = `commands:${payload.type}`;
    if (!allowAdapter(payload.target as { system?: string }, constraints.allowed_adapters)) {
      return { valid: false, error: 'adapter_not_allowed' };
    }
    if (!enforcePermission(apiKey.scopes ?? {}, 'orchestrations:request')) {
      return { valid: false, error: 'permission_denied' };
    }
  }

  if (route === 'tasks') {
    requestType = 'task';
    permissionRequired = 'tasks:create';
    if (!enforcePermission(apiKey.scopes ?? {}, permissionRequired)) {
      return { valid: false, error: 'permission_denied' };
    }
  }

  if (route === 'workflows') {
    requestType = 'workflow';
    permissionRequired = 'orchestrations:request';
    const workflow = payload.workflow as { name?: string; version?: string };
    if (!allowWorkflow(workflow, constraints.allowed_workflows)) {
      return { valid: false, error: 'workflow_not_allowed' };
    }
  }

  if (!enforcePermission(apiKey.scopes ?? {}, permissionRequired)) {
    return { valid: false, error: 'permission_denied' };
  }

  return { valid: true, permission: permissionRequired, requestType };
}

async function processRequestItem(
  item: unknown,
  index: number,
  context: ProcessItemContext
): Promise<Record<string, unknown>> {
  const { route, apiKey, constraints, idempotencyHeader, serviceClient } = context;

  const payload = item as Record<string, unknown>;
  if (!payload || typeof payload !== 'object') {
    return { status: 'invalid', index, error: 'invalid_payload' };
  }

  const requiredFields = getRequiredFields(route);
  const missingField = validateEnvelope(payload, requiredFields);
  if (missingField) {
    return { status: 'invalid', index, error: `missing_${missingField}` };
  }

  if (!enforceEnvAllowlist(payload.source as string, constraints.env_allowlist)) {
    return { status: 'denied', index, error: 'env_not_allowed' };
  }

  const permissionResult = validatePermissions(route, payload, apiKey, constraints);
  if (!permissionResult.valid) {
    return { status: 'denied', index, error: permissionResult.error };
  }

  if (route === 'workflows' && payload.input && !payload.params) {
    payload.params = payload.input;
  }

  if (constraints.approvals_required_for.includes(payload.type as string)) {
    payload.policy = { ...(payload.policy as Record<string, unknown>), require_approval: true };
  }

  const idempotencyKey = `${idempotencyHeader}:${resolvePayloadId(payload, index)}`;

  const { data, error } = await serviceClient.rpc('omnilink_ingest', {
    p_api_key_id: apiKey.id,
    p_integration_id: apiKey.integration_id,
    p_tenant_id: apiKey.tenant_id,
    p_request_type: permissionResult.requestType ?? 'event',
    p_envelope: payload,
    p_idempotency_key: idempotencyKey,
    p_max_rpm: constraints.max_rpm,
    p_entity: payload.entity ?? null,
  });

  if (error) {
    return { status: 'error', index, error: error instanceof Error ? error.message : String(error) };
  }

  return { status: data.status, record_id: data.record_id, index, retry_after_seconds: data.retry_after_seconds };
}

function omniPortEnvelope(input: SOmniPortInput): Record<string, unknown> {
  const canonical = normalizeOmniPortIntent(input);
  const source = `omniport/${canonical.channel}`;
  const base = {
    specversion: '1.0',
    id: canonical.traceId,
    source,
    type: canonical.type,
    time: canonical.createdAt,
    data: {
      payload: canonical.payload,
      channel: canonical.channel,
      requires_approval: canonical.requiresApproval,
      notify: canonical.notify,
      user_id: canonical.userId ?? null,
      raw: canonical.raw,
    },
  } as Record<string, unknown>;

  if (canonical.requiresApproval) {
    base.policy = { ...(base.policy as Record<string, unknown>), require_approval: true };
  }

  return base;
}

function determineStatusCode(results: Record<string, unknown>[]): number {
  const hasQueued = results.some((result) => result.status === 'queued');
  const hasRateLimited = results.some((result) => result.status === 'rate_limited');
  const singleResult = results.length === 1 ? results[0] : null;

  let statusCode = hasQueued ? 202 : 200;
  if (singleResult?.status === 'denied') statusCode = 403;
  if (singleResult?.status === 'invalid') statusCode = 400;
  if (singleResult?.status === 'error') statusCode = 500;
  if (singleResult?.status === 'rate_limited') statusCode = 429;
  if (!singleResult && hasRateLimited && !hasQueued) statusCode = 429;

  return statusCode;
}

async function authenticateRequest(
  req: Request,
  corsHeaders: HeadersInit
): Promise<{ apiKey: ApiKeyRecord; idempotencyHeader: string } | Response> {
  const token = parseBearerToken(req);
  if (!token) {
    return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);
  }

  const apiKey = await loadApiKey(token);
  if (!apiKey) {
    return jsonResponse({ error: 'invalid_key' }, 401, corsHeaders);
  }

  const idempotencyHeader = req.headers.get('X-Idempotency-Key');
  if (!idempotencyHeader) {
    return jsonResponse({ error: 'missing_idempotency_key' }, 400, corsHeaders);
  }

  return { apiKey, idempotencyHeader };
}

async function validatePayload(
  req: Request,
  constraints: Required<NonNullable<OmniLinkScopes['constraints']>>,
  corsHeaders: HeadersInit
): Promise<{ items: unknown[]; requestSize: number } | Response> {
  const parsedBody = await parseJsonBody(req).catch(() => null);
  if (!parsedBody) {
    return jsonResponse({ error: 'invalid_json' }, 400, corsHeaders);
  }
  const { raw, body } = parsedBody;
  const payloadSize = getRequestSize(raw);

  if (payloadSize > constraints.max_payload_kb * 1024) {
    return jsonResponse({ error: 'payload_too_large' }, 413, corsHeaders);
  }

  if (!Array.isArray(body) && payloadSize > MAX_SINGLE_PAYLOAD_BYTES) {
    return jsonResponse({ error: 'payload_too_large', max_bytes: MAX_SINGLE_PAYLOAD_BYTES }, 413, corsHeaders);
  }

  if (payloadSize > MAX_BATCH_PAYLOAD_BYTES) {
    return jsonResponse({ error: 'batch_too_large' }, 413, corsHeaders);
  }

  const items = Array.isArray(body) ? body : [body];
  if (items.length > MAX_BATCH_ITEMS) {
    return jsonResponse({ error: 'batch_too_large', max_items: MAX_BATCH_ITEMS }, 413, corsHeaders);
  }

  return { items, requestSize: payloadSize };
}

// ── Task dispatch handlers ────────────────────────────────────────────────────

async function handleTaskClaim(req: Request, corsHeaders: HeadersInit): Promise<Response> {
  const authResult = await authenticateRequest(req, corsHeaders);
  if ('status' in authResult) return authResult;
  const { apiKey } = authResult;

  if (!enforcePermission(apiKey.scopes ?? {}, 'tasks:claim')) {
    return jsonResponse({ error: 'permission_denied' }, 403, corsHeaders);
  }

  const { body } = await parseJsonBody(req).catch(() => ({ body: null, raw: '' }));
  const payload = (body ?? {}) as Record<string, unknown>;
  const workerId = payload.worker_id as string | undefined;
  const target = payload.target as string | undefined;

  if (!workerId) {
    return jsonResponse({ error: 'worker_id_required' }, 400, corsHeaders);
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.rpc('omnilink_claim_task', {
    p_integration_id: apiKey.integration_id,
    p_worker_id: workerId,
    p_target: target ?? null,
  });

  if (error) {
    return jsonResponse({ error: 'claim_failed', message: error instanceof Error ? error.message : String(error) }, 500, corsHeaders);
  }

  const result = data as { status: string; task_id?: string; type?: string; params?: unknown; policy?: unknown };
  if (result.status === 'no_tasks') {
    return jsonResponse({ status: 'no_tasks' }, 200, corsHeaders);
  }

  return jsonResponse({
    status: 'claimed',
    task: {
      id: result.task_id,
      type: result.type,
      params: result.params,
      policy: result.policy,
    },
  }, 200, corsHeaders);
}

async function handleTaskComplete(req: Request, corsHeaders: HeadersInit): Promise<Response> {
  const authResult = await authenticateRequest(req, corsHeaders);
  if ('status' in authResult) return authResult;
  const { apiKey } = authResult;

  if (!enforcePermission(apiKey.scopes ?? {}, 'tasks:complete')) {
    return jsonResponse({ error: 'permission_denied' }, 403, corsHeaders);
  }

  const { body } = await parseJsonBody(req).catch(() => ({ body: null, raw: '' }));
  const payload = (body ?? {}) as Record<string, unknown>;
  const taskId = payload.task_id as string | undefined;
  const workerId = payload.worker_id as string | undefined;
  const taskStatus = payload.status as string | undefined;
  const output = payload.output as Record<string, unknown> | undefined;
  const errorMessage = payload.error_message as string | undefined;

  if (!taskId || !workerId || !taskStatus) {
    return jsonResponse({ error: 'missing_required_fields' }, 400, corsHeaders);
  }

  const MAX_OUTPUT_BYTES = 16 * 1024;
  let boundedOutput = output;
  if (output) {
    const outputStr = JSON.stringify(output);
    if (new TextEncoder().encode(outputStr).length > MAX_OUTPUT_BYTES) {
      boundedOutput = { truncated: true, summary: outputStr.slice(0, 8000) + '...(truncated)' };
    }
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient.rpc('omnilink_complete_task', {
    p_task_id: taskId,
    p_worker_id: workerId,
    p_status: taskStatus,
    p_output: boundedOutput ?? null,
    p_error_message: errorMessage ?? null,
  });

  if (error) {
    return jsonResponse({ error: 'complete_failed', message: error instanceof Error ? error.message : String(error) }, 500, corsHeaders);
  }

  const result = data as { status: string; final_status?: string };
  if (result.status === 'not_found_or_not_owned') {
    return jsonResponse({ error: 'task_not_found_or_not_owned' }, 404, corsHeaders);
  }
  if (result.status === 'already_completed') {
    return jsonResponse({ status: 'already_completed' }, 200, corsHeaders);
  }

  return jsonResponse({ status: 'completed', final_status: result.final_status }, 200, corsHeaders);
}

async function handleEventBatchRequest(
  req: Request,
  route: string,
  isOmniPort: boolean,
  corsHeaders: HeadersInit
): Promise<Response> {
  const targetRoute = isOmniPort ? 'events' : route;

  const authResult = await authenticateRequest(req, corsHeaders);
  if ('status' in authResult) return authResult;
  const { apiKey, idempotencyHeader } = authResult;

  const constraints = getConstraints(apiKey.scopes ?? {});
  const payloadResult = await validatePayload(req, constraints, corsHeaders);
  if ('status' in payloadResult) return payloadResult;
  const { items } = payloadResult;

  const concurrencyOk = await enforceConcurrency(apiKey.id, constraints.max_concurrency);
  if (!concurrencyOk) {
    return jsonResponse({ error: 'concurrency_limit_exceeded' }, 429, corsHeaders);
  }

  const requestId = crypto.randomUUID();
  const serviceClient = createServiceClient();

  try {
    const normalizedItems = isOmniPort
      ? items.map((item) => omniPortEnvelope(item as SOmniPortInput))
      : items;

    const results = await Promise.all(
      normalizedItems.map((item, index) =>
        processRequestItem(item, index, {
          route: targetRoute,
          apiKey,
          constraints,
          idempotencyHeader,
          serviceClient,
        })
      )
    );

    const statusCode = determineStatusCode(results);
    return jsonResponse({ request_id: requestId, results }, statusCode, corsHeaders);
  } finally {
    releaseConcurrency(apiKey.id);
  }
}

// ── Sub-routers ───────────────────────────────────────────────────────────────

async function routeTaskRequest(route: string, req: Request, corsHeaders: HeadersInit): Promise<Response | null> {
  if (!route.startsWith('tasks/')) return null;
  const subRoute = route.split('/')[1];
  if (subRoute === 'claim') return handleTaskClaim(req, corsHeaders);
  if (subRoute === 'complete') return handleTaskComplete(req, corsHeaders);
  return jsonResponse({ error: 'not_found' }, 404, corsHeaders);
}

function handleGetHealth(corsHeaders: HeadersInit): Response {
  return jsonResponse({ status: 'ok', checked_at: new Date().toISOString() }, 200, corsHeaders);
}

async function handleKeysRequest(route: string, req: Request, corsHeaders: HeadersInit): Promise<Response> {
  const subRoute = route.split('/')[1] || '';
  if (req.method === 'POST') {
    if (subRoute === '' || subRoute === 'create') return handleKeyCreation(req, corsHeaders);
    if (subRoute === 'revoke') return handleKeyRevoke(req, corsHeaders);
    if (subRoute === 'rotate') return handleKeyRotate(req, corsHeaders);
  } else if (req.method === 'GET' && subRoute === 'list') {
    return handleKeyList(req, corsHeaders);
  }
  return jsonResponse({ error: 'not_found' }, 404, corsHeaders);
}

// ── Main request handler ──────────────────────────────────────────────────────

async function handleServeRequest(req: Request): Promise<Response> {
  const requestOrigin = req.headers.get('origin')?.replace(/\/$/, '') ?? null;
  const corsHeaders = buildCorsHeaders(requestOrigin);

  // ── CORS preflight — MUST be first. OPTIONS carries no Authorization header
  // and must return 2xx + CORS headers before the browser sends the real POST.
  // Any guard placed above this returns a non-2xx that the browser treats as
  // "preflight failed", silently blocking every subsequent cross-origin fetch.
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  if (!OMNILINK_ENABLED) {
    return corsErrorResponse('omnilink_disabled', 'OmniLink port is disabled', 503, requestOrigin);
  }

  if (!isOriginAllowed(requestOrigin)) {
    return corsErrorResponse('origin_not_allowed', 'CORS policy: Origin not allowed', 403, requestOrigin);
  }

  const route = parseRoute(new URL(req.url).pathname);
  const isOmniPort = route === 'omniport';

  if (req.method === 'GET' && route === 'health') {
    return handleGetHealth(corsHeaders);
  }

  const rl = await checkRateLimit(
    req.headers.get('x-forwarded-for') ?? 'anon',
    RATE_LIMIT_CONFIGS.omnilinkPort,
  );
  if (!rl.allowed) {
    return rateLimitExceededResponse(requestOrigin, rl);
  }

  if (route.startsWith('keys')) {
    return handleKeysRequest(route, req, corsHeaders);
  }

  if (route === 'module-state' && req.method === 'POST') {
    return handleModuleState(req, corsHeaders);
  }

  const taskResponse = await routeTaskRequest(route, req, corsHeaders);
  if (taskResponse) return taskResponse;

  if (!['events', 'commands', 'workflows', 'omniport', 'tasks'].includes(route)) {
    return jsonResponse({ error: 'not_found' }, 404, corsHeaders);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, corsHeaders);
  }

  return handleEventBatchRequest(req, route, isOmniPort, corsHeaders);
}

Deno.serve(handleServeRequest);
