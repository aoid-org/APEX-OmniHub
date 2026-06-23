import { useCallback, useEffect, useRef, useState } from 'react';

type DemoVideoPlayerProps = {
  readonly id?: string;
  readonly sourceUrl: string;
  readonly captionUrl?: string;
};

export function DemoVideoPlayer({
  id,
  sourceUrl,
  captionUrl = '/captions/demo.vtt',
}: DemoVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = true;
    video
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        setIsPlaying(false);
        setIsMuted(true);
      });

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
    };

    video.addEventListener('pause', handlePause);
    video.addEventListener('play', handlePlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
      return;
    }

    video.pause();
    setIsPlaying(false);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const reloadVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    setHasError(false);
    video.load();
    video.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });
  }, []);

  return (
    <div className="demo-video__container">
      <div className="demo-video__glow" aria-hidden="true" />
      {/*
        CLS FIX: explicit width + height attributes tell the browser the
        intrinsic size BEFORE video metadata loads, eliminating the 0.169 layout shift.
        aspect-ratio:16/9 in CSS is the primary constraint; width+height are the
        authoritative intrinsic-size hint for pre-metadata render.
      */}
      <video
        ref={videoRef}
        id={id}
        className="demo-video__player"
        src={sourceUrl}
        autoPlay
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        controls
        width={960}
        height={540}
      >
        <track kind="captions" src={captionUrl} srcLang="en" label="English" />
        Your browser does not support the video tag.
      </video>
      <div className="demo-video__controls">
        <button
          type="button"
          className="demo-video__control-btn"
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="demo-video__control-btn"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>
      {hasError ? (
        <output className="demo-video__error" aria-live="polite">
          <p>The current video file could not be played in this browser.</p>
          <button type="button" className="demo-video__retry-btn" onClick={reloadVideo}>
            Retry
          </button>
        </output>
      ) : null}
    </div>
  );
}
