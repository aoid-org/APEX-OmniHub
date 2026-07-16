import { useCallback, useState } from 'react';
import {
  Zap, Receipt, Bell, Database, UserCheck,
  CheckCircle, Clock, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import type { ModuleListItem } from '@/dashboard/components/ModuleRegistry';

type AutomationActionType = 'webhook' | 'notification' | 'send_email' | 'create_record';

const ACTION_TYPE_LABELS: Readonly<Record<AutomationActionType, string>> = {
  webhook: 'Webhook (POST to a URL)',
  notification: 'Notification',
  send_email: 'Send Email',
  create_record: 'Create Record',
};

const CREATE_RECORD_TABLES = ['invoices', 'logs', 'tasks', 'notifications'] as const;

const fieldClass =
  'w-full rounded-lg border border-border/30 bg-muted/10 px-3 py-2 text-xs text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40';

interface Props {
  readonly onClose: () => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Map automation item id → contextual icon
const AUTOMATION_ICONS: Readonly<Record<string, typeof Zap>> = {
  'auto-lead':    Zap,
  'auto-invoice': Receipt,
  'auto-alert':   Bell,
  'auto-backup':  Database,
  'auto-onboard': UserCheck,
};

const STATUS_COLOR: Readonly<Record<string, string>> = {
  active:   '#34d399',
  pending:  '#facc15',
  inactive: '#6b7280',
  error:    '#ef4444',
};

function AutomationRow({ item, selected, onToggle }: { item: ModuleListItem; selected: boolean; onToggle: () => void }) {
  const Icon  = AUTOMATION_ICONS[item.id] ?? Zap;
  const color = STATUS_COLOR[item.status] ?? '#6b7280';

  // Parse "Trigger: X | Runs: N/day" from detail
  const triggerMatch = item.detail?.match(/Trigger:\s*([^|]+)/);
  const runsMatch    = item.detail?.match(/Runs:\s*([^|]+)/);
  const trigger      = triggerMatch?.[1]?.trim() ?? '';
  const runs         = runsMatch?.[1]?.trim() ?? null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left transition-colors"
      aria-pressed={selected}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '8px 10px', borderRadius: 8,
        border: selected ? `1px solid ${color}` : `1px solid ${color}22`,
        background: selected ? `${color}14` : `${color}06`,
      }}
    >
      {/* Icon badge */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: `${color}14`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 14, height: 14, color }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--omni-t1, #e2e8f0)', lineHeight: 1.3 }}>
          {item.label}
        </div>
        {trigger && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <ArrowRight style={{ width: 9, height: 9, color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--omni-t3, #64748b)' }}>{trigger}</span>
          </div>
        )}
        {runs && (
          <div style={{ fontSize: 10, color: 'var(--omni-t3, #64748b)', marginTop: 1 }}>
            {runs}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {item.status === 'active'
          ? <CheckCircle style={{ width: 13, height: 13, color }} />
          : <Clock style={{ width: 13, height: 13, color }} />
        }
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>
          {item.status}
        </span>
      </div>
    </button>
  );
}

interface CreateAutomationFormProps {
  readonly onCancel: () => void;
  readonly onCreated: (message: string) => void;
}

function buildAutomationConfig(
  actionType: AutomationActionType,
  fields: Record<string, string>,
): { config: Record<string, unknown>; error: string | null } {
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
      return { config: {}, error: 'Unknown action type.' };
  }
}

function CreateAutomationForm({ onCancel, onCreated }: CreateAutomationFormProps) {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('Manual');
  const [actionType, setActionType] = useState<AutomationActionType>('notification');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!name.trim()) {
      setError('Automation name is required.');
      return;
    }
    const { config, error: configError } = buildAutomationConfig(actionType, fields);
    if (configError) {
      setError(configError);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Sign in required to create an automation.');
        return;
      }
      const { error: insertError } = await supabase
        .from('automations')
        .insert({
          user_id: user.id,
          name: name.trim(),
          trigger_type: triggerType.trim() || 'Manual',
          action_type: actionType,
          config,
          is_active: true,
        });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      onCreated(`"${name.trim()}" created. Select it below and click Execute Automation to run it for real.`);
    } finally {
      setSubmitting(false);
    }
  }, [name, triggerType, actionType, fields, onCreated]);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="text-xs font-semibold text-foreground">New Automation</div>
      <input
        className={fieldClass}
        placeholder="Name (e.g. Ping deploy webhook)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className={fieldClass}
        placeholder="Trigger (freeform label — execution is manual today)"
        value={triggerType}
        onChange={(e) => setTriggerType(e.target.value)}
      />
      <select
        className={fieldClass}
        value={actionType}
        onChange={(e) => {
          setActionType(e.target.value as AutomationActionType);
          setFields({});
        }}
      >
        {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {actionType === 'webhook' && (
        <input className={fieldClass} placeholder="https://example.com/webhook" value={fields.url ?? ''} onChange={setField('url')} />
      )}
      {actionType === 'notification' && (
        <>
          <input className={fieldClass} placeholder="Message" value={fields.message ?? ''} onChange={setField('message')} />
          <input className={fieldClass} placeholder="Channel (optional)" value={fields.channel ?? ''} onChange={setField('channel')} />
        </>
      )}
      {actionType === 'send_email' && (
        <>
          <input className={fieldClass} placeholder="To (email address)" value={fields.to ?? ''} onChange={setField('to')} />
          <input className={fieldClass} placeholder="Subject" value={fields.subject ?? ''} onChange={setField('subject')} />
          <textarea className={fieldClass} placeholder="Body" rows={2} value={fields.body ?? ''} onChange={setField('body')} />
        </>
      )}
      {actionType === 'create_record' && (
        <>
          <select className={fieldClass} value={fields.table ?? ''} onChange={setField('table')}>
            <option value="">Select table…</option>
            {CREATE_RECORD_TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <textarea className={fieldClass} placeholder='Record data as JSON, e.g. {"note":"hello"}' rows={2} value={fields.data ?? ''} onChange={setField('data')} />
        </>
      )}

      {error && <div className="text-[11px] text-red-400">{error}</div>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Creating…' : 'Save Automation'}
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
  if (actionId !== 'execute-automation') return null;
  if (selectedItems.length !== 1) {
    return 'Select exactly one live automation to execute.';
  }
  if (!UUID_RE.test(selectedItems[0])) {
    return 'Only saved live automations can be executed. Demo automation rows are not executable.';
  }
  return null;
}

function formatExecutionResult(data: unknown): string {
  const envelope = data && typeof data === 'object' && 'data' in data
    ? (data as { data?: unknown }).data
    : data;
  if (envelope && typeof envelope === 'object' && 'action_type' in envelope) {
    const actionType = String((envelope as { action_type?: unknown }).action_type ?? 'automation');
    return `Automation executed successfully (${actionType}).`;
  }
  return 'Automation executed successfully.';
}

export default function AutomationsModule({ onClose }: Props) {
  const state = useOmniModuleState('automations');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);

  const handleAction = useCallback(async (actionId: string, selectedItems: string[]): Promise<boolean | string> => {
    if (actionId === 'execute-automation') {
      const disabledReason = actionDisabledReason(actionId, selectedItems);
      if (disabledReason) return disabledReason;
      const { data, error } = await supabase.functions.invoke('execute-automation', {
        body: { automationId: selectedItems[0] },
      });
      if (error) throw new Error(error.message || 'Automation execution failed.');
      state.refetch?.();
      return formatExecutionResult(data);
    }
    if (actionId === 'create-automation') {
      setShowCreateForm(true);
      return true;
    }
    if (actionId === 'view-logs') {
      return 'Automation run logs are not connected to this panel yet. No log viewer URL is configured.';
    }
    return false;
  }, [state]);

  return (
    <ModuleShell
      state={state}
      onClose={onClose}
      onAction={handleAction}
      getActionDisabledReason={actionDisabledReason}
      emptyState="No automations yet. Use Create Automation to set up your first rule — it will appear here with its trigger and run stats."
      renderItem={(item, selected, toggle) => (
        <AutomationRow item={item} selected={selected} onToggle={toggle} />
      )}
    >
      {showCreateForm && (
        <CreateAutomationForm
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
    </ModuleShell>
  );
}
