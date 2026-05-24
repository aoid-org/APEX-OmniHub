import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/monitoring';
import { recordAuditEvent } from '@/security/auditLog';
import { Incident, KpiDaily, PipelineItem, TodayItem, OmniDashSettings } from './types';

/**
 * Explicit column selections for OmniDash tables.
 *
 * Benefits:
 * 1. Performance: Reduces network transfer and database I/O
 * 2. Security: Prevents accidental exposure of sensitive columns
 * 3. Type Safety: Improves TypeScript inference
 * 4. Maintainability: Self-documenting and DRY
 *
 * IMPORTANT: Keep these in sync with types in src/omnidash/types.ts
 */
export const OMNIDASH_COLUMNS = {
  settings: 'user_id, demo_mode, show_connected_ecosystem, anonymize_kpis, freeze_mode, power_block_started_at, power_block_duration_minutes, updated_at',

  today_items: 'id, user_id, title, next_action, category, order_index, is_active, power_block_started_at, power_block_duration_minutes, created_at, updated_at',

  pipeline_items: 'id, user_id, account_name, product, owner, stage, last_touch_at, next_touch_at, expected_mrr, probability, notes, created_at, updated_at',

  kpi_daily: 'id, user_id, day, tradeline_paid_starts, tradeline_active_pilots, tradeline_churn_risks, flowbills_demos, flowbills_paid_accounts, cash_days_to_cash, ops_sev1_incidents, updated_at',

  incidents: 'id, user_id, severity, status, title, description, resolution_notes, occurred_at, resolved_at, created_at, updated_at',
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleError<T>(promise: PromiseLike<any>, context: string): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    logError(error as Error, { action: `omnidash_${context}` });
    throw new Error(error.message || `Failed to ${context}`);
  }
  if (!data) {
    throw new Error(`No data returned for ${context}`);
  }
  return data;
}

export async function fetchSettings(userId: string): Promise<OmniDashSettings> {
  const { data, error } = await supabase
    .from('omnidash_settings')
    .select(OMNIDASH_COLUMNS.settings)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logError(error, { action: 'omnidash_fetch_settings' });
    throw error;
  }

  if (!data) {
    const insert = await supabase
      .from('omnidash_settings')
      .insert({
        user_id: userId,
      })
      .select(OMNIDASH_COLUMNS.settings)
      .single();
    if (insert.error) {
      logError(insert.error, { action: 'omnidash_seed_settings' });
      throw insert.error;
    }
    return insert.data;
  }

  return data;
}

export async function updateSettings(userId: string, patch: Partial<OmniDashSettings>): Promise<OmniDashSettings> {
  const result = await supabase
    .from('omnidash_settings')
    .upsert({
      user_id: userId,
      ...patch,
    })
    .select(OMNIDASH_COLUMNS.settings)
    .single();

  if (result.error) {
    logError(result.error, { action: 'omnidash_update_settings' });
    throw result.error;
  }

  recordAuditEvent({
    actorId: userId,
    actionType: 'omnidash.settings.updated',
    resourceType: 'omnidash_settings',
    resourceId: userId,
    metadata: patch,
  });

  return result.data;
}

export async function fetchTodayItems(userId: string): Promise<TodayItem[]> {
  return handleError(
    supabase
      .from('omnidash_today_items')
      .select(OMNIDASH_COLUMNS.today_items)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('order_index', { ascending: true }),
    'fetch_today_items'
  );
}

export async function upsertTodayItem(item: Partial<TodayItem> & { user_id: string; title: string }): Promise<TodayItem> {
  const result = await supabase
    .from('omnidash_today_items')
    .upsert(item)
    .select(OMNIDASH_COLUMNS.today_items)
    .single();
  if (result.error) {
    logError(result.error, { action: 'omnidash_upsert_today_item' });
    throw result.error;
  }
  return result.data;
}

