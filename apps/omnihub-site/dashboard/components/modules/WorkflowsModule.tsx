import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function WorkflowsModule({ onClose }: Props) {
  const state = useOmniModuleState('workflows');

  // Derive graph counts from live/registry items — never hardcode.
  const running = state.items.filter((i) => i.status === 'active').length;
  const pending = state.items.filter((i) => i.status === 'pending').length;
  const idle = state.items.filter(
    (i) => i.status === 'inactive' || i.status === 'error',
  ).length;

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Active Workflow Graph
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-muted-foreground tabular-nums">{running} running</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-muted-foreground tabular-nums">{pending} pending</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              <span className="text-muted-foreground tabular-nums">{idle} idle</span>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
