import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase as supabaseSingleton } from '@/lib/supabase';

type SupabaseClient = typeof supabaseSingleton;

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

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Replay Slider Panel ────────────────────────────────────────────────────

interface ReplayPanelProps {
  logs: AuditLog[];
  onClose: () => void;
}

const SPEEDS = [0.5, 1, 2, 5] as const;

function ReplayPanel({ logs, onClose }: ReplayPanelProps) {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const [cursor, setCursor] = useState(sorted.length > 0 ? sorted.length - 1 : 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<typeof SPEEDS[number]>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      setCursor(prev => {
        if (prev >= sorted.length - 1) {
          clearTimer();
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, Math.round(800 / speed));
  }, [clearTimer, sorted.length, speed]);

  useEffect(() => {
    if (playing) startPlayback();
    else clearTimer();
    return clearTimer;
  }, [playing, startPlayback, clearTimer]);

  const togglePlay = () => {
    if (cursor >= sorted.length - 1 && !playing) {
      setCursor(0);
      setPlaying(true);
    } else {
      setPlaying(p => !p);
    }
  };

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
  };

  const activeLog = sorted[cursor] as AuditLog | undefined;
  const progress = sorted.length > 1 ? cursor / (sorted.length - 1) : 1;

  return (
    <div
      data-testid="replay-panel"
      style={{
        marginTop: 10,
        borderRadius: 9,
        // Subtle inner replay sub-panel (the OmniTrace tile chrome lives on the
        // feed root below). Nested, so it stays lighter than the outer tile.
        border: '1px solid rgba(249,115,22,0.22)',
        background: 'rgba(249,115,22,0.05)',
        padding: '10px 10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#f97316' }}>
          Replay Mode
        </span>
        <button
          type="button"
          aria-label="Close replay"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--od-text-tertiary)', fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center' }}
        >
          ×
        </button>
      </div>

      {/* Active event card */}
      {activeLog && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 6,
          border: `1px solid ${SEVERITY_COLOR[activeLog.severity ?? 'info']}44`,
          padding: '7px 9px',
          display: 'flex',
          gap: 7,
          alignItems: 'flex-start',
          minHeight: 40,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4,
            background: SEVERITY_COLOR[activeLog.severity ?? 'info'],
            boxShadow: `0 0 6px ${SEVERITY_COLOR[activeLog.severity ?? 'info']}99`,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--od-text-primary)', wordBreak: 'break-word' }}>
              {activeLog.action}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--od-text-tertiary)', marginTop: 2 }}>
              {formatTimestamp(activeLog.created_at)} · event {cursor + 1} of {sorted.length}
            </div>
          </div>
        </div>
      )}

      {/* Timeline scrubber */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Tick marks */}
        <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', margin: '0 1px' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2,
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, rgba(249,115,22,0.5), #f97316)',
            transition: 'width 0.15s ease',
          }} />
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, sorted.length - 1)}
          value={cursor}
          step={1}
          aria-label="Replay timeline scrubber"
          onChange={e => {
            setPlaying(false);
            setCursor(Number(e.target.value));
          }}
          style={{
            width: '100%',
            accentColor: '#f97316',
            height: 18,
            cursor: 'pointer',
            margin: 0,
          }}
        />
        {/* Time labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: 'var(--od-text-tertiary)' }}>
          <span>{sorted[0] ? relativeTime(sorted[0].created_at) : ''}</span>
          <span>{sorted[sorted.length - 1] ? relativeTime(sorted[sorted.length - 1].created_at) : ''}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Step back */}
        <button
          type="button"
          aria-label="Step back"
          onClick={() => { setPlaying(false); setCursor(c => Math.max(0, c - 1)); }}
          disabled={cursor === 0}
          style={controlBtnStyle(cursor === 0)}
        >
          ‹
        </button>

        {/* Play / Pause */}
        <button
          type="button"
          aria-label={playing ? 'Pause replay' : 'Play replay'}
          onClick={togglePlay}
          style={{
            ...controlBtnStyle(false),
            background: playing ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.10)',
            borderColor: 'rgba(249,115,22,0.40)',
            color: '#f97316',
            width: 28,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {playing ? '⏸' : '▶'}
        </button>

        {/* Step forward */}
        <button
          type="button"
          aria-label="Step forward"
          onClick={() => { setPlaying(false); setCursor(c => Math.min(sorted.length - 1, c + 1)); }}
          disabled={cursor >= sorted.length - 1}
          style={controlBtnStyle(cursor >= sorted.length - 1)}
        >
          ›
        </button>

        {/* Speed toggle */}
        <button
          type="button"
          aria-label={`Playback speed ${speed}x, click to cycle`}
          onClick={cycleSpeed}
          style={{ ...controlBtnStyle(false), marginLeft: 'auto', minWidth: 34, fontSize: 9.5, letterSpacing: '0.04em' }}
        >
          {speed}×
        </button>
      </div>
    </div>
  );
}

function controlBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 5,
    color: disabled ? 'rgba(255,255,255,0.15)' : 'var(--od-text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontFamily: "'Space Grotesk',sans-serif",
    fontWeight: 600,
    height: 24,
    minWidth: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
    transition: 'background 0.12s, border-color 0.12s',
  };
}

// ─── Main Feed ──────────────────────────────────────────────────────────────

export function OmniTraceFeed({ tenantId, mockSupabase }: Readonly<{ tenantId?: string, mockSupabase?: SupabaseClient }>) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [status, setStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'ERROR'>('CONNECTING');
  const [replayOpen, setReplayOpen] = useState(false);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL ?? '';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
    if (!url || !key) {
      setStatus('ERROR');
      setLogs(DEMO_LOGS);
    }
  }, []);

  // PRCC-001 WP-3a: backfill the feed from omnitrace_events on mount. The panel
  // previously only rendered realtime INSERTs, so existing trace events (e.g. an
  // automation the user just executed) never appeared — the feed read empty even
  // when rows existed. This is the read half of the flagship loop; the write half
  // lands in supabase/functions/_shared/omnitrace.ts + execute-automation. RLS
  // scopes SELECT to auth.uid(), so users only ever see their own trace.
  useEffect(() => {
    const hasConfig = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    if (!hasConfig) return;
    let cancelled = false;
    const supabase = mockSupabase ?? supabaseSingleton;

    (async () => {
      const { data, error } = await supabase
        .from('omnitrace_events')
        .select('id, event_text, severity, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled || error || !data) return;
      const mapped: AuditLog[] = data.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        action: String(r.event_text ?? ''),
        created_at: String(r.created_at),
        severity:
          r.severity === 'success' ? 'ok'
          : r.severity === 'error' || r.severity === 'warning' ? 'warn'
          : 'info',
      }));
      if (mapped.length > 0) {
        setLogs(mapped);
        setStatus('SUBSCRIBED');
      }
    })();

    return () => { cancelled = true; };
  }, [mockSupabase]);

  useEffect(() => {
    const hasConfig = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    if (!hasConfig) return;

    const supabase = mockSupabase ?? supabaseSingleton;
    let channel: ReturnType<typeof supabase.channel>;

    try {
      const channelFilter = tenantId ? `tenant_id=eq.${tenantId}` : undefined;
      channel = supabase
        .channel('omnitrace-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log', filter: channelFilter },
          (payload: Record<string, unknown>) => {
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
  }, [tenantId, mockSupabase]);

  const isDemo = status === 'ERROR';
  const displayLogs = isDemo ? DEMO_LOGS : logs;

  let traceColor = '#f59e0b';
  let traceBg = 'rgba(245,158,11,0.08)';
  let traceBorderColor = 'rgba(245,158,11,0.22)';
  let traceText = 'Connecting';

  if (isDemo) {
    traceText = 'Demo (Simulated)';
  } else if (status === 'SUBSCRIBED') {
    traceColor = '#34d399';
    traceBg = 'rgba(52,211,153,0.08)';
    traceBorderColor = 'rgba(52,211,153,0.22)';
    traceText = 'Live';
  }

  return (
    <div
      data-testid="omni-trace-feed"
      className="sentinel-section"
      style={{
        // Unified glassmorph rail tile — same orange border, fill opacity, and
        // blur as OmniSentry / Ops Controls / OmniMedia / System Status (owner
        // request). Overrides the bare sentinel-section padding + border-bottom.
        borderRadius: 10,
        border: '1px solid rgba(249,115,22,0.25)',
        background: 'rgba(249,115,22,0.06)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        padding: '10px 12px',
      }}
    >
      <div className="sentinel-section-title" style={{ marginBottom: 8 }}>
        OmniTrace{' '}
        <span style={{
          marginLeft: 'auto',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: traceColor,
          padding: '2px 6px',
          borderRadius: 4,
          background: traceBg,
          border: `1px solid ${traceBorderColor}`,
        }}>
          {traceText}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 190, overflowY: 'auto' }}>
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

      {replayOpen && (
        <ReplayPanel logs={displayLogs} onClose={() => setReplayOpen(false)} />
      )}

      <button
        type="button"
        data-testid="replay-workflows-btn"
        style={{
          marginTop: 10, width: '100%', padding: '6px 0', borderRadius: 7,
          border: `1px solid ${replayOpen ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
          background: replayOpen ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.03)',
          color: replayOpen ? '#f97316' : 'var(--od-text-tertiary)',
          fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          fontFamily: "'Space Grotesk',sans-serif",
          transition: 'border-color .15s, background .15s, color .15s',
        }}
        onClick={() => setReplayOpen(o => !o)}
        onMouseEnter={e => {
          if (!replayOpen) {
            e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)';
            e.currentTarget.style.color = '#f97316';
          }
        }}
        onMouseLeave={e => {
          if (!replayOpen) {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'var(--od-text-tertiary)';
          }
        }}
      >
        {replayOpen ? '× Close Replay' : '+ Replay Workflows'}
      </button>
    </div>
  );
}

export default OmniTraceFeed;
