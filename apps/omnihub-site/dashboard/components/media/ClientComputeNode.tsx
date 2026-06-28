/**
 * ClientComputeNode — Web Audio API Edge-Compute Media Graph
 * @version 1.0.0
 * @module src/components/omnidash/media/ClientComputeNode
 *
 * Intercepts raw media streams through the Web Audio API's
 * MediaElementAudioSourceNode, applies real-time DSP processing
 * (dynamic range compression for voice normalization), and routes
 * output to client speakers — zero server-side compute.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Audio graph guarded by ref — no duplicate contexts
 * - Memory Safety: AudioContext.close() on unmount prevents hardware leaks
 * - Enterprise Performance: All DSP on client CPU via Web Audio API
 * - Overload-Free: Single audio graph per component lifecycle
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useOmniMedia } from '@/stores/omniMediaStore';
import { fetchOmniMediaCatalog } from '@/dashboard/lib/omniMediaCatalog';

export interface ClientComputeNodeHandle {
  readonly mediaElement: HTMLMediaElement | null;
}

export const ClientComputeNode = forwardRef<ClientComputeNodeHandle>(
  function ClientComputeNode(_props, ref) {
    const { currentMedia, isPlaying, volume, mediaError, loadMedia, setMediaError, clearMediaError } = useOmniMedia();
    const mediaRef = useRef<HTMLMediaElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

    // A playback error (e.g. expired signed URL) sets mediaError. The next play
    // attempt re-resolves a fresh signed URL from the catalog instead of retrying
    // the same dead URL.
    useEffect(() => {
      if (!isPlaying || !mediaError || !currentMedia || currentMedia.type === 'embed') return;
      let cancelled = false;
      (async () => {
        try {
          const items = await fetchOmniMediaCatalog();
          const fresh = items.find((i) => i.id === currentMedia.id);
          if (cancelled || !fresh?.source) return;
          clearMediaError();
          await loadMedia(
            { ...currentMedia, source: fresh.source },
            true,
          );
        } catch {
          if (!cancelled) {
            setMediaError('omnimedia_refresh_failed');
          }
        }
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, mediaError]);

    // Expose media element to parent for seek/progress tracking
    useImperativeHandle(ref, () => ({
      get mediaElement() {
        return mediaRef.current;
      },
    }));

    // Initialize Web Audio graph and sync playback state
    useEffect(() => {
      const el = mediaRef.current;
      if (!el) return;

      // 1. Create audio context + compute graph on first interaction
      if (!audioContextRef.current) {
        const Ctx = globalThis.AudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          audioContextRef.current = ctx;

          // Intercept DOM media element
          const source = ctx.createMediaElementSource(el);
          sourceNodeRef.current = source;

          // Client-side compute: Dynamic Range Compression
          const compressor = ctx.createDynamicsCompressor();
          compressor.threshold.setValueAtTime(-24, ctx.currentTime);
          compressor.knee.setValueAtTime(30, ctx.currentTime);
          compressor.ratio.setValueAtTime(12, ctx.currentTime);
          compressor.attack.setValueAtTime(0.003, ctx.currentTime);
          compressor.release.setValueAtTime(0.25, ctx.currentTime);

          // Wire: Source → Compressor → Client Speakers
          source.connect(compressor);
          compressor.connect(ctx.destination);
        }
      }

      // 2. Sync React state to local hardware state
      el.volume = volume;

      if (isPlaying) {
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {
            // AudioContext resume can fail if document not yet interactive
          });
        }
        el.play().catch(() => {
          // Browser autoplay policy may block — handled gracefully
        });
      } else {
        el.pause();
      }
    }, [isPlaying, volume, currentMedia]);

    // Cleanup: close AudioContext on unmount
    useEffect(() => {
      return () => {
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {
            // Closing an already-closed context is harmless
          });
          audioContextRef.current = null;
          sourceNodeRef.current = null;
        }
      };
    }, []);

    if (!currentMedia || currentMedia.type === 'embed') return null;

    const setVideoRef = (el: HTMLVideoElement | null) => {
      mediaRef.current = el;
    };

    const setAudioRef = (el: HTMLAudioElement | null) => {
      mediaRef.current = el;
    };

    if (currentMedia.type === 'video') {
      return (
        <video
          ref={setVideoRef}
          src={currentMedia.source}
          poster={currentMedia.poster}
          crossOrigin="anonymous"
          playsInline
          className="w-full h-full object-cover rounded-md"
          controls={false}
          onError={() => setMediaError('omnimedia_playback_error')}
        >
          <track kind="captions" />
        </video>
      );
    }

    return (
      <audio
        ref={setAudioRef}
        src={currentMedia.source}
        crossOrigin="anonymous"
        className="hidden"
        onError={() => setMediaError('omnimedia_playback_error')}
      >
        <track kind="captions" />
      </audio>
    );
  },
);
