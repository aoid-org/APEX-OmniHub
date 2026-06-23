/**
 * GlobalMediaDock — Persistent PiP Media Layer
 * @version 1.1.0
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

import { type ComponentType } from 'react';
// Relative import (not '@/stores/...'): vite.config resolves '@' to
// apps/omnihub-site/src, but omniMediaStore lives in the ROOT src/ package.
// A relative path resolves correctly in both the Vite build and vitest.
import { useOmniMedia } from '../../../../../src/stores/omniMediaStore';
import { OmniMediaPlayer } from './OmniMediaPlayer';
// Relative import: the Slider primitive lives in the ROOT src/ package, not
// apps/omnihub-site/src (where vite.config maps '@'). Its own '@/lib/utils'
// resolves to a compatible cn() in both trees, so the build and tests agree.
import { Slider } from '../../../../../src/components/ui/slider';
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

// ---------------------------------------------------------------------------
// Shared sub-component — eliminates the duplicated info-row JSX block
// ---------------------------------------------------------------------------

interface DockInfoRowProps {
  readonly title: string;
  readonly provider: string;
  readonly mediaType: string;
  readonly isPlaying: boolean;
  readonly onTogglePlay: () => void;
  readonly DockIcon: ComponentType<{ readonly className?: string }>;
  readonly dockLabel: string;
  readonly onToggleDock: () => void;
  readonly onClose: () => void;
}

function DockInfoRow({
  title,
  provider,
  mediaType,
  isPlaying,
  onTogglePlay,
  DockIcon,
  dockLabel,
  onToggleDock,
  onClose,
}: DockInfoRowProps) {
  return (
    <div className="omni-dock-info-row">
      <div className="omni-dock-info">
        <span className="omni-dock-title">{title}</span>
        <span className="omni-dock-provider">{provider}</span>
      </div>
      <div className="omni-dock-actions">
        {mediaType !== 'embed' && (
          <button
            type="button"
            className="omni-dock-btn"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          className="omni-dock-btn"
          onClick={onToggleDock}
          aria-label={dockLabel}
        >
          <DockIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="omni-dock-btn omni-dock-btn-close"
          onClick={onClose}
          aria-label="Close media player"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GlobalMediaDock
// ---------------------------------------------------------------------------

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

  if (!currentMedia) return null;

  const sharedInfoRowProps = {
    title: currentMedia.title,
    provider: currentMedia.provider,
    mediaType: currentMedia.type,
    isPlaying,
    onTogglePlay: togglePlay,
    onClose: close,
  };

  // When not docked, render a minimal floating "re-dock" button
  if (!isDocked) {
    return (
      <div className="omni-media-dock" style={{ width: 'auto', padding: '8px 12px' }}>
        <DockInfoRow
          {...sharedInfoRowProps}
          DockIcon={Maximize2}
          dockLabel="Expand media player"
          onToggleDock={() => setDocked(true)}
        />
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
        <DockInfoRow
          {...sharedInfoRowProps}
          DockIcon={Minimize2}
          dockLabel="Minimize media player"
          onToggleDock={() => setDocked(false)}
        />

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
