import { useMemo } from 'react';
import { Shield, Database, Lock, Key, CheckCircle, Clock } from 'lucide-react';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import type { ModuleListItem } from '@/dashboard/components/ModuleRegistry';

interface Props {
  readonly onClose: () => void;
}

// Baseline tiles shown regardless of live state — avoids blank tile syndrome.
interface AuditCategory {
  readonly id: string;
  readonly icon: typeof Shield;
  readonly label: string;
  readonly baseline: string;
}

const AUDIT_CATEGORIES: readonly AuditCategory[] = [
  { id: 'aud-001', icon: Shield,   label: 'Security Controls',  baseline: 'Roadmap assessment' },
  { id: 'aud-002', icon: Database, label: 'Data Processing',    baseline: 'Activity audit' },
  { id: 'aud-003', icon: Lock,     label: 'Zero-Trust Policy',  baseline: 'Policy enforcement' },
  { id: 'aud-004', icon: Key,      label: 'API Access Trail',   baseline: 'Request logging' },
];

function AuditTile({
  category,
  item,
}: {
  category: AuditCategory;
  item: ModuleListItem | undefined;
}) {
  const Icon   = category.icon;
  const active = item?.status === 'active';
  const color  = active ? '#34d399' : '#6b7280';
  const detail = item?.detail ?? category.baseline;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 9,
      padding: '8px 10px', borderRadius: 8,
      border: `1px solid ${color}22`,
      background: `${color}06`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: `${color}14`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 13, height: 13, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--omni-t1, #e2e8f0)', lineHeight: 1.3 }}>
          {item?.label ?? category.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--omni-t3, #64748b)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {detail}
        </div>
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {active
          ? <CheckCircle style={{ width: 13, height: 13, color: '#34d399' }} />
          : <Clock       style={{ width: 13, height: 13, color: '#6b7280' }} />
        }
      </div>
    </div>
  );
}

export default function AuditsModule({ onClose }: Props) {
  const state = useOmniModuleState('audits');

  const itemsById = useMemo(
    () => new Map(state.items.map((i) => [i.id, i])),
    [state.items],
  );

  const allClear = state.items.length > 0 && state.items.every((i) => i.status === 'active');

  // Always render audit tiles (never blank) — use live item when available,
  // fall back to static category baseline when state is unavailable.
  const shellState = useMemo(() => ({ ...state, items: [] as readonly ModuleListItem[] }), [state]);

  return (
    <ModuleShell state={shellState} onClose={onClose}>
      {/* Compliance summary — visible whenever we have any data */}
      {!state.loading && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Compliance Status
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${allClear ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className="text-foreground font-medium">
              {allClear ? 'All controls passing' : 'Audit in progress'}
            </span>
          </div>
        </div>
      )}

      {/* Audit category tiles — always rendered, never blank */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {AUDIT_CATEGORIES.map((cat) => (
          <AuditTile key={cat.id} category={cat} item={itemsById.get(cat.id)} />
        ))}
      </div>
    </ModuleShell>
  );
}
