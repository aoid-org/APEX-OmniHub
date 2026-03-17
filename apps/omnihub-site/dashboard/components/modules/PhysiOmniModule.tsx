import { useOmniModuleState } from '../../../src/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function PhysiOmniModule({ onClose }: Props) {
  const state = useOmniModuleState('physiomni');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Biometric Sync Status
          </div>
          <div className="text-xs text-muted-foreground">
            Apple Health connected
          </div>
        </div>

        <div className="flex justify-end">
          <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
            Log Activity
          </button>
        </div>
      </div>
    </ModuleShell>
  );
}
