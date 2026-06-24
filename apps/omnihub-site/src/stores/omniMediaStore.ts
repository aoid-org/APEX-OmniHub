import { create } from 'zustand';

export type MediaType = 'video' | 'audio' | 'embed' | 'image';

export interface OmniMediaItem {
  id: string;
  source: string;
  type: MediaType;
  title: string;
  provider?: string;
  poster?: string;
}

interface OmniMediaState {
  currentMedia: OmniMediaItem | null;
  isPlaying: boolean;
  isDocked: boolean;
  volume: number;
  loadMedia: (item: OmniMediaItem, autoPlay?: boolean) => Promise<void>;
  togglePlay: () => void;
  setDocked: (docked: boolean) => void;
  setVolume: (volume: number) => void;
  close: () => void;
}

export const useOmniMedia = create<OmniMediaState>((set) => ({
  currentMedia: null,
  isPlaying: false,
  isDocked: true,
  volume: 0.8,

  loadMedia: async (item, autoPlay = false) => {
    set({ currentMedia: item, isPlaying: autoPlay });
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  setDocked: (docked) => set({ isDocked: docked }),

  setVolume: (volume) => set({ volume }),

  close: () => set({ currentMedia: null, isPlaying: false }),
}));
