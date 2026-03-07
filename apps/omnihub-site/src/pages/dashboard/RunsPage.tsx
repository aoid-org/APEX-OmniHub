/**
 * RunsPage — Workflow execution history and trace logs
 * Displays run status summary, recent runs table, and status filter buttons.
 *
 * APEX STANDARDS: Atomic, Idempotent, Modular, React.memo wrapped.
 */

import { memo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  Filter,
  Play,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type RunStatus = 'Completed' | 'Running' | 'Failed' | 'Queued';

interface RunSummary {
  readonly status: RunStatus;
  readonly count: number;
  readonly color: string;
  readonly bg: string;
  readonly icon: typeof CheckCircle2;
}

interface RecentRun {
  readonly runId: string;
  readonly workflow: string;
  readonly status: RunStatus;
  readonly duration: string;
  readonly started: string;
}

const RUN_SUMMARY: readonly RunSummary[] = [
  { status: 'Completed', count: 847, color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle2 },
  { status: 'Running', count: 12, color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Loader2 },
  { status: 'Failed', count: 3, color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
  { status: 'Queued', count: 8, color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Clock },
] as const;

const STATUS_BADGE: Record<RunStatus, string> = {
  Completed: 'text-emerald-400 bg-emerald-500/20',
  Running: 'text-blue-400 bg-blue-500/20',
  Failed: 'text-red-400 bg-red-500/20',
  Queued: 'text-amber-400 bg-amber-500/20',
};

const RECENT_RUNS: readonly RecentRun[] = [
  { runId: 'run-a8f3c', workflow: 'Lead Scoring Pipeline', status: 'Completed', duration: '4.2s', started: '2 min ago' },
  { runId: 'run-b7e2d', workflow: 'Customer Onboarding Seq', status: 'Running', duration: '12.8s', started: '3 min ago' },
  { runId: 'run-c6d1e', workflow: 'Invoice Generation', status: 'Completed', duration: '1.9s', started: '5 min ago' },
  { runId: 'run-d5c0f', workflow: 'Data Sync — Salesforce', status: 'Failed', duration: '8.4s', started: '8 min ago' },
  { runId: 'run-e4b9a', workflow: 'Monthly Report Builder', status: 'Queued', duration: '--', started: '10 min ago' },
  { runId: 'run-f3a8b', workflow: 'Anomaly Detection Scan', status: 'Completed', duration: '22.1s', started: '12 min ago' },
  { runId: 'run-g2d7c', workflow: 'Slack Notification Dispatch', status: 'Completed', duration: '0.8s', started: '15 min ago' },
  { runId: 'run-h1c6d', workflow: 'Inventory Reconciliation', status: 'Running', duration: '34.6s', started: '18 min ago' },
  { runId: 'run-i0b5e', workflow: 'Email Campaign Trigger', status: 'Completed', duration: '2.3s', started: '22 min ago' },
  { runId: 'run-j9a4f', workflow: 'Compliance Audit Check', status: 'Queued', duration: '--', started: '25 min ago' },
  { runId: 'run-k8z3g', workflow: 'Webhook Relay — Stripe', status: 'Failed', duration: '6.1s', started: '28 min ago' },
  { runId: 'run-l7y2h', workflow: 'User Segmentation Job', status: 'Completed', duration: '18.4s', started: '32 min ago' },
] as const;

const ALL_STATUSES: readonly RunStatus[] = ['Completed', 'Running', 'Failed', 'Queued'];

export const RunsPage = memo(function RunsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<RunStatus | 'ALL'>('ALL');

  const handleFilterClick = useCallback((filter: RunStatus | 'ALL') => {
    setActiveFilter(filter);
  }, []);

  const filteredRuns = activeFilter === 'ALL'
    ? RECENT_RUNS
    : RECENT_RUNS.filter((r) => r.status === activeFilter);

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
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Runs</h1>
        <p className="text-sm text-gray-400 mt-1">Workflow execution history and trace logs</p>
      </div>

      {/* Run Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {RUN_SUMMARY.map((summary) => (
          <div
            key={summary.status}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6"
          >
            <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-purple-500/[0.04] blur-2xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center">
                <summary.icon className={`w-5 h-5 ${summary.color}`} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${summary.bg} ${summary.color}`}>
                {summary.status}
              </span>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{summary.count.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{summary.status} runs today</p>
          </div>
        ))}
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-gray-500 mr-1" />
        <button
          onClick={() => handleFilterClick('ALL')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            activeFilter === 'ALL'
              ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
              : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:text-gray-300'
          }`}
        >
          All Runs
        </button>
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => handleFilterClick(status)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeFilter === status
                ? `border-white/10 ${STATUS_BADGE[status]}`
                : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:text-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Recent Runs Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-gray-300">Recent Runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="pb-3 text-xs font-medium text-gray-500">Run ID</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Workflow</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Status</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Duration</th>
                <th className="pb-3 text-xs font-medium text-gray-500">Started</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr key={run.runId} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-3 text-xs font-mono text-gray-400">{run.runId}</td>
                  <td className="py-3 text-sm text-white">{run.workflow}</td>
                  <td className="py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[run.status]}`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-300 font-mono">{run.duration}</td>
                  <td className="py-3 text-xs text-gray-500">{run.started}</td>
                </tr>
              ))}
              {filteredRuns.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                    No runs match the selected filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
