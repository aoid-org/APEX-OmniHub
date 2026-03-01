import { useRef, useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Section } from '@/components/Section';
import { CTAGroup } from '@/components/CTAGroup';
import { HeroVisual } from '@/components/HeroVisual';
import { FeatureHighlightGrid } from '@/components/FeatureHighlightGrid';
import { siteConfig } from '@/content/site';
import { useTranslation } from 'react-i18next';
import {
  IconConnect,
  IconTranslate,
  IconExecute,
  IconTriForceProtocol,
  IconOrchestrator,
  IconFortressProtocol,
  IconManMode,
  IconAutomation,
  IconIntegrations,
  IconAnalytics,
} from '@/components/icons';

function Hero() {
  const { t } = useTranslation();

  return (
    <section className="hero hero--mission">
      <div className="hero__background" aria-hidden="true">
        <div className="hero__gradient" />
        <div className="hero__arcs" />
        <div className="hero__stars" />
      </div>
      <div className="container hero__grid">
        <div className="hero__content">
          <h1 className="heading-hero hero__title hero__title--grid">
            <span>{t('hero.headline.line1', { defaultValue: 'Connect anything.' })}</span>
            <span>{t('hero.headline.line2', { defaultValue: 'Orchestrate everything.' })}</span>
            <span className="hero__title--span">{t('hero.headline.line3', { defaultValue: 'Stay in control.' })}</span>
          </h1>
          <p className="hero__tagline">{t('hero.tagline', { defaultValue: 'YOUR SYSTEMS. YOUR RULES.' })}</p>
          <p className="hero__subtagline">
            {t('hero.traits', { defaultValue: 'DIRECTABLE \u2022 AUDITABLE \u2022 REVERSIBLE' })}
          </p>
          <p className="hero__subtitle">{t('hero.subtitle', { defaultValue: 'The Anti-OS: Universal Sync Orchestrator (USO). Designed to translate intent into governed execution across SaaS, legacy systems, blockchain infrastructure, and physical edge devices (PhysiOmni, Enterprise).' })}</p>
          <p className="hero__description" style={{ color: 'rgba(100, 180, 255, 0.95)' }}>
            {t('hero.description', { defaultValue: 'OmniDash keeps execution in view. Single-plane. Modal-first. PiP persistent. Translate across English, French, Spanish, German, Japanese, and Simplified Chinese. OmniHub is the Brain. OmniDash is the Eyes. PhysiOmni is the Hands and Feet. APEX Agent is the Voice. OmniLink is the AppShell.' })}
          </p>
          <div className="hero__actions">
            <CTAGroup
              primary={{ label: t('hero.cta.primary', { defaultValue: 'Request Access' }), href: siteConfig.ctas.primary.href }}
              secondary={{ label: t('hero.cta.secondary', { defaultValue: 'Watch Demo' }), href: siteConfig.ctas.secondary.href }}
            />
            <p className="hero__footnote" style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '1rem' }}>
              {t('hero.footnote', { defaultValue: '*Blockchain, wallet, and NFT integrations are optional and disabled by default.' })}
            </p>
          </div>
        </div>

        <div className="hero__visual" aria-hidden="true">
          <div className="hero__glow" />
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function DemoVideoSection() {
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
    <Section id="demo-video" variant="default">
      <div className="demo-video">
        <div className="demo-video__header">
          <h2 className="heading-2">See OmniHub in Action</h2>
          <p className="text-secondary mt-4">
            Watch how OmniHub orchestrates AI, enterprise systems, and Web3
            through a single controlled port.
          </p>
        </div>
        <div className="demo-video__container">
          <div className="demo-video__glow" aria-hidden="true" />
          <video
            ref={videoRef}
            id="apex-demo-video"
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
      </div>
    </Section>
  );
}

