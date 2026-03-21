import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function AgentModule({ onClose }: Props) {
  const state = useOmniModuleState('agent');

  const sessionsStat = state.stats.find(s => s.label === 'Active Sessions');
  const accuracyStat = state.stats.find(s => s.label === 'Intent Accuracy');
  const sessionsVal = sessionsStat?.value ?? '0';
  const accuracyVal = accuracyStat?.value ?? '—';

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Voice Agent Status
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{sessionsVal} active sessions</span>
            <span className="tabular-nums">{accuracyVal} accuracy</span>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
