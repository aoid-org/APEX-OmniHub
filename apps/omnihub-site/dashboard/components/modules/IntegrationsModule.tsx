import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function IntegrationsModule({ onClose }: Props) {
  const state = useOmniModuleState('integrations');

  const connectedStat = state.stats.find(s => s.label === 'Connected');
  const availableStat = state.stats.find(s => s.label === 'Available');
  const connectedVal = connectedStat?.value ?? '0';
  const availableVal = availableStat?.value ?? '0';
  const connectedNum = parseInt(connectedVal.replace(/[^0-9]/g, ''), 10) || 0;
  const availableNum = parseInt(availableVal.replace(/[^0-9]/g, ''), 10) || 0;
  const pct = availableNum > 0 ? Math.round((connectedNum / availableNum) * 100) : 0;

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Integration Coverage
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {connectedVal} / {availableVal} connected
            </span>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
