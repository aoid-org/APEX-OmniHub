import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { exportAuditLogCSV } from '../../utils/exportAuditLog';
import { supabase } from '@/lib/supabase';

interface Props {
  readonly onClose: () => void;
}

export default function AuditsModule({ onClose }: Props) {
  const state = useOmniModuleState('audits');

  // Derive the lead compliance entry from live/registry items — never hardcode.
  const lead = state.items[0];
  const allClear = state.items.length > 0 && state.items.every((i) => i.status === 'active');

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && lead && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Compliance Status
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`inline-block h-2 w-2 rounded-full ${allClear ? 'bg-green-400' : 'bg-yellow-400'}`}
            />
            <span className="text-foreground font-medium truncate">{lead.label}</span>
            {lead.detail && (
              <span className="ml-auto text-muted-foreground truncate">{lead.detail}</span>
            )}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
