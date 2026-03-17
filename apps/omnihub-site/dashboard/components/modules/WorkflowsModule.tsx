import { useOmniModuleState } from '../../../src/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function WorkflowsModule({ onClose }: Props) {
  const state = useOmniModuleState('workflows');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Active Workflow Graph
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-muted-foreground">8 running</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
            Start Workflow
          </button>
        </div>
      </div>
    </ModuleShell>
  );
}
