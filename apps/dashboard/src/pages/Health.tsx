/**
 * Health check endpoint/page for deployment verification
 * Accessible at /health route
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getOmniLinkHealth } from '@/integrations/omnilink';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    supabase: { status: 'ok' | 'error'; message: string; latency?: number };
    database: { status: 'ok' | 'error'; message: string; latency?: number };
    omnilink: { status: 'ok' | 'error' | 'disabled'; message: string };
  };
  timestamp: string;
}

export default function Health() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSupabase(): Promise<HealthStatus['checks']['supabase']> {
      try {
        const supabaseStart = Date.now();
        const { data: { session: _session }, error: sessionError } = await supabase.auth.getSession();
        const supabaseLatency = Date.now() - supabaseStart;
        if (sessionError) {
          return { status: 'error', message: sessionError.message };
        }
        return { status: 'ok', message: 'Connected', latency: supabaseLatency };
      } catch (error) {
        return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    async function checkDatabase(): Promise<HealthStatus['checks']['database']> {
      try {
        const dbStart = Date.now();
        const { error: dbError } = await supabase.from('health_checks').select('id').limit(1);
        const dbLatency = Date.now() - dbStart;
        if (dbError) {
          return { status: 'error', message: dbError.message };
        }
        return { status: 'ok', message: 'Database accessible', latency: dbLatency };
      } catch (error) {
        return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    async function checkOmniLink(): Promise<HealthStatus['checks']['omnilink']> {
      try {
        const omnilink = await getOmniLinkHealth();
        return { status: omnilink.status, message: omnilink.lastError ?? 'OmniLink port ok' };
      } catch (error) {
        return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    function deriveOverallStatus(checks: HealthStatus['checks']): HealthStatus['status'] {
      const allOk = checks.supabase.status === 'ok'
        && checks.database.status === 'ok'
        && (checks.omnilink.status === 'ok' || checks.omnilink.status === 'disabled');
      if (allOk) return 'healthy';

      const anyOk = checks.supabase.status === 'ok'
        || checks.database.status === 'ok'
        || checks.omnilink.status === 'ok';
      if (anyOk) return 'degraded';

      return 'unhealthy';
    }

    async function checkHealth() {
      const checks: HealthStatus['checks'] = {
        supabase: await checkSupabase(),
        database: await checkDatabase(),
        omnilink: await checkOmniLink(),
      };

      setHealth({
        status: deriveOverallStatus(checks),
        checks,
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
    }

    void checkHealth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Health Check</CardTitle>
            <CardDescription>Unable to determine health status</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {health.status === 'healthy' ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            System Health: {health.status.toUpperCase()}
          </CardTitle>
          <CardDescription>
            Last checked: {new Date(health.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {health.checks.supabase.status === 'ok' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">Supabase Connection</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {health.checks.supabase.message}
                {health.checks.supabase.latency !== undefined && (
                  <span className="ml-2">({health.checks.supabase.latency}ms)</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {health.checks.database.status === 'ok' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">Database</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {health.checks.database.message}
                {health.checks.database.latency !== undefined && (
                  <span className="ml-2">({health.checks.database.latency}ms)</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {health.checks.omnilink.status === 'ok' || health.checks.omnilink.status === 'disabled' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">OmniLink Port</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {health.checks.omnilink.message}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
