/**
 * useDashboardData — OmniDash Real-Data Bridge
 * @version 1.0.0
 * @module apps/omnihub-site/dashboard/hooks/useDashboardData
 *
 * Fetches live data for OmniDashShell from Supabase via the site-local
 * Supabase client. Avoids deep cross-layer imports.
 *
 * APEX STANDARDS ENFORCED:
 * - Fail-Safe: Promise.allSettled + empty defaults on every fetch
 * - Atomic Idempotency: Same userId always produces same initial state
 * - Zero dead stubs: Every field is populated from real Supabase query
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/lib/supabase';
import type { KpiSummary } from '../types/dashboard.types';
import { EMPTY_KPI_SUMMARY } from '../types/dashboard.types';

// ── Minimal local types (mirrors src/omnidash/types.ts) ─────────────────────

interface OmniDashSettings {
  user_id: string;
  demo_mode: boolean;
  anonymize_kpis: boolean;
  freeze_mode: boolean;
  updated_at: string;
}

interface KpiDaily {
  id: string;
  day: string;
  tradeline_paid_starts: number | null;
  tradeline_active_pilots: number | null;
  tradeline_churn_risks: number | null;
  flowbills_demos: number | null;
  flowbills_paid_accounts: number | null;
  cash_days_to_cash: number | null;
  ops_sev1_incidents: number | null;
}

export interface Incident {
  id: string;
  severity: 'sev1' | 'sev2' | 'sev3';
  status: 'open' | 'resolved' | 'monitoring';
  title: string;
  occurred_at: string;
}

interface MemoryHealthStats {
  total_memories: number;
  embedded_count: number;
  expired_count: number;
  avg_importance: number;
}

// ── Return type ──────────────────────────────────────────────────────────────

export interface DashboardData {
  readonly settings: OmniDashSettings | null;
  readonly kpiSummary: KpiSummary;
  readonly kpiHistory: KpiDaily[];
  readonly openIncidents: Incident[];
  readonly memoryHealth: MemoryHealthStats | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardData(options?: { enabled?: boolean }): DashboardData {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const enabled = options?.enabled ?? true;

  const [settings, setSettings] = useState<OmniDashSettings | null>(null);
  const [kpiHistory, setKpiHistory] = useState<KpiDaily[]>([]);
  const [openIncidents, setOpenIncidents] = useState<Incident[]>([]);
  const [memoryHealth, setMemoryHealth] = useState<MemoryHealthStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId || !enabled) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        const [settingsRes, kpiRes, incidentsRes, memRes] = await Promise.allSettled([
          supabase
            .from('omnidash_settings')
            .select('user_id, demo_mode, anonymize_kpis, freeze_mode, updated_at')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('omnidash_kpi_daily')
            .select('id, day, tradeline_paid_starts, tradeline_active_pilots, tradeline_churn_risks, flowbills_demos, flowbills_paid_accounts, cash_days_to_cash, ops_sev1_incidents')
            .eq('user_id', userId)
            .order('day', { ascending: false })
            .limit(7),
          supabase
            .from('omnidash_incidents')
            .select('id, severity, status, title, occurred_at')
            .eq('user_id', userId)
            .eq('status', 'open')
            .order('occurred_at', { ascending: false })
            .limit(10),
          supabase
            .from('memory_health_stats')
            .select('total_memories, embedded_count, expired_count, avg_importance')
            .eq('user_id', userId)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const extract = <T,>(res: PromiseSettledResult<{ data: unknown; error: unknown }>) => 
          res.status === 'fulfilled' && !res.value.error ? res.value.data as T : undefined;

        const sData = extract<OmniDashSettings>(settingsRes);
        if (sData) setSettings(sData);

        const kData = extract<KpiDaily[]>(kpiRes);
        if (kData) setKpiHistory(kData);

        const iData = extract<Incident[]>(incidentsRes);
        if (iData) setOpenIncidents(iData);

        const mData = extract<MemoryHealthStats>(memRes);
        if (mData) setMemoryHealth(mData);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'omnidash_kpi_daily' }, () => {
        if (!cancelled) setRefreshKey(k => k + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'omnidash_incidents' }, () => {
        if (!cancelled) setRefreshKey(k => k + 1);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'omnidash_settings' }, () => {
        if (!cancelled) setRefreshKey(k => k + 1);
      })
      .subscribe();

    return () => { 
      cancelled = true; 
      supabase.removeChannel(channel);
    };
  }, [userId, refreshKey, enabled]);

  const kpiSummary: KpiSummary = kpiHistory[0]
    ? {
        tradeline_paid_starts: kpiHistory[0].tradeline_paid_starts ?? 0,
        tradeline_active_pilots: kpiHistory[0].tradeline_active_pilots ?? 0,
        tradeline_churn_risks: kpiHistory[0].tradeline_churn_risks ?? 0,
        flowbills_demos: kpiHistory[0].flowbills_demos ?? 0,
        flowbills_paid_accounts: kpiHistory[0].flowbills_paid_accounts ?? 0,
        cash_days_to_cash: kpiHistory[0].cash_days_to_cash ?? 0,
        ops_sev1_incidents: kpiHistory[0].ops_sev1_incidents ?? 0,
      }
    : EMPTY_KPI_SUMMARY;

  return {
    settings,
    kpiSummary,
    kpiHistory,
    openIncidents,
    memoryHealth,
    isLoading,
    error,
    refresh,
  };
}
