import { useRef, useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Section, SectionHeader } from '@/components/Section';
import { CTAGroup } from '@/components/CTAGroup';
import { demoConfig, siteConfig } from '@/content/site';

function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
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

function InteractivePlaceholder() {
  return (
    <div className="card" style={{ padding: 'var(--space-8)' }}>
      <h3 className="heading-4">{demoConfig.interactivePlaceholder.title}</h3>
      <p className="text-secondary mt-2">
        {demoConfig.interactivePlaceholder.description}
      </p>
      <div
        style={{
          marginTop: 'var(--space-6)',
          padding: 'var(--space-6)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--border-radius-md)',
          border: '1px dashed var(--color-border)',
          textAlign: 'center',
        }}
      >
        <p className="text-muted text-sm">Interactive demo coming soon</p>
      </div>
    </div>
  );
}

function DemoCTA() {
  return (
    <Section variant="navy">
      <div style={{ textAlign: 'center' }}>
        <h2 className="heading-2">{demoConfig.cta.title}</h2>
        <p className="text-lg mt-4" style={{ color: 'var(--color-text-muted)' }}>
          {demoConfig.cta.description}
        </p>
        <div className="mt-8">
          <CTAGroup
            primary={demoConfig.cta.button}
            secondary={siteConfig.ctas.secondary}
            centered
          />
        </div>
      </div>
    </Section>
  );
}

export function DemoPage() {
  return (
    <Layout title="Demo">
      <Section>
        <SectionHeader
          title={demoConfig.title}
          subtitle={demoConfig.subtitle}
        />
        <div className="demo-video" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          <DemoVideo />
          <InteractivePlaceholder />
        </div>
      </Section>
      <DemoCTA />
    </Layout>
  );
}
