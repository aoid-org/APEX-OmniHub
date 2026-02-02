/**
 * OmniDash Data Adapters
 * 
 * Provides unified data access for OmniDash that works in both demo and live modes.
 * In demo mode: Returns data from demoStore
 * In live mode: Returns data from Supabase
 * 
 * NO DIRECT SUPABASE CALLS in demo mode - all data flows through these adapters.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccessMode } from '@/contexts/AccessContext';
import { demoStore, type DemoTask, type DemoEvent, type DemoRun, type DemoIntegration, type DemoTodayItem, type DemoPipelineDeal, type DemoLocalAgent, type DemoApproval } from '@/demo';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface AdapterResult<T> {
  data: T;
  isDemo: boolean;
  source: 'demo' | 'supabase';
}

// ============================================================================
// TODAY ITEMS ADAPTER
// ============================================================================

export function useTodayItems() {
  const { isDemo, isAuthenticated } = useAccessMode();

  return useQuery({
    queryKey: ['omnidash', 'today', isDemo],
    queryFn: async (): Promise<AdapterResult<DemoTodayItem[]>> => {
      if (isDemo || !isAuthenticated) {
        return {
          data: demoStore.getTodayItems(),
          isDemo: true,
          source: 'demo',
        };
      }

      // Live mode - fetch from Supabase
      const { data, error } = await supabase
        .from('omnidash_today_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform Supabase data to match demo format
      const items: DemoTodayItem[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row['id'] ?? ''),
        type: (row['type'] as DemoTodayItem['type']) ?? 'outcome',
        label: String(row['label'] ?? ''),
        value: typeof row['value'] === 'number' ? row['value'] : undefined,
        completed: Boolean(row['completed']),
        createdAt: String(row['created_at'] ?? new Date().toISOString()),
      }));

      return {
        data: items,
        isDemo: false,
        source: 'supabase',
      };
    },
    staleTime: isDemo ? Infinity : 30000, // Demo data never stales
  });
}

// ============================================================================
// TASKS ADAPTER
// ============================================================================

export function useTasks() {
  const { isDemo, isAuthenticated } = useAccessMode();

  return useQuery({
    queryKey: ['omnidash', 'tasks', isDemo],
    queryFn: async (): Promise<AdapterResult<DemoTask[]>> => {
      if (isDemo || !isAuthenticated) {
        return {
          data: demoStore.getTasks(),
          isDemo: true,
          source: 'demo',
        };
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const tasks: DemoTask[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row['id'] ?? ''),
        action: String(row['action'] ?? ''),
        payload: (row['payload'] as Record<string, unknown>) ?? {},
        status: (row['status'] as DemoTask['status']) ?? 'pending',
        createdAt: String(row['created_at'] ?? new Date().toISOString()),
        completedAt: row['completed_at'] ? String(row['completed_at']) : undefined,
      }));

      return {
        data: tasks,
        isDemo: false,
        source: 'supabase',
      };
    },
    staleTime: isDemo ? Infinity : 30000,
  });
}

// ============================================================================
// EVENTS ADAPTER
// ============================================================================

export function useEvents() {
  const { isDemo, isAuthenticated } = useAccessMode();

  return useQuery({
    queryKey: ['omnidash', 'events', isDemo],
    queryFn: async (): Promise<AdapterResult<DemoEvent[]>> => {
      if (isDemo || !isAuthenticated) {
        return {
          data: demoStore.getEvents(),
          isDemo: true,
          source: 'demo',
        };
      }

      const { data, error } = await supabase
        .from('omnidash_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      const events: DemoEvent[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row['id'] ?? ''),
        type: String(row['type'] ?? ''),
        source: String(row['source'] ?? ''),
        payload: (row['payload'] as Record<string, unknown>) ?? {},
        timestamp: String(row['timestamp'] ?? new Date().toISOString()),
      }));

      return {
        data: events,
        isDemo: false,
        source: 'supabase',
      };
    },
    staleTime: isDemo ? Infinity : 10000,
  });
}

// ============================================================================
// RUNS ADAPTER
// ============================================================================

export function useRuns() {
  const { isDemo, isAuthenticated } = useAccessMode();

  return useQuery({
    queryKey: ['omnidash', 'runs', isDemo],
    queryFn: async (): Promise<AdapterResult<DemoRun[]>> => {
      if (isDemo || !isAuthenticated) {
        return {
          data: demoStore.getRuns(),
          isDemo: true,
          source: 'demo',
        };
      }

      const { data, error } = await supabase
        .from('workflow_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const runs: DemoRun[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row['id'] ?? ''),
        workflowId: String(row['workflow_id'] ?? ''),
        status: (row['status'] as DemoRun['status']) ?? 'running',
        startedAt: String(row['started_at'] ?? new Date().toISOString()),
        completedAt: row['completed_at'] ? String(row['completed_at']) : undefined,
        steps: typeof row['steps'] === 'number' ? row['steps'] : 0,
        currentStep: typeof row['current_step'] === 'number' ? row['current_step'] : 0,
      }));

      return {
        data: runs,
        isDemo: false,
        source: 'supabase',
      };
    },
    staleTime: isDemo ? Infinity : 10000,
  });
}

// ============================================================================
// INTEGRATIONS ADAPTER
// ============================================================================

export function useIntegrations() {
  const { isDemo, isAuthenticated } = useAccessMode();

  return useQuery({
    queryKey: ['omnidash', 'integrations', isDemo],
    queryFn: async (): Promise<AdapterResult<DemoIntegration[]>> => {
      if (isDemo || !isAuthenticated) {
        return {
          data: demoStore.getIntegrations(),
          isDemo: true,
          source: 'demo',
        };
      }

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const integrations: DemoIntegration[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row['id'] ?? ''),
        name: String(row['name'] ?? ''),
        type: (row['type'] as DemoIntegration['type']) ?? 'custom',
        status: (row['status'] as DemoIntegration['status']) ?? 'inactive',
        lastSync: row['last_sync'] ? String(row['last_sync']) : undefined,
        keyPrefix: row['key_prefix'] ? String(row['key_prefix']) : undefined,
      }));

      return {
        data: integrations,
        isDemo: false,
        source: 'supabase',
      };
    },
    staleTime: isDemo ? Infinity : 60000,
  });
}

// ============================================================================
// PIPELINE ADAPTER
// ============================================================================

export function usePipeline() {
  const { isDemo, isAuthenticated } = useAccessMode();

  return useQuery({
    queryKey: ['omnidash', 'pipeline', isDemo],
    queryFn: async (): Promise<AdapterResult<DemoPipelineDeal[]>> => {
      if (isDemo || !isAuthenticated) {
        return {
          data: demoStore.getPipeline(),
          isDemo: true,
          source: 'demo',
        };
      }

      const { data, error } = await supabase
        .from('pipeline_deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const deals: DemoPipelineDeal[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row['id'] ?? ''),
        name: String(row['name'] ?? ''),
        value: typeof row['value'] === 'number' ? row['value'] : 0,
        stage: (row['stage'] as DemoPipelineDeal['stage']) ?? 'lead',
        probability: typeof row['probability'] === 'number' ? row['probability'] : 0,
        company: String(row['company'] ?? ''),
        createdAt: String(row['created_at'] ?? new Date().toISOString()),
      }));

      return {
        data: deals,
        isDemo: false,
        source: 'supabase',
      };
    },
    staleTime: isDemo ? Infinity : 30000,
  });
}

// ============================================================================
// LOCAL AGENTS ADAPTER
// ============================================================================

export function useLocalAgents() {
  const { isDemo, isAuthenticated } = useAccessMode();

  return useQuery({
    queryKey: ['omnidash', 'localAgents', isDemo],
    queryFn: async (): Promise<AdapterResult<DemoLocalAgent[]>> => {
      if (isDemo || !isAuthenticated) {
        return {
          data: demoStore.getLocalAgents(),
          isDemo: true,
          source: 'demo',
        };
      }

      const { data, error } = await supabase
        .from('local_agents')
        .select('*')
        .order('last_ping', { ascending: false });

      if (error) throw error;

      const agents: DemoLocalAgent[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row['id'] ?? ''),
        name: String(row['name'] ?? ''),
        type: (row['type'] as DemoLocalAgent['type']) ?? 'custom',
        status: (row['status'] as DemoLocalAgent['status']) ?? 'offline',
        lastPing: String(row['last_ping'] ?? new Date().toISOString()),
      }));

      return {
        data: agents,
        isDemo: false,
        source: 'supabase',
      };
    },
    staleTime: isDemo ? Infinity : 15000,
  });
}

// ============================================================================
// APPROVALS ADAPTER
// ============================================================================

export function useApprovals() {
  const { isDemo, isAuthenticated } = useAccessMode();

  return useQuery({
    queryKey: ['omnidash', 'approvals', isDemo],
    queryFn: async (): Promise<AdapterResult<DemoApproval[]>> => {
      if (isDemo || !isAuthenticated) {
        return {
          data: demoStore.getApprovals(),
          isDemo: true,
          source: 'demo',
        };
      }

      const { data, error } = await supabase
        .from('approvals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const approvals: DemoApproval[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row['id'] ?? ''),
        type: (row['type'] as DemoApproval['type']) ?? 'workflow',
        title: String(row['title'] ?? ''),
        requester: String(row['requester'] ?? ''),
        status: (row['status'] as DemoApproval['status']) ?? 'pending',
        createdAt: String(row['created_at'] ?? new Date().toISOString()),
      }));

      return {
        data: approvals,
        isDemo: false,
        source: 'supabase',
      };
    },
    staleTime: isDemo ? Infinity : 30000,
  });
}

// ============================================================================
// KPIS ADAPTER
// ============================================================================

export function useKpis() {
  const { isDemo, isAuthenticated } = useAccessMode();

  return useQuery({
    queryKey: ['omnidash', 'kpis', isDemo],
    queryFn: async () => {
      if (isDemo || !isAuthenticated) {
        return {
          data: demoStore.getKpis(),
          isDemo: true,
          source: 'demo' as const,
        };
      }

      const { data, error } = await supabase
        .from('omnidash_kpis')
        .select('*');

      if (error) throw error;

      const kpis = (data ?? []).map((row: Record<string, unknown>) => ({
        label: String(row['label'] ?? ''),
        value: typeof row['value'] === 'number' ? row['value'] : 0,
        trend: typeof row['trend'] === 'number' ? row['trend'] : 0,
        unit: String(row['unit'] ?? ''),
      }));

      return {
        data: kpis,
        isDemo: false,
        source: 'supabase' as const,
      };
    },
    staleTime: isDemo ? Infinity : 60000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useAddTodayItem() {
  const { isDemo } = useAccessMode();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: { type: DemoTodayItem['type']; label: string; value?: number }) => {
      if (isDemo) {
        return demoStore.addTodayItem(item);
      }

      const { data, error } = await supabase
        .from('omnidash_today_items')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omnidash', 'today'] });
    },
  });
}

export function useToggleTodayItem() {
  const { isDemo } = useAccessMode();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemo) {
        return demoStore.toggleTodayItem(id);
      }

      // Fetch current state, toggle, update
      const { data: current, error: fetchError } = await supabase
        .from('omnidash_today_items')
        .select('completed')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('omnidash_today_items')
        .update({ completed: !(current as { completed: boolean }).completed })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omnidash', 'today'] });
    },
  });
}

export function useGenerateApiKey() {
  const { isDemo } = useAccessMode();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId: string) => {
      if (isDemo) {
        return { key: demoStore.generateApiKey(integrationId) };
      }

      // In live mode, call edge function to generate key
      const { data, error } = await supabase.functions.invoke('generate-api-key', {
        body: { integrationId },
      });

      if (error) throw error;
      return data as { key: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omnidash', 'integrations'] });
    },
  });
}
