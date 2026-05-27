/**
 * ClientComputeNode — Component Tests
 * @module tests/omnidash/client-compute-node.spec
 *
 * OMNI-TEST UNIVERSAL — AAA pattern enforced.
 * Covers: null render for embed type, video element render,
 * audio element render, null render when no currentMedia,
 * AudioContext cleanup on unmount (memory safety).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClientComputeNode } from '@/dashboard/components/media/ClientComputeNode';
import { useOmniMedia } from '@/stores/omniMediaStore';

// HTMLMediaElement stubs from setup.ts handle play/pause
// AudioContext stub
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockResume = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn();
const mockCreateDynamicsCompressor = vi.fn(() => ({
  threshold: { setValueAtTime: vi.fn() },
  knee: { setValueAtTime: vi.fn() },
  ratio: { setValueAtTime: vi.fn() },
  attack: { setValueAtTime: vi.fn() },
  release: { setValueAtTime: vi.fn() },
  connect: mockConnect,
}));
const mockCreateMediaElementSource = vi.fn(() => ({ connect: mockConnect }));

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  close = mockClose;
  resume = mockResume;
  createDynamicsCompressor = mockCreateDynamicsCompressor;
  createMediaElementSource = mockCreateMediaElementSource;
}

describe('ClientComputeNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Provide AudioContext mock
    (globalThis as Record<string, unknown>).AudioContext = MockAudioContext;
    // Reset store to null media
    useOmniMedia.setState({ currentMedia: null, isPlaying: false, volume: 1 });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Null media', () => {
    it('renders null when currentMedia is null', () => {
      const { container } = render(<ClientComputeNode />);
      expect(container.firstChild).toBeNull();
    });

    it('renders null when currentMedia.type is "embed"', () => {
      useOmniMedia.setState({
        currentMedia: { id: 'test-id', provider: 'test-provider', type: 'embed', source: 'https://youtube.com/watch?v=abc', title: 'Test' },
        isPlaying: false,
        volume: 1,
      });
      const { container } = render(<ClientComputeNode />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Video media', () => {
    it('renders a video element for video type', () => {
      useOmniMedia.setState({
        currentMedia: {
          id: 'test-id',
          provider: 'test-provider',
          type: 'video',
          source: 'https://example.com/video.mp4',
          poster: 'https://example.com/poster.jpg',
          title: 'Test Video',
        },
        isPlaying: false,
        volume: 0.8,
      });

      render(<ClientComputeNode />);

      const video = document.querySelector('video');
      expect(video).not.toBeNull();
    });

    it('sets crossOrigin="anonymous" on video element', () => {
      useOmniMedia.setState({
        currentMedia: { id: 'test-id', provider: 'test-provider', type: 'video', source: 'https://cdn.example.com/v.mp4', title: 'V' },
        isPlaying: false,
        volume: 1,
      });

      render(<ClientComputeNode />);
      const video = document.querySelector('video') as HTMLVideoElement;
      expect(video?.crossOrigin).toBe('anonymous');
    });
  });

  describe('Audio media', () => {
    it('renders an audio element for audio type', () => {
      useOmniMedia.setState({
        currentMedia: {
          id: 'test-id',
          provider: 'test-provider',
          type: 'audio',
          source: 'https://example.com/track.mp3',
          title: 'Test Track',
        },
        isPlaying: false,
        volume: 1,
      });

      render(<ClientComputeNode />);

      const audio = document.querySelector('audio');
      expect(audio).not.toBeNull();
    });

    it('sets crossOrigin="anonymous" on audio element', () => {
      useOmniMedia.setState({
        currentMedia: { id: 'test-id', provider: 'test-provider', type: 'audio', source: 'https://cdn.example.com/track.mp3', title: 'T' },
        isPlaying: false,
        volume: 1,
      });
      render(<ClientComputeNode />);
      const audio = document.querySelector('audio') as HTMLAudioElement;
      expect(audio?.crossOrigin).toBe('anonymous');
    });
  });

  describe('AudioContext lifecycle', () => {
    it('closes AudioContext on unmount to prevent hardware leaks', () => {
      useOmniMedia.setState({
        currentMedia: { id: 'test-id', provider: 'test-provider', type: 'audio', source: 'https://cdn.example.com/t.mp3', title: 'T' },
        isPlaying: false,
        volume: 1,
      });

      const { unmount } = render(<ClientComputeNode />);
      unmount();

      // AudioContext close called during cleanup
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Imperative handle', () => {
    it('exposes mediaElement handle via ref', async () => {
      const { createRef } = await import('react');
      type Handle = import('@/dashboard/components/media/ClientComputeNode').ClientComputeNodeHandle;
      const ref = createRef<Handle>();

      useOmniMedia.setState({
        currentMedia: { id: 'test-id', provider: 'test-provider', type: 'audio', source: 'https://cdn.example.com/x.mp3', title: 'X' },
        isPlaying: false,
        volume: 1,
      });

      render(<ClientComputeNode ref={ref} />);
      expect(ref.current).not.toBeNull();
    });
  });
});