function HighlightsSection() {
  const highlightItems = [
    {
      title: 'Portable Automation',
      description:
        'You define what happens. The system runs it. You can change it anytime.',
      icon: <IconAutomation size={22} />,
      href: '/ai-automation#modular-adapters',
    },
    {
      title: 'Smart Integrations',
      description:
        'Connect your systems. Keep your rules. Switch tools without rebuilding.',
      icon: <IconIntegrations size={22} />,
      href: '/smart-integrations#single-port',
    },
    {
      title: 'Clear Visibility',
      description:
        'See what runs. Know what changed. Decide what happens next.',
      icon: <IconAnalytics size={22} />,
      href: '/advanced-analytics#receipts-idempotency',
    },
  ];

  return (
    <Section id="features" variant="surface">
      <FeatureHighlightGrid items={highlightItems} />
    </Section>
  );
}

function TriForceSection() {
  const triForceCards = [
    {
      id: 'connect',
      title: 'Connect',
      icon: <IconConnect size={32} />,
      description:
        'Modular adapters plug into any system with an interface: API, webhook, or events.',
    },
    {
      id: 'translate',
      title: 'Translate',
      icon: <IconTranslate size={32} />,
      description:
        'Canonical, typed semantic events so platforms actually understand each other.',
    },
    {
      id: 'execute',
      title: 'Execute',
      icon: <IconExecute size={32} />,
      description:
        'Deterministic workflows with receipts, retries, rollback paths, and MAN Mode gates.',
    },
  ];

  return (
    <Section id="tri-force" variant="default">
      <div className="triforce">
        <div className="triforce__header">
          <h2 className="heading-2">Tri-Force Protocol</h2>
          <p className="text-secondary mt-4">
            The three pillars that power every OmniHub workflow
          </p>
        </div>
        <div className="triforce__grid">
          {triForceCards.map((card) => (
            <a
              key={card.id}
              href={`/tri-force#${card.id}`}
              className="triforce__card"
            >
              <div className="triforce__icon">{card.icon}</div>
              <h3 className="triforce__title">{card.title}</h3>
              <p className="triforce__desc">{card.description}</p>
            </a>
          ))}
        </div>
      </div>
    </Section>
  );
}

