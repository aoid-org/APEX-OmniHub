import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, Trash2, FileIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getUploadToken, uploadWithToken, listUserFiles, createDownloadUrl, deleteFile } from '@/lib/files';
import { useToast } from '@/hooks/use-toast';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FileItem = any;

const Files = () => {
  const [uid, setUid] = useState<string>("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const cols = { lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 };
  const [layouts, setLayouts] = useState<Partial<Record<string, Layout>>>({});

  useEffect(() => {
    const newLayouts: Partial<Record<string, Layout>> = {};
    for (const [bp, c] of Object.entries(cols)) {
      newLayouts[bp] = items.map((item, i) => ({
        i: item.name,
        x: i % c,
        y: Math.floor(i / c),
        w: 1,
        h: 1,
        isResizable: false
      }));
    }
    setLayouts(newLayouts);
  }, [items, cols]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) {
        setUid(data.user.id);
      }
    });
  }, []);

  async function refresh() {
    if (!uid) return;
    try {
      const { data, error } = await listUserFiles(uid);
      if (error) throw error;
      setItems(data ?? []);
    } catch {
      // Error logged via toast
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive"
      });
    }
  }

  useEffect(() => {
    if (uid) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setUploading(true);
    try {
      const { path, token } = await getUploadToken(f.name, f.type, f.size);
      const { error } = await uploadWithToken(path, token, f);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `${f.name} uploaded successfully`
      });

      await refresh();
      e.currentTarget.value = "";
    } catch (error: unknown) {
      // Error logged via toast
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }

  async function onDownload(name: string) {
    try {
      const path = `${uid}/${name}`;
      const { data, error } = await createDownloadUrl(path, 60);
      
      if (error) throw error;
      if (data?.signedUrl) {
        globalThis.open(data.signedUrl, "_blank");
      }
    } catch (error: unknown) {
      // Error logged via toast
      toast({
        title: "Download failed",
        description: error.message || "Failed to download file",
        variant: "destructive"
      });
    }
  }

  async function onDelete(name: string) {
    if (!confirm(`Delete ${name}?`)) return;

    try {
      const path = `${uid}/${name}`;
      const { error } = await deleteFile(path);
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `${name} deleted successfully`
      });

      await refresh();
    } catch (error: unknown) {
      // Error logged via toast
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive"
      });
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-muted-foreground">Manage your files and documents</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={onPick}
          className="hidden"
        />
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No files yet. Upload your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <ResponsiveGridLayout
          className="layout -mx-2"
          layouts={layouts}
          breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
          cols={cols}
          rowHeight={88}
          onLayoutChange={(_layout, allLayouts) => setLayouts(allLayouts)}
          draggableHandle=".custom-drag-handle"
          margin={[16, 16]}
        >
          {items.map((obj) => (
            <div key={obj.name}>
              <Card className="h-full relative group shadow-sm border border-white/10 hover:border-white/20 transition-all bg-[#121622]/50">
                <div className="custom-drag-handle absolute top-0 right-0 p-3 h-10 w-10 cursor-grab active:cursor-grabbing text-white/0 group-hover:text-white/30 hover:!text-white/60 transition-colors z-20">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </div>
                <CardContent className="p-4 h-full pr-10">
                  <div className="flex items-center justify-between h-full">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate pr-2">{obj.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatFileSize(obj.metadata?.size || 0)} • {new Date(obj.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDownload(obj.name)}
                        className="cancel-drag relative z-30"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(obj.name)}
                        className="cancel-drag relative z-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
};

export default Files;