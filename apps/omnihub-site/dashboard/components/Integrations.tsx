import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert, Loader2 } from 'lucide-react';
import { ProviderLogo } from './ProviderLogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useOmniBoard } from '@/stores/omniBoardStore';
import { useOmniDashAction, type OmniDashIntent } from '@/omnidash/useOmniDashAction';
import {
  fetchOmniLinkEvents,
  fetchOmniLinkIntegrations,
  fetchOmniLinkKeys,
} from '@/omnidash/omnilink-api';
import type { OmniLinkEvent, OmniLinkIntegration, OmniLinkApiKey } from '@/omnidash/types';

type ConnectorStatus = 'LIVE' | 'NEEDS_AUTH' | 'PARTIAL' | 'ERROR';
type HealthStatus = 'healthy' | 'degraded' | 'unknown';

interface ConnectorViewModel {
  id: string;
  appSlug: string;
  displayName: string;
  status: ConnectorStatus;
  lastSyncAt: string | null;
  healthStatus: HealthStatus;
  supportsContextBinding: boolean;
  integrationType: string;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '');
}

function deriveStatus(
  integration: OmniLinkIntegration,
  integrationKeys: OmniLinkApiKey[],
  integrationEvents: OmniLinkEvent[],
): ConnectorStatus {
  const hasActiveKey = integrationKeys.some((key) => key.revoked_at === null);
  const hasEvents = integrationEvents.length > 0;
  const normalized = (integration.status ?? '').toUpperCase();

  if (normalized.includes('ERROR') || normalized.includes('FAILED')) return 'ERROR';
  if (!hasActiveKey) return 'NEEDS_AUTH';
  if (hasActiveKey && !hasEvents) return 'PARTIAL';
  return 'LIVE';
}

function deriveBoardStatus(status: string): ConnectorStatus {
  if (status === 'LIVE') return 'LIVE';
  if (status === 'CONNECTING' || status === 'LOCAL_LAUNCHED') return 'PARTIAL';
  if (status === 'NEEDS_AUTH') return 'NEEDS_AUTH';
  return 'ERROR';
}

function deriveHealth(events: OmniLinkEvent[]): HealthStatus {
  if (events.length === 0) return 'unknown';
  const newest = new Date(events[0].received_at).getTime();
  const ageHours = (Date.now() - newest) / (1000 * 60 * 60);
  return ageHours <= 24 ? 'healthy' : 'degraded';
}

function mapConnectorModels(
  integrations: OmniLinkIntegration[],
  keys: OmniLinkApiKey[],
  events: OmniLinkEvent[],
): ConnectorViewModel[] {
  // O(N) grouping to avoid O(N^2) filtering in the map loop
  const keysByIntegration = new Map<string, OmniLinkApiKey[]>();
  for (const key of keys) {
    if (!keysByIntegration.has(key.integration_id)) {
      keysByIntegration.set(key.integration_id, []);
    }
    keysByIntegration.get(key.integration_id)!.push(key);
  }

  const eventsByIntegration = new Map<string, OmniLinkEvent[]>();
  for (const event of events) {
    if (!eventsByIntegration.has(event.integration_id)) {
      eventsByIntegration.set(event.integration_id, []);
    }
    eventsByIntegration.get(event.integration_id)!.push(event);
  }

  return integrations.map((integration) => {
    const integrationKeys = keysByIntegration.get(integration.id) || [];
    const integrationEvents = eventsByIntegration.get(integration.id) || [];
    const status = deriveStatus(integration, integrationKeys, integrationEvents);

    return {
      id: integration.id,
      appSlug: slugify(integration.type || integration.name),
      displayName: integration.name,
      status,
      lastSyncAt: integrationEvents[0]?.received_at ?? null,
      healthStatus: deriveHealth(integrationEvents),
      supportsContextBinding: true,
      integrationType: integration.type || '',
    };
  });
}

function statusDotClass(status: ConnectorStatus): string {
  if (status === 'LIVE') return 'bg-emerald-500';
  if (status === 'PARTIAL') return 'bg-amber-500';
  return 'bg-red-500';
}

function statusBadgeClass(status: ConnectorStatus): string {
  if (status === 'LIVE') return 'border-emerald-500/30 text-emerald-300';
  if (status === 'PARTIAL') return 'border-amber-500/30 text-amber-300';
  if (status === 'ERROR') return 'border-red-500/30 text-red-300';
  return 'border-red-500/30 text-red-300';
}

function HealthIcon({ status }: Readonly<{ status: HealthStatus }>) {
  if (status === 'healthy') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === 'degraded') return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
  return <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />;
}

