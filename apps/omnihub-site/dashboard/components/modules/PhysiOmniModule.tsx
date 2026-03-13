import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function PhysiOmniModule({ onClose }: Props) {
  const state = useOmniModuleState('physiomni');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Device Telemetry
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-bold text-foreground">3</div>
            <div className="text-muted-foreground">Paired</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-green-400">2</div>
            <div className="text-muted-foreground">Online</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-yellow-400">1</div>
            <div className="text-muted-foreground">Syncing</div>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}
