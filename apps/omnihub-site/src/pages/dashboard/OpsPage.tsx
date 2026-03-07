/**
 * OpsPage — Operations, incidents, and system health
 * Displays system status cards, recent incidents, and uptime metrics.
 *
 * APEX STANDARDS: Atomic, Idempotent, Modular, React.memo wrapped.
 */

import { memo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Database,
  Globe,
  Cpu,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type SystemStatus = 'Operational' | 'Degraded' | 'Down';

interface SystemService {
  readonly name: string;
  readonly status: SystemStatus;
  readonly uptime: string;
  readonly icon: typeof Server;
}

const SYSTEMS: readonly SystemService[] = [
  { name: 'API Gateway', status: 'Operational', uptime: '99.99%', icon: Globe },
  { name: 'Database', status: 'Operational', uptime: '99.98%', icon: Database },
  { name: 'Edge Functions', status: 'Degraded', uptime: '99.84%', icon: Cpu },
  { name: 'Workflow Engine', status: 'Operational', uptime: '99.97%', icon: Server },
] as const;

const INCIDENTS = [
  {
    id: 'INC-2847',
    title: 'Edge Function latency spike in us-east-1',
    severity: 'warning' as const,
    time: '47 min ago',
    status: 'Investigating',
    description: 'Elevated p99 latency observed on edge functions deployed to us-east-1 region.',
  },
  {
    id: 'INC-2846',
    title: 'Scheduled maintenance: Database cluster upgrade',
    severity: 'info' as const,
    time: '3h ago',
    status: 'Resolved',
    description: 'Planned rolling upgrade of primary database cluster completed without downtime.',
  },
  {
    id: 'INC-2844',
    title: 'API rate-limiting misconfiguration',
    severity: 'critical' as const,
    time: '1d ago',
    status: 'Resolved',
    description: 'Incorrect rate-limit threshold caused 429 errors for a subset of enterprise clients.',
  },
] as const;

const STATUS_CONFIG: Record<SystemStatus, { color: string; icon: typeof CheckCircle2 }> = {
  Operational: { color: 'text-emerald-400', icon: CheckCircle2 },
  Degraded: { color: 'text-amber-400', icon: AlertTriangle },
  Down: { color: 'text-red-400', icon: XCircle },
};

const SEVERITY_STYLES = {
  info: 'bg-blue-500/20 text-blue-400',
  warning: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-red-500/20 text-red-400',
} as const;

export const OpsPage = memo(function OpsPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/omnidash')}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to OmniBoard
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Ops</h1>
        <p className="text-sm text-gray-400 mt-1">Operations, incidents, and system health</p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {SYSTEMS.map((sys) => {
          const cfg = STATUS_CONFIG[sys.status];
          return (
            <div
              key={sys.name}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6"
            >
              <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-purple-500/[0.04] blur-2xl" />
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center">
                  <sys.icon className="w-5 h-5 text-purple-400" />
                </div>
                <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <p className="text-sm font-semibold text-white">{sys.name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs font-medium ${cfg.color}`}>{sys.status}</span>
                <span className="text-xs text-gray-500">{sys.uptime} uptime</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Uptime Overview */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Uptime — Last 90 Days</h2>
        <div className="flex gap-[2px]">
          {Array.from({ length: 90 }, (_, i) => {
            const isToday = i === 89;
            const isDegraded = i === 89 || i === 72;
            return (
              <div
                key={i}
                className={`flex-1 h-8 rounded-sm ${isToday ? 'bg-amber-500/50' : isDegraded ? 'bg-amber-500/30' : 'bg-emerald-500/30'}`}
                title={`Day ${i + 1}`}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30" />
            <span className="text-[10px] text-gray-500">Operational</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/30" />
            <span className="text-[10px] text-gray-500">Degraded</span>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Recent Incidents</h2>
        <div className="space-y-4">
          {INCIDENTS.map((inc) => (
            <div
              key={inc.id}
              className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_STYLES[inc.severity]}`}>
                    {inc.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">{inc.id}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {inc.time}
                </div>
              </div>
              <p className="text-sm text-white font-medium">{inc.title}</p>
              <p className="text-xs text-gray-500 mt-1">{inc.description}</p>
              <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full ${inc.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {inc.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
