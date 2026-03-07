/**
 * KPIsPage — Key performance indicators and daily metrics
 * Displays KPI cards with trends and daily target progress bars.
 *
 * APEX STANDARDS: Atomic, Idempotent, Modular, React.memo wrapped.
 */

import { memo } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Shield,
  Clock,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const KPI_CARDS = [
  { label: 'Revenue', value: '$847K', sub: 'MTD', icon: DollarSign, trend: '+14.2%', up: true },
  { label: 'Active Users', value: '12,847', sub: 'Current', icon: Users, trend: '+6.8%', up: true },
  { label: 'Uptime', value: '99.97%', sub: '30-day', icon: Shield, trend: '+0.02%', up: true },
  { label: 'Response Time', value: '142ms', sub: 'P95', icon: Clock, trend: '-8ms', up: true },
  { label: 'Workflows Run', value: '3,241', sub: 'Today', icon: Zap, trend: '+312', up: true },
  { label: 'Error Rate', value: '0.02%', sub: 'Last 24h', icon: AlertTriangle, trend: '-0.01%', up: false },
] as const;

const DAILY_TARGETS = [
  { label: 'Revenue Target', current: 847000, target: 1000000, unit: '$' },
  { label: 'New Sign-ups', current: 184, target: 200, unit: '' },
  { label: 'Support Tickets Resolved', current: 47, target: 60, unit: '' },
  { label: 'API Calls Processed', current: 2840000, target: 3000000, unit: '' },
  { label: 'Deployment Success Rate', current: 98.4, target: 99.5, unit: '%' },
] as const;

function formatTargetValue(value: number, unit: string): string {
  if (unit === '$') {
    return value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : `$${(value / 1000).toFixed(0)}K`;
  }
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value}${unit}`;
}

export const KPIsPage = memo(function KPIsPage() {
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
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">KPIs</h1>
        <p className="text-sm text-gray-400 mt-1">Key performance indicators and daily metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {KPI_CARDS.map((kpi) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6"
          >
            <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-purple-500/[0.04] blur-2xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center">
                <kpi.icon className="w-5 h-5 text-purple-400" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {kpi.up ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {kpi.trend}
              </div>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-1">
              {kpi.label} <span className="text-gray-600">/ {kpi.sub}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Daily Targets */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-5">Daily Targets</h2>
        <div className="space-y-5">
          {DAILY_TARGETS.map((target) => {
            const pct = Math.min((target.current / target.target) * 100, 100);
            const isOnTrack = pct >= 75;
            return (
              <div key={target.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">{target.label}</span>
                  <span className="text-xs text-gray-500">
                    {formatTargetValue(target.current, target.unit)} / {formatTargetValue(target.target, target.unit)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isOnTrack ? 'bg-gradient-to-r from-purple-500/60 to-cyan-500/60' : 'bg-amber-500/50'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-1">{pct.toFixed(1)}% complete</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
