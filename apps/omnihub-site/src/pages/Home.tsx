import { Layout } from '@/components/Layout';
import { Section } from '@/components/Section';
import { CTAGroup } from '@/components/CTAGroup';
import { HeroVisual } from '@/components/HeroVisual';
import { FeatureHighlightGrid } from '@/components/FeatureHighlightGrid';
import { siteConfig } from '@/content/site';
import { useEffect, useMemo, useState } from 'react';
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


type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
};


function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
  return (
    'prompt' in event &&
    typeof (event as BeforeInstallPromptEvent).prompt === 'function' &&
    'userChoice' in event
  );
}

function PWAInstallNode() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() =>
    globalThis.window !== undefined &&
    globalThis.window.matchMedia('(display-mode: standalone)').matches,
  );

  const isIOS = useMemo(() => {
    if (globalThis.window === undefined) {
      return false;
    }

    const userAgent = globalThis.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isBeforeInstallPromptEvent(event)) {
        setDeferredPrompt(event);
      }
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    globalThis.window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    globalThis.window.addEventListener('appinstalled', handleInstalled);

    return () => {
      globalThis.window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      globalThis.window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return null;
  }

  return (
    <div className="hero__install-node">
      <button
        type="button"
        className="btn btn--secondary btn--sm hero__install-btn"
        onClick={() => void handleInstall()}
        disabled={!deferredPrompt}
      >
        {t('hero.cta.install', { defaultValue: 'Install App' })}
      </button>
      <p className="hero__install-help">
        {deferredPrompt
          ? t('hero.installPromptReady', { defaultValue: 'Install OmniHub for one-tap launch and push updates.' })
          : isIOS
            ? t('hero.installPromptIOS', { defaultValue: 'On iOS: Share → Add to Home Screen to install OmniHub.' })
            : t('hero.installPromptFallback', { defaultValue: 'Install becomes available once your browser meets PWA criteria.' })}
      </p>
    </div>
  );
}

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
          <h1 className="heading-hero hero__title flex flex-col items-center lg:items-start w-fit mx-auto lg:mx-0">
            <div className="flex flex-row gap-[0.5em] justify-center lg:justify-start text-center">
              <span className="w-min">{t('hero.headline.line1', { defaultValue: 'Connect anything.' })}</span>
              <span className="w-min">{t('hero.headline.line2', { defaultValue: 'Orchestrate everything.' })}</span>
            </div>
            <div className="w-full text-center mt-[0.1em]">
              <span>{t('hero.headline.line3', { defaultValue: 'Stay in control.' })}</span>
            </div>
          </h1>
          <p className="hero__tagline hero__tagline--center">{t('hero.tagline', { defaultValue: 'YOUR SYSTEMS. YOUR RULES.' })}</p>
          <p className="hero__subtagline hero__subtagline--center">
            {t('hero.traits', { defaultValue: 'DIRECTABLE \u2022 AUDITABLE \u2022 REVERSIBLE' })}
          </p>
          
          <div className="flex flex-col gap-4 mt-6 mb-6">
            <p className="hero__subtitle">
              <span className="hero__sentence-indent">
                {t('hero.subtitleSentence1', {
                  defaultValue:
                    'The Anti-OS: Universal Sync Orchestrator (USO). Unify software, AI agents, enterprise platforms, and optional blockchain, wallet, and NFT integrations* into one governed command surface.',
                })}
              </span>{' '}
              {t('hero.subtitleSentence2', { defaultValue: 'Every action is authorized, logged, and reversible.' })}
            </p>
            <p className="hero__description" style={{ color: 'rgba(100, 180, 255, 0.95)' }}>
              <span className="hero__sentence-indent">
                {t('hero.descriptionSentence1', { defaultValue: 'OmniDash keeps execution in view.' })}
              </span>{' '}
              {t('hero.descriptionSentence2', {
                defaultValue:
                  'Single-plane. Modal-first. PiP persistent. One-hand ready. Translate across English, French, Spanish, German, Japanese, and Simplified Chinese (en-US, fr-FR, es-ES, de-DE, ja-JP, zh-CN). OmniHub is the Brain. OmniDash is the Eyes. PhysiOmni is the Hands and Feet (Enterprise). APEX Agent is the Voice. OmniLink is the AppShell.',
              })}
            </p>
          </div>
          
          <div className="flex flex-col items-center lg:items-start gap-4 mt-8">
            <div className="flex flex-row flex-wrap justify-center lg:justify-start gap-4">
              <CTAGroup
                primary={{ label: t('hero.cta.primary', { defaultValue: 'Request Access' }), href: siteConfig.ctas.primary.href }}
                secondary={{ label: t('hero.cta.secondary', { defaultValue: 'Watch Demo' }), href: siteConfig.ctas.secondary.href }}
              />
            </div>
            <PWAInstallNode />
            <p className="hero__footnote mt-2 text-center lg:text-left" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
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
