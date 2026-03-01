import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Self-contained demo video player.
 *
 * Autoplay strategy — start muted (guaranteed by every browser), then unmute
 * as aggressively as possible:
 *   1. Try immediate programmatic unmute (works when the site's Media
 *      Engagement Index is high enough, e.g. return visitors in Chrome).
 *   2. If that fails, listen for the first user gesture anywhere on the page
 *      (click / touchstart / keydown) and unmute at that moment.
 *
 * User controls — a mute/unmute toggle and a play/pause toggle are always
 * visible so the visitor can silence or stop the video at any time.
 */
export function DemoVideoPlayer({ id }: { id?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let disposed = false;

    const unmuteNow = () => {
      if (disposed) return;
      video.muted = false;
      setIsMuted(false);
      teardown();
    };

    const teardown = () => {
      document.removeEventListener('click', unmuteNow);
      document.removeEventListener('touchstart', unmuteNow);
      document.removeEventListener('keydown', unmuteNow);
    };

    // 1. Start muted — autoplay is guaranteed
    video.muted = true;
    video.play()
      .then(() => {
        setIsPlaying(true);
        // 2. Attempt immediate unmute on the already-playing video
        video.muted = false;
        if (!video.muted) {
          setIsMuted(false);
          return;
        }

        // 3. Browser blocked — wait for first user gesture
        video.muted = true;
        document.addEventListener('click', unmuteNow);
        document.addEventListener('touchstart', unmuteNow);
        document.addEventListener('keydown', unmuteNow);
      })
      .catch(() => {
        setIsPlaying(false);
      });

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  return (
    <div className="demo-video__container">
      <div className="demo-video__glow" aria-hidden="true" />
      <video
        ref={videoRef}
        id={id}
        className="demo-video__player"
        autoPlay
        loop
        playsInline
        preload="auto"
      >
        <source src="/apex-demo-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="demo-video__controls">
        <button
          type="button"
          className="demo-video__ctrl-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="demo-video__ctrl-btn"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
