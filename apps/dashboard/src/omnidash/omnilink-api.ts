import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/debug-logger';
import type {
  OmniLinkApiKey,
  OmniLinkEntity,
  OmniLinkEvent,
  OmniLinkIntegration,
  OmniLinkOrchestrationRequest,
  OmniLinkRun,
  OmniTraceRunsListResponse,
  OmniTraceRunDetailResponse,
} from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function requireSupabaseUrl(): string {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL is not configured');
  }
  return SUPABASE_URL;
}

// =============================================================================
// Shared fetch helpers (eliminates per-table duplication)
// =============================================================================

interface FetchListOptions {
  table: string;
  userIdField: string;
  orderField: string;
  action: string;
  limit?: number;
  extraFilters?: Record<string, string>;
}

async function fetchSupabaseList<T>(userId: string, opts: FetchListOptions): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from as any)(opts.table)
    .select('*')
    .eq(opts.userIdField, userId)
    .order(opts.orderField, { ascending: false });

  if (opts.limit) query = query.limit(opts.limit);
  if (opts.extraFilters) {
    for (const [col, val] of Object.entries(opts.extraFilters)) {
      query = query.eq(col, val);
    }
  }

  const { data, error } = await query;
  if (error) {
    logError(error, { action: opts.action });
    throw error;
  }
  return (data ?? []) as T[];
}

async function authenticatedEdgeFetch<T>(path: string, action: string): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) {
    throw new Error('No authenticated session found');
  }

  const url = `${requireSupabaseUrl()}/functions/v1/${path}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    logError(new Error(`${action} failed: ${text}`), { action });
    throw new Error(`${action} failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

// =============================================================================
// OmniLink CRUD API
// =============================================================================

export function fetchOmniLinkIntegrations(userId: string): Promise<OmniLinkIntegration[]> {
  return fetchSupabaseList(userId, { table: 'integrations', userIdField: 'user_id', orderField: 'created_at', action: 'omnilink_fetch_integrations' });
}

export function fetchOmniLinkKeys(userId: string): Promise<OmniLinkApiKey[]> {
  return fetchSupabaseList(userId, { table: 'omnilink_api_keys', userIdField: 'tenant_id', orderField: 'created_at', action: 'omnilink_fetch_keys' });
}

export async function createOmniLinkIntegration(userId: string, name: string, type: string): Promise<OmniLinkIntegration> {
  const { data, error } = await supabase
    .from('integrations')
    .insert({ user_id: userId, name, type, status: 'active' })
    .select()
    .single();

  if (error) {
    logError(error, { action: 'omnilink_create_integration' });
    throw error;
  }

  return data as OmniLinkIntegration;
}

export async function createOmniLinkKey(
  integrationId: string,
  name: string,
  scopes: Record<string, unknown>
): Promise<{ key: string; key_prefix: string; warning: string }> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) {
    throw new Error('No authenticated session found');
  }

  const url = `${requireSupabaseUrl()}/functions/v1/omnilink-port/keys`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ integration_id: integrationId, name, scopes }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create key (${response.status}): ${text}`);
  }

  return (await response.json()) as { key: string; key_prefix: string; warning: string };
}

export async function revokeOmniLinkKey(userId: string, keyId: string): Promise<void> {
  const { error } = await supabase.rpc('omnilink_revoke_key', {
    p_key_id: keyId,
    p_user_id: userId,
  });

  if (error) {
    logError(error, { action: 'omnilink_revoke_key' });
    throw error;
  }
}

export function fetchOmniLinkEvents(userId: string): Promise<OmniLinkEvent[]> {
  return fetchSupabaseList(userId, { table: 'omnilink_events', userIdField: 'tenant_id', orderField: 'received_at', action: 'omnilink_fetch_events', limit: 50 });
}

export function fetchOmniLinkEntities(userId: string): Promise<OmniLinkEntity[]> {
  return fetchSupabaseList(userId, { table: 'omnilink_entities', userIdField: 'tenant_id', orderField: 'updated_at', action: 'omnilink_fetch_entities', limit: 50 });
}

export function fetchOmniLinkRuns(userId: string): Promise<OmniLinkRun[]> {
  return fetchSupabaseList(userId, { table: 'omnilink_runs', userIdField: 'tenant_id', orderField: 'created_at', action: 'omnilink_fetch_runs', limit: 50 });
}

export function fetchOmniLinkApprovals(userId: string): Promise<OmniLinkOrchestrationRequest[]> {
  return fetchSupabaseList(userId, {
    table: 'omnilink_orchestration_requests', userIdField: 'tenant_id', orderField: 'created_at',
    action: 'omnilink_fetch_approvals', extraFilters: { status: 'waiting_approval' },
  });
}

export async function decideOmniLinkApproval(
  userId: string,
  requestId: string,
  decision: 'approved' | 'denied'
): Promise<void> {
  const { error } = await supabase.rpc('omnilink_set_approval', {
    p_request_id: requestId,
    p_user_id: userId,
    p_decision: decision,
  });

  if (error) {
    logError(error, { action: 'omnilink_set_approval' });
    throw error;
  }
}

// =============================================================================
// OmniTrace API - Workflow Run Observability
// =============================================================================

export function fetchOmniTraceRuns(limit: number = 50): Promise<OmniTraceRunsListResponse> {
  return authenticatedEdgeFetch(`omni-runs?limit=${limit}`, 'omnitrace_fetch_runs');
}

export function fetchOmniTraceRunDetail(workflowId: string): Promise<OmniTraceRunDetailResponse> {
  return authenticatedEdgeFetch(`omni-runs/${encodeURIComponent(workflowId)}`, 'omnitrace_fetch_run_detail');
}
