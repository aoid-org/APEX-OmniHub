import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function AuditsModule({ onClose }: Props) {
  const state = useOmniModuleState('audits');

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Compliance Status
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
          <span className="text-foreground font-medium">GDPR Art. 30 compliant</span>
          <span className="ml-auto text-muted-foreground">Last verified: 2h ago</span>
        </div>
      </div>
    </ModuleShell>
  );
}
