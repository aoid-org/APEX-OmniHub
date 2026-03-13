import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function SettingsModule({ onClose }: Props) {
  const state = useOmniModuleState('settings');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Configuration Health
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
          <span className="text-foreground font-medium">All settings validated</span>
          <span className="ml-auto text-muted-foreground">Rev. 47</span>
        </div>
      </div>
    </ModuleShell>
  );
}
