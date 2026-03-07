import { memo } from 'react';
import {
  ArrowLeft,
  CreditCard,
  Zap,
  HardDrive,
  GitBranch,
  Users,
  Crown,
  Download,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

interface UsageMetric {
  label: string;
  current: string;
  limit: string;
  percentage: number;
  icon: React.ReactNode;
  color: string;
}

const USAGE_METRICS: UsageMetric[] = [
  { label: 'API Calls', current: '847K', limit: '1M', percentage: 84.7, icon: <Zap size={18} />, color: 'bg-violet-500' },
  { label: 'Storage', current: '12.4 GB', limit: '50 GB', percentage: 24.8, icon: <HardDrive size={18} />, color: 'bg-cyan-500' },
  { label: 'Workflows', current: '3,241', limit: 'Unlimited', percentage: 100, icon: <GitBranch size={18} />, color: 'bg-emerald-500' },
  { label: 'Users', current: '24', limit: '50', percentage: 48, icon: <Users size={18} />, color: 'bg-amber-500' },
];

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Pending';
}

const INVOICES: Invoice[] = [
  { id: 'INV-2026-003', date: 'Mar 1, 2026', amount: '$2,499.00', status: 'Pending' },
  { id: 'INV-2026-002', date: 'Feb 1, 2026', amount: '$2,499.00', status: 'Paid' },
  { id: 'INV-2026-001', date: 'Jan 1, 2026', amount: '$2,499.00', status: 'Paid' },
  { id: 'INV-2025-012', date: 'Dec 1, 2025', amount: '$2,499.00', status: 'Paid' },
  { id: 'INV-2025-011', date: 'Nov 1, 2025', amount: '$2,299.00', status: 'Paid' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const BillingPage = memo(function BillingPage() {
  const navigate = useNavigate();

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
          <CreditCard size={24} className="text-violet-400" />
          <h1 className="text-2xl font-semibold text-white">Billing &amp; Usage</h1>
        </div>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-500/[0.08] to-indigo-500/[0.04] backdrop-blur-xl p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-400">
              <Crown size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white">Enterprise</h2>
                <span className="rounded-full bg-violet-500/20 px-3 py-0.5 text-xs font-medium text-violet-400">
                  Active
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                <span className="text-3xl font-bold text-white">$2,499</span>
                <span className="text-gray-500">/month</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Calendar size={16} />
            <span>Renewal: <span className="text-gray-300">Apr 1, 2026</span></span>
          </div>
        </div>
      </div>

      {/* Usage Metrics */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-300">Usage This Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {USAGE_METRICS.map(metric => (
            <div
              key={metric.label}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-gray-400">
                    {metric.icon}
                  </div>
                  <span className="font-medium text-white">{metric.label}</span>
                </div>
                <span className="text-sm text-gray-400">
                  <span className="text-white font-medium">{metric.current}</span>
                  {' / '}
                  {metric.limit}
                </span>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${metric.color} transition-all`}
                  style={{
                    width: `${metric.label === 'Workflows' ? 100 : metric.percentage}%`,
                    opacity: metric.label === 'Workflows' ? 0.4 : 1,
                  }}
                />
              </div>
              {metric.percentage > 80 && metric.label !== 'Workflows' && (
                <p className="mt-2 text-xs text-amber-400">
                  Approaching limit &mdash; consider upgrading
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recent Invoices */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-300">Recent Invoices</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-gray-500">
                <th className="px-6 py-4 font-medium">Invoice</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map(inv => (
                <tr key={inv.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-6 py-4 font-medium text-white">{inv.id}</td>
                  <td className="px-6 py-4 text-gray-400">{inv.date}</td>
                  <td className="px-6 py-4 text-white">{inv.amount}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {inv.status === 'Paid' && <CheckCircle2 size={12} />}
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-gray-400 transition hover:bg-white/[0.08] hover:text-white ml-auto">
                      <Download size={12} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
});

export default BillingPage;
