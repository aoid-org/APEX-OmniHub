import { useCallback } from 'react';
import {
  Zap, Receipt, Bell, Database, UserCheck,
  CheckCircle, Clock, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import type { ModuleListItem } from '@/dashboard/components/ModuleRegistry';

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
      return 'Automation creation is not available from this panel yet. Use the dedicated workflow builder when it is enabled.';
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
      renderItem={(item, selected, toggle) => (
        <AutomationRow item={item} selected={selected} onToggle={toggle} />
      )}
    />
  );
}
