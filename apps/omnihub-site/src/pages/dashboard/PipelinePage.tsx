/**
 * PipelinePage — Sales pipeline and opportunity tracking
 * Displays funnel stages, pipeline stats, and recent opportunities.
 *
 * APEX STANDARDS: Atomic, Idempotent, Modular, React.memo wrapped.
 */

import { memo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PIPELINE_STAGES = [
  { name: 'Lead', count: 18, value: '$324K', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { name: 'Qualified', count: 12, value: '$480K', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  { name: 'Proposal', count: 9, value: '$612K', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { name: 'Negotiation', count: 7, value: '$504K', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { name: 'Closed Won', count: 4, value: '$384K', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  { name: 'Closed Lost', count: 2, value: '$96K', color: 'text-red-400', bg: 'bg-red-500/20' },
] as const;

const PIPELINE_STATS = [
  { label: 'Total Pipeline Value', value: '$2.4M', icon: DollarSign, trend: '+12%' },
  { label: 'Win Rate', value: '34%', icon: Target, trend: '+2.1%' },
  { label: 'Avg Deal Size', value: '$48K', icon: BarChart3, trend: '+8%' },
  { label: 'Deals in Pipeline', value: '52', icon: TrendingUp, trend: '+5' },
] as const;

const RECENT_OPPORTUNITIES = [
  { name: 'Acme Corp — Enterprise Suite', stage: 'Negotiation', value: '$128K', owner: 'Sarah L.', updated: '2h ago' },
  { name: 'Nexgen AI — Platform License', stage: 'Proposal', value: '$84K', owner: 'James R.', updated: '4h ago' },
  { name: 'CloudBridge — Integration Pack', stage: 'Qualified', value: '$56K', owner: 'Maria K.', updated: '6h ago' },
  { name: 'DataVault Inc — Annual Renewal', stage: 'Closed Won', value: '$92K', owner: 'Alex T.', updated: '1d ago' },
  { name: 'Orbital Systems — Pilot Program', stage: 'Lead', value: '$34K', owner: 'Chris N.', updated: '1d ago' },
] as const;

export const PipelinePage = memo(function PipelinePage() {
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
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Pipeline</h1>
        <p className="text-sm text-gray-400 mt-1">Sales pipeline and opportunity tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PIPELINE_STATS.map((stat) => (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6"
          >
            <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-purple-500/[0.04] blur-2xl" />
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xs font-medium text-emerald-400">{stat.trend}</span>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel Stages */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Pipeline Stages</h2>
        <div className="flex flex-wrap gap-3">
          {PIPELINE_STAGES.map((stage, i) => (
            <div
              key={stage.name}
              className="relative flex-1 min-w-[140px] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${stage.bg}`} />
                <span className={`text-xs font-semibold ${stage.color}`}>{stage.name}</span>
              </div>
              <p className="text-xl font-bold text-white">{stage.count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stage.value}</p>
              {i < PIPELINE_STAGES.length - 1 && (
                <ChevronRight className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Opportunities Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Recent Opportunities</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="pb-3 text-xs font-medium text-gray-500">Opportunity</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Stage</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Value</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Owner</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Updated</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_OPPORTUNITIES.map((opp) => (
                <tr key={opp.name} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-3 text-sm text-white">{opp.name}</td>
                  <td className="py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-white/[0.04] text-gray-300">
                      {opp.stage}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-300 font-medium">{opp.value}</td>
                  <td className="py-3 text-sm text-gray-400">{opp.owner}</td>
                  <td className="py-3 text-xs text-gray-500">{opp.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
