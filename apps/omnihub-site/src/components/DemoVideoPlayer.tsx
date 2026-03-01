import { useRef, useState, useEffect, useCallback } from 'react';

export function DemoVideoPlayer({ id }: { id?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Attempt unmuted autoplay; fall back to muted if browser blocks it
    video.muted = false;
    video.play().then(() => {
      setIsMuted(false);
    }).catch(() => {
      video.muted = true;
      video.play().catch(() => { /* autoplay fully blocked */ });
      setIsMuted(true);
    });
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
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
      <button
        type="button"
        className="demo-video__mute-btn"
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
      >
        {isMuted ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
      </button>
    </div>
  );
}
