import { useRef, useState } from 'react';
import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { UploadCloud, FileText, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPlayableMediaKind, ingestUploadedMedia, sanitizeFilename } from '@/dashboard/lib/omniMediaCatalog';
import { useOmniMedia } from '../../../src/stores/omniMediaStore';
import { usePlan, getStorageCapGB } from '@/hooks/usePlan';

interface Props {
  readonly onClose: () => void;
}

export default function FilesModule({ onClose }: Props) {
  const state = useOmniModuleState('files');
  const bumpCatalog = useOmniMedia((s) => s.bumpCatalog);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const storageStat    = state.stats.find(s => s.label === 'Storage Used');
  const totalFilesStat = state.stats.find(s => s.label === 'Total Files');
  const storageUsed    = storageStat?.value ?? '—';
  const totalFiles     = totalFilesStat?.value ?? '—';

  const usedGB = Number.parseFloat(storageUsed.replaceAll(/[^0-9.]/g, '')) || 0;
  const plan = usePlan();
  const capGB = getStorageCapGB(plan.tier);
  const pct    = Math.min(100, Math.round((usedGB / capGB) * 100));
  const isOverLimit = usedGB >= capGB;

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStaged(e.target.files?.[0] ?? null);
    // Reset input so the same file can be re-selected after clearing
    e.target.value = '';
  };

  // Real end-to-end upload. Non-playable files go to the tenant-scoped 'omnihub-files'
  // bucket (RLS: first path segment must equal auth.uid() — migration 20260531000002).
  // Playable video/audio (detected from the browser-sniffed MIME type, never the filename)
  // routes to the private 'omnimedia-assets' bucket and is ingested into the OmniMedia
  // catalog so it shows up in the gallery/player instead of the plain files list.
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

    const mediaKind = getPlayableMediaKind(staged.type);

    if (mediaKind) {
      const path = `${userId}/media/${Date.now()}-${sanitizeFilename(staged.name)}`;
      const { error } = await supabase.storage
        .from('omnimedia-assets')
        .upload(path, staged, { upsert: false, contentType: staged.type });
      if (error) {
        setIsUploading(false);
        setUploadError(`Upload failed: ${error.message}`);
        return;
      }
      try {
        await ingestUploadedMedia({
          storagePath: path,
          title: staged.name,
          kind: mediaKind,
          mimeType: staged.type,
          sizeBytes: staged.size,
        });
      } catch (err) {
        setIsUploading(false);
        setUploadError(`Upload failed: ${err instanceof Error ? err.message : 'omnimedia_ingest_failed'}`);
        return;
      }
      setIsUploading(false);
      setStaged(null);
      bumpCatalog();
      state.refetch?.();
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

  // Real storage-backed module actions. 'delete_file' removes the selected
  // objects from the tenant prefix (RLS-scoped) — no fake success states.
  const handleAction = async (actionId: string, selectedItems: string[]): Promise<boolean | string> => {
    if (actionId === 'upload_file') {
      fileInputRef.current?.click();
      return true;
    }
    if (actionId !== 'delete_file') return false;
    if (selectedItems.length === 0) return 'Select a file first, then Delete File removes it from your APEX Storage.';
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return 'Authentication required to delete files.';
    const { error } = await supabase.storage
      .from('omnihub-files')
      .remove(selectedItems.map((name) => `${userId}/${name}`));
    if (error) return `Delete failed: ${error.message}`;
    state.refetch?.();
    return `Deleted ${selectedItems.length} file${selectedItems.length === 1 ? '' : 's'} from APEX Storage.`;
  };

  const actionDisabledReason = (actionId: string, selectedItems: readonly string[]): string | null => {
    if (actionId === 'delete_file' && selectedItems.length === 0) {
      return 'Select a file to enable deletion.';
    }
    return null;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  return (
    <ModuleShell state={state} onClose={onClose} onAction={handleAction} getActionDisabledReason={actionDisabledReason}>
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
          <button
            type="button"
            disabled={isOverLimit}
            className={`w-full rounded-lg border border-dashed border-border/40 p-5 flex flex-col items-center justify-center bg-muted/5 text-center ${isOverLimit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/40 hover:bg-muted/10'} transition-colors`}
            onClick={() => !isOverLimit && fileInputRef.current?.click()}
            aria-label="Select file to upload"
          >
            <UploadCloud className="text-muted-foreground/50 mb-2 h-6 w-6" />
            <span className="block text-sm font-medium text-muted-foreground">
              {isOverLimit ? 'Storage Limit Reached' : 'Click to select a file'}
            </span>
            <span className="block text-xs text-muted-foreground/60 mt-0.5">
              {isOverLimit ? 'Please upgrade your plan to upload more files.' : 'Files upload to your private APEX Storage.'}
            </span>
          </button>

          {/* Hidden native file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
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
