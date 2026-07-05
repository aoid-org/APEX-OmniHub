import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DraftStep {
  id: string;
  actionType: StepActionType;
  fields: Record<string, string>;
}

type StepActionType = 'webhook' | 'notification' | 'send_email' | 'create_record';

const STEP_TYPE_LABELS: Readonly<Record<StepActionType, string>> = {
  webhook: 'Webhook (POST to a URL)',
  notification: 'Notification',
  send_email: 'Send Email',
  create_record: 'Create Record',
};

const CREATE_RECORD_TABLES = ['invoices', 'logs', 'tasks', 'notifications'] as const;

const SCHEDULE_LABELS: Readonly<Record<'manual' | 'every_5_min' | 'hourly' | 'daily', string>> = {
  manual: 'Manual only (click Trigger Run)',
  every_5_min: 'Every 5 minutes',
  hourly: 'Hourly',
  daily: 'Daily',
};

const MAX_STEPS = 10;

const fieldClass =
  'w-full rounded-lg border border-border/30 bg-muted/10 px-3 py-2 text-xs text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40';

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
  readonly step: DraftStep;
  readonly index: number;
  readonly onChange: (next: DraftStep) => void;
  readonly onRemove: () => void;
  readonly canRemove: boolean;
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
        onChange={(e) => onChange({ ...step, actionType: e.target.value as StepActionType, fields: {} })}
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

export default function CreateWorkflowForm({
  onCancel,
  onCreated,
}: {
  readonly onCancel: () => void;
  readonly onCreated: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState<'manual' | 'every_5_min' | 'hourly' | 'daily'>('manual');
  const [steps, setSteps] = useState<DraftStep[]>([{ id: 'step-0', actionType: 'notification', fields: {} }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStep = (i: number, next: DraftStep) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? next : s)));

  const addStep = () => {
    if (steps.length >= MAX_STEPS) return;
    setSteps((prev) => [...prev, { id: `step-${Date.now()}-${Math.random()}`, actionType: 'notification', fields: {} }]);
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
          schedule: schedule === 'manual' ? null : schedule,
        });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      const scheduleNote = schedule === 'manual'
        ? 'Select it below and click Trigger Run to run it for real.'
        : `It will also run automatically on the "${SCHEDULE_LABELS[schedule]}" schedule (pg_cron), or select it below to run it manually now.`;
      onCreated(`"${name.trim()}" created with ${steps.length} step${steps.length === 1 ? '' : 's'}. ${scheduleNote}`);
    } finally {
      setSubmitting(false);
    }
  }, [name, schedule, steps, onCreated]);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="text-xs font-semibold text-foreground">New Workflow</div>
      <input
        className={fieldClass}
        placeholder="Name (e.g. New signup follow-up)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select
        className={fieldClass}
        value={schedule}
        onChange={(e) => setSchedule(e.target.value as typeof schedule)}
      >
        {Object.entries(SCHEDULE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {steps.map((step, i) => (
        <StepEditor
          key={step.id}
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
