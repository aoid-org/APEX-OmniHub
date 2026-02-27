/**
 * OmniMedia Store — Unit Tests
 * @module tests/omnidash/omni-media-store.spec
 *
 * Tests the global Zustand store for media state management.
 * Pure store tests — no DOM, no React rendering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOmniMedia } from '@/stores/omniMediaStore';
import type { MediaPayload } from '@/stores/omniMediaStore';

// Mock EdgeCacheController — returns URL as-is in tests
vi.mock('@/lib/media/EdgeCacheController', () => ({
  prefetchAndCacheMedia: vi.fn(async (url: string) => url),
  revokeCachedBlobUrl: vi.fn(),
}));

const MOCK_VIDEO: MediaPayload = {
  id: 'test-video-01',
  source: 'https://example.com/video.mp4',
  type: 'video',
  title: 'Test Video',
  provider: 'Internal',
  poster: 'https://example.com/thumb.jpg',
};

const MOCK_AUDIO: MediaPayload = {
  id: 'test-audio-01',
  source: 'https://example.com/audio.mp3',
  type: 'audio',
  title: 'Test Audio',
  provider: 'Spotify',
};

const MOCK_EMBED: MediaPayload = {
  id: 'test-embed-01',
  source: 'https://www.youtube.com/embed/abc123',
  type: 'embed',
  title: 'YouTube Video',
  provider: 'YouTube',
};

describe('omniMediaStore', () => {
  beforeEach(() => {
    // Reset store to defaults between tests
    useOmniMedia.setState({
      currentMedia: null,
      isPlaying: false,
      isDocked: false,
      volume: 1,
    });
  });

  describe('initial state', () => {
    it('starts with no media, not playing, not docked, volume 1', () => {
      const state = useOmniMedia.getState();
      expect(state.currentMedia).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isDocked).toBe(false);
      expect(state.volume).toBe(1);
    });
  });

  describe('loadMedia', () => {
    it('sets currentMedia and isPlaying for video', async () => {
      await useOmniMedia.getState().loadMedia(MOCK_VIDEO);
      const state = useOmniMedia.getState();
      expect(state.currentMedia?.id).toBe('test-video-01');
      expect(state.currentMedia?.type).toBe('video');
      expect(state.isPlaying).toBe(true);
      expect(state.isDocked).toBe(false);
    });

    it('sets embed media without cache prefetch', async () => {
      await useOmniMedia.getState().loadMedia(MOCK_EMBED);
      const state = useOmniMedia.getState();
      expect(state.currentMedia?.id).toBe('test-embed-01');
      expect(state.currentMedia?.source).toBe('https://www.youtube.com/embed/abc123');
      expect(state.isPlaying).toBe(true);
    });

    it('respects autoPlay=false', async () => {
      await useOmniMedia.getState().loadMedia(MOCK_AUDIO, false);
      const state = useOmniMedia.getState();
      expect(state.currentMedia?.id).toBe('test-audio-01');
      expect(state.isPlaying).toBe(false);
    });

    it('replaces previous media (single-stream enforcement)', async () => {
      await useOmniMedia.getState().loadMedia(MOCK_VIDEO);
      expect(useOmniMedia.getState().currentMedia?.id).toBe('test-video-01');

      await useOmniMedia.getState().loadMedia(MOCK_AUDIO);
      const state = useOmniMedia.getState();
      expect(state.currentMedia?.id).toBe('test-audio-01');
    });
  });

  describe('play / pause / togglePlay', () => {
    it('play() sets isPlaying to true', () => {
      useOmniMedia.getState().play();
      expect(useOmniMedia.getState().isPlaying).toBe(true);
    });

    it('pause() sets isPlaying to false', () => {
      useOmniMedia.setState({ isPlaying: true });
      useOmniMedia.getState().pause();
      expect(useOmniMedia.getState().isPlaying).toBe(false);
    });

    it('togglePlay() flips isPlaying', () => {
      expect(useOmniMedia.getState().isPlaying).toBe(false);
      useOmniMedia.getState().togglePlay();
      expect(useOmniMedia.getState().isPlaying).toBe(true);
      useOmniMedia.getState().togglePlay();
      expect(useOmniMedia.getState().isPlaying).toBe(false);
    });
  });

  describe('setDocked', () => {
    it('sets isDocked to true', () => {
      useOmniMedia.getState().setDocked(true);
      expect(useOmniMedia.getState().isDocked).toBe(true);
    });

    it('sets isDocked to false', () => {
      useOmniMedia.setState({ isDocked: true });
      useOmniMedia.getState().setDocked(false);
      expect(useOmniMedia.getState().isDocked).toBe(false);
    });
  });

  describe('setVolume', () => {
    it('sets volume to given value', () => {
      useOmniMedia.getState().setVolume(0.5);
      expect(useOmniMedia.getState().volume).toBe(0.5);
    });

    it('clamps volume to 0 minimum', () => {
      useOmniMedia.getState().setVolume(-1);
      expect(useOmniMedia.getState().volume).toBe(0);
    });

    it('clamps volume to 1 maximum', () => {
      useOmniMedia.getState().setVolume(5);
      expect(useOmniMedia.getState().volume).toBe(1);
    });
  });

  describe('close', () => {
    it('resets all state to defaults', async () => {
      await useOmniMedia.getState().loadMedia(MOCK_VIDEO);
      useOmniMedia.getState().setDocked(true);
      useOmniMedia.getState().setVolume(0.5);

      useOmniMedia.getState().close();
      const state = useOmniMedia.getState();
      expect(state.currentMedia).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isDocked).toBe(false);
      // Volume intentionally NOT reset on close
    });
  });
});
