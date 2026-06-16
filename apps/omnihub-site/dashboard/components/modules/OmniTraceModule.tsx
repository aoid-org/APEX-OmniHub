import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function OmniTraceModule({ onClose }: Props) {
  const state = useOmniModuleState('omnitrace');

  const spansStat = state.stats.find(s => s.label === 'Active Spans');
  const latencyStat = state.stats.find(s => s.label === 'Tail Latency');
  const spansVal = spansStat?.value ?? '0';
  const latencyVal = latencyStat?.value ?? '—';

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Trace Overview
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{spansVal} active spans</span>
            <span className="tabular-nums">Tail: {latencyVal}</span>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
