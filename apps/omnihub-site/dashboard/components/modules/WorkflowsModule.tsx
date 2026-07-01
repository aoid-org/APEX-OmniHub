import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import type { ModuleListItem } from '@/dashboard/components/ModuleRegistry';

interface Props {
  readonly onClose: () => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_STEPS = 10;

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
  item: ModuleListItem;
  y: number;
  selected: boolean;
  onToggle: () => void;
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

type StepActionType = 'webhook' | 'notification' | 'send_email' | 'create_record';

const STEP_TYPE_LABELS: Readonly<Record<StepActionType, string>> = {
  webhook: 'Webhook (POST to a URL)',
  notification: 'Notification',
  send_email: 'Send Email',
  create_record: 'Create Record',
};

const CREATE_RECORD_TABLES = ['invoices', 'logs', 'tasks', 'notifications'] as const;

const fieldClass =
  'w-full rounded-lg border border-border/30 bg-muted/10 px-3 py-2 text-xs text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40';

interface DraftStep {
  actionType: StepActionType;
  fields: Record<string, string>;
}

function buildStepConfig(
  step: DraftStep,
): { config: Record<string, unknown>; error: string | null } {
  const { actionType, fields } = step;
  switch (actionType) {
    case 'webhook': {
      if (!fields.url?.trim()) return { config: {}, error: 'Webhook URL is required.' };
      return { config: { url: fields.url.trim(), method: 'POST' }, error: null };
    }
    case 'notification': {
      if (!fields.message?.trim()) return { config: {}, error: 'Notification message is required.' };
      return {
        config: { message: fields.message.trim(), channel: fields.channel?.trim() || 'default' },
        error: null,
      };
    }
    case 'send_email': {
      if (!fields.to?.trim() || !fields.subject?.trim()) {
        return { config: {}, error: 'Recipient and subject are required.' };
      }
      return {
        config: { to: fields.to.trim(), subject: fields.subject.trim(), body: fields.body ?? '' },
        error: null,
      };
    }
    case 'create_record': {
      if (!fields.table?.trim()) return { config: {}, error: 'Target table is required.' };
      try {
        const data = fields.data?.trim() ? JSON.parse(fields.data) : {};
        return { config: { table: fields.table.trim(), data }, error: null };
      } catch {
        return { config: {}, error: 'Record data must be valid JSON.' };
      }
    }
    default:
      return { config: {}, error: 'Unknown step type.' };
  }
}

function StepEditor({
  step,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  step: DraftStep;
  index: number;
  onChange: (next: DraftStep) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange({ ...step, fields: { ...step.fields, [key]: e.target.value } });

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/20 bg-muted/5 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Step {index + 1}</span>
        {canRemove && (
          <button type="button" className="text-[10px] text-red-400" onClick={onRemove}>Remove</button>
        )}
      </div>
      <select
        className={fieldClass}
        value={step.actionType}
        onChange={(e) => onChange({ actionType: e.target.value as StepActionType, fields: {} })}
      >
        {Object.entries(STEP_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {step.actionType === 'webhook' && (
        <input className={fieldClass} placeholder="https://example.com/webhook" value={step.fields.url ?? ''} onChange={setField('url')} />
      )}
      {step.actionType === 'notification' && (
        <>
          <input className={fieldClass} placeholder="Message" value={step.fields.message ?? ''} onChange={setField('message')} />
          <input className={fieldClass} placeholder="Channel (optional)" value={step.fields.channel ?? ''} onChange={setField('channel')} />
        </>
      )}
      {step.actionType === 'send_email' && (
        <>
          <input className={fieldClass} placeholder="To (email address)" value={step.fields.to ?? ''} onChange={setField('to')} />
          <input className={fieldClass} placeholder="Subject" value={step.fields.subject ?? ''} onChange={setField('subject')} />
          <textarea className={fieldClass} placeholder="Body" rows={2} value={step.fields.body ?? ''} onChange={setField('body')} />
        </>
      )}
      {step.actionType === 'create_record' && (
        <>
          <select className={fieldClass} value={step.fields.table ?? ''} onChange={setField('table')}>
            <option value="">Select table…</option>
            {CREATE_RECORD_TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <textarea className={fieldClass} placeholder='Record data as JSON, e.g. {"note":"hello"}' rows={2} value={step.fields.data ?? ''} onChange={setField('data')} />
        </>
      )}
    </div>
  );
}

function CreateWorkflowForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<DraftStep[]>([{ actionType: 'notification', fields: {} }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStep = (i: number, next: DraftStep) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? next : s)));

  const addStep = () => {
    if (steps.length >= MAX_STEPS) return;
    setSteps((prev) => [...prev, { actionType: 'notification', fields: {} }]);
  };

  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!name.trim()) {
      setError('Workflow name is required.');
      return;
    }
    const built = steps.map(buildStepConfig);
    const firstError = built.find((b) => b.error);
    if (firstError?.error) {
      setError(firstError.error);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Sign in required to create a workflow.');
        return;
      }
      const definitionSteps = steps.map((step, i) => ({
        action_type: step.actionType,
        config: built[i].config,
      }));
      const { error: insertError } = await supabase
        .from('workflows')
        .insert({
          user_id: user.id,
          name: name.trim(),
          definition: { steps: definitionSteps },
          is_active: true,
        });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      onCreated(`"${name.trim()}" created with ${steps.length} step${steps.length === 1 ? '' : 's'}. Select it below and click Trigger Run to run it for real.`);
    } finally {
      setSubmitting(false);
    }
  }, [name, steps, onCreated]);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="text-xs font-semibold text-foreground">New Workflow</div>
      <input
        className={fieldClass}
        placeholder="Name (e.g. New signup follow-up)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {steps.map((step, i) => (
        <StepEditor
          key={i}
          step={step}
          index={i}
          onChange={(next) => updateStep(i, next)}
          onRemove={() => removeStep(i)}
          canRemove={steps.length > 1}
        />
      ))}

      {steps.length < MAX_STEPS && (
        <button
          type="button"
          className="text-[11px] text-primary self-start"
          onClick={addStep}
        >
          + Add step
        </button>
      )}

      {error && <div className="text-[11px] text-red-400">{error}</div>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Creating…' : 'Save Workflow'}
        </button>
        <button
          type="button"
          className="rounded-lg border border-border/30 px-3 py-1.5 text-xs text-muted-foreground"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function actionDisabledReason(actionId: string, selectedItems: readonly string[]): string | null {
  if (actionId !== 'trigger_run') return null;
  if (selectedItems.length !== 1) {
    return 'Select exactly one saved workflow to run.';
  }
  if (!UUID_RE.test(selectedItems[0])) {
    return 'Only saved live workflows can be run. Demo rows are not executable.';
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
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: { workflowId: selectedItems[0] },
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
