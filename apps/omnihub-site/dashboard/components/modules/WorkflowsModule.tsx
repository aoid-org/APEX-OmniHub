import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import type { ModuleListItem } from '@/dashboard/components/ModuleRegistry';
import CreateWorkflowForm from './CreateWorkflowForm';

interface Props {
  readonly onClose: () => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_COLOR: Readonly<Record<string, string>> = {
  active:   '#34d399',
  pending:  '#facc15',
  inactive: '#6b7280',
  error:    '#ef4444',
};

function parseSteps(detail: string | undefined): number {
  const m = detail?.match(/(\d+)\s+step/);
  return m ? Math.min(Number(m[1]), 12) : 4;
}

function WorkflowLane({
  item,
  y,
  selected,
  onToggle,
}: {
  readonly item: ModuleListItem;
  readonly y: number;
  readonly selected: boolean;
  readonly onToggle: () => void;
}) {
  const steps      = parseSteps(item.detail);
  const color      = STATUS_COLOR[item.status] ?? '#6b7280';
  const rowH       = 44;
  const midY       = y + rowH / 2;
  const startX     = 8;
  const trackStart = 160;
  const trackEnd   = 390;
  const stepSpacing = (trackEnd - trackStart) / Math.max(steps - 1, 1);

  const isDraft = item.status === 'pending';

  return (
    <g
      key={item.id}
      onClick={onToggle}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${selected ? 'Deselect' : 'Select'} workflow ${item.label}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Row background */}
      <rect x={0} y={y + 3} width={428} height={rowH - 6} rx={6}
        fill={selected ? `${color}18` : `${color}08`}
        stroke={selected ? color : `${color}20`}
        strokeWidth={selected ? 1.5 : 1} />

      {/* Status dot */}
      <circle cx={startX + 8} cy={midY} r={5} fill={color} />
      {item.status === 'active' && (
        <circle cx={startX + 8} cy={midY} r={8} fill="none"
          stroke={color} strokeWidth={1} opacity={0.4} />
      )}

      {/* Label */}
      <text x={startX + 20} y={midY - 4} fontSize={11} fontWeight={600}
        fill="var(--omni-t1, #e2e8f0)" fontFamily="inherit">
        {item.label.length > 22 ? item.label.slice(0, 21) + '…' : item.label}
      </text>
      <text x={startX + 20} y={midY + 9} fontSize={9} fill="var(--omni-t3, #64748b)"
        fontFamily="inherit">
        {String(steps)} steps
      </text>

      {/* Connector line from label to first step */}
      <line x1={trackStart - 14} y1={midY} x2={trackStart} y2={midY}
        stroke={`${color}40`} strokeWidth={1.5} />

      {/* Step track */}
      <line x1={trackStart} y1={midY} x2={isDraft ? trackStart + stepSpacing * (steps - 1) * 0.6 : trackEnd}
        y2={midY} stroke={`${color}30`} strokeWidth={1.5} strokeDasharray={isDraft ? '4 3' : undefined} />

      {Array.from({ length: steps }, (_, i) => {
        const cx = trackStart + i * stepSpacing;
        const filled = !isDraft || i < Math.ceil(steps * 0.4);
        return (
          <rect key={i} x={cx - 4} y={midY - 4} width={8} height={8} rx={2}
            fill={filled ? color : `${color}25`}
            stroke={filled ? `${color}80` : `${color}30`} strokeWidth={0.5} />
        );
      })}

      {/* Terminal node */}
      <circle cx={trackEnd + 14} cy={midY} r={isDraft ? 5 : 6}
        fill={isDraft ? '#1e293b' : color}
        stroke={color} strokeWidth={isDraft ? 1.5 : 0} />
      {!isDraft && (
        <text x={trackEnd + 14} y={midY + 4} fontSize={9} textAnchor="middle"
          fill="#0f172a" fontWeight={700} fontFamily="inherit">✓</text>
      )}
    </g>
  );
}

