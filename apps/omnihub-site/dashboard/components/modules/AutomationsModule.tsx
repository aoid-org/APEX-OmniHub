import { useMemo } from 'react';
import {
  Zap, Receipt, Bell, Database, UserCheck,
  CheckCircle, Clock, ArrowRight,
} from 'lucide-react';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import type { ModuleListItem } from '@/dashboard/components/ModuleRegistry';

interface Props {
  readonly onClose: () => void;
}

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

function AutomationRow({ item }: { item: ModuleListItem }) {
  const Icon  = AUTOMATION_ICONS[item.id] ?? Zap;
  const color = STATUS_COLOR[item.status] ?? '#6b7280';

  // Parse "Trigger: X | Runs: N/day" from detail
  const triggerMatch = item.detail?.match(/Trigger:\s*([^|]+)/);
  const runsMatch    = item.detail?.match(/Runs:\s*([^|]+)/);
  const trigger      = triggerMatch?.[1]?.trim() ?? '';
  const runs         = runsMatch?.[1]?.trim() ?? null;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '8px 10px', borderRadius: 8,
        border: `1px solid ${color}22`,
        background: `${color}06`,
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
    </div>
  );
}

export default function AutomationsModule({ onClose }: Props) {
  const state = useOmniModuleState('automations');

  // Render automations with icon context in children; clear items from shell
  // so they aren't duplicated in the plain text list below.
  const shellState = useMemo(() => ({ ...state, items: [] as readonly ModuleListItem[] }), [state]);

  return (
    <ModuleShell state={shellState} onClose={onClose}>
      {!state.loading && state.items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {state.items.map((item) => (
            <AutomationRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </ModuleShell>
  );
}
