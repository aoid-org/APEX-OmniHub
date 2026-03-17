import { useOmniModuleState } from '../../../src/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function OmniSkillsModule({ onClose }: Props) {
  const state = useOmniModuleState('omniskills');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Skill Activation Queue
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500" style={{ width: '25%' }} />
          </div>
          <span className="text-xs text-muted-foreground">12 / 47 active</span>
        </div>
      </div>
    </ModuleShell>
  );
}
