/**
 * GlobalMediaDock — Persistent PiP Media Layer
 * @version 1.0.0
 * @module src/components/omnidash/media/GlobalMediaDock
 *
 * Fixed-position dock that persists across route transitions.
 * Renders only when media is loaded and isDocked is true.
 *
 * APEX STANDARDS ENFORCED:
 * - Overload-Free: Renders null when inactive — zero DOM cost
 * - Modularity: Delegates rendering to OmniMediaPlayer
 * - Enterprise Performance: CSS animations over JS for GPU compositing
 * - Atomic Idempotency: Same state always produces identical render
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useOmniMedia } from '@/stores/omniMediaStore';
import { OmniMediaPlayer } from './OmniMediaPlayer';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  X,
  Maximize2,
  Minimize2,
  Music,
  Volume2,
  VolumeX,
} from 'lucide-react';
import './OmniMediaDock.css';

export function GlobalMediaDock() {
  const {
    currentMedia,
    isPlaying,
    isDocked,
    volume,
    togglePlay,
    setDocked,
    setVolume,
    close,
  } = useOmniMedia();

  // Render nothing when no media or not docked
  if (!currentMedia) return null;

  // When not docked, render a minimal floating "re-dock" button
  if (!isDocked) {
    return (
      <div className="omni-media-dock" style={{ width: 'auto', padding: '8px 12px' }}>
        <div className="omni-dock-info-row">
          <div className="omni-dock-info">
            <span className="omni-dock-title">{currentMedia.title}</span>
            <span className="omni-dock-provider">{currentMedia.provider}</span>
          </div>
          <div className="omni-dock-actions">
            {currentMedia.type !== 'embed' && (
              <button
                type="button"
                className="omni-dock-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              className="omni-dock-btn"
              onClick={() => setDocked(true)}
              aria-label="Expand media player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="omni-dock-btn omni-dock-btn-close"
              onClick={close}
              aria-label="Close media player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full docked view
  const isAudioOnly = currentMedia.type === 'audio';

  return (
    <aside className="omni-media-dock" aria-label="Media player">
      {/* Media Render Area */}
      <div className={`omni-dock-media ${isAudioOnly ? 'omni-dock-media-audio' : 'omni-dock-media-video'}`}>
        {isAudioOnly && (
          <Music className="w-10 h-10 omni-dock-audio-icon" />
        )}
        <OmniMediaPlayer />
      </div>

      {/* Control Bar */}
      <div className="omni-dock-controls">
        <div className="omni-dock-info-row">
          <div className="omni-dock-info">
            <span className="omni-dock-title">{currentMedia.title}</span>
            <span className="omni-dock-provider">{currentMedia.provider}</span>
          </div>
          <div className="omni-dock-actions">
            {currentMedia.type !== 'embed' && (
              <button
                type="button"
                className="omni-dock-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              className="omni-dock-btn"
              onClick={() => setDocked(false)}
              aria-label="Minimize media player"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="omni-dock-btn omni-dock-btn-close"
              onClick={close}
              aria-label="Close media player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Volume Slider — hidden for embeds (no control) */}
        {currentMedia.type !== 'embed' && (
          <div className="omni-dock-volume-row">
            <button
              type="button"
              className="omni-dock-btn"
              onClick={() => setVolume(volume > 0 ? 0 : 1)}
              aria-label={volume > 0 ? 'Mute' : 'Unmute'}
              style={{ width: 24, height: 24 }}
            >
              {volume > 0 ? (
                <Volume2 className="w-3.5 h-3.5 omni-dock-volume-icon" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 omni-dock-volume-icon" />
              )}
            </button>
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={(vals) => setVolume((vals[0] ?? 100) / 100)}
              className="flex-1"
              aria-label="Volume"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
