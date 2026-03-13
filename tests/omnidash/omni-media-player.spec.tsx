/**
 * OmniMediaPlayer — Component Tests
 * @module tests/omnidash/omni-media-player.spec
 *
 * Verifies the adaptive rendering of the media player,
 * choosing between ClientComputeNode (audio/video) and an iframe (embeds).
 * Adheres to omni-test-universal AAA pattern.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OmniMediaPlayer } from '@/dashboard/components/media/OmniMediaPlayer';
import { useOmniMedia, type MediaPayload } from '@/stores/omniMediaStore';

const MOCK_EMBED: MediaPayload = {
  id: 'test-embed',
  source: 'https://youtube.com/embed/test',
  type: 'embed',
  title: 'Test Embed',
  provider: 'YouTube'
};

const MOCK_VIDEO: MediaPayload = {
  id: 'test-video',
  source: 'test.mp4',
  type: 'video',
  title: 'Test Video',
  provider: 'System'
};

const MOCK_AUDIO: MediaPayload = {
  id: 'test-audio',
  source: 'test.mp3',
  type: 'audio',
  title: 'Test Audio',
  provider: 'System'
};

describe('OmniMediaPlayer', () => {
  beforeEach(() => {
    useOmniMedia.setState({ currentMedia: null, isPlaying: false, isDocked: false, volume: 1 });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when no media is active', () => {
    const { container } = render(<OmniMediaPlayer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an iframe for embed type media', () => {
    useOmniMedia.setState({ currentMedia: MOCK_EMBED });
    render(<OmniMediaPlayer />);
    
    const iframe = screen.getByTitle('Test Embed');
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe).toHaveAttribute('src', 'https://youtube.com/embed/test');
    expect(iframe).toHaveAttribute('allowFullScreen');
  });

  it('renders ClientComputeNode (native video tag) for video type media', () => {
    useOmniMedia.setState({ currentMedia: MOCK_VIDEO });
    
    // We mock the inner audio context logic to avoid JSDOM missing implementations
    // but the actual element tag should be present.
    const { container } = render(<OmniMediaPlayer />);
    
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'test.mp4');
    // Ensure APEX standard playsInline is set correctly
    expect(video).toHaveAttribute('playsinline'); 
  });

  it('renders ClientComputeNode (native audio tag) for audio type media', () => {
    useOmniMedia.setState({ currentMedia: MOCK_AUDIO });
    
    const { container } = render(<OmniMediaPlayer />);
    
    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('src', 'test.mp3');
  });

  it('renders an error fallback for unsupported media types', () => {
    // Cast to force an invalid type for boundary testing
    useOmniMedia.setState({ currentMedia: { ...MOCK_AUDIO, type: 'unknown' as MediaPayload['type'] } });
    
    render(<OmniMediaPlayer />);
    
    expect(screen.getByText('Unsupported Media Type')).toBeInTheDocument();
  });
});
