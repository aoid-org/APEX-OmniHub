import { memo, useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

interface ApprovalItem {
  id: string;
  action: string;
  requestedBy: string;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  timeSubmitted: string;
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_QUEUE: ApprovalItem[] = [
  { id: 'a1', action: 'Deploy model v2.4 to production', requestedBy: 'Sarah Chen', risk: 'High', timeSubmitted: '2 min ago', status: 'pending' },
  { id: 'a2', action: 'Grant admin access to Analytics module', requestedBy: 'James Park', risk: 'Critical', timeSubmitted: '8 min ago', status: 'pending' },
  { id: 'a3', action: 'Update billing tier for Org #4412', requestedBy: 'Mia Torres', risk: 'Medium', timeSubmitted: '14 min ago', status: 'pending' },
  { id: 'a4', action: 'Enable third-party webhook integration', requestedBy: 'Liam Nguyen', risk: 'Medium', timeSubmitted: '22 min ago', status: 'pending' },
  { id: 'a5', action: 'Archive stale customer records', requestedBy: 'Priya Sharma', risk: 'Low', timeSubmitted: '31 min ago', status: 'pending' },
  { id: 'a6', action: 'Rotate API keys for production env', requestedBy: 'Daniel Lee', risk: 'High', timeSubmitted: '45 min ago', status: 'pending' },
  { id: 'a7', action: 'Add new data-processing pipeline', requestedBy: 'Olivia Kim', risk: 'Low', timeSubmitted: '1 hr ago', status: 'pending' },
];

const HISTORY: ApprovalItem[] = [
  { id: 'h1', action: 'Scale inference cluster to 8 nodes', requestedBy: 'Ethan Reyes', risk: 'Medium', timeSubmitted: '3 hrs ago', status: 'approved' },
  { id: 'h2', action: 'Delete staging environment snapshot', requestedBy: 'Grace Liu', risk: 'Low', timeSubmitted: '5 hrs ago', status: 'rejected' },
  { id: 'h3', action: 'Modify RBAC policy for engineering', requestedBy: 'Noah Bell', risk: 'High', timeSubmitted: '8 hrs ago', status: 'approved' },
];

const RISK_COLORS: Record<ApprovalItem['risk'], string> = {
  Low: 'bg-emerald-500/20 text-emerald-400',
  Medium: 'bg-amber-500/20 text-amber-400',
  High: 'bg-orange-500/20 text-orange-400',
  Critical: 'bg-red-500/20 text-red-400',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ApprovalsPage = memo(function ApprovalsPage() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<ApprovalItem[]>(INITIAL_QUEUE);
  const [history, setHistory] = useState<ApprovalItem[]>(HISTORY);

  const pending = queue.filter(i => i.status === 'pending');

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    const item = queue.find(i => i.id === id);
    if (!item) return;
    setQueue(prev => prev.filter(i => i.id !== id));
    setHistory(prev => [{ ...item, status: action }, ...prev]);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] p-2 text-gray-400 transition hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-amber-400" />
          <h1 className="text-2xl font-semibold text-white">MAN Mode Approvals</h1>
          <span className="rounded-full bg-amber-500/20 px-3 py-0.5 text-sm font-medium text-amber-400">
            {pending.length} Pending
          </span>
        </div>
      </div>

      {/* Pending Queue */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-300">Approval Queue</h2>
        <div className="space-y-3">
          {pending.map(item => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 space-y-1">
                <p className="text-white font-medium">{item.action}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span>Requested by <span className="text-gray-300">{item.requestedBy}</span></span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {item.timeSubmitted}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${RISK_COLORS[item.risk]}`}>
                  {item.risk}
                </span>
                <button
                  onClick={() => handleAction(item.id, 'approved')}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-4 py-1.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button
                  onClick={() => handleAction(item.id, 'rejected')}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-4 py-1.5 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-10 text-center text-gray-500">
              All caught up — no pending approvals.
            </div>
          )}
        </div>
      </section>

      {/* History */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-300">Recent History</h2>
        <div className="space-y-3">
          {history.map(item => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 space-y-1">
                <p className="text-gray-300">{item.action}</p>
                <p className="text-sm text-gray-500">
                  {item.requestedBy} &middot; {item.timeSubmitted}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${RISK_COLORS[item.risk]}`}>
                  {item.risk}
                </span>
                {item.status === 'approved' ? (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                    <CheckCircle2 size={14} /> Approved
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-red-400">
                    <XCircle size={14} /> Rejected
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
});

export default ApprovalsPage;
