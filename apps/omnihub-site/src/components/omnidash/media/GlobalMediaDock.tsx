import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import { useMemo } from 'react';
import { useOmniMedia } from '@/stores/omniMediaStore';

function MediaSurface() {
  const currentMedia = useOmniMedia((state) => state.currentMedia);
  const isPlaying = useOmniMedia((state) => state.isPlaying);

  if (!currentMedia) return null;

  if (currentMedia.type === 'embed') {
    return (
      <iframe
        src={currentMedia.source}
        title={currentMedia.title}
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    );
  }

  if (currentMedia.type === 'video') {
    return (
      <video
        src={currentMedia.source}
        poster={currentMedia.poster}
        className="h-full w-full object-cover"
        playsInline
        autoPlay={isPlaying}
        controls
      />
    );
  }

  return (
    <audio
      src={currentMedia.source}
      autoPlay={isPlaying}
      controls
      className="w-full"
    />
  );
}

export function GlobalMediaDock() {
  const currentMedia = useOmniMedia((state) => state.currentMedia);
  const isPlaying = useOmniMedia((state) => state.isPlaying);
  const isDocked = useOmniMedia((state) => state.isDocked);
  const volume = useOmniMedia((state) => state.volume);
  const togglePlay = useOmniMedia((state) => state.togglePlay);
  const setDocked = useOmniMedia((state) => state.setDocked);
  const setVolume = useOmniMedia((state) => state.setVolume);
  const close = useOmniMedia((state) => state.close);

  const shellClassName = useMemo(
    () => isDocked
      ? 'fixed bottom-4 right-4 z-[18000] w-[360px] overflow-hidden rounded-2xl border border-white/15 bg-[#0b1326]/90 shadow-2xl backdrop-blur-xl'
      : 'fixed bottom-4 right-4 z-[18000] w-auto overflow-hidden rounded-xl border border-white/15 bg-[#0b1326]/90 shadow-xl backdrop-blur-xl',
    [isDocked],
  );

  if (!currentMedia) return null;

  return (
    <aside className={shellClassName} aria-label="Global OmniMedia dock">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-xs text-slate-200">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{currentMedia.title}</div>
          <div className="truncate text-[10px] uppercase tracking-wide text-slate-400">{currentMedia.provider}</div>
        </div>
        <div className="flex items-center gap-1">
          {currentMedia.type !== 'embed' && (
            <button type="button" onClick={togglePlay} className="rounded-md p-1.5 hover:bg-white/10" aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          )}
          <button type="button" onClick={() => setDocked(!isDocked)} className="rounded-md p-1.5 hover:bg-white/10" aria-label={isDocked ? 'Minimize' : 'Expand'}>
            {isDocked ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={close} className="rounded-md p-1.5 text-rose-300 hover:bg-rose-500/20" aria-label="Close media">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isDocked && (
        <div className="h-[202px] w-full bg-black/40">
          <MediaSurface />
        </div>
      )}

      {isDocked && currentMedia.type !== 'embed' && (
        <div className="flex items-center gap-2 px-3 py-2">
          <button type="button" onClick={() => setVolume(volume > 0 ? 0 : 1)} className="rounded-md p-1.5 hover:bg-white/10" aria-label={volume > 0 ? 'Mute' : 'Unmute'}>
            {volume > 0 ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <input
            aria-label="Media volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(event) => setVolume(Number(event.target.value) / 100)}
            className="w-full"
          />
        </div>
      )}
    </aside>
  );
}
