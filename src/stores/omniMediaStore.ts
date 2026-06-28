/**
 * OmniMedia Global State — "The Omnipresent Director"
 * @version 1.0.0
 * @module src/stores/omniMediaStore
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: loadMedia() with same payload produces identical state
 * - Single-Stream: Loading new media auto-closes previous (no overload)
 * - Memory Safety: Blob URLs revoked on close() to prevent leaks
 * - Modularity: Pure Zustand store — zero React dependencies
 * - Enterprise Performance: loadMedia is async for edge cache prefetch
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';
import { prefetchAndCacheMedia, revokeCachedBlobUrl } from '@/lib/media/EdgeCacheController';

// ============================================================================
// Types — All readonly for immutability
// ============================================================================

export type MediaType = 'audio' | 'video' | 'embed';

export interface MediaPayload {
  readonly id: string;
  readonly source: string;
  readonly type: MediaType;
  readonly title: string;
  readonly provider: string;
  readonly poster?: string;
}

interface OmniMediaState {
  readonly currentMedia: MediaPayload | null;
  readonly isPlaying: boolean;
  readonly isDocked: boolean;
  readonly volume: number;
  // Batch 3b catalog/error API — kept in lock-step with the omnihub-site app store
  // (apps/omnihub-site/src/stores/omniMediaStore.ts) so the dashboard media
  // components typecheck identically under both alias-resolution targets.
  readonly catalogVersion: number;
  readonly mediaError: string | null;
  loadMedia: (payload: MediaPayload, autoPlay?: boolean) => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setDocked: (docked: boolean) => void;
  setVolume: (vol: number) => void;
  close: () => void;
  bumpCatalog: () => void;
  clearMediaError: () => void;
  setMediaError: (message: string) => void;
}

// ============================================================================
// Store
// ============================================================================

export const useOmniMedia = create<OmniMediaState>((set, get) => ({
  currentMedia: null,
  isPlaying: false,
  isDocked: false,
  volume: 1,
  catalogVersion: 0,
  mediaError: null,

  loadMedia: async (payload, autoPlay = true) => {
    // Close previous media first (revoke blob URLs, reset state)
    const prev = get().currentMedia;
    if (prev?.source?.startsWith('blob:')) {
      revokeCachedBlobUrl(prev.source);
    }

    // Route non-embed through edge cache for local buffering
    if (payload.type === 'embed') {
      set({
        currentMedia: payload,
        isPlaying: autoPlay,
        isDocked: false,
      });
    } else {
      const localSource = await prefetchAndCacheMedia(payload.source);
      set({
        currentMedia: { ...payload, source: localSource },
        isPlaying: autoPlay,
        isDocked: false,
      });
    }
  },

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setDocked: (docked) => set({ isDocked: docked }),

  setVolume: (vol) => set({ volume: Math.max(0, Math.min(1, vol)) }),

  close: () => {
    const prev = get().currentMedia;
    if (prev?.source?.startsWith('blob:')) {
      revokeCachedBlobUrl(prev.source);
    }
    set({ currentMedia: null, isPlaying: false, isDocked: false });
  },

  bumpCatalog: () => set((state) => ({ catalogVersion: state.catalogVersion + 1 })),

  clearMediaError: () => set({ mediaError: null }),

  setMediaError: (message) => set({ mediaError: message }),
}));
