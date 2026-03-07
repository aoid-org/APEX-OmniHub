import { memo, useState } from 'react';
import {
  Zap,
  Play,
  Pause,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Timer,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface Automation {
  id: string;
  name: string;
  trigger: string;
  status: 'Active' | 'Paused' | 'Error';
  lastRun: string;
  nextRun: string;
  active: boolean;
}

const AUTOMATIONS: Automation[] = [
  {
    id: 'ln',
    name: 'Lead Nurture Sequence',
    trigger: 'New Lead Created',
    status: 'Active',
    lastRun: '5 min ago',
    nextRun: 'On trigger',
    active: true,
  },
  {
    id: 'ip',
    name: 'Invoice Processing',
    trigger: 'Email Attachment',
    status: 'Active',
    lastRun: '12 min ago',
    nextRun: 'On trigger',
    active: true,
  },
  {
    id: 'co',
    name: 'Customer Onboarding',
    trigger: 'New Signup',
    status: 'Active',
    lastRun: '1 hr ago',
    nextRun: 'On trigger',
    active: true,
  },
  {
    id: 'dr',
    name: 'Daily Report Generation',
    trigger: 'Scheduled (6:00 AM)',
    status: 'Paused',
    lastRun: 'Yesterday 6:00 AM',
    nextRun: 'Paused',
    active: false,
  },
  {
    id: 'ir',
    name: 'Incident Response',
    trigger: 'Alert Threshold',
    status: 'Error',
    lastRun: '3 hr ago',
    nextRun: 'Retry in 10m',
    active: true,
  },
];

const STATS = [
  {
    label: 'Active Automations',
    value: '24',
    icon: Zap,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Executions Today',
    value: '1,847',
    icon: BarChart3,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    label: 'Success Rate',
    value: '99.8%',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'Time Saved',
    value: '42h',
    icon: Timer,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
];

const STATUS_STYLES: Record<
  Automation['status'],
  { dot: string; text: string }
> = {
  Active: { dot: 'bg-emerald-400', text: 'text-emerald-400' },
  Paused: { dot: 'bg-yellow-400', text: 'text-yellow-400' },
  Error: { dot: 'bg-red-400', text: 'text-red-400' },
};

export const AutomationsPage = memo(function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(AUTOMATIONS);

  const handleToggle = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              active: !a.active,
              status: !a.active ? 'Active' : 'Paused',
            }
          : a,
      ),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
          <Zap className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Automations</h1>
          <p className="text-sm text-gray-400">
            Workflow automation and pipeline orchestration
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Automations List */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Active Workflows
        </h2>
        <div className="space-y-3">
          {automations.map((auto) => {
            const style = STATUS_STYLES[auto.status];
            return (
              <div
                key={auto.id}
                className="flex items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
              >
                {/* Status icon */}
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]">
                  {auto.status === 'Active' && (
                    <Play className="h-4 w-4 text-emerald-400" />
                  )}
                  {auto.status === 'Paused' && (
                    <Pause className="h-4 w-4 text-yellow-400" />
                  )}
                  {auto.status === 'Error' && (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white">{auto.name}</h3>
                  <p className="text-sm text-gray-500">{auto.trigger}</p>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <span className={`text-xs font-medium ${style.text}`}>
                    {auto.status}
                  </span>
                </div>

                {/* Timing */}
                <div className="hidden sm:flex flex-col items-end text-xs">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{auto.lastRun}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                    <TrendingUp className="h-3 w-3" />
                    <span>{auto.nextRun}</span>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(auto.id)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    auto.active ? 'bg-emerald-500/40' : 'bg-white/10'
                  }`}
                  aria-label={`Toggle ${auto.name}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      auto.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default AutomationsPage;
