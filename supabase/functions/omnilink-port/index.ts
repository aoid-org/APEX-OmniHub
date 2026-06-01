import { encodeBase64Url } from 'https://deno.land/std@0.177.0/encoding/base64url.ts';
import { buildCorsHeaders, corsErrorResponse, handlePreflight, isOriginAllowed } from '../_shared/cors.ts';
import { allowAdapter, allowWorkflow, enforceEnvAllowlist, enforcePermission, type OmniLinkScopes } from '../_shared/omnilinkScopes.ts';
import { createAnonClient, createServiceClient } from '../_shared/supabaseClient.ts';
import { normalizeOmniPortIntent, type SOmniPortInput } from '../_shared/omniport-normalize.ts';

const OMNILINK_ENABLED = (Deno.env.get('OMNILINK_ENABLED') ?? '').toLowerCase() === 'true';
const MAX_SINGLE_PAYLOAD_BYTES = 256 * 1024;
const MAX_BATCH_PAYLOAD_BYTES = 1024 * 1024;
const MAX_BATCH_ITEMS = 50;
const DEFAULT_MAX_CONCURRENCY = 5;

const inflight = new Map<string, number>();

const textEncoder = new TextEncoder();

interface ApiKeyRecord {
  id: string;
  tenant_id: string;
  integration_id: string;
  key_hash: string;
  key_prefix: string;
  scopes: OmniLinkScopes;
  integrations?: { status: string } | { status: string }[];
}

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

async function handleModuleState(req: Request, corsHeaders: HeadersInit): Promise<Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);

  let tenantId: string | null = null;
  const token = authHeader.replace('Bearer ', '').trim();
  const apiKey = await loadApiKey(token);

  if (apiKey) {
    if (!enforcePermission(apiKey.scopes ?? {}, 'module_state:read')) {
      return jsonResponse({ error: 'permission_denied' }, 403, corsHeaders);
    }
    tenantId = apiKey.tenant_id;
  } else {
    const userClient = createAnonClient(authHeader);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: 'unauthorized' }, 401, corsHeaders);
    tenantId = user.id;
  }

  const { body } = await parseJsonBody(req).catch(() => ({ body: null, raw: '' }));
  const payload = (body ?? {}) as Record<string, unknown>;
  const moduleKey = payload.module_key as string | undefined;
  if (!moduleKey) return jsonResponse({ error: 'module_key_required' }, 400, corsHeaders);

  const svc = createServiceClient();

  try {
    const data = await resolveModuleState(svc, moduleKey, tenantId);
    return jsonResponse(data, 200, corsHeaders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'module_state_error';
    return jsonResponse({ error: msg }, 500, corsHeaders);
  }
}

// ── Per-module real-data resolvers ───────────────────────────────────────────

type StatItem = { label: string; value: string; trend?: 'up' | 'down' | 'stable' };
type ListItem = { id: string; label: string; status: 'active' | 'inactive' | 'pending' | 'error'; detail?: string };
type ActionItem = { id: string; label: string; variant: 'primary' | 'secondary' | 'destructive' };

interface ModuleStatePayload {
  moduleKey: string;
  headline: string;
  stats: StatItem[];
  items: ListItem[];
  actions: ActionItem[];
}

