/**
 * useOmniTrace — Realtime trace event consumption hook.
 *
 * Fetches last 50 events from omni_run_events (desc by created_at).
 * Subscribes via Supabase Realtime for live updates.
 * Optional filter by workflowId.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TraceEvent {
  id: string;
  workflow_id: string;
  event_key: string;
  kind: 'tool' | 'model' | 'policy' | 'cache' | 'system';
  name: string;
  latency_ms: number | null;
  data_redacted: Record<string, unknown>;
  data_hash: string;
  created_at: string;
}

export function useOmniTrace(workflowId?: string) {
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [isTracing, setIsTracing] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsTracing(true);

    const fetchTraces = async () => {
      let query = supabase
        .from('omni_run_events')
        .select('id, workflow_id, event_key, kind, name, latency_ms, data_redacted, data_hash, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      const { data, error } = await query;
      if (!error && data && mounted) {
        setTraces(data as TraceEvent[]);
      }
      if (mounted) setIsTracing(false);
    };

    fetchTraces().catch(console.error);

    const channel = supabase
      .channel(`omnitrace-live-${workflowId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'omni_run_events',
        },
        (payload) => {
          const row = payload.new as TraceEvent;
          if (!workflowId || row.workflow_id === workflowId) {
            setTraces((prev) => [row, ...prev].slice(0, 50));
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel).catch(console.error);
    };
  }, [workflowId]);

  return { traces, isTracing };
}
