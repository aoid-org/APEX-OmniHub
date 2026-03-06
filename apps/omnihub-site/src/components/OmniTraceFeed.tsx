/**
 * OmniTraceFeed — Live trace events from the Universal Sync Orchestrator.
 *
 * Uses the REAL useOmniTrace hook from src/hooks/useOmniTrace.ts which:
 * 1. Fetches last 50 events from omni_run_events (desc by created_at)
 * 2. Subscribes via Supabase Realtime for live updates
 *
 * TraceEvent fields: id, workflow_id, event_key, kind, name, latency_ms, data_redacted, data_hash, created_at
 */
import { useOmniTrace } from '@/hooks/useOmniTrace';

const KIND_COLORS: Record<string, string> = {
  tool: 'var(--health-green)',
  model: 'var(--accent)',
  policy: 'var(--health-yellow)',
  cache: 'var(--text-secondary)',
  system: 'var(--text-muted)',
};

export function OmniTraceFeed() {
  const { traces, isTracing } = useOmniTrace();

  if (isTracing) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>
        Syncing with APEX Orchestrator...
      </div>
    );
  }

  if (!traces || traces.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12, fontFamily: 'monospace' }}>
        No active sync events. System nominal.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {traces.slice(0, 10).map((trace) => (
        <div
          key={trace.id}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 10px', borderRadius: 8,
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Status dot — color by event kind */}
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: KIND_COLORS[trace.kind] ?? 'var(--text-muted)',
            }} />
            {/* Real event name from DB */}
            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {trace.name}
            </span>
            {/* Kind badge */}
            <span style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 4,
              background: 'var(--bg-surface-hover)', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {trace.kind}
            </span>
          </div>
          {/* Real timestamp from DB */}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {new Date(trace.created_at).toLocaleTimeString('en-US', { timeZone: 'America/Edmonton' })}
          </span>
        </div>
      ))}
    </div>
  );
}