async function resolveModuleState(
  svc: ReturnType<typeof createServiceClient>,
  moduleKey: string,
  tenantId: string
): Promise<ModuleStatePayload> {
  switch (moduleKey) {

    // ── WORKFLOWS ──────────────────────────────────────────────────────────
    case 'workflows': {
      const { data: wf } = await svc.from('workflows')
        .select('id, name, is_active, created_at, updated_at')
        .eq('user_id', tenantId)
        .order('updated_at', { ascending: false })
        .limit(10);

      const { data: runs } = await svc.from('workflow_runs')
        .select('id, workflow_id, status, started_at, completed_at')
        .eq('user_id', tenantId)
        .order('started_at', { ascending: false })
        .limit(5);

      const workflows = (wf ?? []) as Array<{ id: string; name: string; is_active: boolean; created_at: string; updated_at: string }>;
      const workflowRuns = (runs ?? []) as Array<{ id: string; workflow_id: string; status: string; started_at: string; completed_at: string | null }>;
      const active = workflows.filter(w => w.is_active).length;
      const pending = workflowRuns.filter(r => r.status === 'pending' || r.status === 'running').length;

      const lastRunMap = new Map<string, string>();
      for (const run of workflowRuns) {
        if (!lastRunMap.has(run.workflow_id)) {
          const mins = Math.round((Date.now() - new Date(run.started_at).getTime()) / 60000);
          lastRunMap.set(run.workflow_id, `${mins}m ago`);
        }
      }

      return {
        moduleKey: 'workflows',
        headline: `${workflows.length} Workflow${workflows.length === 1 ? '' : 's'} Defined`,
        stats: [
          { label: 'Workflows', value: String(workflows.length), trend: 'stable' },
          { label: 'Active', value: String(active), trend: active > 0 ? 'up' : 'stable' },
          { label: 'Running', value: String(pending), trend: pending > 0 ? 'up' : 'stable' },
        ],
        items: workflows.slice(0, 5).map(w => ({
          id: w.id,
          label: w.name,
          status: w.is_active ? 'active' : 'inactive',
          detail: lastRunMap.has(w.id) ? `Last run: ${lastRunMap.get(w.id)}` : 'Never run',
        })),
        actions: [
          { id: 'create-workflow', label: 'New Workflow', variant: 'primary' },
          { id: 'view-runs', label: 'View Run History', variant: 'secondary' },
        ],
      };
    }

    // ── AUTOMATIONS ────────────────────────────────────────────────────────
    case 'automations': {
      const { data: auto } = await svc.from('automations')
        .select('id, name, action_type, is_active, config')
        .eq('user_id', tenantId)
        .order('id', { ascending: false })
        .limit(10);

      const automations = (auto ?? []) as Array<{ id: string; name: string; action_type: string; is_active: boolean; config: Record<string, unknown> }>;
      const activeCount = automations.filter(a => a.is_active).length;

      return {
        moduleKey: 'automations',
        headline: `${activeCount} Active Automation Rule${activeCount === 1 ? '' : 's'}`,
        stats: [
          { label: 'Total Rules', value: String(automations.length), trend: 'stable' },
          { label: 'Active', value: String(activeCount), trend: activeCount > 0 ? 'up' : 'stable' },
          { label: 'Inactive', value: String(automations.length - activeCount), trend: 'stable' },
        ],
        items: automations.slice(0, 5).map(a => ({
          id: a.id,
          label: a.name ?? `Automation ${a.id.slice(0, 8)}`,
          status: a.is_active ? 'active' : 'inactive',
          detail: `Type: ${a.action_type}`,
        })),
        actions: [
          { id: 'create-automation', label: 'Create Automation', variant: 'primary' },
          { id: 'view-logs', label: 'View Execution Logs', variant: 'secondary' },
        ],
      };
    }

    // ── FILES ──────────────────────────────────────────────────────────────
    case 'files': {
      // List real files from Supabase Storage bucket "omnihub-files"
      const { data: objects } = await svc.storage.from('omnihub-files').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'updated_at', order: 'desc' },
      });

      const files = (objects ?? []) as Array<{ name: string; metadata?: { size?: number }; updated_at?: string }>;
      const totalBytes = files.reduce((acc, f) => acc + (f.metadata?.size ?? 0), 0);
      const totalGB = (totalBytes / (1024 ** 3)).toFixed(2);

      return {
        moduleKey: 'files',
        headline: `${files.length} File${files.length === 1 ? '' : 's'} in Storage`,
        stats: [
          { label: 'Total Files', value: String(files.length), trend: 'stable' },
          { label: 'Storage Used', value: `${totalGB} GB`, trend: 'stable' },
          { label: 'Bucket', value: 'omnihub-files', trend: 'stable' },
        ],
        items: files.slice(0, 6).map(f => ({
          id: f.name,
          label: f.name,
          status: 'active' as const,
          detail: f.metadata?.size ? `${(f.metadata.size / 1024).toFixed(1)} KB` : 'Unknown size',
        })),
        actions: [
          { id: 'upload', label: 'Upload Files', variant: 'primary' },
          { id: 'browse', label: 'Browse Storage', variant: 'secondary' },
        ],
      };
    }

    // ── BILLING ────────────────────────────────────────────────────────────
    case 'billing': {
      const { data: sub } = await svc.from('subscriptions')
        .select('tier, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, trial_end')
        .eq('user_id', tenantId)
        .maybeSingle();

      const subscription = sub as {
        tier: string;
        status: string;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
        current_period_start: string | null;
        current_period_end: string | null;
        trial_end: string | null;
      } | null;

      const tier = subscription?.tier ?? 'free';
      const status = subscription?.status ?? 'inactive';
      const periodEnd = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
        : 'N/A';

      return {
        moduleKey: 'billing',
        headline: tier.charAt(0).toUpperCase() + tier.slice(1) + ' Plan',
        stats: [
          { label: 'Plan', value: tier.charAt(0).toUpperCase() + tier.slice(1) },
          { label: 'Status', value: status.charAt(0).toUpperCase() + status.slice(1) },
          { label: 'Next Invoice', value: periodEnd },
        ],
        items: subscription ? [
          {
            id: 'current-sub',
            label: `${tier.toUpperCase()} — ${status}`,
            status: ((): 'active' | 'error' | 'pending' => {
              if (status === 'active') return 'active';
              if (status === 'past_due') return 'error';
              return 'pending';
            })(),
            detail: subscription.current_period_end
              ? `Renews ${periodEnd}`
              : 'No active period',
          },
        ] : [
          {
            id: 'no-sub',
            label: 'No active subscription',
            status: 'inactive',
            detail: 'Upgrade to access premium features',
          },
        ],
        actions: [
          { id: 'manage-plan', label: 'Manage Plan', variant: 'primary' },
          { id: 'download-invoices', label: 'Billing Portal', variant: 'secondary' },
        ],
      };
    }

    // ── LINKS (Connections) ────────────────────────────────────────────────
    case 'links': {
      const { data: sessions } = await svc.from('connector_sessions')
        .select('connector_id, provider, created_at, last_sync_at, scopes')
        .eq('tenant_id', tenantId)
        .order('last_sync_at', { ascending: false })
        .limit(10);

      const connections = (sessions ?? []) as Array<{ connector_id: string; provider: string; created_at: string; last_sync_at: string | null; scopes: string[] }>;

      return {
        moduleKey: 'links',
        headline: `${connections.length} Connected App${connections.length === 1 ? '' : 's'}`,
        stats: [
          { label: 'Active Links', value: String(connections.length), trend: connections.length > 0 ? 'up' : 'stable' },
          { label: 'Scopes Granted', value: String(connections.reduce((acc, c) => acc + c.scopes.length, 0)), trend: 'stable' },
          { label: 'Status', value: connections.length > 0 ? 'Healthy' : 'No connections', trend: 'stable' },
        ],
        items: connections.slice(0, 6).map(c => {
          const syncAgo = c.last_sync_at
            ? `Synced ${Math.round((Date.now() - new Date(c.last_sync_at).getTime()) / 60000)}m ago`
            : 'Never synced';
          return {
            id: c.connector_id,
            label: c.provider.charAt(0).toUpperCase() + c.provider.slice(1),
            status: 'active' as const,
            detail: syncAgo,
          };
        }),
        actions: [
          { id: 'add-link', label: 'Add Connection', variant: 'primary' },
          { id: 'test-all', label: 'Test All Links', variant: 'secondary' },
        ],
      };
    }

    // ── AUDITS ─────────────────────────────────────────────────────────────
    case 'audits': {
      const [eventsRes, incidentsRes] = await Promise.allSettled([
        svc.from('omnitrace_events')
          .select('id, event_type, event_text, severity, created_at')
          .eq('user_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(10),
        svc.from('security_incidents')
          .select('id, incident_type, severity, status, occurred_at')
          .eq('tenant_id', tenantId)
          .eq('status', 'open')
          .order('occurred_at', { ascending: false })
          .limit(5),
      ]);

      const events = (eventsRes.status === 'fulfilled' ? eventsRes.value.data ?? [] : []) as Array<{
        id: string; event_type: string; event_text: string; severity: string; created_at: string;
      }>;
      const incidents = (incidentsRes.status === 'fulfilled' ? incidentsRes.value.data ?? [] : []) as Array<{
        id: string; incident_type: string; severity: string; status: string; occurred_at: string;
      }>;

      const violations = incidents.filter(i => i.status === 'open').length;
      let headline = 'All Systems Compliant';
      if (violations > 0) {
        headline = `${violations} Open Incident${violations === 1 ? '' : 's'}`;
      }

      return {
        moduleKey: 'audits',
        headline,
        stats: [
          { label: 'Events (24h)', value: String(events.length), trend: 'stable' },
          { label: 'Open Incidents', value: String(violations), trend: violations > 0 ? 'up' : 'stable' },
          { label: 'Compliance', value: violations === 0 ? '100%' : 'Review Required', trend: violations === 0 ? 'stable' : 'down' },
        ],
        items: [
          ...incidents.slice(0, 2).map(i => ({
            id: i.id,
            label: i.incident_type.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
            status: 'error' as const,
            detail: `SEV-${i.severity.toUpperCase()} · ${new Date(i.occurred_at).toLocaleDateString()}`,
          })),
          ...events.slice(0, 4).map(e => ({
            id: e.id,
            label: e.event_type.replaceAll('_', ' '),
            status: e.severity === 'error' ? 'error' as const : 'active' as const,
            detail: e.event_text.slice(0, 60),
          })),
        ].slice(0, 5),
        actions: [
          { id: 'export-audit', label: 'Export Audit Log', variant: 'primary' },
          { id: 'run-compliance', label: 'Run Compliance Check', variant: 'secondary' },
        ],
      };
    }

    // ── SETTINGS ───────────────────────────────────────────────────────────
    case 'settings': {
      const { data: settings } = await svc.from('omnidash_settings')
        .select('demo_mode, anonymize_kpis, freeze_mode, show_connected_ecosystem, updated_at')
        .eq('user_id', tenantId)
        .maybeSingle();

      const s = settings as { demo_mode: boolean; anonymize_kpis: boolean; freeze_mode: boolean; show_connected_ecosystem: boolean; updated_at: string } | null;

      const configItems: ListItem[] = s ? [
        {
          id: 'demo-mode',
          label: 'Demo Mode',
          status: s.demo_mode ? 'active' : 'inactive',
          detail: s.demo_mode ? 'Enabled — showing sample data' : 'Disabled — live data active',
        },
        {
          id: 'anonymize-kpis',
          label: 'Anonymize KPIs',
          status: s.anonymize_kpis ? 'active' : 'inactive',
          detail: s.anonymize_kpis ? 'KPI values hidden from display' : 'KPI values visible',
        },
        {
          id: 'freeze-mode',
          label: 'Freeze Mode',
          status: s.freeze_mode ? 'active' : 'inactive',
          detail: s.freeze_mode ? 'Dashboard frozen — no live updates' : 'Live updates active',
        },
        {
          id: 'ecosystem-view',
          label: 'Show Ecosystem',
          status: s.show_connected_ecosystem ? 'active' : 'inactive',
          detail: s.show_connected_ecosystem ? 'Connected apps shown in overview' : 'Ecosystem panel hidden',
        },
      ] : [];

      return {
        moduleKey: 'settings',
        headline: 'Platform Configuration',
        stats: [
          { label: 'Environment', value: 'Production' },
          { label: 'Region', value: 'us-east-1' },
          { label: 'Last Updated', value: s?.updated_at ? new Date(s.updated_at).toLocaleDateString() : 'Never' },
        ],
        items: configItems,
        actions: [
          { id: 'save-settings', label: 'Save Changes', variant: 'primary' },
          { id: 'reset-defaults', label: 'Reset Defaults', variant: 'destructive' },
        ],
      };
    }

    // ── PHYSIOMNI ──────────────────────────────────────────────────────────
    case 'physiomni': {
      const { data: devices } = await svc.from('physiomni_devices')
        .select('id, device_id, device_type, firmware_version, is_active, last_seen_at')
        .eq('tenant_id', tenantId)
        .order('last_seen_at', { ascending: false })
        .limit(10);

      const deviceList = (devices ?? []) as Array<{
        id: string; device_id: string; device_type: string; firmware_version: string | null; is_active: boolean; last_seen_at: string | null;
      }>;
      const activeDevices = deviceList.filter(d => d.is_active).length;

      return {
        moduleKey: 'physiomni',
        headline: `${deviceList.length} Device${deviceList.length === 1 ? '' : 's'} Registered`,
        stats: [
          { label: 'Connected Devices', value: String(deviceList.length), trend: 'stable' },
          { label: 'Active', value: String(activeDevices), trend: activeDevices > 0 ? 'up' : 'stable' },
          { label: 'Offline', value: String(deviceList.length - activeDevices), trend: 'stable' },
        ],
        items: deviceList.slice(0, 5).map(d => {
          const seenAgo = d.last_seen_at
            ? `${Math.round((Date.now() - new Date(d.last_seen_at).getTime()) / 60000)}m ago`
            : 'Never';
            const fwSuffix = d.firmware_version ? ` · FW ${d.firmware_version}` : '';
          return {
            id: d.id,
            label: `${d.device_type} · ${d.device_id.slice(0, 8)}`,
            status: d.is_active ? 'active' : 'inactive',
            detail: `Last seen: ${seenAgo}${fwSuffix}`,
          };
        }),
        actions: [
          { id: 'provision-device', label: 'Provision Device', variant: 'primary' },
          { id: 'export-telemetry', label: 'Export Telemetry', variant: 'secondary' },
        ],
      };
    }

    // ── AGENT ──────────────────────────────────────────────────────────────
    case 'agent': {
      const { data: sessions } = await svc.from('agent_sessions')
        .select('id, status, started_at, updated_at')
        .eq('user_id', tenantId)
        .order('updated_at', { ascending: false })
        .limit(10);

      const agentSessions = (sessions ?? []) as Array<{ id: string; status: string; started_at: string; updated_at: string }>;
      const activeSessions = agentSessions.filter(s => s.status === 'active').length;
      let headline = 'No Active Sessions';
      if (activeSessions > 0) {
        headline = `${activeSessions} Active Session${activeSessions === 1 ? '' : 's'}`;
      }

      return {
        moduleKey: 'agent',
        headline,
        stats: [
          { label: 'Active Sessions', value: String(activeSessions), trend: activeSessions > 0 ? 'up' : 'stable' },
          { label: 'Total Sessions', value: String(agentSessions.length), trend: 'stable' },
          { label: 'Status', value: activeSessions > 0 ? 'Running' : 'Idle', trend: 'stable' },
        ],
        items: agentSessions.slice(0, 4).map(s => ({
          id: s.id,
          label: `Session ${s.id.slice(0, 8)}`,
          status: s.status as 'active' | 'inactive' | 'pending',
          detail: `Started ${Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000)}m ago`,
        })),
        actions: [
          { id: 'new-session', label: 'New Session', variant: 'primary' },
          { id: 'view-history', label: 'Session History', variant: 'secondary' },
        ],
      };
    }

    // ── DASHBOARD (overview module) ────────────────────────────────────────
    case 'dashboard': {
      const [kpiRes, incidentRes] = await Promise.allSettled([
        svc.from('omnidash_kpi_daily')
          .select('tradeline_paid_starts, tradeline_active_pilots, ops_sev1_incidents')
          .eq('user_id', tenantId)
          .order('day', { ascending: false })
          .limit(1)
          .maybeSingle(),
        svc.from('omnidash_incidents')
          .select('id')
          .eq('user_id', tenantId)
          .eq('status', 'open'),
      ]);

      const kpi = (kpiRes.status === 'fulfilled' ? kpiRes.value.data : null) as {
        tradeline_paid_starts: number | null;
        tradeline_active_pilots: number | null;
        ops_sev1_incidents: number | null;
      } | null;
      const openIncidents = (incidentRes.status === 'fulfilled' ? incidentRes.value.data ?? [] : []).length;

      return {
        moduleKey: 'dashboard',
        headline: 'System Overview',
        stats: [
          { label: 'Paid Starts', value: String(kpi?.tradeline_paid_starts ?? 0), trend: 'stable' },
          { label: 'Active Pilots', value: String(kpi?.tradeline_active_pilots ?? 0), trend: 'stable' },
          { label: 'Open Incidents', value: String(openIncidents), trend: openIncidents > 0 ? 'up' : 'stable' },
        ],
        items: [],
        actions: [],
      };
    }

    // ── DEFAULT: return empty live state for unknown keys ──────────────────
    default:
      return {
        moduleKey,
        headline: 'Module Online',
        stats: [],
        items: [],
        actions: [],
      };
  }
}

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

  // Normalize workflow params
  if (route === 'workflows' && payload.input && !payload.params) {
    payload.params = payload.input;
  }

  // Apply approval policy if needed
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

  // Truncate output to max 16KB
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

    return jsonResponse(
      {
        request_id: requestId,
        results,
      },
      statusCode,
      corsHeaders
    );
  } finally {
    releaseConcurrency(apiKey.id);
  }
}