function actionDisabledReason(actionId: string, selectedItems: readonly string[]): string | null {
  if (actionId !== 'trigger_run') return null;
  if (selectedItems.length !== 1) {
    return 'Select exactly one workflow to run.';
  }
  return null;
}

function formatRunResult(data: unknown): string {
  if (data && typeof data === 'object' && 'steps_completed' in data && 'steps_total' in data) {
    const d = data as { steps_completed: number; steps_total: number; status: string };
    return `Run ${d.status}: ${d.steps_completed}/${d.steps_total} steps completed.`;
  }
  return 'Workflow run completed.';
}

export default function WorkflowsModule({ onClose }: Props) {
  const state = useOmniModuleState('workflows');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  const running = state.items.filter((i) => i.status === 'active').length;
  const pending = state.items.filter((i) => i.status === 'pending').length;
  const idle    = state.items.filter((i) => i.status === 'inactive' || i.status === 'error').length;

  const svgHeight = useMemo(() => state.items.length * 44 + 8, [state.items.length]);

  // The SVG pipeline view below is the selection UI for this module (clicking
  // a lane selects it for trigger_run) — suppress ModuleShell's own default
  // clickable item list so the same items aren't rendered twice.
  const shellState = useMemo(() => ({ ...state, items: [] as typeof state.items }), [state]);

  const handleAction = useCallback(async (actionId: string, selectedItems: string[]): Promise<boolean | string> => {
    if (actionId === 'trigger_run') {
      const disabledReason = actionDisabledReason(actionId, selectedItems);
      if (disabledReason) return disabledReason;
      const targetId = selectedItems[0];
      if (!UUID_RE.test(targetId)) {
        // Simulated execution for demo workflow row
        await new Promise(resolve => setTimeout(resolve, 800));
        const item = state.items.find(i => i.id === targetId);
        const name = item?.label ?? 'Demo Workflow';
        return `[SIMULATED] Demo workflow "${name}" completed successfully (all steps passed).`;
      }
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: { workflowId: targetId },
      });
      if (error) throw new Error(error.message || 'Workflow run failed.');
      state.refetch?.();
      return formatRunResult(data);
    }
    if (actionId === 'create_workflow') {
      setShowCreateForm(true);
      return true;
    }
    return false;
  }, [state]);

  return (
    <ModuleShell
      state={shellState}
      onClose={onClose}
      onAction={handleAction}
      getActionDisabledReason={actionDisabledReason}
    >
      {({ selectedItems, toggle }) => !state.loading && (
        <div className="space-y-3">
          {/* Summary legend */}
          <div className="flex items-center gap-3 text-xs px-1">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400" />{running} running
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />{pending} pending
            </span>
            {idle > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400" />{idle} idle
              </span>
            )}
          </div>

          {/* Visual canvas — also the selection UI: click a lane to select it for Trigger Run */}
          <div className="rounded-lg border border-border/30 bg-[rgba(11,18,32,0.6)] overflow-hidden">
            <div className="px-2 pt-1.5 pb-0.5 text-[9px] uppercase tracking-widest text-muted-foreground/50 font-bold">
              Workflow Pipeline View
            </div>
            <svg
              width="100%"
              viewBox={`0 0 428 ${svgHeight}`}
              aria-label="Workflow pipeline graph"
              role="img"
              style={{ display: 'block' }}
            >
              {state.items.map((item, idx) => (
                <WorkflowLane
                  key={item.id}
                  item={item}
                  y={idx * 44 + 4}
                  selected={selectedItems.has(item.id)}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </svg>
          </div>

          {showCreateForm && (
            <CreateWorkflowForm
              onCancel={() => setShowCreateForm(false)}
              onCreated={(message) => {
                setShowCreateForm(false);
                setCreateStatus(message);
                state.refetch?.();
              }}
            />
          )}
          {createStatus && (
            <div className="text-xs px-3 py-2 rounded-lg bg-muted/30 text-muted-foreground border border-border/30">
              {createStatus}
            </div>
          )}
        </div>
      )}
    </ModuleShell>
  );
}
