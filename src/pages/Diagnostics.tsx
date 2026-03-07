import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Copy } from 'lucide-react';
import { getAuditQueueSnapshot } from '@/security/auditLog';
import { getUpsertQueueSnapshot } from '@/zero-trust/deviceRegistry';
import { getErrorLogs } from '@/lib/monitoring';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticStatus {
  supabaseConnected: boolean;
  deviceQueueSize: number;
  auditQueueSize: number;
  errorCount: number;
  lastError?: string;
}

export default function Diagnostics() {
  const [status, setStatus] = useState<DiagnosticStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      // Check Supabase connection
      let supabaseConnected = false;
      try {
        const { data, error } = await supabase.functions.invoke('supabase_healthcheck');
        supabaseConnected = !error && data?.status === 'OK';
      } catch {
        supabaseConnected = false;
      }

      // Get queue sizes
      const deviceQueue = await getUpsertQueueSnapshot();
      const auditQueue = await getAuditQueueSnapshot();
      const errors = getErrorLogs();

      setStatus({
        supabaseConnected,
        deviceQueueSize: deviceQueue.filter((q) => q.status === 'pending').length,
        auditQueueSize: auditQueue.filter((q) => q.status === 'pending').length,
        errorCount: errors.length,
        lastError: errors[errors.length - 1]?.message,
      });
    } catch (error) {
      console.error('Failed to load diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const copyDiagnostics = () => {
    if (!status) return;
    const text = JSON.stringify(status, null, 2);
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Diagnostics...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load diagnostics</AlertTitle>
          <AlertDescription>Please refresh the page and try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Diagnostics</h1>
          <p className="text-muted-foreground mt-2">
            Monitor system health and queue status
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDiagnostics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={copyDiagnostics} variant="outline" size="sm">
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.supabaseConnected ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Supabase Connection
            </CardTitle>
            <CardDescription>Database and edge function connectivity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Status:</span>
                <Badge variant={status.supabaseConnected ? 'default' : 'destructive'}>
                  {status.supabaseConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue Status</CardTitle>
            <CardDescription>Pending sync operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Device Registry:</span>
                <Badge variant={status.deviceQueueSize > 0 ? 'secondary' : 'default'}>
                  {status.deviceQueueSize} pending
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Audit Logs:</span>
                <Badge variant={status.auditQueueSize > 0 ? 'secondary' : 'default'}>
                  {status.auditQueueSize} pending
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Status</CardTitle>
            <CardDescription>Recent error count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Errors:</span>
                <Badge variant={status.errorCount > 0 ? 'destructive' : 'default'}>
                  {status.errorCount}
                </Badge>
              </div>
              {status.lastError && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Last Error:</p>
                  <p className="text-xs font-mono bg-muted p-2 rounded mt-1">
                    {status.lastError}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {status.errorCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errors Detected</AlertTitle>
          <AlertDescription>
            There are {status.errorCount} errors in the log. Check browser console or use the
            monitoring tools for details.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
