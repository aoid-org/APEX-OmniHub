import { memo } from 'react';
import {
  GitBranch,
  Plus,
  Clock,
  Layers,
  UserCheck,
  AlertCircle,
  FileBarChart,
  ShieldCheck,
  Database,
  ArrowRight,
  Circle,
} from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodeCount: number;
  estimatedDuration: string;
  category: string;
  categoryColor: string;
  icon: React.ReactNode;
}

interface RecentWorkflow {
  id: string;
  name: string;
  status: 'Running' | 'Completed' | 'Draft';
  nodes: number;
  lastModified: string;
}

const TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'onboard',
    name: 'Customer Onboarding',
    description:
      'Automated welcome sequence with account setup, training, and check-ins.',
    nodeCount: 12,
    estimatedDuration: '7 days',
    category: 'CRM',
    categoryColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    icon: <UserCheck className="h-5 w-5 text-blue-400" />,
  },
  {
    id: 'pipeline',
    name: 'Data Pipeline',
    description:
      'ETL workflow for ingesting, transforming, and loading data across systems.',
    nodeCount: 8,
    estimatedDuration: '15 min',
    category: 'Data',
    categoryColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    icon: <Database className="h-5 w-5 text-emerald-400" />,
  },
  {
    id: 'approval',
    name: 'Approval Chain',
    description:
      'Multi-level approval workflow with escalation paths and notifications.',
    nodeCount: 6,
    estimatedDuration: '2-48 hrs',
    category: 'Operations',
    categoryColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    icon: <Layers className="h-5 w-5 text-purple-400" />,
  },
  {
    id: 'incident',
    name: 'Incident Response',
    description:
      'Alert triage, escalation, remediation, and post-mortem automation.',
    nodeCount: 15,
    estimatedDuration: '30 min',
    category: 'DevOps',
    categoryColor: 'text-red-400 bg-red-400/10 border-red-400/20',
    icon: <AlertCircle className="h-5 w-5 text-red-400" />,
  },
  {
    id: 'report',
    name: 'Report Generation',
    description:
      'Aggregate data from multiple sources into formatted reports with delivery.',
    nodeCount: 9,
    estimatedDuration: '5 min',
    category: 'Analytics',
    categoryColor: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    icon: <FileBarChart className="h-5 w-5 text-orange-400" />,
  },
  {
    id: 'compliance',
    name: 'Compliance Check',
    description:
      'Automated compliance verification against regulatory frameworks.',
    nodeCount: 11,
    estimatedDuration: '20 min',
    category: 'Security',
    categoryColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    icon: <ShieldCheck className="h-5 w-5 text-cyan-400" />,
  },
];

const RECENT_WORKFLOWS: RecentWorkflow[] = [
  {
    id: 'r1',
    name: 'Q1 Sales Pipeline',
    status: 'Running',
    nodes: 14,
    lastModified: '2 hours ago',
  },
  {
    id: 'r2',
    name: 'Employee Offboarding',
    status: 'Completed',
    nodes: 9,
    lastModified: 'Yesterday',
  },
  {
    id: 'r3',
    name: 'Vendor Qualification',
    status: 'Draft',
    nodes: 7,
    lastModified: '3 days ago',
  },
  {
    id: 'r4',
    name: 'Content Review Pipeline',
    status: 'Running',
    nodes: 11,
    lastModified: '5 hours ago',
  },
];

const STATUS_STYLES: Record<
  RecentWorkflow['status'],
  { dot: string; text: string }
> = {
  Running: { dot: 'bg-emerald-400', text: 'text-emerald-400' },
  Completed: { dot: 'bg-blue-400', text: 'text-blue-400' },
  Draft: { dot: 'bg-gray-400', text: 'text-gray-400' },
};

export const WorkflowsPage = memo(function WorkflowsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
            <GitBranch className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Workflows</h1>
            <p className="text-sm text-gray-400">
              Visual workflow builder and process studio
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/30">
          <Plus className="h-4 w-4" />
          Create New Workflow
        </button>
      </div>

      {/* Templates Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Workflow Templates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 transition-colors hover:bg-white/[0.04] cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
                  {tpl.icon}
                </div>
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium ${tpl.categoryColor}`}
                >
                  {tpl.category}
                </span>
              </div>

              <h3 className="mt-4 font-medium text-white">{tpl.name}</h3>
              <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                {tpl.description}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  <span>{tpl.nodeCount} nodes</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{tpl.estimatedDuration}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-600 transition-colors group-hover:text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Workflows */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Recent Workflows
        </h2>
        <div className="space-y-2">
          {RECENT_WORKFLOWS.map((wf) => {
            const style = STATUS_STYLES[wf.status];
            return (
              <div
                key={wf.id}
                className="flex items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]"
              >
                <GitBranch className="h-4 w-4 text-gray-500" />
                <span className="flex-1 text-sm font-medium text-white">
                  {wf.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <Circle
                    className={`h-2 w-2 fill-current ${style.text}`}
                  />
                  <span className={`text-xs font-medium ${style.text}`}>
                    {wf.status}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {wf.nodes} nodes
                </span>
                <span className="text-xs text-gray-500">
                  {wf.lastModified}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default WorkflowsPage;
