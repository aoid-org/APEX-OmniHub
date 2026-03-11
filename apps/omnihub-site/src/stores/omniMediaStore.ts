import { create } from 'zustand';

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
  loadMedia: (payload: MediaPayload, autoPlay?: boolean) => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setDocked: (docked: boolean) => void;
  setVolume: (vol: number) => void;
  close: () => void;
}

export const useOmniMedia = create<OmniMediaState>((set) => ({
  currentMedia: null,
  isPlaying: false,
  isDocked: true,
  volume: 1,

  loadMedia: async (payload, autoPlay = true) => {
    set({
      currentMedia: structuredClone(payload),
      isPlaying: autoPlay,
      isDocked: true,
    });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setDocked: (docked) => set({ isDocked: docked }),
  setVolume: (vol) => set({ volume: Math.max(0, Math.min(1, vol)) }),
  close: () => set({ currentMedia: null, isPlaying: false, isDocked: false }),
}));
