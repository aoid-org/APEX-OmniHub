import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function DashboardModule({ onClose }: Props) {
  const state = useOmniModuleState('dashboard');

  const systemsStat = state.stats.find(s => s.label === 'Systems Online');
  const uptimeStat = state.stats.find(s => s.label === 'Uptime');
  const systemsVal = systemsStat?.value ?? '0';
  const uptimeVal = uptimeStat?.value ?? '—';

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Platform Health
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{systemsVal} systems operational</span>
            <span className="tabular-nums">{uptimeVal} uptime</span>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
