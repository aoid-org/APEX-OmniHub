import { useEffect, useRef, useState } from 'react';
import './BrandAnthemPlayer.css';

export function BrandAnthemPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      console.error('Audio playback error.');
      setHasError(true);
      setIsPlaying(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const playAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      setHasError(false);
    }).catch(err => {
      console.error('Failed to play audio manually:', err);
      setHasError(true);
    });
  };

  const pauseAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
  };

  return (
    <div className="brand-anthem-player" aria-label="Brand Anthem Player">
      <audio
        ref={audioRef}
        src="/audio/brand-anthem.mp3"
        loop
        preload="metadata"
      />
      <div className="brand-anthem-controls">
        <span className="anthem-label">Brand Anthem</span>
        <button 
          onClick={playAudio} 
          className={`anthem-action-btn ${isPlaying ? "active" : ""}`}
          aria-label="Play brand anthem"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
        <button 
          onClick={pauseAudio} 
          className={`anthem-action-btn ${isPlaying ? "" : "active"}`}
          aria-label="Pause brand anthem"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        </button>
        {hasError && <span className="anthem-error-text">!</span>}
      </div>
    </div>
  );
}
