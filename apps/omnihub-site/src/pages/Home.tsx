import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
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
  const [isInstalled, setIsInstalled] = useState<boolean>(
    () => globalThis.window?.matchMedia('(display-mode: standalone)').matches ?? false,
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

  let installHelpText = t('hero.installPromptFallback', {
    defaultValue: 'Install becomes available once your browser meets PWA criteria.',
  });
  if (deferredPrompt) {
    installHelpText = t('hero.installPromptReady', {
      defaultValue: 'Install OmniHub for one-tap launch and push updates.',
    });
  } else if (isIOS) {
    installHelpText = t('hero.installPromptIOS', {
      defaultValue: 'On iOS: Share -> Add to Home Screen to install OmniHub.',
    });
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
      <p className="hero__install-help">{installHelpText}</p>
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
          <h1 className="heading-hero hero__title text-center lg:text-left">
            {t('hero.headline.line1', {
              defaultValue: 'The only orchestrator you can audit, override, and reverse.',
            })}
          </h1>
          <p className="text-lg font-semibold tracking-wide text-foreground mt-4">
            {t('hero.tagline', { defaultValue: 'YOUR SYSTEMS. YOUR RULES.' })}
          </p>
          <div
            className="flex flex-wrap gap-4 items-center justify-center mt-3"
            aria-label="Core platform pillars: Directable, Auditable, Reversible"
          >
            {['DIRECTABLE', 'AUDITABLE', 'REVERSIBLE'].map((pillar) => (
              <span
                key={pillar}
                className="px-5 py-1.5 border border-teal-500 text-teal-400 text-sm font-bold tracking-widest rounded-sm"
              >
                {pillar}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-4 mt-6 mb-6">
            <p className="hero-body mt-6 text-muted-foreground max-w-2xl mx-auto">
              {t('hero.subtitle', {
                defaultValue:
                  'The Anti-OS for enterprise AI. Unify software, AI agents, and enterprise platforms into one governed command surface — where every action is authorized, logged, and reversible.',
              })}
            </p>
            <p className="hero-body mt-3 font-medium text-foreground">
              {t('hero.description', {
                defaultValue: 'No vendor lock-in. No black boxes. No surprises.',
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
            <div
              className="flex flex-wrap gap-x-3 gap-y-1 items-center justify-center text-xs text-muted-foreground mt-5"
              aria-label="Compliance certifications"
            >
              <span>SOC 2 aligned</span>
              <span aria-hidden="true">·</span>
              <span>EU AI Act Article 14</span>
              <span aria-hidden="true">·</span>
              <span>GDPR Art. 30</span>
              <span aria-hidden="true">·</span>
              <span>Trusted by operators in regulated industries</span>
            </div>
            <PWAInstallNode />
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
      ariaLabel: 'Portable Automation — Directable',
    },
    {
      title: 'Smart Integrations',
      description:
        'Switch tools without rebuilding. Your logic, your schemas, and your rules move with you — never locked to a single vendor or platform.',
      icon: <IconIntegrations size={22} />,
      href: '/smart-integrations#single-port',
      ariaLabel: 'Smart Integrations — Reversible',
    },
    {
      title: 'Clear Visibility',
      description:
        'See what runs. Know what changed. Prove it to anyone — with a complete, tamper-evident audit trail your compliance team can hand to an auditor.',
      icon: <IconAnalytics size={22} />,
      href: '/advanced-analytics#receipts-idempotency',
      ariaLabel: 'Clear Visibility — Auditable',
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
    <Section variant="default">
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
          <h2 id="man-mode" className="heading-2">
            {siteConfig.manMode.subtitle}
          </h2>
          <p className="text-secondary mt-4">{siteConfig.manMode.description}</p>
          <ul className="manmode__features">
            <li>High-risk items are flagged and held — not silently blocked, not silently executed</li>
            <li>Workflow execution continues on all non-flagged items</li>
            <li>Flagged item enters review queue: Approve → executes | Reject → logged + discarded</li>
            <li>Every decision is timestamped, attributed, and replayed via OmniTrace</li>
            <li>MAN Mode thresholds are operator-configurable per environment</li>
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
      <SEOMeta
        title="AI Orchestration Platform"
        description="APEX OmniHub is the enterprise AI governance platform for governed execution across AI agents, legacy systems, and Web3. Directable. Accountable. Dependable."
        canonical="https://apexomnihub.icu"
      />
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


