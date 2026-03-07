import { memo } from 'react';
import {
  ArrowLeft,
  Shield,
  Lock,
  Database,
  KeyRound,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const COMPLIANCE_SCORE = 97;

interface AuditCategory {
  name: string;
  grade: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: AuditCategory[] = [
  { name: 'Security', grade: 'A+', icon: <Shield size={20} />, color: 'text-emerald-400' },
  { name: 'Data Protection', grade: 'A', icon: <Database size={20} />, color: 'text-cyan-400' },
  { name: 'Access Control', grade: 'A+', icon: <KeyRound size={20} />, color: 'text-violet-400' },
  { name: 'Compliance', grade: 'A', icon: <FileCheck size={20} />, color: 'text-amber-400' },
];

interface AuditEvent {
  id: string;
  event: string;
  category: string;
  result: 'Pass' | 'Fail' | 'Warning';
  timestamp: string;
}

const EVENTS: AuditEvent[] = [
  { id: 'e1', event: 'SSL certificate rotation', category: 'Security', result: 'Pass', timestamp: '10 min ago' },
  { id: 'e2', event: 'PII data masking verification', category: 'Data Protection', result: 'Pass', timestamp: '25 min ago' },
  { id: 'e3', event: 'Failed login threshold check', category: 'Access Control', result: 'Warning', timestamp: '1 hr ago' },
  { id: 'e4', event: 'GDPR consent audit', category: 'Compliance', result: 'Pass', timestamp: '2 hrs ago' },
  { id: 'e5', event: 'API rate-limit enforcement', category: 'Security', result: 'Pass', timestamp: '3 hrs ago' },
  { id: 'e6', event: 'Data retention policy scan', category: 'Data Protection', result: 'Fail', timestamp: '4 hrs ago' },
  { id: 'e7', event: 'MFA enrollment coverage', category: 'Access Control', result: 'Pass', timestamp: '5 hrs ago' },
  { id: 'e8', event: 'SOC 2 control evidence sync', category: 'Compliance', result: 'Pass', timestamp: '6 hrs ago' },
];

const RESULT_BADGE: Record<AuditEvent['result'], { cls: string; icon: React.ReactNode }> = {
  Pass: { cls: 'bg-emerald-500/20 text-emerald-400', icon: <CheckCircle2 size={12} /> },
  Fail: { cls: 'bg-red-500/20 text-red-400', icon: <XCircle size={12} /> },
  Warning: { cls: 'bg-amber-500/20 text-amber-400', icon: <AlertTriangle size={12} /> },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const AuditsPage = memo(function AuditsPage() {
  const navigate = useNavigate();

  const scoreColor =
    COMPLIANCE_SCORE >= 90
      ? 'stroke-emerald-400'
      : COMPLIANCE_SCORE >= 70
        ? 'stroke-amber-400'
        : 'stroke-red-400';

  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (COMPLIANCE_SCORE / 100) * circumference;

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
          <Lock size={24} className="text-emerald-400" />
          <h1 className="text-2xl font-semibold text-white">Audits &amp; Compliance</h1>
        </div>
      </div>

      {/* Score + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Compliance Ring */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-white/[0.06]" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={scoreColor}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <p className="mt-3 text-3xl font-bold text-white">{COMPLIANCE_SCORE}<span className="text-lg text-gray-500">/100</span></p>
          <p className="text-sm text-gray-500">Compliance Score</p>
        </div>

        {/* Category Cards */}
        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map(cat => (
            <div
              key={cat.name}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 text-center"
            >
              <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ${cat.color}`}>
                {cat.icon}
              </div>
              <p className="mt-3 text-3xl font-bold text-white">{cat.grade}</p>
              <p className="mt-1 text-sm text-gray-500">{cat.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Audit Events */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-300">Recent Audit Events</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-gray-500">
                <th className="px-6 py-4 font-medium">Event</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Result</th>
                <th className="px-6 py-4 font-medium text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {EVENTS.map(ev => {
                const badge = RESULT_BADGE[ev.result];
                return (
                  <tr key={ev.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-6 py-4 text-white">{ev.event}</td>
                    <td className="px-6 py-4 text-gray-400">{ev.category}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                        {badge.icon} {ev.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">{ev.timestamp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
});

export default AuditsPage;