export async function restartRitual(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('omnidash_today_items')
    .select(OMNIDASH_COLUMNS.today_items)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    logError(error, { action: 'omnidash_restart_ritual' });
    throw error;
  }

  const categories: Array<'outcome' | 'outreach' | 'metric'> = ['outcome', 'outreach', 'metric'];
  const keepIds = categories
    .map((cat) => data?.find((row: Record<string, unknown>) => row.category === cat)?.id)
    .filter(Boolean) as string[];

  await supabase.from('omnidash_today_items').update({ is_active: false }).eq('user_id', userId);
  if (keepIds.length) {
    await supabase.from('omnidash_today_items').update({ is_active: true }).in('id', keepIds);
  }
}

export async function fetchPipelineItems(userId: string): Promise<PipelineItem[]> {
  return handleError(
    supabase
      .from('omnidash_pipeline_items')
      .select(OMNIDASH_COLUMNS.pipeline_items)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    'fetch_pipeline_items'
  );
}

export async function upsertPipelineItem(item: Partial<PipelineItem> & { user_id: string; account_name: string; product: string; owner: string; stage: PipelineItem['stage'] }): Promise<PipelineItem> {
  if (item.stage !== 'lost' && !item.next_touch_at) {
    throw new Error('Next touch is required unless stage is Lost.');
  }

  const result = await supabase
    .from('omnidash_pipeline_items')
    .upsert(item)
    .select(OMNIDASH_COLUMNS.pipeline_items)
    .single();
  if (result.error) {
    logError(result.error, { action: 'omnidash_upsert_pipeline_item' });
    throw result.error;
  }
  return result.data;
}

export async function fetchKpiDaily(userId: string, days = 7): Promise<KpiDaily[]> {
  return handleError(
    supabase
      .from('omnidash_kpi_daily')
      .select(OMNIDASH_COLUMNS.kpi_daily)
      .eq('user_id', userId)
      .order('day', { ascending: false })
      .limit(days),
    'fetch_kpi_daily'
  );
}

export async function upsertKpiDailyEntry(row: Partial<KpiDaily> & { user_id: string; day: string }): Promise<KpiDaily> {
  const result = await supabase
    .from('omnidash_kpi_daily')
    .upsert(row)
    .select(OMNIDASH_COLUMNS.kpi_daily)
    .single();
  if (result.error) {
    logError(result.error, { action: 'omnidash_upsert_kpi_daily' });
    throw result.error;
  }
  return result.data;
}

export async function fetchIncidents(userId: string, limit = 20): Promise<Incident[]> {
  return handleError(
    supabase
      .from('omnidash_incidents')
      .select(OMNIDASH_COLUMNS.incidents)
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .limit(limit),
    'fetch_incidents'
  );
}

export async function addIncident(incident: Partial<Incident> & { user_id: string; title: string; severity: Incident['severity'] }): Promise<Incident> {
  const result = await supabase
    .from('omnidash_incidents')
    .insert({
      status: 'open',
      ...incident,
    })
    .select(OMNIDASH_COLUMNS.incidents)
    .single();
  if (result.error) {
    logError(result.error, { action: 'omnidash_add_incident' });
    throw result.error;
  }
  return result.data;
}

// ============================================================================
// Usage Metering (BYOM Telemetry Bridge)
// ============================================================================

export interface UsageMeteringSummary {
  provider: string;
  model: string;
  total_input_tokens: number;
  total_output_tokens: number;
  request_count: number;
}

export interface UsageMeteringRow {
  id: string;
  tenant_id: string;
  user_id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  region: string;
  timestamp: string;
}

export async function fetchUsageMetering(userId: string, days = 7): Promise<UsageMeteringRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('usage_metering')
    .select('id, tenant_id, user_id, provider, model, input_tokens, output_tokens, region, timestamp')
    .eq('user_id', userId)
    .gte('timestamp', since.toISOString())
    .order('timestamp', { ascending: false })
    .limit(500);

  if (error) {
    logError(error, { action: 'omnidash_fetch_usage_metering' });
    throw error;
  }

  return data ?? [];
}

