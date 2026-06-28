/**
 * OmniMediaGallery — Real OmniMedia catalog browser.
 *
 * Shared between the right-panel launch widget (`variant="compact"`) and the
 * full OmniMedia modal (`variant="full"`). Refetches whenever `catalogVersion`
 * bumps (upload/delete elsewhere in the app), so widget and modal always show
 * the same data without polling.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Music, RefreshCw, Trash2, Video } from 'lucide-react';
import { useOmniMedia } from '@/stores/omniMediaStore';
import {
  deleteOmniMediaAsset,
  fetchOmniMediaCatalog,
  type OmniMediaCatalogItem,
} from '@/dashboard/lib/omniMediaCatalog';

interface Props {
  readonly variant: 'compact' | 'full';
}

type LoadState = 'loading' | 'ready' | 'error';

export function OmniMediaGallery({ variant }: Props) {
  const catalogVersion = useOmniMedia((s) => s.catalogVersion);
  const bumpCatalog = useOmniMedia((s) => s.bumpCatalog);
  const loadMedia = useOmniMedia((s) => s.loadMedia);
  const setDocked = useOmniMedia((s) => s.setDocked);

  const [state, setState] = useState<LoadState>('loading');
  const [items, setItems] = useState<readonly OmniMediaCatalogItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage(null);
    try {
      const fetched = await fetchOmniMediaCatalog();
      setItems(fetched);
      setState('ready');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'omnimedia_catalog_failed');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, catalogVersion]);

  const handlePlay = (item: OmniMediaCatalogItem) => {
    if (!item.source) return;
    void loadMedia(
      {
        id: item.id,
        source: item.source,
        type: item.kind,
        title: item.title,
        provider: item.provider ?? undefined,
      },
      true,
    );
    setDocked(true);
  };

  const handleDelete = async (item: OmniMediaCatalogItem) => {
    if (deletingId) return;
    setDeletingId(item.id);
    try {
      await deleteOmniMediaAsset(item.id);
      bumpCatalog();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'omnimedia_delete_failed');
    } finally {
      setDeletingId(null);
    }
  };

  const visibleItems = variant === 'compact' ? items.slice(0, 5) : items;

  if (state === 'loading') {
    return (
      <div
        data-testid="omnimedia-gallery-loading"
        className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading media…
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        data-testid="omnimedia-gallery-error"
        role="alert"
        className="flex flex-col items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs text-red-300"
      >
        <span>Couldn’t load your media: {errorMessage}</span>
        <button
          type="button"
          data-testid="omnimedia-gallery-retry"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-md border border-red-400/30 px-2 py-1 text-[11px] font-medium text-red-200 hover:bg-red-500/10"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <div
        data-testid="omnimedia-gallery-empty"
        className="rounded-lg border border-dashed border-border/30 px-3 py-4 text-center text-xs text-muted-foreground"
      >
        No media yet. Upload a video or audio file from Files to see it here.
      </div>
    );
  }

  return (
    <div data-testid="omnimedia-gallery" className="flex flex-col gap-2">
      {visibleItems.map((item) => (
        <div
          key={item.id}
          data-testid="omnimedia-gallery-item"
          className="flex items-center gap-2 rounded-lg border border-border/20 bg-muted/5 px-2.5 py-2 hover:border-primary/40"
        >
          <button
            type="button"
            onClick={() => handlePlay(item)}
            className="flex flex-1 min-w-0 items-center gap-2 text-left"
            aria-label={`Play ${item.title}`}
          >
            {item.kind === 'video' ? (
              <Video className="h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
            ) : (
              <Music className="h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">
                {item.title}
              </span>
              <span className="block text-[10px] text-muted-foreground">
                {item.is_external ? item.provider ?? 'External' : 'First-Party'}
              </span>
            </span>
          </button>
          {variant === 'full' && (
            <button
              type="button"
              aria-label={`Delete ${item.title}`}
              disabled={deletingId === item.id}
              onClick={() => void handleDelete(item)}
              className="flex-shrink-0 p-1 text-muted-foreground hover:text-red-400 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
