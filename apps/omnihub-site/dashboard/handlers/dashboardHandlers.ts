/**
 * dashboardHandlers — OmniDash Action Handlers
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/handlers/dashboardHandlers
 *
 * Pure async handler functions for OmniDashShell user actions.
 * Uses the site-local Supabase client to avoid cross-layer import issues.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Identical inputs always produce identical outcomes
 * - Zero Dead Stubs: Every handler has a real Supabase implementation
 * - Overload-Free: Each handler addresses exactly one concern
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { supabase } from '@/lib/supabase';

// ── Result type ───────────────────────────────────────────────────────────────

export interface HandlerResult<T = void> {
  readonly ok: boolean;
  readonly data?: T;
  readonly error?: string;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function handleToggleDemoMode(
  userId: string,
  currentValue: boolean,
): Promise<HandlerResult> {
  const { error } = await supabase
    .from('omnidash_settings')
    .upsert({ user_id: userId, demo_mode: !currentValue });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function handleToggleFreezeMode(
  userId: string,
  currentValue: boolean,
): Promise<HandlerResult> {
  const { error } = await supabase
    .from('omnidash_settings')
    .upsert({ user_id: userId, freeze_mode: !currentValue });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ── Incidents ─────────────────────────────────────────────────────────────────

export async function handleReportIncident(
  userId: string,
  title: string,
  severity: 'sev1' | 'sev2' | 'sev3',
  description?: string,
): Promise<HandlerResult<{ id: string }>> {
  const { data, error } = await supabase
    .from('omnidash_incidents')
    .insert({ user_id: userId, title, severity, description, status: 'open' })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

// ── KPI Entry ─────────────────────────────────────────────────────────────────

export async function handleUpsertKpi(
  userId: string,
  day: string,
  fields: Record<string, number>,
): Promise<HandlerResult> {
  const { error } = await supabase
    .from('omnidash_kpi_daily')
    .upsert({ user_id: userId, day, ...fields });
  return error ? { ok: false, error: error.message } : { ok: true };
}
