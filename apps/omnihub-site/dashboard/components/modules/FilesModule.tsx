import { useOmniModuleState } from '@/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';
import { supabase } from '../../../src/lib/supabase';
import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Loader2, Trash2 } from 'lucide-react';

interface Props {
  readonly onClose: () => void;
}

interface StoredFile {
  name: string;
  id: string;
  metadata: { size: number };
  created_at: string;
}

export default function FilesModule({ onClose }: Props) {
  const state = useOmniModuleState('files');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase.storage.from('omnihub-files').list(user.id);
      if (!error && data) {
        setFiles(data as StoredFile[]);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      for (const file of Array.from(fileList)) {
        const { error } = await supabase.storage
          .from('omnihub-files')
          .upload(`${user.id}/${Date.now()}_${file.name}`, file);
        if (error) console.error('Upload error:', error);
      }
      await fetchFiles();
    } catch (err) {
      console.error('Failed to upload files:', err);
    } finally {
      setUploading(false);
      setIsDragging(false);
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase.storage.from('omnihub-files').remove([`${user.id}/${fileName}`]);
      if (!error) {
        setFiles((prev) => prev.filter((f) => f.name !== fileName));
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const storageUsed = files.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);
  const capBytes = 100 * 1024 * 1024 * 1024; // 100 GB
  const pct = Math.min(100, Math.round((storageUsed / capBytes) * 100));
  const storageUsedMB = (storageUsed / (1024 * 1024)).toFixed(2);

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {!state.loading && (
          <div className="rounded-lg border border-border/30 px-3 py-2 bg-muted/10">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              OmniSLATE Context Storage · {files.length} files
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {storageUsedMB} / 102400 MB
              </span>
            </div>
          </div>
        )}

        <div
          className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-border/50 bg-muted/5 hover:bg-muted/10'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            handleUpload(e.dataTransfer.files);
          }}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Drag and drop files here</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Support for PDF, TXT, CSV, JSON</p>
              <label className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors">
                Browse Files
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </label>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <h3 className="text-sm font-medium">Uploaded Context</h3>
          {loadingFiles ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <p className="text-xs text-muted-foreground">No files uploaded yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
              {files.map((file) => (
                <div key={file.name} className="flex items-center justify-between p-2 rounded-md border border-border/30 bg-muted/5">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-medium truncate">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground">{(file.metadata?.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  );
}