export function aggregateUsageMetering(rows: UsageMeteringRow[]): UsageMeteringSummary[] {
  const map = new Map<string, UsageMeteringSummary>();

  for (const row of rows) {
    const key = `${row.provider}:${row.model}`;
    const existing = map.get(key);
    if (existing) {
      existing.total_input_tokens += row.input_tokens;
      existing.total_output_tokens += row.output_tokens;
      existing.request_count += 1;
    } else {
      map.set(key, {
        provider: row.provider,
        model: row.model,
        total_input_tokens: row.input_tokens,
        total_output_tokens: row.output_tokens,
        request_count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.request_count - a.request_count);
}

export async function fetchHealthSnapshot(userId: string): Promise<{ lastUpdated: string | null }> {
  const healthTables = ['omnidash_today_items', 'omnidash_pipeline_items', 'omnidash_kpi_daily', 'omnidash_incidents', 'omnidash_settings'] as const;
  const latest = await Promise.all(
    healthTables.map(
      async (table) => {
        const res = await supabase
          .from(table)
          .select('updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);
        return res.data?.[0]?.updated_at ?? null;
      }
    )
  );

  const lastUpdated = latest.filter(Boolean).reduce((max, current) => {
    return (current !== null && (!max || current > max)) ? current : max;
  }, null as string | null);

  return { lastUpdated };
}

// ============================================================================
// Memory Health Stats (ACRA Observability)
// ============================================================================

export interface MemoryHealthStats {
  total_memories: number;
  episodic_count: number;
  semantic_count: number;
  procedural_count: number;
  preference_count: number;
  embedded_count: number;
  expired_count: number;
  pending_reembed_count: number;
  avg_importance: number;
  avg_trust_score: number;
  avg_access_count: number;
  latest_memory_at: string | null;
  oldest_memory_at: string | null;
  current_embedding_model: string | null;
  poisoned_candidate_count: number;
  dedup_attempts: number;
}

const MEMORY_HEALTH_COLUMNS = [
  'total_memories',
  'episodic_count',
  'semantic_count',
  'procedural_count',
  'preference_count',
  'embedded_count',
  'expired_count',
  'pending_reembed_count',
  'avg_importance',
  'avg_trust_score',
  'avg_access_count',
  'latest_memory_at',
  'oldest_memory_at',
  'current_embedding_model',
  'poisoned_candidate_count',
].join(', ');

export async function fetchMemoryHealthStats(
  userId: string,
): Promise<MemoryHealthStats> {
  // Fetch from the memory_health_stats view
  const { data, error } = await supabase
    .from('memory_health_stats')
    .select(MEMORY_HEALTH_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logError(error, { action: 'omnidash_fetch_memory_health' });
    // Return empty stats on error (fail-safe for new users)
    return emptyMemoryHealthStats();
  }

  // Fetch dedup count from idempotency_receipts
  const { count: dedupCount } = await supabase
    .from('idempotency_receipts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', userId)
    .gt('attempt_count', 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as Record<string, any> | null;
  return {
    total_memories: d?.total_memories ?? 0,
    episodic_count: d?.episodic_count ?? 0,
    semantic_count: d?.semantic_count ?? 0,
    procedural_count: d?.procedural_count ?? 0,
    preference_count: d?.preference_count ?? 0,
    embedded_count: d?.embedded_count ?? 0,
    expired_count: d?.expired_count ?? 0,
    pending_reembed_count: d?.pending_reembed_count ?? 0,
    avg_importance: d?.avg_importance ?? 0,
    avg_trust_score: d?.avg_trust_score ?? 0,
    avg_access_count: d?.avg_access_count ?? 0,
    latest_memory_at: d?.latest_memory_at ?? null,
    oldest_memory_at: d?.oldest_memory_at ?? null,
    current_embedding_model:
      d?.current_embedding_model ?? null,
    poisoned_candidate_count:
      d?.poisoned_candidate_count ?? 0,
    dedup_attempts: dedupCount ?? 0,
  };
}

function emptyMemoryHealthStats(): MemoryHealthStats {
  return {
    total_memories: 0,
    episodic_count: 0,
    semantic_count: 0,
    procedural_count: 0,
    preference_count: 0,
    embedded_count: 0,
    expired_count: 0,
    pending_reembed_count: 0,
    avg_importance: 0,
    avg_trust_score: 0,
    avg_access_count: 0,
    latest_memory_at: null,
    oldest_memory_at: null,
    current_embedding_model: null,
    poisoned_candidate_count: 0,
    dedup_attempts: 0,
  };
}
