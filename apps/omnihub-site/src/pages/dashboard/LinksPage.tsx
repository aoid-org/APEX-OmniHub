import { memo, useState } from 'react';
import {
  Link2,
  Plus,
  Circle,
  Activity,
  Clock,
  Wifi,
  Globe,
  Database,
  MessageSquare,
  Mail,
  RefreshCw,
  Cloud,
} from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  protocol: 'REST' | 'GraphQL' | 'WebSocket' | 'gRPC';
  status: 'healthy' | 'degraded' | 'down';
  latency: string;
  lastHeartbeat: string;
  icon: React.ReactNode;
}

const CONNECTIONS: Connection[] = [
  {
    id: 'sf',
    name: 'Salesforce API',
    protocol: 'REST',
    status: 'healthy',
    latency: '42ms',
    lastHeartbeat: '2s ago',
    icon: <Globe className="h-5 w-5 text-blue-400" />,
  },
  {
    id: 'stripe',
    name: 'Stripe Webhooks',
    protocol: 'WebSocket',
    status: 'healthy',
    latency: '18ms',
    lastHeartbeat: '1s ago',
    icon: <Activity className="h-5 w-5 text-purple-400" />,
  },
  {
    id: 'slack',
    name: 'Slack Events',
    protocol: 'WebSocket',
    status: 'degraded',
    latency: '156ms',
    lastHeartbeat: '8s ago',
    icon: <MessageSquare className="h-5 w-5 text-yellow-400" />,
  },
  {
    id: 'gw',
    name: 'Google Workspace',
    protocol: 'REST',
    status: 'healthy',
    latency: '67ms',
    lastHeartbeat: '3s ago',
    icon: <Mail className="h-5 w-5 text-red-400" />,
  },
  {
    id: 'hs',
    name: 'HubSpot Sync',
    protocol: 'GraphQL',
    status: 'healthy',
    latency: '89ms',
    lastHeartbeat: '5s ago',
    icon: <RefreshCw className="h-5 w-5 text-orange-400" />,
  },
  {
    id: 'aws',
    name: 'AWS S3',
    protocol: 'gRPC',
    status: 'down',
    latency: '--',
    lastHeartbeat: '2m ago',
    icon: <Cloud className="h-5 w-5 text-emerald-400" />,
  },
];

const STATUS_COLORS: Record<Connection['status'], string> = {
  healthy: 'bg-emerald-400',
  degraded: 'bg-yellow-400',
  down: 'bg-red-400',
};

const STATUS_LABELS: Record<Connection['status'], string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
};

const PROTOCOL_COLORS: Record<Connection['protocol'], string> = {
  REST: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  GraphQL: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  WebSocket: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  gRPC: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

export const LinksPage = memo(function LinksPage() {
  const [connections] = useState<Connection[]>(CONNECTIONS);
  const activeCount = connections.filter((c) => c.status !== 'down').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Link2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Connections</h1>
            <p className="text-sm text-gray-400">
              Manage integration endpoints and API links
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30">
          <Plus className="h-4 w-4" />
          New Connection
        </button>
      </div>

      {/* Active Count Banner */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Wifi className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Active Connections</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {activeCount}
              </span>
              <span className="text-sm text-gray-500">Active</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Circle className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
              <span className="text-gray-300">
                {connections.filter((c) => c.status === 'healthy').length}{' '}
                Healthy
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
              <span className="text-gray-300">
                {connections.filter((c) => c.status === 'degraded').length}{' '}
                Degraded
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-2.5 w-2.5 fill-red-400 text-red-400" />
              <span className="text-gray-300">
                {connections.filter((c) => c.status === 'down').length} Down
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connections.map((conn) => (
          <div
            key={conn.id}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
                  {conn.icon}
                </div>
                <div>
                  <h3 className="font-medium text-white">{conn.name}</h3>
                  <span
                    className={`mt-1 inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${PROTOCOL_COLORS[conn.protocol]}`}
                  >
                    {conn.protocol}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[conn.status]}`}
                />
                <span className="text-xs text-gray-400">
                  {STATUS_LABELS[conn.status]}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <div className="flex items-center gap-1.5 text-sm">
                <Activity className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-gray-300">{conn.latency}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-gray-400">{conn.lastHeartbeat}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default LinksPage;
