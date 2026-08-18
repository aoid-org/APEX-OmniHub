import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { CheckCircle2, Copy, Key, RefreshCw, AlertTriangle, ShieldCheck, Server } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { type IntegrationDef } from '@/omniconnect/core/registry';
import { ProviderLogo } from '../../dashboard/components/ProviderLogo';
import { toast } from 'sonner';

interface ConnectorKitProps {
  integration: IntegrationDef;
  onConnect?: () => void;
}

export const ConnectorKit = ({ integration, onConnect }: ConnectorKitProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ key: string; prefix: string } | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'passed' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState('Test the connector before generating a production key.');

  const serverUrl = import.meta.env.VITE_SUPABASE_URL || 'https://api.apexomnihub.icu';
  const publicUrl = import.meta.env.VITE_PUBLIC_URL || globalThis.location.origin;

  const requireSession = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      toast.error('You must be logged in');
      return null;
    }
    return session;
  };

  const parseResponse = async (response: Response) => {
    try {
      return await response.json() as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  const responseMessage = (data: Record<string, unknown>, fallback: string) => {
    const candidate = data.message ?? data.error;
    if (typeof candidate === 'string') return candidate;
    if (typeof candidate === 'number' || typeof candidate === 'boolean') return String(candidate);
    return fallback;
  };

  const plainError = (value: unknown) => {
    const raw = typeof value === 'string' ? value : 'We could not verify this connector.';
    if (/unauthorized|auth/i.test(raw)) return 'Please sign in again, then retry the connection test.';
    if (/forbidden/i.test(raw)) return 'Your account needs admin access to connect this app.';
    if (/network|fetch|failed/i.test(raw)) return 'We could not reach the connection service. Check your internet connection, then retry.';
    if (/invalid|integration_id/i.test(raw)) return 'We could not verify that connector. Choose the app again and retry.';
    return `${raw} Check the app details, then retry.`;
  };

  const invokeEdgeApi = async (path: string, body: Record<string, unknown>, accessToken: string) => {
    try {
      const res = await fetch(`/functions/v1/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      const fallback = await supabase.functions.invoke(path, { body });
      if (fallback.error) throw fallback.error;
      return fallback.data;
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connector readiness…');
    try {
      const session = await requireSession();
      if (!session) {
        setTestStatus('failed');
        setTestMessage('Please sign in again, then retry the connection test.');
        return;
      }
      await invokeEdgeApi('omnilink-port/keys/test', {
        integration_id: integration.id,
        integration_type: integration.type,
        name: integration.name,
        scopes: integration.scopes ?? [],
      }, session.access_token);

      setTestStatus('passed');
      setTestMessage('Connection test passed. This app is ready for a production key.');
      toast.success('Connection test passed');
    } catch (error: unknown) {
      const message = plainError(error instanceof Error ? error.message : error);
      setTestStatus('failed');
      setTestMessage(message);
      toast.error(message);
    }
  };

  const handleGenerateKey = async () => {
    if (testStatus !== 'passed') {
      const message = 'Run Test Connection successfully before generating a production key.';
      setTestMessage(message);
      toast.error(message);
      return;
    }
    setIsLoading(true);
    try {
      const session = await requireSession();
      if (!session) return;
      const responseData = await invokeEdgeApi('omnilink-port/keys', {
        integration_id: integration.id,
        integration_type: integration.type,
        name: `${integration.name} Connector`,
        scopes: integration.scopes ?? [],
      }, session.access_token);

      setGeneratedKey({
        key: String(responseData.key),
        prefix: String(responseData.key_prefix),
      });
      toast.success('New API Key generated successfully');
      if (onConnect) onConnect();
    } catch (error: unknown) {
      const message = plainError(error instanceof Error ? error.message : 'Failed to generate key');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const config = {
    serverUrl,
    publicUrl,
    authorization: generatedKey ? `Bearer ${generatedKey.key}` : 'Bearer <your-key>',
    integrationId: integration.id,
  };

  const isTestPassed = testStatus === 'passed';
  const isTestRunning = testStatus === 'testing';
  let testAlertClassName = '';
  if (testStatus === 'passed') testAlertClassName = 'border-emerald-500/50 bg-emerald-500/10';
  if (testStatus === 'failed') testAlertClassName = 'border-orange-500/50 bg-orange-500/10';
  const TestAlertIcon = isTestPassed ? CheckCircle2 : ShieldCheck;
  const testAlertIconClassName = isTestPassed ? 'h-4 w-4 text-emerald-500' : 'h-4 w-4';
  const TestButtonIcon = isTestRunning ? RefreshCw : ShieldCheck;
  const testButtonIconClassName = isTestRunning ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4';
  const GenerateButtonIcon = isLoading ? RefreshCw : Key;
  const generateButtonIconClassName = isLoading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4';
  let testAlertTitle = 'Required before save';
  if (testStatus === 'passed') testAlertTitle = 'Ready to connect';
  if (testStatus === 'failed') testAlertTitle = 'Needs attention';

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    toast.success('Configuration copied to clipboard');
  };
  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey.key);
      toast.success('API Key copied to clipboard');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ProviderLogo provider={integration.type || integration.name} size="sm" />
          <span>{integration.name}</span>
        </CardTitle>
        <CardDescription>{integration.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Server URLs */}
        <div className="space-y-2">
          <Label>Server URL</Label>
          <div className="relative">
            <Input readOnly value={serverUrl} className="pr-10 bg-muted" />
          </div>
          <p className="text-xs text-muted-foreground">The endpoint for the OmniHub Edge Function.</p>
        </div>
        <div className="space-y-2">
          <Label>Public URL</Label>
          <div className="relative">
            <Input readOnly value={publicUrl} className="pr-10 bg-muted" />
          </div>
          <p className="text-xs text-muted-foreground">Your publicly accessible instance URL.</p>
        </div>

        {/* Test Connection */}
        <Alert className={testAlertClassName}>
          <TestAlertIcon className={testAlertIconClassName} />
          <AlertTitle>{testAlertTitle}</AlertTitle>
          <AlertDescription>{testMessage}</AlertDescription>
        </Alert>
        <Button
          onClick={handleTestConnection}
          disabled={isTestRunning}
          variant="outline"
          className="w-full"
        >
          <TestButtonIcon className={testButtonIconClassName} />
          Test Connection
        </Button>

        {/* Authentication */}
        <div className="space-y-2">
          <Label>Authentication</Label>
          {generatedKey ? (
            <div className="space-y-2">
              <Alert className="border-orange-500/50 bg-orange-500/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Copy this key immediately</AlertTitle>
                <AlertDescription>We only show this key once. If you lose it, you'll need to regenerate it.</AlertDescription>
              </Alert>
              <div className="relative">
                <Input readOnly value={generatedKey.key} className="pr-24 font-mono text-sm bg-muted/50 border-orange-200 dark:border-orange-900" />
                <Button size="sm" variant="ghost" className="absolute right-1 top-1 h-7" onClick={copyKey}>
                  <Copy className="h-3 w-3 mr-1" />Copy
                </Button>
              </div>
              <Button onClick={handleGenerateKey} disabled={isLoading} variant="outline" className="w-full">
                <GenerateButtonIcon className={generateButtonIconClassName} />
                Regenerate (Rotates Key)
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Generating a key will enable this integration.</p>
              <Button onClick={handleGenerateKey} disabled={isLoading || !isTestPassed} className="w-full">
                <GenerateButtonIcon className={generateButtonIconClassName} />
                Generate New API Key
              </Button>
            </div>
          )}
        </div>

        {/* Quick Configuration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Quick Configuration</Label>
            <Button size="sm" variant="ghost" onClick={copyConfig}>
              <Copy className="h-3 w-3 mr-1" />Copy JSON
            </Button>
          </div>
          <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-auto max-h-32">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};
