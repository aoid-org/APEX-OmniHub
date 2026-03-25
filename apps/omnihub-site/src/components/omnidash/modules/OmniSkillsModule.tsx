import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function OmniSkillsModule({ onClose }: Props) {
  const state = useOmniModuleState('omniskills');

  // Derive live counts from registry/live stats — never hardcode.
  const activeStat = state.stats.find(s => s.label === 'Active Skills');
  const availableStat = state.stats.find(s => s.label === 'Available');
  const activeCount = activeStat?.value ?? '0';
  const availableCount = availableStat?.value ?? '0';
  const activeNum = Number.parseInt(activeCount.replaceAll(/\D/g, ''), 10) || 0;
  const availableNum = Number.parseInt(availableCount.replaceAll(/\D/g, ''), 10) || 0;
  const pct = availableNum > 0 ? Math.round((activeNum / availableNum) * 100) : 0;

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Skill Activation Queue
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {activeCount} / {availableCount} active
            </span>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
