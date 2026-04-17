import { useEffect, useState, useMemo, type FC } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OmniBridgeEventRow {
  id: string;
  event_id: string;
  source_id: string;
  tenant_id: string;
  profile: 'hardened' | 'sync_packet' | 'legacy';
  event_type: string;
  trace_id: string | null;
  payload: Record<string, unknown>;
  signature_verified: boolean;
  dispatch_state: 'received' | 'dispatching' | 'dispatched' | 'acknowledged' | 'dlq';
  received_at: string;
  dispatched_at: string | null;
  acknowledged_at: string | null;
}

interface OmniBridgeLiveFeedProps {
  /** Filter to a specific source (e.g. 'sbbl-hq'); empty = all sources */
  sourceFilter?: string;
  /** Maximum rows to keep in the in-memory window */
  windowSize?: number;
  /** Optional tenant filter for multi-tenant admin views */
  tenantId?: string;
}

/**
 * Real-time admin feed backed by Supabase Realtime on omnibridge_events.
 * Grant-evidence UI: shows verification pass rate, dispatch acks, latency.
 */
export const OmniBridgeLiveFeed: FC<OmniBridgeLiveFeedProps> = ({
  sourceFilter,
  windowSize = 100,
  tenantId,
}) => {
  const [events, setEvents] = useState<OmniBridgeEventRow[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      let query = supabase
        .from('omnibridge_events')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(windowSize);
      if (sourceFilter) query = query.eq('source_id', sourceFilter);
      if (tenantId) query = query.eq('tenant_id', tenantId);
      const { data, error: fetchError } = await query;
      if (!isMounted) return;
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      setEvents((data ?? []) as OmniBridgeEventRow[]);
    };

    loadInitial();

    const channel = supabase
      .channel('omnibridge_events_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'omnibridge_events' },
        (payload) => {
          if (!isMounted) return;
          const row = payload.new as OmniBridgeEventRow;
          if (sourceFilter && row.source_id !== sourceFilter) return;
          if (tenantId && row.tenant_id !== tenantId) return;
          setEvents((prev) => [row, ...prev].slice(0, windowSize));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'omnibridge_events' },
        (payload) => {
          if (!isMounted) return;
          const row = payload.new as OmniBridgeEventRow;
          setEvents((prev) => prev.map((e) => (e.id === row.id ? row : e)));
        },
      )
      .subscribe((status) => {
        if (!isMounted) return;
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [sourceFilter, windowSize, tenantId]);

  const stats = useMemo(() => {
    const total = events.length;
    const verified = events.filter((e) => e.signature_verified).length;
    const acked = events.filter((e) => e.dispatch_state === 'acknowledged').length;
    const dlq = events.filter((e) => e.dispatch_state === 'dlq').length;
    const latencies = events
      .filter((e) => e.acknowledged_at)
      .map((e) => new Date(e.acknowledged_at!).getTime() - new Date(e.received_at).getTime())
      .sort((a, b) => a - b);
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p95 = latencies[p95Idx] ?? 0;
    return {
      total,
      verified_rate: total ? ((verified / total) * 100).toFixed(1) : '0.0',
      ack_rate: total ? ((acked / total) * 100).toFixed(1) : '0.0',
      dlq_count: dlq,
      p95_latency_ms: p95,
    };
  }, [events]);

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">OmniBridge Live Feed</h2>
          <p className="text-sm text-muted-foreground">
            {sourceFilter ? `Source: ${sourceFilter}` : 'All sources'} · Window: {windowSize}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'}`}
            aria-label={connected ? 'connected' : 'disconnected'}
          />
          <span className="text-xs text-muted-foreground">
            {connected ? 'live' : 'connecting...'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Total" value={String(stats.total)} />
        <Stat label="Verified" value={`${stats.verified_rate}%`} />
        <Stat label="Acked" value={`${stats.ack_rate}%`} />
        <Stat label="DLQ" value={String(stats.dlq_count)} />
        <Stat label="p95 (ms)" value={String(stats.p95_latency_ms)} />
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="py-2 pr-2">Time</th>
              <th className="py-2 pr-2">Source</th>
              <th className="py-2 pr-2">Event</th>
              <th className="py-2 pr-2">Profile</th>
              <th className="py-2 pr-2">State</th>
              <th className="py-2 pr-2">Trace</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No events yet. When SBBL-HQ emits a SyncPacket or another partner POSTs to /api/omnibridge/*, it will appear here in real time.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-b hover:bg-muted/50">
                  <td className="py-2 pr-2 font-mono text-xs">
                    {new Date(e.received_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2 pr-2 font-mono text-xs">{e.source_id}</td>
                  <td className="py-2 pr-2">{e.event_type}</td>
                  <td className="py-2 pr-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">{e.profile}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <StateBadge state={e.dispatch_state} verified={e.signature_verified} />
                  </td>
                  <td className="py-2 pr-2 font-mono text-xs text-muted-foreground">
                    {e.trace_id ? `${e.trace_id.slice(0, 8)}...` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Stat: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded border bg-muted/30 p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-xl font-semibold">{value}</div>
  </div>
);

const StateBadge: FC<{ state: OmniBridgeEventRow['dispatch_state']; verified: boolean }> = ({ state, verified }) => {
  const color = !verified
    ? 'bg-red-500/20 text-red-700 dark:text-red-300'
    : state === 'acknowledged'
    ? 'bg-green-500/20 text-green-700 dark:text-green-300'
    : state === 'dlq'
    ? 'bg-red-500/20 text-red-700 dark:text-red-300'
    : state === 'dispatched'
    ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
    : 'bg-muted text-muted-foreground';
  return <span className={`rounded px-2 py-0.5 text-xs ${color}`}>{state}</span>;
};

export default OmniBridgeLiveFeed;