function routeTaskRequest(route: string, req: Request, corsHeaders: HeadersInit): Response | null {
  if (!route.startsWith('tasks/')) return null;

  const subRoute = route.split('/')[1];
  if (subRoute === 'claim') {
    return handleTaskClaim(req, corsHeaders);
  }
  if (subRoute === 'complete') {
    return handleTaskComplete(req, corsHeaders);
  }
  return jsonResponse({ error: 'not_found' }, 404, corsHeaders);
}

function handleGetHealth(corsHeaders: HeadersInit): Response {
  return jsonResponse({ status: 'ok', checked_at: new Date().toISOString() }, 200, corsHeaders);
}

async function _handleKeysRequest(route: string, req: Request, corsHeaders: HeadersInit): Promise<Response> {
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

async function handleServeRequest(req: Request): Promise<Response> {
  const requestOrigin = req.headers.get('origin')?.replace(/\/$/, '') ?? null;
  const corsHeaders = buildCorsHeaders(requestOrigin);

  // Early exits for disabled service or preflight
  if (!OMNILINK_ENABLED) {
    return corsErrorResponse('omnilink_disabled', 'OmniLink port is disabled', 503, requestOrigin);
  }

  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  if (!isOriginAllowed(requestOrigin)) {
    return corsErrorResponse('origin_not_allowed', 'CORS policy: Origin not allowed', 403, requestOrigin);
  }

  // Parse route
  const route = parseRoute(new URL(req.url).pathname);
  const isOmniPort = route === 'omniport';

  // Simple GET route
  if (req.method === 'GET' && route === 'health') {
    return handleGetHealth(corsHeaders);
  }

  // API key routes
  if (route.startsWith('keys')) {
    return handleKeysRequest(route, req, corsHeaders);
  }

  // Module state route
  if (route === 'module-state' && req.method === 'POST') {
    return handleModuleState(req, corsHeaders);
  }

  // Task dispatch routes
  const taskResponse = routeTaskRequest(route, req, corsHeaders);
  if (taskResponse) return taskResponse;

  // Validate route for batch processing
  if (!['events', 'commands', 'workflows', 'omniport', 'tasks'].includes(route)) {
    return jsonResponse({ error: 'not_found' }, 404, corsHeaders);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, corsHeaders);
  }

  // Handle event batch request
  return handleEventBatchRequest(req, route, isOmniPort, corsHeaders);
}

Deno.serve(handleServeRequest);
