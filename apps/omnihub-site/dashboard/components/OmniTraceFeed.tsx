import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  severity?: 'info' | 'warn' | 'ok';
  [key: string]: unknown;
}

const DEMO_LOGS: AuditLog[] = [
  { id: 'd1', action: 'Salesforce sync completed — 48 records updated', created_at: new Date(Date.now() - 92000).toISOString(), severity: 'ok' },
  { id: 'd2', action: 'Invoice batch #1042 processed successfully', created_at: new Date(Date.now() - 310000).toISOString(), severity: 'ok' },
  { id: 'd3', action: 'Workflow "Lead Nurture" triggered by Guardian', created_at: new Date(Date.now() - 540000).toISOString(), severity: 'info' },
  { id: 'd4', action: 'QuickBooks reconciliation done — 0 discrepancies', created_at: new Date(Date.now() - 870000).toISOString(), severity: 'ok' },
  { id: 'd5', action: 'Ticket #7291 auto-resolved by APEX Agent', created_at: new Date(Date.now() - 1200000).toISOString(), severity: 'ok' },
  { id: 'd6', action: 'MAN Mode review request queued — low risk', created_at: new Date(Date.now() - 1800000).toISOString(), severity: 'warn' },
];

const SEVERITY_COLOR: Record<string, string> = {
  ok:   '#34d399',
  warn: '#f59e0b',
  info: '#38bdf8',
};

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function OmniTraceFeed({ tenantId }: Readonly<{ tenantId?: string }>) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [status, setStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'ERROR'>(() => {
    const url = import.meta.env.VITE_SUPABASE_URL ?? '';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
    return (!url || !key) ? 'ERROR' : 'CONNECTING';
  });

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    let channel: ReturnType<typeof supabase.channel>;

    try {
      const channelFilter = tenantId ? `tenant_id=eq.${tenantId}` : undefined;
      channel = supabase
        .channel('omnitrace-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log', filter: channelFilter },
          (payload) => {
            const newLog = payload.new as AuditLog;
            setLogs((prev) => [newLog, ...prev].slice(0, 50));
          }
        )
        .subscribe((s: string) => {
          if (s === 'SUBSCRIBED') setStatus('SUBSCRIBED');
          else if (s === 'CHANNEL_ERROR') setStatus('ERROR');
        });
    } catch {
      setStatus('ERROR');
    }

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [tenantId]);

  const isDemo = status === 'ERROR';
  const displayLogs = isDemo ? DEMO_LOGS : logs;

  return (
    <div data-testid="omni-trace-feed" className="sentinel-section" style={{ paddingBottom: 8 }}>
      <div className="sentinel-section-title" style={{ marginBottom: 8 }}>
        OmniTrace
        <span style={{
          marginLeft: 'auto',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: isDemo ? '#f59e0b' : status === 'SUBSCRIBED' ? '#34d399' : '#f59e0b',
          padding: '2px 6px',
          borderRadius: 4,
          background: isDemo ? 'rgba(245,158,11,0.08)' : status === 'SUBSCRIBED' ? 'rgba(52,211,153,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${isDemo ? 'rgba(245,158,11,0.22)' : status === 'SUBSCRIBED' ? 'rgba(52,211,153,0.22)' : 'rgba(245,158,11,0.22)'}`,
        }}>
          {isDemo ? 'Demo' : status === 'SUBSCRIBED' ? 'Live' : 'Connecting'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {displayLogs.map(log => (
          <div key={log.id} className="sentinel-trace-item">
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 4,
              background: SEVERITY_COLOR[log.severity ?? 'info'],
              boxShadow: `0 0 5px ${SEVERITY_COLOR[log.severity ?? 'info']}88`,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--od-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.action}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--od-text-tertiary)', marginTop: 1 }}>
                {relativeTime(log.created_at)}
              </div>
            </div>
          </div>
        ))}
        {!isDemo && logs.length === 0 && status === 'SUBSCRIBED' && (
          <div style={{ fontSize: 11, color: 'var(--od-text-tertiary)', padding: '6px 0' }}>No events yet</div>
        )}
      </div>

      <button
        type="button"
        style={{
          marginTop: 10, width: '100%', padding: '6px 0', borderRadius: 7,
          border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
          color: 'var(--od-text-tertiary)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          fontFamily: "'Space Grotesk',sans-serif",
          transition: 'border-color .15s, background .15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(249,115,22,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = '#f97316'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--od-text-tertiary)'; }}
      >
        + Replay Workflows
      </button>
    </div>
  );
}

export default OmniTraceFeed;
