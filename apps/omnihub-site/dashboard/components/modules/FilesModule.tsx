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
  const usedGB = Number.parseFloat(storageUsed.replaceAll(/[^0-9.]/g, '')) || 0;
  const capGB = 100;
  const pct = Math.min(100, Math.round((usedGB / capGB) * 100));

  return (
    <ModuleShell state={state} onClose={onClose}>
      {!state.loading && (
        <div className="space-y-4">
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
          
          <div className="rounded-lg border border-dashed border-border/40 p-6 flex flex-col items-center justify-center bg-muted/5 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 mb-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            <p className="text-sm font-medium text-muted-foreground">Uploads Unavailable</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">File ingestion requires a connected APEX Storage Provider.</p>
            <button disabled className="mt-4 px-4 py-2 bg-muted/20 text-muted-foreground/50 border border-border/30 rounded-md text-xs cursor-not-allowed">
              Select Files
            </button>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