function OrchestratorSection() {
  return (
    <Section id="orchestrator" variant="surface">
      <div className="orchestrator">
        <div className="orchestrator__content">
          <h2 className="heading-2">The Orchestrator</h2>
          <p className="text-secondary mt-4">
            OmniHub does more than connect. It coordinates. Every workflow
            flows through the central orchestrator, ensuring consistent
            execution, comprehensive logging, and intelligent routing.
          </p>
          <ul className="orchestrator__list">
            <li>Single control plane for all integrations</li>
            <li>Real-time event correlation and tracking</li>
            <li>Automatic retry and compensation logic</li>
            <li>Workflow state persistence and recovery</li>
          </ul>
        </div>
        <div className="orchestrator__visual" aria-hidden="true">
          <div className="orchestrator__hub">
            <div className="orchestrator__pulse" />
            <div className="orchestrator__core">
              <IconOrchestrator size={48} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function FortressSection() {
  return (
    <Section id="fortress" variant="navy">
      <div className="fortress">
        <h2 className="heading-2">Zero-Trust Fortress Protocol</h2>
        <p className="fortress__subtitle">
          Security is not an afterthought. It is the foundation.
        </p>
        <div className="fortress__grid">
          {siteConfig.fortress.items.map((item, idx) => (
            <div key={`fortress-${idx}-${item.substring(0, 20)}`} className="fortress__item">
              <div className="fortress__bullet" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function ManModeSection() {
  return (
    <Section id="man-mode" variant="default">
      <div className="manmode">
        <div className="manmode__visual" aria-hidden="true">
          <div className="manmode__icon">
            <picture>
              {/* PNG for mobile/tablet (max-width: 768px) */}
              <source media="(max-width: 768px)" srcSet="/manmode-icon.png" />
              {/* SVG for desktop (min-width: 769px) */}
              <img
                src="/manmode-icon.svg"
                alt=""
                className="manmode__icon-img"
                style={{
                  maxWidth: 'min(560px, 100%)',
                  maxHeight: 'min(60vh, 520px)',
                  width: 'auto',
                  height: 'auto',
                }}
              />
            </picture>
          </div>
        </div>
        <div className="manmode__content">
          <span className="manmode__badge">MAN MODE</span>
          <h2 className="heading-2">{siteConfig.manMode.subtitle}</h2>
          <p className="text-secondary mt-4">{siteConfig.manMode.description}</p>
          <ul className="manmode__features">
            <li>High-risk items are flagged, not blocked</li>
            <li>Workflow continues with zero interruption</li>
            <li>User notified for manual review</li>
            <li>Full audit trail maintained</li>
          </ul>
          <a href="/man-mode#man-mode" className="btn btn--secondary mt-8">
            Learn More
          </a>
        </div>
      </div>
    </Section>
  );
}

function CapabilityShowcase() {
  const capabilities = [
    {
      id: 'tri-force',
      title: 'Tri-Force Protocol',
      description: 'Connect, Translate, Execute',
      icon: <IconTriForceProtocol size={28} />,
      href: '/tri-force#tri-force',
    },
    {
      id: 'orchestrator',
      title: 'Orchestrator',
      description: 'Central command for all workflows',
      icon: <IconOrchestrator size={28} />,
      href: '/orchestrator#orchestrator',
    },
    {
      id: 'fortress',
      title: 'Fortress Protocol',
      description: 'Zero-trust security by default',
      icon: <IconFortressProtocol size={28} />,
      href: '/fortress#fortress',
    },
    {
      id: 'man-mode',
      title: 'MAN Mode',
      description: 'Manual Authorization Needed',
      icon: <IconManMode size={28} />,
      href: '/man-mode#man-mode',
    },

    {
      id: 'omniport',
      title: 'OmniPort',
      description: 'Unified gateway for secure data flow and visibility.',
      icon: <IconIntegrations size={28} />,
      href: '/omniport#single-port',
    },
    {
      id: 'maestro',
      title: 'M.A.E.S.T.R.O.',
      description: 'Memory Augmented Execution Synchronization To Reproduce Orchestration',
      icon: <IconAutomation size={28} />,
      href: '/maestro#maestro',
      descStyle: { fontSize: '0.7rem', lineHeight: '1.4' } as React.CSSProperties,
    },
  ];

  return (
    <Section id="integrations" variant="surface">
      <div style={{ textAlign: 'center' }}>
        <h2 className="heading-2">Core Capabilities</h2>
        <p className="text-secondary mt-4">
          Explore what makes OmniHub the intelligent hub for your operations
        </p>
        <div className="capability-grid mt-8">
          {capabilities.map((cap) => (
            <a key={cap.id} href={cap.href} className="capability-card">
              <div className="capability-card__icon">{cap.icon}</div>
              <h3 className="capability-card__title">{cap.title}</h3>
              <p className="capability-card__desc" style={cap.descStyle}>{cap.description}</p>
            </a>
          ))}
        </div>
      </div>
    </Section>
  );
}

function CTASection() {
  return (
    <Section id="cta" variant="navy">
      <div style={{ textAlign: 'center' }}>
        <h2 className="heading-2">Experience APEX OmniHub Today</h2>
        <p
          className="text-lg mt-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Unite. Automate. Excel.
        </p>
        <div className="mt-8">
          <CTAGroup
            primary={{ label: 'Request Access', href: '/request-access' }}
            secondary={{ label: 'Watch Demo', href: '/demo' }}
            centered
          />
        </div>
      </div>
    </Section>
  );
}

export function HomePage() {
  return (
    <Layout>
      <Hero />
      <DemoVideoSection />
      <HighlightsSection />
      <TriForceSection />
      <OrchestratorSection />
      <FortressSection />
      <ManModeSection />
      <CapabilityShowcase />
      <CTASection />
    </Layout>
  );
}
