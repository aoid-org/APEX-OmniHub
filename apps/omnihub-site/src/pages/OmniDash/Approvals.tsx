import { useManMode, ApprovalTask } from '@/hooks/useManMode';
import { useEffect } from 'react';

// Color Mapping for Risk Classes
const RISK_COLORS = {
  A: 'bg-red-950 text-red-400 border-red-800',
  B: 'bg-orange-950 text-orange-400 border-orange-800',
  C: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  D: 'bg-emerald-950 text-emerald-400 border-emerald-800',
};

export function ApprovalsPage() {
  const { approvals, loading, handleApprove, handleDeny } = useManMode(true); // Default to Demo mode for now

  useEffect(() => {
    document.title = "MAN Mode Console | OmniHub";
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold mb-2 text-white">Pending Approvals</h1>
          <p className="text-gray-400">
            Review and authorize high-risk agent actions.
          </p>
        </header>

        {approvals.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-gray-400">No pending approvals required.</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto bg-white/5 border border-white/10 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-gray-400 uppercase font-mono text-xs bg-white/5">
                  <tr>
                    <th className="py-4 px-4">ID</th>
                    <th className="py-4 px-4">Agent</th>
                    <th className="py-4 px-4">Risk Class</th>
                    <th className="py-4 px-4">Confidence</th>
                    <th className="py-4 px-4">Reasoning</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((task) => (
                    <tr key={task.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-mono text-xs text-gray-400">#{task.id}</td>
                      <td className="py-4 px-4 font-medium text-white">{task.agent}</td>
                      <td className="py-4 px-4">
                        <RiskBadge riskClass={task.risk_class} />
                      </td>
                      <td className="py-4 px-4 text-gray-400">{(task.confidence_score * 100).toFixed(0)}%</td>
                      <td className="py-4 px-4 text-gray-400 max-w-xs truncate" title={task.reasoning}>
                        {task.reasoning}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <ActionButtons task={task} onApprove={handleApprove} onDeny={handleDeny} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {approvals.map((task) => (
                <div key={task.id} className="p-4 border border-white/10 bg-white/5 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <RiskBadge riskClass={task.risk_class} />
                    <span className="font-mono text-xs text-gray-500">#{task.id}</span>
                  </div>

                  <h3 className="font-medium mb-1 text-white">{task.agent}</h3>
                  <p className="text-sm text-gray-400 mb-4">{task.reasoning}</p>

                  <div className="flex justify-between items-center text-xs text-gray-500 mb-4 font-mono">
                    <span>Confidence: {(task.confidence_score * 100).toFixed(0)}%</span>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <ActionButtons task={task} onApprove={handleApprove} onDeny={handleDeny} fullWidth />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Sub-components

function RiskBadge({ riskClass }: { riskClass: ApprovalTask['risk_class'] }) {
  const colorClass = RISK_COLORS[riskClass] || 'bg-gray-800 text-gray-400 border-gray-700';

  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClass}`}>
      Class {riskClass}
    </span>
  );
}

function ActionButtons({
  task,
  onApprove,
  onDeny,
  fullWidth = false
}: {
  task: ApprovalTask;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  fullWidth?: boolean;
}) {
  if (task.status !== 'PENDING') {
    return (
      <span className={`font-mono text-xs font-bold ${
        task.status === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'
      }`}>
        {task.status}
      </span>
    );
  }

  return (
    <div className={`flex gap-2 ${fullWidth ? 'w-full' : ''}`}>
      <button
        onClick={() => onDeny(task.id)}
        className={`px-3 py-1.5 rounded text-xs font-medium bg-red-950 text-red-400 border border-red-900 hover:bg-red-900 transition-colors ${fullWidth ? 'flex-1' : ''}`}
      >
        Deny
      </button>
      <button
        onClick={() => onApprove(task.id)}
        className={`px-3 py-1.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-900 hover:bg-emerald-900 transition-colors ${fullWidth ? 'flex-1' : ''}`}
      >
        Approve
      </button>
    </div>
  );
}