export const Integrations = () => {
  const { user } = useAuth();
  const { dispatch } = useOmniDashAction();
  const boardConnectors = useOmniBoard((s) => s.connectors);


  const integrationsQuery = useQuery({
    queryKey: ['omnilink-integrations', user?.id],
    enabled: !!user,
    queryFn: () => fetchOmniLinkIntegrations(user!.id),
  });

  const keysQuery = useQuery({
    queryKey: ['omnilink-keys', user?.id],
    enabled: !!user,
    queryFn: () => fetchOmniLinkKeys(user!.id),
  });

  const eventsQuery = useQuery({
    queryKey: ['omnilink-events', user?.id],
    enabled: !!user,
    queryFn: () => fetchOmniLinkEvents(user!.id),
  });

  const connectors = useMemo(() => {
    const dbModels = mapConnectorModels(
      integrationsQuery.data ?? [],
      keysQuery.data ?? [],
      eventsQuery.data ?? [],
    );
    // Merge OmniBoard store state — store wins over stale DB cache for
    // immediate post-auth reflection without waiting for React Query refetch.
    return dbModels.map((c) => {
      const boardRecord = boardConnectors?.get(c.appSlug);
      if (!boardRecord) return c;
      const boardStatus = deriveBoardStatus(boardRecord.status);
      return { ...c, status: boardStatus };
    });
  }, [integrationsQuery.data, keysQuery.data, eventsQuery.data, boardConnectors]);

  const isLoading = integrationsQuery.isLoading || keysQuery.isLoading || eventsQuery.isLoading;

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="py-10 text-center text-sm text-slate-300">
            Sign in to view OmniBoard connector status.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-6 bg-slate-950 p-6 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">OmniBoard</h1>
          <p className="text-sm text-slate-400">Manage your app stack in OmniBoard</p>
        </div>
        <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
          {connectors.length} connectors
        </Badge>
      </div>



      {isLoading && (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="py-10 text-center text-sm text-slate-400">Loading connectors…</CardContent>
        </Card>
      )}

      {!isLoading && connectors.length === 0 && (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="py-10 text-center text-sm text-slate-400" data-testid="no-connectors-state">
            No connector records found. Tiles are rendered only from live connector records.
          </CardContent>
        </Card>
      )}

      {!isLoading && connectors.length > 0 && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="connector-grid">
          {connectors.map((connector) => (
            <Card
              key={connector.id}
              className="border-slate-800 bg-slate-900"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({
                    type: 'app',
                    connector_id: connector.id,
                    app_slug: connector.appSlug,
                    status: connector.status,
                    metadata: {
                      health_status: connector.healthStatus,
                      last_sync_at: connector.lastSyncAt,
                    },
                  }),
                );
              }}
              data-testid={`connector-tile-${connector.id}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <ProviderLogo provider={connector.displayName || connector.appSlug} size="sm" />
                    {connector.displayName}
                  </span>
                  <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(connector.status)}`} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={statusBadgeClass(connector.status)} data-testid={`connector-status-${connector.id}`}>
                    {connector.status}
                  </Badge>
                  <span className="text-xs text-slate-400">{connector.appSlug}</span>
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>
                      Last sync:{' '}
                      {connector.lastSyncAt
                        ? new Date(connector.lastSyncAt).toLocaleString()
                        : 'No sync events'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <HealthIcon status={connector.healthStatus} />
                    <span>Health: {connector.healthStatus}</span>
                  </div>
                </div>

                <div className="rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-300">
                  Drag this tile into OmniSLATE context to bind connector metadata.
                </div>
                
                {connector.integrationType === 'mobile_app' ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-all duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open('https://apps.apple.com/us/app/apex-omnilink/id1234567890', '_blank', 'noopener,noreferrer');
                      }}
                    >
                      App Store
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 transition-all duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open('https://play.google.com/store/apps/details?id=com.apex.omnilink', '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Play Store
                    </Button>
                  </div>
                ) : connector.status !== 'LIVE' && (
                  <Button
                    variant="outline"
                    className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-all duration-300"
                    style={{ transitionTimingFunction: 'var(--apex-ease-out-expo)' }}
                    disabled={boardConnectors?.get(connector.appSlug)?.status === 'CONNECTING'}
                    onClick={(e) => {
                      e.stopPropagation();
                      const intent: OmniDashIntent = {
                        source: 'integration',
                        appKey: connector.appSlug,
                        provider: connector.displayName,
                        label: connector.displayName,
                        category: 'platform',
                        routePath: `/omnidash/integrations/${connector.id}`,
                        dashboardStatus: 'Partial',
                        contextData: {
                          connectorId: connector.id,
                          healthStatus: connector.healthStatus,
                          lastSyncAt: connector.lastSyncAt,
                        },
                      };
                      dispatch(intent);
                    }}
                  >
                    {(() => {
                      if (boardConnectors?.get(connector.appSlug)?.status === 'CONNECTING') {
                        return (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting…
                          </>
                        );
                      }
                      if (connector.status === 'NEEDS_AUTH') {
                        return 'Connect Account';
                      }
                      return 'Resolve Connection';
                    })()}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};

export default Integrations;
