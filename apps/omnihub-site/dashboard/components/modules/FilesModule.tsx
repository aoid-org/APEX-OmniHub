import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function FilesModule({ onClose }: Props) {
  const state = useOmniModuleState('files');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Storage Usage
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: '34%' }} />
          </div>
          <span className="text-xs text-muted-foreground">3.4 GB / 10 GB</span>
        </div>
      </div>
    </ModuleShell>
  );
}
