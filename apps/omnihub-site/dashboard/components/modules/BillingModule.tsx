import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function BillingModule({ onClose }: Props) {
  const state = useOmniModuleState('billing');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Current Period
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground font-medium">Pro Plan</span>
          <span className="text-muted-foreground">Renews Mar 15, 2026</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full rounded-full bg-orange-500" style={{ width: '72%' }} />
          </div>
          <span className="text-xs text-muted-foreground">72% used</span>
        </div>
      </div>
    </ModuleShell>
  );
}
