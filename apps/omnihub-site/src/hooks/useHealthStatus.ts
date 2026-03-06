/**
 * useHealthStatus — Self-contained health status hook for apps/omnihub-site.
 *
 * Does NOT depend on src/guardian/heartbeat (which breaks the cross-app build).
 * Instead, polls the Supabase connection status as a proxy for system health.
 *
 * Health derivation:
 *   - "healthy": Supabase reachable, auth session valid
 *   - "degraded": Supabase reachable but auth session missing
 *   - "critical": Supabase unreachable or error
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

interface HealthState {
  status: HealthStatus;
  lastChecked: Date;
  loopStatuses: ReadonlyArray<{ loopName: string; status: 'healthy' | 'stale' }>;
}

const POLL_INTERVAL_MS = 30_000;

export function useSystemHealth() {
  const [state, setState] = useState<HealthState>({
    status: 'healthy',
    lastChecked: new Date(),
    loopStatuses: [],
  });

  const ping = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const status: HealthStatus = session ? 'healthy' : 'degraded';
      setState({
        status,
        lastChecked: new Date(),
        loopStatuses: session
          ? [{ loopName: 'auth', status: 'healthy' }]
          : [{ loopName: 'auth', status: 'stale' }],
      });
    } catch {
      setState({
        status: 'critical',
        lastChecked: new Date(),
        loopStatuses: [{ loopName: 'supabase', status: 'stale' }],
      });
    }
  }, []);

  useEffect(() => {
    ping().catch(() => { /* fail-silent ping */ });
    const id = setInterval(() => { ping().catch(() => { /* fail-silent ping */ }); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ping]);

  return {
    status: state.status,
    lastChecked: state.lastChecked,
    loopStatuses: state.loopStatuses,
    pingSystem: ping,
  };
}
