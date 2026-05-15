import { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
import { StructuredData } from '@/components/StructuredData';
import { HERO_BADGE_ASSET_PATH } from '@/lib/heroAssets';
import '@/styles/landing.css';
import homepageSchema from '../../public/schema/homepage.jsonld?raw';
import organizationSchema from '../../public/schema/organization.jsonld?raw';

function HeroSection({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section className="hero hov-section">
      <div className="hero-glow-l"></div>
      <div className="hero-glow-r"></div>
      <div className="hero-inner">
        <div className="hero-left">
          <h1 className="hero-h1 rv">The Universal<br />Sync<br />Orchestrator.</h1>
          <p className="hero-sub rv d1">
            The governed command surface for enterprise AI. Unify software, AI agents, and enterprise platforms into one orchestrated layer where every action is authorized, logged, and reversible. Connect Web3, legacy, blockchain, and AI systems without limits. Your capacity and use cases are the only boundaries.
          </p>
          <div className="hero-tiles rv d1">
            <div className="htile">DIRECT</div>
            <div className="htile">AUDIT</div>
            <div className="htile">DEDUCE</div>
          </div>
          <div className="hero-ctas rv d2">
            <a
              href="#"
              className="pill pill-lg"
              data-modal="request-access"
              onClick={(e) => { e.preventDefault(); onOpenModal(); }}
            >
              Request Early Access
            </a>
            <a href="/demo.html" className="pill pill-lg pill-ghost" data-cta="watch-demo">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <polygon points="5,3 13,8 5,13" fill="currentColor" opacity=".9" />
              </svg>
              Watch Demo
            </a>
          </div>
          <p className="hero-trust rv d3">
            SOC 2 Aligned<span>&middot;</span>EU AI Act Art. 14<span>&middot;</span>GDPR Art. 30<span>&middot;</span>Trusted in regulated industries
          </p>
        </div>
        <div className="hero-right rv d1">
          <div className="hero-art-wrap">
            <svg className="hero-art-svg" viewBox="0 0 520 540" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
              <defs>
                <radialGradient id="sphere-core" cx="42%" cy="38%" r="58%">
                  <stop offset="0%" stopColor="#F5C06A" />
                  <stop offset="28%" stopColor="#E8A247" />
                  <stop offset="58%" stopColor="#C4511A" />
                  <stop offset="82%" stopColor="#8B2E0A" />
                  <stop offset="100%" stopColor="#3A1005" />
                </radialGradient>
                <radialGradient id="atm-r" cx="50%" cy="50%" r="50%">
                  <stop offset="60%" stopColor="rgba(196,81,26,0)" />
                  <stop offset="85%" stopColor="rgba(196,81,26,0.06)" />
                  <stop offset="100%" stopColor="rgba(232,162,71,0.14)" />
                </radialGradient>
                <linearGradient id="rg1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(232,162,71,0)" />
                  <stop offset="40%" stopColor="rgba(232,162,71,0.62)" />
                  <stop offset="70%" stopColor="rgba(245,192,106,0.82)" />
                  <stop offset="100%" stopColor="rgba(232,162,71,0)" />
                </linearGradient>
                <linearGradient id="sa" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(96,165,250,0)" />
                  <stop offset="55%" stopColor="rgba(96,165,250,0.7)" />
                  <stop offset="100%" stopColor="rgba(232,162,71,0.9)" />
                </linearGradient>
                <linearGradient id="sb" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(192,132,252,0)" />
                  <stop offset="55%" stopColor="rgba(192,132,252,0.62)" />
                  <stop offset="100%" stopColor="rgba(232,162,71,0.88)" />
                </linearGradient>
                <linearGradient id="sc" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(74,222,128,0)" />
                  <stop offset="55%" stopColor="rgba(74,222,128,0.56)" />
                  <stop offset="100%" stopColor="rgba(232,162,71,0.88)" />
                </linearGradient>
                <linearGradient id="sd" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="rgba(251,191,36,0)" />
                  <stop offset="55%" stopColor="rgba(251,191,36,0.6)" />
                  <stop offset="100%" stopColor="rgba(196,81,26,0.92)" />
                </linearGradient>
                <filter id="fg"><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="fxl"><feGaussianBlur in="SourceGraphic" stdDeviation="18" /></filter>
                <filter id="fm"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="dofSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="0.9" /></filter>
                <radialGradient id="badgeFade" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                  <stop offset="48%" stopColor="#fff" stopOpacity="0.95" />
                  <stop offset="78%" stopColor="#fff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <mask id="badgeFadeMask" maskUnits="userSpaceOnUse">
                  <rect x="200" y="205" width="120" height="120" fill="url(#badgeFade)" />
                </mask>
                <radialGradient id="coreRecess" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="62%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="85%" stopColor="rgba(58,16,5,0.45)" />
                  <stop offset="100%" stopColor="rgba(20,6,2,0.85)" />
                </radialGradient>
                <radialGradient id="coreInner" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(8,4,2,0.75)" />
                  <stop offset="55%" stopColor="rgba(40,14,5,0.4)" />
                  <stop offset="100%" stopColor="rgba(40,14,5,0)" />
                </radialGradient>
                <clipPath id="sclip"><circle cx="260" cy="265" r="152" /></clipPath>
              </defs>
              <circle cx="260" cy="265" r="240" fill="rgba(196,81,26,0.033)" />
              <circle cx="260" cy="265" r="192" fill="rgba(232,162,71,0.038)" />
              <circle cx="260" cy="265" r="178" fill="url(#atm-r)" filter="url(#fxl)" />
              <ellipse cx="260" cy="265" rx="212" ry="52" fill="none" stroke="rgba(232,162,71,0.1)" strokeWidth="1.5" transform="rotate(-18,260,265)" />
              <path d="M78,212 A212 52 0 0 1 442,220" fill="none" stroke="url(#rg1)" strokeWidth="2" transform="rotate(-18,260,265)" />
              <ellipse cx="260" cy="265" rx="183" ry="43" fill="none" stroke="rgba(196,81,26,0.08)" strokeWidth="1" transform="rotate(28,260,265)" />
              <path d="M30,54 C84,104,140,149,168,183 C192,214,215,240,235,254" fill="none" stroke="url(#sa)" strokeWidth="1.8" strokeLinecap="round">
                <animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="2.8s" repeatCount="indefinite" />
              </path>
              <path d="M490,42 C442,94,392,148,350,190 C322,216,300,240,286,254" fill="none" stroke="url(#sb)" strokeWidth="1.8" strokeLinecap="round">
                <animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="3.4s" repeatCount="indefinite" begin="0.6s" />
              </path>
              <path d="M18,492 C68,442,122,396,170,356 C202,326,228,304,246,285" fill="none" stroke="url(#sc)" strokeWidth="1.8" strokeLinecap="round">
                <animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="3.1s" repeatCount="indefinite" begin="1.2s" />
              </path>
              <path d="M260,12 L260,215" fill="none" stroke="url(#sd)" strokeWidth="1.8" strokeLinecap="round">
                <animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="2.2s" repeatCount="indefinite" begin="0.3s" />
              </path>
              <path d="M508,300 C462,288,416,280,380,276 C350,272,320,268,292,267" fill="none" stroke="rgba(232,162,71,0.58)" strokeWidth="1.5" strokeLinecap="round">
                <animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="3.8s" repeatCount="indefinite" begin="0.9s" />
              </path>
              <path d="M498,512 C450,462,398,415,350,372 C318,344,292,318,276,298" fill="none" stroke="rgba(192,132,252,0.52)" strokeWidth="1.5" strokeLinecap="round">
                <animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="4.1s" repeatCount="indefinite" begin="1.6s" />
              </path>
              <path d="M22,390 C80,355,148,324,205,299 C228,288,247,278,250,271" fill="none" stroke="rgba(56,189,248,0.58)" strokeWidth="1.8" strokeLinecap="round">
                <animate attributeName="stroke-dasharray" from="0,500" to="500,0" dur="3.9s" repeatCount="indefinite" begin="2.2s" />
              </path>
              <g transform="translate(26,50)">
                <circle r="7" fill="rgba(96,165,250,0.1)" stroke="rgba(96,165,250,0.52)" strokeWidth="1" />
                <circle r="3" fill="#60a5fa" filter="url(#fm)" />
                <text x="12" y="4" fill="rgba(96,165,250,0.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">WEB3</text>
              </g>
              <g transform="translate(490,40)">
                <circle r="7" fill="rgba(192,132,252,0.1)" stroke="rgba(192,132,252,0.52)" strokeWidth="1" />
                <circle r="3" fill="#c084fc" filter="url(#fm)" />
                <text x="-52" y="4" fill="rgba(192,132,252,0.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">AI CLOUD</text>
              </g>
              <g transform="translate(12,494)">
                <circle r="7" fill="rgba(74,222,128,0.1)" stroke="rgba(74,222,128,0.52)" strokeWidth="1" />
                <circle r="3" fill="#4ade80" filter="url(#fm)" />
                <text x="12" y="4" fill="rgba(74,222,128,0.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">LEGACY</text>
              </g>
              <g transform="translate(260,8)">
                <circle r="7" fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.52)" strokeWidth="1" />
                <circle r="3" fill="#fbbf24" filter="url(#fm)" />
                <text x="-22" y="-11" fill="rgba(251,191,36,0.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">AI AGENTS</text>
              </g>
              <g transform="translate(510,300)">
                <circle r="7" fill="rgba(232,162,71,0.1)" stroke="rgba(232,162,71,0.52)" strokeWidth="1" />
                <circle r="3" fill="#E8A247" filter="url(#fm)" />
                <text x="-72" y="-11" fill="rgba(232,162,71,0.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">ENTERPRISE</text>
              </g>
              <g transform="translate(500,512)">
                <circle r="7" fill="rgba(192,132,252,0.1)" stroke="rgba(192,132,252,0.45)" strokeWidth="1" />
                <circle r="3" fill="#c084fc" filter="url(#fm)" />
                <text x="-74" y="4" fill="rgba(192,132,252,0.68)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">BLOCKCHAIN</text>
              </g>
              <g transform="translate(18,390)">
                <circle r="7" fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.52)" strokeWidth="1" />
                <circle r="3" fill="#38bdf8" filter="url(#fm)" />
                <text x="12" y="4" fill="rgba(56,189,248,0.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">PHYSICAL AI</text>
              </g>
              <circle cx="268" cy="272" r="152" fill="rgba(0,0,0,0.42)" />
              <circle cx="260" cy="265" r="152" fill="url(#sphere-core)" />
              <g clipPath="url(#sclip)" opacity="0.15">
                <line x1="108" y1="185" x2="412" y2="185" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="210" x2="412" y2="210" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="235" x2="412" y2="235" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="260" x2="412" y2="260" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="285" x2="412" y2="285" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="310" x2="412" y2="310" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="335" x2="412" y2="335" stroke="#fff" strokeWidth=".5" />
              </g>
              <g clipPath="url(#sclip)" opacity="0.1">
                <ellipse cx="260" cy="265" rx="14" ry="152" fill="none" stroke="#fff" strokeWidth=".5" />
                <ellipse cx="260" cy="265" rx="42" ry="152" fill="none" stroke="#fff" strokeWidth=".5" />
                <ellipse cx="260" cy="265" rx="82" ry="152" fill="none" stroke="#fff" strokeWidth=".5" />
                <ellipse cx="260" cy="265" rx="124" ry="152" fill="none" stroke="#fff" strokeWidth=".5" />
              </g>
              <ellipse cx="214" cy="208" rx="55" ry="38" fill="rgba(255,255,255,0.15)" filter="url(#fg)" />
              <ellipse cx="206" cy="200" rx="28" ry="19" fill="rgba(255,255,255,0.26)" />
              <ellipse cx="260" cy="265" rx="152" ry="30" fill="none" stroke="rgba(245,192,106,0.27)" strokeWidth="3" filter="url(#fg)" />
              <circle cx="260" cy="265" r="64" fill="rgba(56,189,248,0.12)">
                <animate attributeName="r" values="60;70;60" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="fill" values="rgba(56,189,248,0.08);rgba(56,189,248,0.22);rgba(56,189,248,0.08)" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="260" cy="265" r="64" fill="none" stroke="rgba(56,189,248,0.45)" strokeWidth="1.5">
                <animate attributeName="r" values="60;74;60" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.45;0.85;0.45" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <g clipPath="url(#sclip)">
                {/* Recessed dark well: makes the badge read as set inside a deep core */}
                <circle cx="260" cy="265" r="80" fill="url(#coreInner)" filter="url(#fg)">
                  <animate attributeName="r" values="76;84;76" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2.6s" repeatCount="indefinite" />
                </circle>
                {/* Inner halo that pulses with the badge */}
                <circle cx="260" cy="265" r="58" fill="rgba(245,192,106,0.18)" filter="url(#fg)">
                  <animate attributeName="r" values="54;62;54" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0.7;0.35" dur="2.6s" repeatCount="indefinite" />
                </circle>
                {/* The badge — depth-of-field blur + radial fade mask + float */}
                <image
                  href={HERO_BADGE_ASSET_PATH}
                  xlinkHref={HERO_BADGE_ASSET_PATH}
                  x="206"
                  y="211"
                  width="108"
                  height="108"
                  preserveAspectRatio="xMidYMid meet"
                  mask="url(#badgeFadeMask)"
                  filter="url(#dofSoft)"
                  aria-label="APEX OmniHub core badge"
                >
                  <animate attributeName="opacity" values="0.82;1;0.82" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="y" values="211;208;211" dur="4.2s" repeatCount="indefinite" />
                </image>
                {/* Vignette ring inside the orb — creates the "looking down into the core" depth */}
                <circle cx="260" cy="265" r="152" fill="url(#coreRecess)" pointerEvents="none" />
              </g>
              <circle cx="260" cy="265" r="90" fill="none" stroke="rgba(232,162,71,0.18)" strokeWidth="1.5">
                <animate attributeName="r" from="90" to="155" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.28" to="0" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="260" cy="265" r="90" fill="none" stroke="rgba(232,162,71,0.12)" strokeWidth="1">
                <animate attributeName="r" from="90" to="155" dur="3s" repeatCount="indefinite" begin="1.5s" />
                <animate attributeName="opacity" from="0.18" to="0" dur="3s" repeatCount="indefinite" begin="1.5s" />
              </circle>
              <circle cx="260" cy="113" r="4" fill="rgba(232,162,71,0.65)" filter="url(#fm)">
                <animateTransform attributeName="transform" type="rotate" from="0 260 265" to="360 260 265" dur="12s" repeatCount="indefinite" />
              </circle>
              <circle cx="412" cy="182" r="3" fill="rgba(96,165,250,0.55)" filter="url(#fm)">
                <animateTransform attributeName="transform" type="rotate" from="0 260 265" to="-360 260 265" dur="19s" repeatCount="indefinite" />
              </circle>
              <circle cx="108" cy="348" r="3.5" fill="rgba(192,132,252,0.6)" filter="url(#fm)">
                <animateTransform attributeName="transform" type="rotate" from="0 260 265" to="360 260 265" dur="24s" repeatCount="indefinite" />
              </circle>
              <text x="260" y="518" textAnchor="middle" fill="rgba(232,162,71,0.28)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="3.5">INTELLIGENCE, DESIGNED.</text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function TickerSection() {
  const items = [
    "Universal Sync", "Agent Governance", "Immutable Audit Log", "Policy Enforcement",
    "One-Click Rollback", "MAN Mode", "Tri-Force Architecture", "Zero Vendor Lock-In",
    "Universal Integrations", "SOC 2 Aligned"
  ];
  const doubledItems = [...items, ...items];

  return (
    <div className="ticker">
      <div className="ticker-track">
        {doubledItems.map((item, idx) => (
          <div key={idx} className="ticker-item">{item}<span className="ticker-dot">&middot;</span></div>
        ))}
      </div>
    </div>
  );
}

function GovernanceSection() {
  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section" id="platform">
        <div className="sec-in">
          <div className="split">
            <div className="rv">
              <div className="tag">Total Command</div>
              <h2 className="h2">Absolute<br /><span className="g">Governance.</span></h2>
              <p className="sub">You issue the directive. OmniHub orchestrates every connected system with full real-time visibility. Actions logged. Agents tracked. Outcomes traceable.</p>
              <div className="feat-list">
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <path d="M3 4h12M3 8h8M3 12h5" stroke="#D4855A" strokeWidth="1.6" strokeLinecap="round" />
                      <circle cx="14" cy="10" r="3.5" stroke="#D4855A" strokeWidth="1.4" fill="none" />
                      <path d="M13 10l1 1 1.5-1.5" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">Natural language directives</div>
                    <div className="feat-dsc">Issue commands in plain language. OmniHub translates intent into structured task plans dispatched across your agent network.</div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="2.5" fill="#D4855A" opacity=".9" />
                      <circle cx="9" cy="9" r="6.5" stroke="#D4855A" strokeWidth="1.3" fill="none" strokeDasharray="3 2" />
                      <path d="M9 2.5V1M9 17v-1.5M2.5 9H1M17 9h-1.5" stroke="#D4855A" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">Capability-matched routing</div>
                    <div className="feat-dsc">Each task routes to the most qualified agent. No guesswork, no misroutes, full audit of each routing decision.</div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <rect x="3" y="3" width="12" height="12" rx="2" stroke="#D4855A" strokeWidth="1.4" fill="none" />
                      <path d="M9 6v4M7 8l2 2 2-2" stroke="#D4855A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="6" y1="13" x2="12" y2="13" stroke="#D4855A" strokeWidth="1.3" strokeLinecap="round" opacity=".5" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">Override any agent, instantly</div>
                    <div className="feat-dsc">One command halts, redirects, or replaces any running agent mid-execution. You remain in full control at all times.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="vpanel rv d2">
              <div className="vpanel-in">
                <span className="vp-tag">Live Audit Trail</span>
                <div className="alog">
                  <div className="arow"><span className="at">14:32:07</span><span className="adot ok"></span><span className="atxt">SalesForce Sync: write contact #4821</span><span className="apill p-auth">Authorized</span></div>
                  <div className="arow"><span className="at">14:32:05</span><span className="adot info"></span><span className="atxt">Compliance Reporter: export GDPR batch</span><span className="apill p-log">Logged</span></div>
                  <div className="arow"><span className="at">14:31:58</span><span className="adot ok"></span><span className="atxt">ERP Orchestrator: inventory sync complete</span><span className="apill p-auth">Authorized</span></div>
                  <div className="arow"><span className="at">14:31:44</span><span className="adot warn"></span><span className="atxt">Anomaly: unauthorized scope attempt blocked</span><span className="apill p-block">Blocked</span></div>
                  <div className="arow"><span className="at">14:31:33</span><span className="adot info"></span><span className="atxt">Policy update: RBAC rule #12 applied</span><span className="apill p-log">Logged</span></div>
                  <div className="arow"><span className="at">14:31:20</span><span className="adot ok"></span><span className="atxt">Workflow: Invoice Reconcile, step 3 of 6</span><span className="apill p-auth">Authorized</span></div>
                  <div className="arow"><span className="at">14:31:08</span><span className="adot ok"></span><span className="atxt">Agent deployed: Customer360 Aggregator</span><span className="apill p-auth">Authorized</span></div>
                  <div className="arow"><span className="at">14:30:55</span><span className="adot info"></span><span className="atxt">MAN Mode activated: ERP agent paused</span><span className="apill p-log">Logged</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ReversibleSection() {
  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section">
        <div className="sec-in">
          <div className="split rev">
            <div className="rv">
              <div className="tag">Architectural Primitive</div>
              <h2 className="h2">Built to<br /><span className="g">Reverse.</span></h2>
              <p className="sub">The only enterprise AI platform where rollback is a first-class architectural primitive. One bad decision does not cascade. You undo it. Completely.</p>
              <div className="feat-list">
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <path d="M5 9a4 4 0 0 1 4-4h2" stroke="#D4855A" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M8 3l3 2-3 2" stroke="#D4855A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 13H7a4 4 0 0 1 0-8" stroke="#D4855A" strokeWidth="1.3" fill="none" opacity=".5" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">One-click rollback</div>
                    <div className="feat-dsc">Reverse any agent action or workflow state with a single command. No cleanup required.</div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <path d="M9 2L15 5.5v7L9 16 3 12.5v-7L9 2Z" stroke="#D4855A" strokeWidth="1.4" fill="none" />
                      <path d="M9 8v2.5" stroke="#D4855A" strokeWidth="1.4" strokeLinecap="round" />
                      <circle cx="9" cy="13" r=".8" fill="#D4855A" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">Blast radius containment</div>
                    <div className="feat-dsc">OmniHub detects propagation risk and contains failures before they cascade across connected systems.</div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <rect x="2.5" y="5" width="6" height="4" rx="1.2" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                      <rect x="9.5" y="9" width="6" height="4" rx="1.2" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                      <path d="M8.5 7h1.5M8.5 11h1.5" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
                      <path d="M10 7c0 2-1 4-1.5 4" stroke="#D4855A" strokeWidth="1" fill="none" strokeDasharray="2 1.5" opacity=".6" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">Compensating transactions</div>
                    <div className="feat-dsc">Each agent action carries a compensating operation. Distributed state stays coherent under rollback across connected systems.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="vpanel rv d2">
              <div className="vpanel-in">
                <span className="vp-tag">Policy Engine: Active Rules</span>
                <div className="prules">
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <path d="M7 1.5L11.5 4v6L7 12.5 2.5 10V4Z" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                          <path d="M7 5.5v2" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="7" cy="9" r=".5" fill="#D4855A" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">Scope Restriction</div>
                        <div className="prule-d">No agent accesses unauthorized data scopes</div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                          <path d="M4 5h6M4 7h4M4 9h2" stroke="#D4855A" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">Audit on Write</div>
                        <div className="prule-d">Each write operation logged immutably</div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <path d="M4 7a3 3 0 0 1 3-3h2" stroke="#D4855A" strokeWidth="1.3" strokeLinecap="round" />
                          <path d="M6.5 2.5l2.5 1.5-2.5 1.5" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">Rollback Window</div>
                        <div className="prule-d">30-minute compensating transaction window</div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="5" r="2" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                          <path d="M3.5 12c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">MAN Mode</div>
                        <div className="prule-d">High-risk actions require Manual Approval Node approval</div>
                      </div>
                    </div>
                    <div className="toggle off"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="5.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
                          <path d="M4 7h6M7 4v6" stroke="#D4855A" strokeWidth="1" strokeLinecap="round" opacity=".6" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">Cross-Border Block</div>
                        <div className="prule-d">GDPR: EU data stays within EEA zones</div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function CapabilitiesSection() {
  const capabilities = [
    {
      title: "Universal Connector Network",
      desc: "Universal compatibility across legacy, Web2, Web3, AI, NFT, and blockchain applications. Connect and govern from one surface without an arbitrary integration ceiling.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M3 10h14M10 3v14" stroke="#D4855A" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="10" r="7.5" stroke="#D4855A" strokeWidth="1.3" fill="none" strokeDasharray="4 2.5" opacity=".5" />
          <circle cx="10" cy="10" r="2" fill="#D4855A" opacity=".8" />
        </svg>
      )
    },
    {
      title: "SkillForge/OmniSkills",
      desc: "Forge, install, and govern expert-level OmniSkills for any task or business use case, giving users task-ready agents with reusable skill memory and auditable execution paths.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="5" r="2.5" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <circle cx="4" cy="15" r="2.5" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <circle cx="16" cy="15" r="2.5" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <line x1="8.3" y1="6.8" x2="5.7" y2="12.8" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="11.7" y1="6.8" x2="14.3" y2="12.8" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="6.5" y1="15" x2="13.5" y2="15" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )
    },
    {
      title: "Real-Time Telemetry",
      desc: "Live operational intelligence across all agents and workflows. See what is running, what failed, and where attention is needed.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M2 14L5 8l3 4 3-6 3 3 3-5" stroke="#D4855A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="18" cy="5" r="1.5" fill="#D4855A" />
        </svg>
      )
    },
    {
      title: "Policy Enforcement Engine",
      desc: "Governance rules apply before any action executes. No agent bypasses policy, no exceptions.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M10 2L16 5.5v9L10 18 4 14.5v-9L10 2Z" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <path d="M10 8v3" stroke="#D4855A" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="10" cy="14" r=".8" fill="#D4855A" />
        </svg>
      )
    },
    {
      title: "Workflow Intelligence",
      desc: "Visual workflow builder with embedded governance. Design complex automations that remain fully auditable end-to-end.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <rect x="2.5" y="7" width="5" height="4" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
          <rect x="12.5" y="3" width="5" height="4" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
          <rect x="12.5" y="13" width="5" height="4" rx="1.5" stroke="#D4855A" strokeWidth="1.3" fill="none" />
          <path d="M7.5 9h2.5v-4h2.5M7.5 9h2.5v5h2.5" stroke="#D4855A" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )
    },
    {
      title: "MAN Mode",
      desc: "Manual Approval Node. High-risk actions pause at an approval checkpoint while authorized operators approve, reject, or escalate with full traceability.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M10 3v4M10 13v4M3 10h4M13 10h4" stroke="#D4855A" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="10" r="3" stroke="#D4855A" strokeWidth="1.4" fill="none" />
          <circle cx="10" cy="10" r=".8" fill="#D4855A" />
        </svg>
      )
    }
  ];

  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section" id="features">
        <div className="sec-in">
          <div className="rv">
            <div className="tag">Platform Capabilities</div>
            <h2 className="h2">Everything you need<br />to govern enterprise AI.</h2>
            <p className="sub">One platform. No black boxes. No vendor lock-in. No surprises.</p>
          </div>
          <div className="cap-grid">
            {capabilities.map((cap, idx) => (
              <div key={idx} className={`cap-card rv d${idx % 4}`}>
                <div className="cap-ico">{cap.icon}</div>
                <div className="cap-ttl">{cap.title}</div>
                <div className="cap-dsc">{cap.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function MaestroSection() {
  const rows = [
    { l: "M", word: "Multi-Agent", desc: "coordination at enterprise scale, all synchronized" },
    { l: "A", word: "Authorized", desc: "execution, each action gated by policy" },
    { l: "E", word: "Explainable", desc: "decisions in plain operational language, always" },
    { l: "S", word: "Synchronized", desc: "state across all connected systems, in real time" },
    { l: "T", word: "Traceable", desc: "outcomes with cryptographic immutable audit chains" },
    { l: "R", word: "Reversible", desc: "by design, rollback is a first-class platform primitive" },
    { l: "O", word: "Operational authority", desc: "returned entirely to your organization" }
  ];

  return (
    <div className="maestro-wrap hov-section" id="maestro">
      <div className="maestro-in">
        <div className="rv">
          <div className="tag">Core Philosophy</div>
          <h2 className="h2">The MAESTRO<br />Principle.</h2>
          <p className="sub" style={{ marginBottom: '20px' }}>Intelligence is not just capability. It is coordination with consequence. MAESTRO is the operating philosophy baked into each layer of APEX OmniHub.</p>
          <p style={{ fontSize: '13.5px', color: 'var(--t2)', lineHeight: '1.72', letterSpacing: '-.1px', textAlign: 'justify', textIndent: '2em' }}>Enterprise AI must serve your organization's intent. As the system scales, MAESTRO ensures authority scales with it.</p>
        </div>
        <div className="maestro-rows rv d2">
          {rows.map((row, idx) => (
            <div key={idx} className="m-row">
              <div className="m-l">{row.l}</div>
              <div>
                <div className="m-word">{row.word}</div>
                <div className="m-desc">{row.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EnterpriseSection() {
  const cards = [
    { n: "SOC 2 Type II", d: "Security and availability controls validated by independent audit" },
    { n: "EU AI Act Art. 14", d: "Manual Approval Node governance requirements for high-risk AI systems" },
    { n: "GDPR Article 30", d: "Complete records of processing activities, always exportable" },
    { n: "ISO 27001", d: "Information security management system compatible architecture" },
    { n: "HIPAA-Ready", d: "Healthcare data handling architecture with BAA support" },
    { n: "Zero Trust Model", d: "No implicit trust. Each agent and action verified." },
    { n: "RBAC + ABAC", d: "Granular role and attribute-based access control across all surfaces" },
    { n: "E2E Encryption", d: "All data in transit and at rest encrypted with AES-256" }
  ];

  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section" id="enterprise">
        <div className="sec-in">
          <div className="rv">
            <div className="tag">Enterprise Ready</div>
            <h2 className="h2">Built for regulated<br />environments.</h2>
            <p className="sub">Architected from day one for compliance and governance across finance, healthcare, legal, and government.</p>
          </div>
          <div className="comp-grid">
            {cards.map((card, idx) => (
              <div key={idx} className={`comp-card rv d${idx % 4}`}>
                <div className="comp-chk">&#10003;</div>
                <div className="comp-n">{card.n}</div>
                <div className="comp-d">{card.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function CTASection({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section className="cta-sec hov-section" id="cta">
      <div className="cta-bg"></div>
      <div className="cta-grid"></div>
      <div className="cta-in">
        <div className="tag rv" style={{ justifyContent: 'center' }}>Take Control</div>
        <h2 className="cta-h2 rv">Take operational<br />authority back.</h2>
        <p className="cta-sub rv d1">Join enterprises that have moved beyond black-box AI. Request early access and experience what governed intelligence looks like in production.</p>
        <div className="cta-btns rv d2">
          <a
            href="#"
            className="pill pill-lg"
            onClick={(e) => { e.preventDefault(); onOpenModal(); }}
          >
            Request Early Access
          </a>
          <a href="/demo.html" className="pill pill-lg pill-ghost">Schedule a Demo</a>
        </div>
        <p className="cta-note rv d3">No vendor lock-in. No black boxes. No surprises.</p>
      </div>
    </section>
  );
}

function RequestAccessModal({
  isOpen,
  onClose,
  formStatus,
  formError,
  onSubmit
}: {
  isOpen: boolean;
  onClose: () => void;
  formStatus: 'idle' | 'success';
  formError: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div
      id="ra-modal"
      className={`modal-overlay ${isOpen ? 'open' : ''}`}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-card">
        <button className="modal-close" id="modal-close" aria-label="Close" onClick={onClose}>&times;</button>
        <div className={`modal-form-body ${formStatus === 'success' ? 'hidden' : ''}`} id="modal-form-body">
          <div className="modal-title" id="modal-title">Request Early Access</div>
          <div className="modal-sub">Tell us about your use case and we will be in touch.</div>
          <div className={`modal-gen-error ${formError ? 'show' : ''}`} id="gen-error">{formError}</div>
          <form id="ra-form" noValidate onSubmit={onSubmit}>
            <input type="text" name="website" className="form-honey" tabIndex={-1} autoComplete="off" />
            <div className="form-group">
              <label className="form-label" htmlFor="ra_name">Full Name *</label>
              <input className="form-input" type="text" id="ra_name" name="ra_name" required maxLength={100} autoComplete="name" placeholder="Jane Smith" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ra_email">Work Email *</label>
              <input className="form-input" type="email" id="ra_email" name="ra_email" required maxLength={254} autoComplete="email" placeholder="jane@company.com" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ra_company">Company</label>
              <input className="form-input" type="text" id="ra_company" name="ra_company" maxLength={100} autoComplete="organization" placeholder="ACME Corp" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ra_usecase">Use Case</label>
              <textarea className="form-input" id="ra_usecase" name="ra_usecase" maxLength={500} rows={3} placeholder="Briefly describe how you plan to use APEX OmniHub"></textarea>
            </div>
            <button type="submit" className="pill" id="form-submit" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
              <span className="btn-text">Request Access</span>
              <span className="spinner"></span>
            </button>
          </form>
        </div>
        <div className={`modal-success ${formStatus === 'success' ? 'show' : ''}`} id="modal-success">
          <div className="modal-success-ico">&#10003;</div>
          <div className="modal-success-ttl">Request Received</div>
          <div className="modal-success-txt">We will be in touch shortly.</div>
        </div>
      </div>
    </div>
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

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    const form = e.currentTarget;
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
    const root = rootRef.current;

    // Scroll reveal
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.07, rootMargin: '0px 0px -40px 0px' }
    );
    root.querySelectorAll('.rv').forEach((el) => obs.observe(el));

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) closeModal();
    };
    document.addEventListener('keydown', escHandler);

    return () => {
      obs.disconnect();
      document.removeEventListener('keydown', escHandler);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  return (
    <Layout>
      <SEOMeta
        title="APEX OmniHub - Intelligence, Designed."
        description="The Universal Sync Orchestrator. Every AI agent, enterprise platform, and workflow unified under one governed command surface."
        canonical="https://apexomnihub.icu/"
        appendBrandSuffix={false}
      />
      <StructuredData id="homepage-schema" json={homepageSchema} />
      <StructuredData id="organization-schema" json={organizationSchema} />
      <div className="landing-root" ref={rootRef}>
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
      </div>
    </Layout>
  );
}
