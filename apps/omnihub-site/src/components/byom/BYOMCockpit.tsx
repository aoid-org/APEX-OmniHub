/**
 * BYOMCockpit — Bring Your Own Model provider connection panel
 * Reads from user_provider_connections_safe view
 */

import { memo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ProviderConnection {
  readonly id: string;
  readonly provider_name: string;
  readonly status: 'active' | 'inactive' | 'error';
  readonly model_id: string | null;
  readonly connected_at: string | null;
}

const STATUS_COLORS = {
  active: { bg: 'rgba(52,211,153,0.1)', text: '#34d399', border: 'rgba(52,211,153,0.3)' },
  inactive: { bg: 'rgba(161,161,170,0.1)', text: '#a1a1aa', border: 'rgba(161,161,170,0.3)' },
  error: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
} as const;

export const BYOMCockpit = memo(function BYOMCockpit() {
  const [connections, setConnections] = useState<readonly ProviderConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const { data } = await supabase
          .from('user_provider_connections_safe')
          .select('id, provider_name, status, model_id, connected_at')
          .order('provider_name');
        if (!cancelled && data) {
          setConnections(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ fontSize: 12, color: '#71717a', textAlign: 'center', padding: 20 }}>
          Loading providers...
        </div>
      );
    }
    
    if (connections.length === 0) {
      return (
        <div style={{ fontSize: 12, color: '#71717a', textAlign: 'center', padding: 20 }}>
          No AI providers connected. Use Connect AI to add one.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {connections.map(conn => {
          const colors = STATUS_COLORS[conn.status];
          return (
            <div
              key={conn.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dfe6fe' }}>
                  {conn.provider_name}
                </div>
                {conn.model_id && (
                  <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
                    {conn.model_id}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                 {conn.status}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#dfe6fe', letterSpacing: '-0.01em' }}>
          BYOM Cockpit
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#a1a1aa',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          AI Providers
        </span>
      </div>

      {renderContent()}
    </div>
  );
});
