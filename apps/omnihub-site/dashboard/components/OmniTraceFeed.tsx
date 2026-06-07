import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  [key: string]: unknown;
}

export function OmniTraceFeed({ tenantId }: Readonly<{ tenantId?: string }>) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [status, setStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'ERROR'>(() => {
    const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    return (!url || !key) ? 'ERROR' : 'CONNECTING';
  });

  useEffect(() => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase env vars missing for OmniTraceFeed');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let channel: ReturnType<typeof supabase.channel>;

    try {
      const channelFilter = tenantId
        ? `tenant_id=eq.${tenantId}`
        : undefined;

      channel = supabase
        .channel('omnitrace-feed')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_log',
            filter: channelFilter
          },
          (payload) => {
            const newLog = payload.new as AuditLog;
            setLogs((prev) => {
              const updated = [newLog, ...prev];
              return updated.slice(0, 50); // Cap at 50 items
            });
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setStatus('SUBSCRIBED');
          } else if (status === 'CHANNEL_ERROR') {
            setStatus('ERROR');
          }
        });
    } catch {
      setStatus('ERROR');
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [tenantId]);

  return (
    <div data-testid="omni-trace-feed" className="omni-trace-feed">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">Trace Feed</h3>
        {status === 'CONNECTING' && <span className="text-sm text-gray-500">Connecting... ⌛</span>}
        {status === 'SUBSCRIBED' && <span className="text-sm text-green-500 font-bold bg-green-100 px-2 py-1 rounded">Live</span>}
        {status === 'ERROR' && <span className="text-sm text-red-500">Disconnected</span>}
      </div>
      <ul className="space-y-2">
        {logs.map(log => (
          <li key={log.id} className="text-sm border-b pb-1">
            <span className="font-mono text-xs text-gray-500 mr-2">
              {new Date(log.created_at || new Date().toISOString()).toLocaleTimeString()}
            </span>
            {log.action}
          </li>
        ))}
        {logs.length === 0 && <li className="text-sm text-gray-400">No events yet</li>}
      </ul>
    </div>
  );
}

export default OmniTraceFeed;
