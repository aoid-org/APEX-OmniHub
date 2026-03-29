import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function FilesModule({ onClose }: Props) {
  const state = useOmniModuleState('files');

  // Derive storage used from registry/live stats — never hardcode.
  const storageStat = state.stats.find(s => s.label === 'Storage Used');
  const totalFilesStat = state.stats.find(s => s.label === 'Total Files');
  const storageUsed = storageStat?.value ?? '—';
  const totalFiles = totalFilesStat?.value ?? '—';

  // Parse a rough percentage from "14.2 GB" for progress bar (registry cap: 100 GB)
  const usedGB = parseFloat(storageUsed.replace(/[^0-9.]/g, '')) || 0;
  const capGB = 100;
  const pct = Math.min(100, Math.round((usedGB / capGB) * 100));

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Storage Usage · {totalFiles} files
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {storageUsed} / {capGB} GB
            </span>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
