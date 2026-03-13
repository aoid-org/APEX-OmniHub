import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function AutomationsModule({ onClose }: Props) {
  const state = useOmniModuleState('automations');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Execution Pipeline
        </div>
        <div className="flex items-center gap-1 text-xs">
          {['Trigger', 'Validate', 'Execute', 'Log'].map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{step}</span>
              {i < 3 && <span className="text-muted-foreground">{'\u2192'}</span>}
            </div>
          ))}
        </div>
      </div>
    </ModuleShell>
  );
}
