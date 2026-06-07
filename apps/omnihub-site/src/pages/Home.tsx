import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
import { StructuredData } from '@/components/StructuredData';
import { HERO_BADGE_ASSET_PATH } from '@/lib/heroAssets';
import '@/styles/landing.css';
import homepageSchema from '../../public/schema/homepage.jsonld?raw';
import organizationSchema from '../../public/schema/organization.jsonld?raw';

function HeroSection({ onOpenModal }: Readonly<{ onOpenModal: () => void }>) {
  const { t } = useTranslation();
  return (
    <section className="hero hov-section">
      <div className="hero-glow-l"></div>
      <div className="hero-glow-r"></div>
      <div className="hero-inner">
        <div className="hero-left">
          <h1 className="hero-h1 rv">
            {t('hero.headline.line1')}<br />{t('hero.headline.line2')}<br />{t('hero.headline.line3')}
          </h1>
          <p className="hero-sub rv d1">{t('hero.subtitle')}</p>
          <div className="hero-tiles rv d1">
            {t('hero.tiles', { returnObjects: true }).map((tile: string, i: number) => (
              <div key={i} className="htile">{tile}</div>
            ))}
          </div>
          <div className="hero-ctas rv d2">
            <button
              type="button"
              className="pill pill-lg"
              data-modal="request-access"
              onClick={onOpenModal}
            >
              {t('hero.cta.primary')}
            </button>
            <a href="/demo.html" className="pill pill-lg pill-ghost" data-cta="watch-demo">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <polygon points="5,3 13,8 5,13" fill="currentColor" opacity=".9" />
              </svg>
              {t('hero.cta.secondary')}
            </a>
          </div>
          <p className="hero-trust rv d2">
            {t('hero.trust.soc2')}<span>&middot;</span>{t('hero.trust.euaiact')}<span>&middot;</span>{t('hero.trust.gdpr')}<span>&middot;</span>{t('hero.trust.trusted')}
          </p>
        </div>        <div className="hero-right rv d1">
          <div className="hero-art-wrap">
            <svg className="hero-art-svg" viewBox="0 0 520 540" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
              <defs>
                <filter id="hero-g" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="60" result="blur"/>
                  <feColorMatrix in="blur" type="matrix"
                    values="0 0 0 0 0.0
                            0.3 0 0 0 0.0
                            0 0 0.7 0 0.0
                            0 0 0 0.15 0"/>
                  <feBlend in="blur" in2="SourceGraphic" mode="screen"/>
                </filter>
              </defs>
              {/* ── Nucleus gradients ── */}
              <radialGradient id="hero-g-sphere" cx="50%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#1a1a2e"/>
                <stop offset="50%" stopColor="#16213e"/>
                <stop offset="100%" stopColor="#0f0f1a"/>
              </radialGradient>
              {/* ══ LAYER 1: Deep ambient atmosphere ══ */}
              <ellipse cx="260" cy="370" rx="260" ry="170" fill="url(#hero-g-sphere)" opacity="0.7"/>
              {/* ══ LAYER 2: Orbital ring backs ── */}
              {/* Ring A ── tilt -18° ── WEB3 (blue) + ENTERPRISE (amber) */}
              <g transform="rotate(-18 260 250)">
                <ellipse cx="260" cy="250" rx="225" ry="54" fill="none" stroke="#3b82f6" strokeWidth="1.2" opacity="0.4"/>
                <ellipse cx="260" cy="250" rx="180" ry="54" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.3"/>
              </g>
              {/* Ring B ── tilt 62° ── AI CLOUD (purple) + LEGACY (green) */}
              <g transform="rotate(62 260 250)">
                <ellipse cx="260" cy="250" rx="215" ry="52" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.35"/>
                <ellipse cx="260" cy="250" rx="170" ry="52" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.3"/>
              </g>
              {/* Ring C ── tilt -55° ── PHYSICAL AI (cyan) + BLOCKCHAIN (purple) ── CCW */}
              <g transform="rotate(-55 260 250)">
                <ellipse cx="260" cy="250" rx="210" ry="50" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.4"/>
                <ellipse cx="260" cy="250" rx="165" ry="50" fill="none" stroke="#9333ea" strokeWidth="1" opacity="0.3"/>
              </g>
              {/* Ring D ── tilt 14° inner ── AI AGENTS (gold) */}
              <g transform="rotate(14 260 250)">
                <ellipse cx="260" cy="250" rx="178" ry="43" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.5"/>
              </g>              {/* ══ LAYER 3: Nucleus ══ */}
              <ellipse cx="260" cy="250" rx="140" ry="140" fill="url(#hero-g-sphere)" opacity="0.95" filter="url(#hero-g)"/>
              <ellipse cx="260" cy="250" rx="115" ry="115" fill="none" stroke="#1a1a2e" strokeWidth="0.5" opacity="0.5"/>
              <g opacity="0.3">
                <ellipse cx="260" cy="250" rx="100" ry="16" fill="none" stroke="#16213e" strokeWidth="1"/>
                <ellipse cx="260" cy="250" rx="100" ry="16" fill="none" stroke="#16213e" strokeWidth="1" transform="rotate(45 260 250)"/>
                <ellipse cx="260" cy="250" rx="100" ry="16" fill="none" stroke="#16213e" strokeWidth="1" transform="rotate(90 260 250)"/>
                <ellipse cx="260" cy="250" rx="100" ry="16" fill="none" stroke="#16213e" strokeWidth="1" transform="rotate(135 260 250)"/>
              </g>
              <ellipse cx="260" cy="250" rx="6" ry="6" fill="#00d4ff" opacity="0.8">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite"/>
              </ellipse>
              {/* Equatorial plasma */}
              <ellipse cx="260" cy="250" rx="142" ry="18" fill="none" stroke="#1a1a2e" strokeWidth="2" opacity="0.7"/>
              {/* Badge DOF */}
              <g transform="translate(320,280)">
                <foreignObject width="60" height="60">
                  <img src={HERO_BADGE_ASSET_PATH} width="60" height="60" alt="APEX OmniHub" style={{ display: 'block' }}/>
                </foreignObject>
              </g>
              {/* Pulse rings */}
              <circle cx="260" cy="250" r="1" fill="none" stroke="#00d4ff" strokeWidth="1.5" opacity="0.6">
                <animate attributeName="r" values="1;180" dur="4s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0" dur="4s" repeatCount="indefinite"/>
              </circle>
              <circle cx="260" cy="250" r="1" fill="none" stroke="#00d4ff" strokeWidth="1.5" opacity="0.6">
                <animate attributeName="r" values="1;180" dur="4s" begin="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0" dur="4s" begin="2s" repeatCount="indefinite"/>
              </circle>              {/* ══ LAYER 4: Orbital front arcs ── */}
              {/* Ring A front arc CW bottom half */}
              <path d="M35 250 A 225 54 0 0 1 485 250" fill="none" stroke="#3b82f6" strokeWidth="1.4" opacity="0.5" strokeDasharray="0.8 0.4"/>
              {/* Ring B front arc */}
              <path d="M45 250 A 215 52 0 0 1 475 250" fill="none" stroke="#a855f7" strokeWidth="1.2" opacity="0.45" strokeDasharray="0.7 0.4" transform="rotate(62 260 250)"/>
              {/* Ring C front arc CCW */}
              <path d="M50 250 A 210 50 0 0 1 470 250" fill="none" stroke="#06b6d4" strokeWidth="1.3" opacity="0.5" strokeDasharray="0.7 0.3" transform="rotate(-55 260 250)"/>
              {/* Ring D front arc inner */}
              <path d="M82 250 A 178 43 0 0 1 438 250" fill="none" stroke="#f59e0b" strokeWidth="1.4" opacity="0.55" strokeDasharray="0.6 0.3" transform="rotate(14 260 250)"/>
              {/* ══ LAYER 5: Orbiting electrons ══ */}
              {/* Ring A CW 15s ── WEB3 bright start, ENTERPRISE 180° offset */}
              <g transform="rotate(-18 260 250)">
                <ellipse cx="260" cy="250" rx="220" ry="54" fill="none">
                  <animate attributeName="stroke" values="#3b82f6;#60a5fa;#3b82f6" dur="15s" repeatCount="indefinite"/>
                </ellipse>
                <circle r="4" fill="#60a5fa">
                  <animateMotion dur="15s" repeatCount="indefinite">
                    <mpath href="#ringA-path"/>
                  </animateMotion>
                </circle>
                <circle r="3" fill="#f59e0b">
                  <animateMotion dur="15s" begin="-7.5s" repeatCount="indefinite">
                    <mpath href="#ringA-path"/>
                  </animateMotion>
                </circle>
              </g>
              {/* Ring B CW 19s ── AI CLOUD bright start, LEGACY 180° offset */}
              <g transform="rotate(62 260 250)">
                <circle r="3.5" fill="#c084fc">
                  <animateMotion dur="19s" repeatCount="indefinite">
                    <mpath href="#ringB-path"/>
                  </animateMotion>
                </circle>
                <circle r="3" fill="#34d399">
                  <animateMotion dur="19s" begin="-9.5s" repeatCount="indefinite">
                    <mpath href="#ringB-path"/>
                  </animateMotion>
                </circle>
              </g>
              {/* Ring C CCW 17s ── PHYSICAL AI dim start, BLOCKCHAIN bright */}
              <g transform="rotate(-55 260 250)">
                <circle r="3.5" fill="#22d3ee">
                  <animateMotion dur="17s" repeatCount="indefinite">
                    <mpath href="#ringC-path"/>
                  </animateMotion>
                </circle>
                <circle r="3" fill="#a855f7">
                  <animateMotion dur="17s" begin="-8.5s" repeatCount="indefinite">
                    <mpath href="#ringC-path"/>
                  </animateMotion>
                </circle>
              </g>
              {/* Ring D CW 11s ── AI AGENTS solo */}
              <g transform="rotate(14 260 250)">
                <circle r="4" fill="#f59e0b">
                  <animateMotion dur="11s" repeatCount="indefinite">
                    <mpath href="#ringD-path"/>
                  </animateMotion>
                </circle>
              </g>              {/* ══ LAYER 6: Orbiting label nodes ══ */}
              {/* Ring A - tilt -18°: WEB3 starts leftmost front, ENTERPRISE 180° */}
              <span className="node-label">WEB3</span>
              <span className="node-label">ENTERPRISE</span>
              {/* Ring B - tilt 62°: AI CLOUD bright start, LEGACY dim */}
              <span className="node-label">AI CLOUD</span>
              <span className="node-label">LEGACY</span>
              {/* Ring C - tilt -55° CCW: PHYSICAL AI dim start, BLOCKCHAIN bright */}
              <span className="node-label">PHYSICAL AI</span>
              <span className="node-label">BLOCKCHAIN</span>
              {/* Ring D - tilt 14° inner: AI AGENTS solo */}
              <span className="node-label">AI AGENTS</span>
            </svg>
          </div>
        </div>
      </div>
      <p className="subtitle">{t('hero.art.intelliDesig')}</p>
    </section>
  );
}

