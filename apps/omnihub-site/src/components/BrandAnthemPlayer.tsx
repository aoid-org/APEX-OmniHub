import { useEffect, useRef, useState } from 'react';
import './BrandAnthemPlayer.css'; // Assuming we'll add some CSS variables or structural classes if needed

export function BrandAnthemPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Attempt autoplay
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Autoplay started successfully
          setIsPlaying(true);
        })
        .catch((error) => {
          // Auto-play was prevented.
          // Show a UI element to let the user manually start playback.
          console.warn('Playback prevented by browser policy. User interaction required.', error);
          setIsPlaying(false);
        });
    }
    
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const playAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      setIsPlaying(true);
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
    setIsPlaying(false);
  };

  return (
    <div className="brand-anthem-player" aria-label="Brand Anthem Player">
      <audio
        ref={audioRef}
        src="/audio/brand-anthem.mp3"
        loop
        preload="metadata"
      >
        <track kind="captions" src="/captions/demo.vtt" srcLang="en" label="English" />
      </audio>
      <div className="brand-anthem-controls">
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
