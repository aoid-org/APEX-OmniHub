import { useRef, useState } from 'react';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { UploadCloud, FileText, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  readonly onClose: () => void;
}

export default function FilesModule({ onClose }: Props) {
  const state = useOmniModuleState('files');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const storageStat    = state.stats.find(s => s.label === 'Storage Used');
  const totalFilesStat = state.stats.find(s => s.label === 'Total Files');
  const storageUsed    = storageStat?.value ?? '—';
  const totalFiles     = totalFilesStat?.value ?? '—';

  const usedGB = Number.parseFloat(storageUsed.replaceAll(/[^0-9.]/g, '')) || 0;
  const capGB  = 100;
  const pct    = Math.min(100, Math.round((usedGB / capGB) * 100));

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStaged(e.target.files?.[0] ?? null);
    // Reset input so the same file can be re-selected after clearing
    e.target.value = '';
  };

  // Real end-to-end upload to the tenant-scoped 'omnihub-files' bucket
  // (RLS: first path segment must equal auth.uid() — migration 20260531000002).
  // Mirrors the proven LinksModule auth -> write -> refetch pattern; honest on failure.
  const handleUpload = async () => {
    if (!staged || isUploading) return;
    setIsUploading(true);
    setUploadError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      setUploadError('Authentication required to upload files.');
      setIsUploading(false);
      return;
    }
    const path = `${userId}/${Date.now()}-${staged.name}`;
    const { error } = await supabase.storage
      .from('omnihub-files')
      .upload(path, staged, { upsert: false });
    setIsUploading(false);
    if (error) {
      setUploadError(`Upload failed: ${error.message}`);
      return;
    }
    setStaged(null);
    // Refresh module state in place (storage stats/file count re-read).
    state.refetch?.();
  };

  const clearStaged = () => { setStaged(null); setUploadError(null); };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

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

          {/* File drop / select zone */}
          <div
            className="rounded-lg border border-dashed border-border/40 p-5 flex flex-col items-center justify-center bg-muted/5 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/10 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Select file to upload"
          >
            <UploadCloud className="text-muted-foreground/50 mb-2 h-6 w-6" />
            <p className="text-sm font-medium text-muted-foreground">Click to select a file</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              Files upload to your private APEX Storage.
            </p>
          </div>

          {/* Hidden native file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            aria-hidden="true"
            onChange={handleSelect}
          />

          {/* Staged file preview */}
          {staged && (
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2.5 flex items-start gap-2">
              <FileText className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{staged.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(staged.size)}</p>
                {uploadError ? (
                  <p className="text-[10px] text-red-400 mt-1">{uploadError}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground/70 mt-1">Ready to upload to your private APEX Storage.</p>
                )}
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={(e) => { e.stopPropagation(); void handleUpload(); }}
                  className={[
                    'mt-2 px-3 py-1 rounded text-primary-foreground text-xs font-bold',
                    isUploading ? 'bg-primary/50 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 cursor-pointer',
                  ].join(' ')}
                >
                  {isUploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
              <button
                type="button"
                aria-label="Clear selected file"
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); clearStaged(); }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </ModuleShell>
  );
}
