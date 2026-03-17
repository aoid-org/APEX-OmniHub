import { useState } from 'react';
import { useOmniModuleState } from '../../../src/hooks/useOmniModuleState';
import { ModuleShell } from './ModuleShell';

interface Props {
  readonly onClose: () => void;
}

export default function FilesModule({ onClose }: Props) {
  const state = useOmniModuleState('files');
  const [files, setFiles] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles(prev => [...prev, e.dataTransfer.files[0].name]);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => [...prev, e.target.files[0].name]);
    }
  };

  return (
    <ModuleShell state={state} onClose={onClose}>
      <div className="flex flex-col gap-3">
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

        {/* Upload Zone */}
        <div
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors ${dragActive ? 'border-orange-500 bg-orange-500/10' : 'border-border/40 bg-muted/5'}`}
        >
          <div className="text-sm font-medium mb-1">Drag and drop files here</div>
          <div className="text-xs text-muted-foreground mb-4">or click to browse from your computer</div>
          <label className="cursor-pointer bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 px-4 py-1.5 rounded-md text-sm transition-colors font-medium">
            Browse Files
            <input type="file" className="hidden" onChange={handleUpload} multiple />
          </label>
        </div>

        {/* Queued Files */}
        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Queued Files</div>
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-muted/20 border border-border/20">
                <span>{file}</span>
                <button onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-red-400">Remove</button>
              </div>
            ))}
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-medium transition-colors mt-2">
              Attach {files.length} File{files.length !== 1 && 's'}
            </button>
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