function TickerSection() {
  const { t } = useTranslation();
  const items = t('ticker.items', { returnObjects: true }) as string[];
  const doubledItems = [...items, ...items];
  return (
    <div className="ticker">
      {doubledItems.map((item, idx) => (
        <span key={idx}>{item} &middot; </span>
      ))}

function GovernanceSection() {
  const { t } = useTranslation();
  return (
    <>
      <hr />
      <h2>{t('governance.label')}<br />{t('governance.headline.line1')}<br />{t('governance.headline.line2')}</h2>
      <p>{t('governance.description')}</p>
      <h3>{t('governance.features.naturalLanguage.title')}</h3>
      <p>{t('governance.features.naturalLanguage.desc')}</p>
      <h3>{t('governance.features.capabilityRouting.title')}</h3>
      <p>{t('governance.features.capabilityRouting.desc')}</p>
      <h3>{t('governance.features.override.title')}</h3>
      <p>{t('governance.features.override.desc')}</p>
      <div className="audit-table">
        <h4>{t('governance.features.liveAudit')}</h4>
        <p>14:32:07 SalesForce Sync: write contact #4821 {t('governance.auditTrail.statuses.authorized')}</p>
        <p>14:32:05 Compliance Reporter: export GDPR batch {t('governance.auditTrail.statuses.logged')}</p>
        <p>14:31:58 ERP Orchestrator: inventory sync complete {t('governance.auditTrail.statuses.authorized')}</p>
        <p>14:31:44 Anomaly: unauthorized scope attempt {t('governance.auditTrail.statuses.blocked')}</p>
        <p>14:31:33 Policy update: RBAC rule #12 applied {t('governance.auditTrail.statuses.logged')}</p>
        <p>14:31:20 Workflow: Invoice Reconcile, step 3 of 6 {t('governance.auditTrail.statuses.authorized')}</p>
        <p>14:31:08 Agent deployed: Customer360 Aggregator {t('governance.auditTrail.statuses.authorized')}</p>
        <p>14:30:55 MAN Mode activated: ERP agent paused {t('governance.auditTrail.statuses.logged')}</p>
      </div>
    </>
  );
}

function ReversibleSection() {
  const { t } = useTranslation();
  return (
    <>
      <br />
      <h2>{t('reversible.label')}<br />{t('reversible.headline.line1')}<br />{t('reversible.headline.line2')}</h2>
      <p>{t('reversible.description')}</p>
      <h3>{t('reversible.features.rollback.title')}</h3>
      <p>{t('reversible.features.rollback.desc')}</p>
      <h3>{t('reversible.features.blastRadius.title')}</h3>
      <p>{t('reversible.features.blastRadius.desc')}</p>
      <h3>{t('reversible.features.compensating.title')}</h3>
      <p>{t('reversible.features.compensating.desc')}</p>
      <div className="policy-list">
        <h4>{t('reversible.features.policyEngine')}</h4>
        <p>{t('reversible.policyRules[0].name')}: {t('reversible.policyRules[0].desc')}</p>
        <p>{t('reversible.policyRules[1].name')}: {t('reversible.policyRules[1].desc')}</p>
        <p>{t('reversible.policyRules[2].name')}: {t('reversible.policyRules[2].desc')}</p>
        <p>{t('reversible.policyRules[3].name')}: {t('reversible.policyRules[3].desc')}</p>
        <p>{t('reversible.policyRules[4].name')}: {t('reversible.policyRules[4].desc')}</p>
      </div>
    </>
  );
}

function CapabilitiesSection() {
  const { t } = useTranslation();
  const caps = t('capabilities.items', { returnObjects: true }) as Array<{ key: string; title: string; desc: string }>;
  return (
    <>
      <hr br />
      <h2>{t('capabilities.label')}<br />{t('capabilities.headline.line1')}<br />{t('capabilities.headline.line2')}</h2>
      <p>{t('capabilities.description')}</p>
      {caps.map((cap) => (
        <div key={cap.key} className="cap-card">
          <span></span>
          <h3>{cap.title} &rarr;</h3>
          <p>{cap.desc}</p>
        </div>
      ))}
    </>
  );
}

function MaestroSection() {
  const { t } = useTranslation();
  const rows = [
    { l: "M", word: t('maestro.row.m.word'), desc: t('maestro.row.m.desc') },
    { l: "A", word: t('maestro.row.a.word'), desc: t('maestro.row.a.desc') },
    { l: "E", word: t('maestro.row.e.word'), desc: t('maestro.row.e.desc') },
    { l: "S", word: t('maestro.row.s.word'), desc: t('maestro.row.s.desc') },
    { l: "T", word: t('maestro.row.t.word'), desc: t('maestro.row.t.desc') },
    { l: "R", word: t('maestro.row.r.word'), desc: t('maestro.row.r.desc') },
    { l: "O", word: t('maestro.row.o.word'), desc: t('maestro.row.o.desc') }
  ];
  return (
    <section>
      <h2>{t('maestro.label')}<br />{t('maestro.headline.line1')}<br />{t('maestro.headline.line2')}</h2>
      <p>{t('maestro.description1')}</p>
      <p>{t('maestro.description2')}</p>
      <a href="/maestro">{t('maestro.link')}</a>
      {rows.map((row) => (
        <div key={row.l}>
          <span>{row.l}</span>
          <strong>{row.word}</strong>
          <p>{row.desc}</p>
        </div>
      ))}
    </section>
  );
}

function EnterpriseSection() {
  const { t } = useTranslation();
  const cards = t('enterprise.cards', { returnObjects: true }) as Array<{ name: string; desc: string }>;
  return (
    <>
      <br />
      <h2>{t('enterprise.label')}<br />{t('enterprise.headline.line1')}<br />{t('enterprise.headline.line2')}</h2>
      <p>{t('enterprise.description')}</p>
      {cards.map((card, idx) => (
        <div key={idx}>
          <span>✓</span>
          <h3>{card.name}</h3>
          <p>{card.desc}</p>
        </div>
      ))}
    </>
  );
}

function CTASection({ onOpenModal }: Readonly<{ onOpenModal: () => void }>) {
  const { t } = useTranslation();
  return (
    <section>
      <h2>{t('cta.headline.line1')}<br />{t('cta.headline.line2')}</h2>
      <p>{t('cta.description')}</p>
      <button onClick={onOpenModal}>{t('cta.buttons.primary')}</button>
      <a href="/demo.html">{t('cta.buttons.secondary')}</a>
      <p>{t('cta.tagline')}</p>
    </section>
  );
}

function RequestAccessModal({ isOpen, onClose, formStatus, formError, onSubmit }: Readonly<{ isOpen: boolean; onClose: () => void; formStatus: 'idle' | 'success'; formError: string; onSubmit: (e: React.FormEvent) => void; }>) {
  const { t } = useTranslation();
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClick = (e: MouseEvent) => { if (e.target === dialog) onClose(); };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.target === dialog && (e.key === 'Enter' || e.key === ' ')) onClose(); };
    dialog.addEventListener('click', handleClick);
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('click', handleClick);
      dialog.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  return (
    <dialog ref={dialogRef} open={isOpen} className="modal">
      <button onClick={onClose}>&tim;</button>
      <h2>{t('modal.title')}</h2>
      <p>{t('modal.description')}</p>
      {formError && <p className="error">{formError}</p>}
      <form onSubmit={onSubmit}>
        <input type="text" name="website" className="form-honey" tabIndex={-1} autoComplete="off" />
        <label>{t('modal.fields.name')} <input className="form-input" type="text" id="ra_name" name="ra_name" required maxLength={100} autoComplete="name" placeholder="Jane Smith" /></label>
        <label>{t('modal.fields.email')} <input className="form-input" type="email" id="ra_email" name="ra_email" required maxLength={254} autoComplete="email" placeholder="jane@company.com" /></label>
        <label>{t('modal.fields.company')} <input className="form-input" type="text" id="ra_company" name="ra_company" maxLength={100} autoComplete="organization" placeholder="ACME Corp" /></label>
        <label>{t('modal.fields.useCase')} <textarea id="ra_usecase" name="ra_usecase" maxLength={1000} /></label>
        <button type="submit">{t('modal.submit')}</button>
      </form>
      {formStatus === 'success' && <p>✓ t('modal.success.title')}. {t('modal.success.message')}</p>}
    </dialog>
  );
}

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'success'>('idle');
  const [formError, setFormError] = useState('');
  const formStartRef = useRef(0);
  const lastSubmitRef = useRef(0);

  const openModal = () => {
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
    formStartRef.current = Date.now();
  };
  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = '';
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const honeypot = formData.get('website');
    if (honeypot) return;
    if (Date.now() - formStartRef.current < 2000) {
      setFormError('Please take a moment to fill out the form.');
      return;
    }
    if (lastSubmitRef.current && Date.now() - lastSubmitRef.current < 300000) {
      setFormError('You already submitted recently. Please wait a few minutes.');
      return;
    }
    const name = (formData.get('ra_name') as string || '').trim().slice(0, 200);
    if (!name || name.length < 2) {
      setFormError('Please enter your name.');
      return;
    }
    const emailEl = form.elements.namedItem('ra_email') as HTMLInputElement;
    if (!emailEl.validity.valid || !emailEl.value) {
      setFormError('Please enter a valid email address.');
      return;
    }
    lastSubmitRef.current = Date.now();
    setFormStatus('success');
  };

  useEffect(() => {
    if (!rootRef.current) return;
    const root = rootRef.current as HTMLElement;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.07, rootMargin: '0px 0px -40px 0px' }
    );
    root.querySelectorAll('.rv').forEach((el) => obs.observe(el));
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape' && isModalOpen) closeModal(); };
    document.addEventListener('keydown', escHandler);
    return () => {
      obs.disconnect();
      document.removeEventListener('keydown', escHandler);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  return (
    <div ref={rootRef}>
      <Layout>
        <SEOMeta title="APEX OmniHub | The Universal Sync Orchestrator" />
        <StructuredData data={homepageSchema} />
        <StructuredData data={organizationSchema} />
        <HeroSection onOpenModal={openModal} />
        <TickerSection />
        <GovernanceSection />
        <ReversibleSection />
        <CapabilitiesSection />
        <MaestroSection />
        <EnterpriseSection />
        <CTASection onOpenModal={openModal} />
        <RequestAccessModal 
          isOpen={isModalOpen} 
          onClose={closeModal} 
          formStatus={formStatus} 
          formError={formError} 
          onSubmit={handleFormSubmit} 
        />
      </Layout>
    </div>
  );
}
    
