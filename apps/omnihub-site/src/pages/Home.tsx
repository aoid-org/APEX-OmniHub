import { useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
import { StructuredData } from '@/components/StructuredData';
import '@/styles/landing.css';
import homepageSchema from '../../public/schema/homepage.jsonld?raw';
import organizationSchema from '../../public/schema/organization.jsonld?raw';


export const HERO_BADGE_ASSET_PATH = '/assets/hero/apex-core-badge.svg';

export function getHeroBadgeAssetPath(): string {
  return HERO_BADGE_ASSET_PATH;
}

export function getLandingHtml(): string {
  return LANDING_HTML;
}

const LANDING_HTML = `<!-- HERO -->
<section class="hero hov-section">
  <div class="hero-glow-l"></div>
  <div class="hero-glow-r"></div>
  <div class="hero-inner">
    <div class="hero-left">
      <h1 class="hero-h1 rv">The Universal<br>Sync<br>Orchestrator.</h1>
      <p class="hero-sub rv d1">
        The governed command surface for enterprise AI. Unify software, AI agents, and enterprise platforms into one orchestrated layer where every action is authorized, logged, and reversible. Connect Web3, legacy, blockchain, and AI systems without limits. Your capacity and use cases are the only boundaries.
      </p>
      <div class="hero-tiles rv d1">
        <div class="htile">DIRECT</div>
        <div class="htile">AUDIT</div>
        <div class="htile">DEDUCE</div>
      </div>
      <div class="hero-ctas rv d2">
        <a href="#" class="pill pill-lg" data-modal="request-access">Request Early Access</a>
        <a href="/demo.html" class="pill pill-lg pill-ghost">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polygon points="5,3 13,8 5,13" fill="currentColor" opacity=".9"/></svg>
          Watch Demo
        </a>
      </div>
      <p class="hero-trust rv d3">SOC 2 Aligned<span>&middot;</span>EU AI Act Art. 14<span>&middot;</span>GDPR Art. 30<span>&middot;</span>Trusted in regulated industries</p>
    </div>
    <div class="hero-right rv d1">
      <div class="hero-art-wrap">
        <svg class="hero-art-svg" viewBox="0 0 520 540" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <defs>
            <radialGradient id="sphere-core" cx="42%" cy="38%" r="58%"><stop offset="0%" stop-color="#F5C06A"/><stop offset="28%" stop-color="#E8A247"/><stop offset="58%" stop-color="#C4511A"/><stop offset="82%" stop-color="#8B2E0A"/><stop offset="100%" stop-color="#3A1005"/></radialGradient>
            <radialGradient id="atm-r" cx="50%" cy="50%" r="50%"><stop offset="60%" stop-color="rgba(196,81,26,0)"/><stop offset="85%" stop-color="rgba(196,81,26,0.06)"/><stop offset="100%" stop-color="rgba(232,162,71,0.14)"/></radialGradient>
            <linearGradient id="rg1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(232,162,71,0)"/><stop offset="40%" stop-color="rgba(232,162,71,0.62)"/><stop offset="70%" stop-color="rgba(245,192,106,0.82)"/><stop offset="100%" stop-color="rgba(232,162,71,0)"/></linearGradient>
            <linearGradient id="sa" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="rgba(96,165,250,0)"/><stop offset="55%" stop-color="rgba(96,165,250,0.7)"/><stop offset="100%" stop-color="rgba(232,162,71,0.9)"/></linearGradient>
            <linearGradient id="sb" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="rgba(192,132,252,0)"/><stop offset="55%" stop-color="rgba(192,132,252,0.62)"/><stop offset="100%" stop-color="rgba(232,162,71,0.88)"/></linearGradient>
            <linearGradient id="sc" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(74,222,128,0)"/><stop offset="55%" stop-color="rgba(74,222,128,0.56)"/><stop offset="100%" stop-color="rgba(232,162,71,0.88)"/></linearGradient>
            <linearGradient id="sd" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="rgba(251,191,36,0)"/><stop offset="55%" stop-color="rgba(251,191,36,0.6)"/><stop offset="100%" stop-color="rgba(196,81,26,0.92)"/></linearGradient>
            <filter id="fg"><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="fxl"><feGaussianBlur in="SourceGraphic" stdDeviation="18"/></filter>
            <filter id="coreGlow"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="b1"/><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b2"/><feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/></feMerge></filter>
            <filter id="fm"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <clipPath id="sclip"><circle cx="260" cy="265" r="152"/></clipPath>
          </defs>
          <!-- Atmosphere -->
          <circle cx="260" cy="265" r="240" fill="rgba(196,81,26,0.033)"/>
          <circle cx="260" cy="265" r="192" fill="rgba(232,162,71,0.038)"/>
          <circle cx="260" cy="265" r="178" fill="url(#atm-r)" filter="url(#fxl)"/>
          <ellipse cx="260" cy="265" rx="212" ry="52" fill="none" stroke="rgba(232,162,71,0.1)" stroke-width="1.5" transform="rotate(-18,260,265)"/>
          <path d="M78,212 A212 52 0 0 1 442,220" fill="none" stroke="url(#rg1)" stroke-width="2" transform="rotate(-18,260,265)"/>
          <ellipse cx="260" cy="265" rx="183" ry="43" fill="none" stroke="rgba(196,81,26,0.08)" stroke-width="1" transform="rotate(28,260,265)"/>
          <!-- Stream A: Web3 -->
          <path d="M30,54 C84,104,140,149,168,183 C192,214,215,240,235,254" fill="none" stroke="url(#sa)" stroke-width="1.8" stroke-linecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="2.8s" repeatCount="indefinite"/></path>
          <!-- Stream B: AI Cloud -->
          <path d="M490,42 C442,94,392,148,350,190 C322,216,300,240,286,254" fill="none" stroke="url(#sb)" stroke-width="1.8" stroke-linecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="3.4s" repeatCount="indefinite" begin="0.6s"/></path>
          <!-- Stream C: Legacy -->
          <path d="M18,492 C68,442,122,396,170,356 C202,326,228,304,246,285" fill="none" stroke="url(#sc)" stroke-width="1.8" stroke-linecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="3.1s" repeatCount="indefinite" begin="1.2s"/></path>
          <!-- Stream D: Agents -->
          <path d="M260,12 L260,215" fill="none" stroke="url(#sd)" stroke-width="1.8" stroke-linecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="2.2s" repeatCount="indefinite" begin="0.3s"/></path>
          <!-- Stream E: Enterprise -->
          <path d="M508,300 C462,288,416,280,380,276 C350,272,320,268,292,267" fill="none" stroke="rgba(232,162,71,0.58)" stroke-width="1.5" stroke-linecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="3.8s" repeatCount="indefinite" begin="0.9s"/></path>
          <!-- Stream F: Blockchain -->
          <path d="M498,512 C450,462,398,415,350,372 C318,344,292,318,276,298" fill="none" stroke="rgba(192,132,252,0.52)" stroke-width="1.5" stroke-linecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="4.1s" repeatCount="indefinite" begin="1.6s"/></path>
          <!-- Stream G: Physical AI -->
          <path d="M22,390 C80,355,148,324,205,299 C228,288,247,278,250,271" fill="none" stroke="rgba(56,189,248,0.58)" stroke-width="1.8" stroke-linecap="round"><animate attributeName="stroke-dasharray" from="0,500" to="500,0" dur="3.9s" repeatCount="indefinite" begin="2.2s"/></path>
          <!-- Node: Web3 -->
          <g transform="translate(26,50)"><circle r="7" fill="rgba(96,165,250,0.1)" stroke="rgba(96,165,250,0.52)" stroke-width="1"/><circle r="3" fill="#60a5fa" filter="url(#fm)"/><text x="12" y="4" fill="rgba(96,165,250,0.72)" font-size="7.5" font-weight="700" font-family="Space Grotesk,sans-serif" letter-spacing="1">WEB3</text></g>
          <!-- Node: AI Cloud -->
          <g transform="translate(490,40)"><circle r="7" fill="rgba(192,132,252,0.1)" stroke="rgba(192,132,252,0.52)" stroke-width="1"/><circle r="3" fill="#c084fc" filter="url(#fm)"/><text x="-52" y="4" fill="rgba(192,132,252,0.72)" font-size="7.5" font-weight="700" font-family="Space Grotesk,sans-serif" letter-spacing="1">AI CLOUD</text></g>
          <!-- Node: Legacy -->
          <g transform="translate(12,494)"><circle r="7" fill="rgba(74,222,128,0.1)" stroke="rgba(74,222,128,0.52)" stroke-width="1"/><circle r="3" fill="#4ade80" filter="url(#fm)"/><text x="12" y="4" fill="rgba(74,222,128,0.72)" font-size="7.5" font-weight="700" font-family="Space Grotesk,sans-serif" letter-spacing="1">LEGACY</text></g>
          <!-- Node: AI Agents -->
          <g transform="translate(260,8)"><circle r="7" fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.52)" stroke-width="1"/><circle r="3" fill="#fbbf24" filter="url(#fm)"/><text x="-22" y="-11" fill="rgba(251,191,36,0.72)" font-size="7.5" font-weight="700" font-family="Space Grotesk,sans-serif" letter-spacing="1">AI AGENTS</text></g>
          <!-- Node: Enterprise -->
          <g transform="translate(510,300)"><circle r="7" fill="rgba(232,162,71,0.1)" stroke="rgba(232,162,71,0.52)" stroke-width="1"/><circle r="3" fill="#E8A247" filter="url(#fm)"/><text x="-72" y="-11" fill="rgba(232,162,71,0.72)" font-size="7.5" font-weight="700" font-family="Space Grotesk,sans-serif" letter-spacing="1">ENTERPRISE</text></g>
          <!-- Node: Blockchain -->
          <g transform="translate(500,512)"><circle r="7" fill="rgba(192,132,252,0.1)" stroke="rgba(192,132,252,0.45)" stroke-width="1"/><circle r="3" fill="#c084fc" filter="url(#fm)"/><text x="-74" y="4" fill="rgba(192,132,252,0.68)" font-size="7.5" font-weight="700" font-family="Space Grotesk,sans-serif" letter-spacing="1">BLOCKCHAIN</text></g>
          <!-- Node: Physical AI -->
          <g transform="translate(18,390)"><circle r="7" fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.52)" stroke-width="1"/><circle r="3" fill="#38bdf8" filter="url(#fm)"/><text x="12" y="4" fill="rgba(56,189,248,0.72)" font-size="7.5" font-weight="700" font-family="Space Grotesk,sans-serif" letter-spacing="1">PHYSICAL AI</text></g>
          <!-- Sphere -->
          <circle cx="268" cy="272" r="152" fill="rgba(0,0,0,0.42)"/>
          <circle cx="260" cy="265" r="152" fill="url(#sphere-core)"/>
          <!-- Latitude lines -->
          <g clip-path="url(#sclip)" opacity="0.15"><line x1="108" y1="185" x2="412" y2="185" stroke="#fff" stroke-width=".5"/><line x1="108" y1="210" x2="412" y2="210" stroke="#fff" stroke-width=".5"/><line x1="108" y1="235" x2="412" y2="235" stroke="#fff" stroke-width=".5"/><line x1="108" y1="260" x2="412" y2="260" stroke="#fff" stroke-width=".5"/><line x1="108" y1="285" x2="412" y2="285" stroke="#fff" stroke-width=".5"/><line x1="108" y1="310" x2="412" y2="310" stroke="#fff" stroke-width=".5"/><line x1="108" y1="335" x2="412" y2="335" stroke="#fff" stroke-width=".5"/></g>
          <!-- Meridians -->
          <g clip-path="url(#sclip)" opacity="0.1"><ellipse cx="260" cy="265" rx="14" ry="152" fill="none" stroke="#fff" stroke-width=".5"/><ellipse cx="260" cy="265" rx="42" ry="152" fill="none" stroke="#fff" stroke-width=".5"/><ellipse cx="260" cy="265" rx="82" ry="152" fill="none" stroke="#fff" stroke-width=".5"/><ellipse cx="260" cy="265" rx="124" ry="152" fill="none" stroke="#fff" stroke-width=".5"/></g>
          <!-- Specular -->
          <ellipse cx="214" cy="208" rx="55" ry="38" fill="rgba(255,255,255,0.15)" filter="url(#fg)"/>
          <ellipse cx="206" cy="200" rx="28" ry="19" fill="rgba(255,255,255,0.26)"/>
          <!-- Equatorial glow -->
          <ellipse cx="260" cy="265" rx="152" ry="30" fill="none" stroke="rgba(245,192,106,0.27)" stroke-width="3" filter="url(#fg)"/>
          <!-- Badge core: light-blue pulsing glow -->
          <circle cx="260" cy="265" r="64" fill="rgba(56,189,248,0.12)"><animate attributeName="r" values="60;70;60" dur="2.6s" repeatCount="indefinite"/><animate attributeName="fill" values="rgba(56,189,248,0.08);rgba(56,189,248,0.22);rgba(56,189,248,0.08)" dur="2.6s" repeatCount="indefinite"/></circle>
          <circle cx="260" cy="265" r="64" fill="none" stroke="rgba(56,189,248,0.45)" stroke-width="1.5"><animate attributeName="r" values="60;74;60" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.45;0.85;0.45" dur="2.6s" repeatCount="indefinite"/></circle>
          <!-- APEX Badge floating inside sphere -->
          <g clip-path="url(#sclip)"><image href="${HERO_BADGE_ASSET_PATH}" xlink:href="${HERO_BADGE_ASSET_PATH}" x="202" y="203" width="116" height="124" preserveAspectRatio="xMidYMid meet" filter="url(#coreGlow)"><animate attributeName="opacity" values="0.82;1;0.82" dur="2.6s" repeatCount="indefinite"/></image></g>
          <!-- Pulse rings -->
          <circle cx="260" cy="265" r="90" fill="none" stroke="rgba(232,162,71,0.18)" stroke-width="1.5"><animate attributeName="r" from="90" to="155" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.28" to="0" dur="3s" repeatCount="indefinite"/></circle>
          <circle cx="260" cy="265" r="90" fill="none" stroke="rgba(232,162,71,0.12)" stroke-width="1"><animate attributeName="r" from="90" to="155" dur="3s" repeatCount="indefinite" begin="1.5s"/><animate attributeName="opacity" from="0.18" to="0" dur="3s" repeatCount="indefinite" begin="1.5s"/></circle>
          <!-- Orbiting dots -->
          <circle cx="260" cy="113" r="4" fill="rgba(232,162,71,0.65)" filter="url(#fm)"><animateTransform attributeName="transform" type="rotate" from="0 260 265" to="360 260 265" dur="12s" repeatCount="indefinite"/></circle>
          <circle cx="412" cy="182" r="3" fill="rgba(96,165,250,0.55)" filter="url(#fm)"><animateTransform attributeName="transform" type="rotate" from="0 260 265" to="-360 260 265" dur="19s" repeatCount="indefinite"/></circle>
          <circle cx="108" cy="348" r="3.5" fill="rgba(192,132,252,0.6)" filter="url(#fm)"><animateTransform attributeName="transform" type="rotate" from="0 260 265" to="360 260 265" dur="24s" repeatCount="indefinite"/></circle>
          <!-- Signature -->
          <text x="260" y="518" text-anchor="middle" fill="rgba(232,162,71,0.28)" font-size="7.5" font-weight="700" font-family="Space Grotesk,sans-serif" letter-spacing="3.5">INTELLIGENCE, DESIGNED.</text>
        </svg>
      </div>
    </div>
  </div>
</section>

<!-- TICKER -->
<div class="ticker">
  <div class="ticker-track">
    <div class="ticker-item">Universal Sync<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Agent Governance<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Immutable Audit Log<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Policy Enforcement<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">One-Click Rollback<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">MAN Mode<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Tri-Force Architecture<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Zero Vendor Lock-In<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">200+ Integrations<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">SOC 2 Aligned<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Universal Sync<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Agent Governance<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Immutable Audit Log<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Policy Enforcement<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">One-Click Rollback<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">MAN Mode<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Tri-Force Architecture<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">Zero Vendor Lock-In<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">200+ Integrations<span class="ticker-dot">&middot;</span></div>
    <div class="ticker-item">SOC 2 Aligned<span class="ticker-dot">&middot;</span></div>
  </div>
</div>

<!-- FEAT 1: GOVERNANCE -->
<hr class="divider">
<section class="sec hov-section" id="platform">
  <div class="sec-in">
    <div class="split">
      <div class="rv">
        <div class="tag">Total Command</div>
        <h2 class="h2">Absolute<br><span class="g">Governance.</span></h2>
        <p class="sub">You issue the directive. OmniHub orchestrates every connected system with full real-time visibility. Actions logged. Agents tracked. Outcomes traceable.</p>
        <div class="feat-list">
          <div class="feat-item">
            <div class="feat-ico"><svg viewBox="0 0 18 18" fill="none"><path d="M3 4h12M3 8h8M3 12h5" stroke="#D4855A" stroke-width="1.6" stroke-linecap="round"/><circle cx="14" cy="10" r="3.5" stroke="#D4855A" stroke-width="1.4" fill="none"/><path d="M13 10l1 1 1.5-1.5" stroke="#D4855A" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <div><div class="feat-ttl">Natural language directives</div><div class="feat-dsc">Issue commands in plain language. OmniHub translates intent into structured task plans dispatched across your agent network.</div></div>
          </div>
          <div class="feat-item">
            <div class="feat-ico"><svg viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" fill="#D4855A" opacity=".9"/><circle cx="9" cy="9" r="6.5" stroke="#D4855A" stroke-width="1.3" fill="none" stroke-dasharray="3 2"/><path d="M9 2.5V1M9 17v-1.5M2.5 9H1M17 9h-1.5" stroke="#D4855A" stroke-width="1.3" stroke-linecap="round"/></svg></div>
            <div><div class="feat-ttl">Capability-matched routing</div><div class="feat-dsc">Each task routes to the most qualified agent. No guesswork, no misroutes, full audit of each routing decision.</div></div>
          </div>
          <div class="feat-item">
            <div class="feat-ico"><svg viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke="#D4855A" stroke-width="1.4" fill="none"/><path d="M9 6v4M7 8l2 2 2-2" stroke="#D4855A" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="13" x2="12" y2="13" stroke="#D4855A" stroke-width="1.3" stroke-linecap="round" opacity=".5"/></svg></div>
            <div><div class="feat-ttl">Override any agent, instantly</div><div class="feat-dsc">One command halts, redirects, or replaces any running agent mid-execution. You remain in full control at all times.</div></div>
          </div>
        </div>
      </div>
      <div class="vpanel rv d2">
        <div class="vpanel-in">
          <span class="vp-tag">Live Audit Trail</span>
          <div class="alog">
            <div class="arow"><span class="at">14:32:07</span><span class="adot ok"></span><span class="atxt">SalesForce Sync: write contact #4821</span><span class="apill p-auth">Authorized</span></div>
            <div class="arow"><span class="at">14:32:05</span><span class="adot info"></span><span class="atxt">Compliance Reporter: export GDPR batch</span><span class="apill p-log">Logged</span></div>
            <div class="arow"><span class="at">14:31:58</span><span class="adot ok"></span><span class="atxt">ERP Orchestrator: inventory sync complete</span><span class="apill p-auth">Authorized</span></div>
            <div class="arow"><span class="at">14:31:44</span><span class="adot warn"></span><span class="atxt">Anomaly: unauthorized scope attempt blocked</span><span class="apill p-block">Blocked</span></div>
            <div class="arow"><span class="at">14:31:33</span><span class="adot info"></span><span class="atxt">Policy update: RBAC rule #12 applied</span><span class="apill p-log">Logged</span></div>
            <div class="arow"><span class="at">14:31:20</span><span class="adot ok"></span><span class="atxt">Workflow: Invoice Reconcile, step 3 of 6</span><span class="apill p-auth">Authorized</span></div>
            <div class="arow"><span class="at">14:31:08</span><span class="adot ok"></span><span class="atxt">Agent deployed: Customer360 Aggregator</span><span class="apill p-auth">Authorized</span></div>
            <div class="arow"><span class="at">14:30:55</span><span class="adot info"></span><span class="atxt">MAN Mode activated: ERP agent paused</span><span class="apill p-log">Logged</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FEAT 2: REVERSIBLE -->
<hr class="divider">
<section class="sec hov-section">
  <div class="sec-in">
    <div class="split rev">
      <div class="rv">
        <div class="tag">Architectural Primitive</div>
        <h2 class="h2">Built to<br><span class="g">Reverse.</span></h2>
        <p class="sub">The only enterprise AI platform where rollback is a first-class architectural primitive. One bad decision does not cascade. You undo it. Completely.</p>
        <div class="feat-list">
          <div class="feat-item">
            <div class="feat-ico"><svg viewBox="0 0 18 18" fill="none"><path d="M5 9a4 4 0 0 1 4-4h2" stroke="#D4855A" stroke-width="1.5" stroke-linecap="round"/><path d="M8 3l3 2-3 2" stroke="#D4855A" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 13H7a4 4 0 0 1 0-8" stroke="#D4855A" stroke-width="1.3" fill="none" opacity=".5"/></svg></div>
            <div><div class="feat-ttl">One-click rollback</div><div class="feat-dsc">Reverse any agent action or workflow state with a single command. No cleanup required.</div></div>
          </div>
          <div class="feat-item">
            <div class="feat-ico"><svg viewBox="0 0 18 18" fill="none"><path d="M9 2L15 5.5v7L9 16 3 12.5v-7L9 2Z" stroke="#D4855A" stroke-width="1.4" fill="none"/><path d="M9 8v2.5" stroke="#D4855A" stroke-width="1.4" stroke-linecap="round"/><circle cx="9" cy="13" r=".8" fill="#D4855A"/></svg></div>
            <div><div class="feat-ttl">Blast radius containment</div><div class="feat-dsc">OmniHub detects propagation risk and contains failures before they cascade across connected systems.</div></div>
          </div>
          <div class="feat-item">
            <div class="feat-ico"><svg viewBox="0 0 18 18" fill="none"><rect x="2.5" y="5" width="6" height="4" rx="1.2" stroke="#D4855A" stroke-width="1.3" fill="none"/><rect x="9.5" y="9" width="6" height="4" rx="1.2" stroke="#D4855A" stroke-width="1.3" fill="none"/><path d="M8.5 7h1.5M8.5 11h1.5" stroke="#D4855A" stroke-width="1.2" stroke-linecap="round"/><path d="M10 7c0 2-1 4-1.5 4" stroke="#D4855A" stroke-width="1" fill="none" stroke-dasharray="2 1.5" opacity=".6"/></svg></div>
            <div><div class="feat-ttl">Compensating transactions</div><div class="feat-dsc">Each agent action carries a compensating operation. Distributed state stays coherent under rollback across connected systems.</div></div>
          </div>
        </div>
      </div>
      <div class="vpanel rv d2">
        <div class="vpanel-in">
          <span class="vp-tag">Policy Engine: Active Rules</span>
          <div class="prules">
            <div class="prule"><div class="prule-l"><div class="prule-ico"><svg viewBox="0 0 14 14" fill="none"><path d="M7 1.5L11.5 4v6L7 12.5 2.5 10V4Z" stroke="#D4855A" stroke-width="1.3" fill="none"/><path d="M7 5.5v2" stroke="#D4855A" stroke-width="1.2" stroke-linecap="round"/><circle cx="7" cy="9" r=".5" fill="#D4855A"/></svg></div><div><div class="prule-n">Scope Restriction</div><div class="prule-d">No agent accesses unauthorized data scopes</div></div></div><div class="toggle"></div></div>
            <div class="prule"><div class="prule-l"><div class="prule-ico"><svg viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="1.5" stroke="#D4855A" stroke-width="1.3" fill="none"/><path d="M4 5h6M4 7h4M4 9h2" stroke="#D4855A" stroke-width="1" stroke-linecap="round"/></svg></div><div><div class="prule-n">Audit on Write</div><div class="prule-d">Each write operation logged immutably</div></div></div><div class="toggle"></div></div>
            <div class="prule"><div class="prule-l"><div class="prule-ico"><svg viewBox="0 0 14 14" fill="none"><path d="M4 7a3 3 0 0 1 3-3h2" stroke="#D4855A" stroke-width="1.3" stroke-linecap="round"/><path d="M6.5 2.5l2.5 1.5-2.5 1.5" stroke="#D4855A" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div><div class="prule-n">Rollback Window</div><div class="prule-d">30-minute compensating transaction window</div></div></div><div class="toggle"></div></div>
            <div class="prule"><div class="prule-l"><div class="prule-ico"><svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2" stroke="#D4855A" stroke-width="1.3" fill="none"/><path d="M3.5 12c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5" stroke="#D4855A" stroke-width="1.3" fill="none"/></svg></div><div><div class="prule-n">Human-in-Loop</div><div class="prule-d">High-risk actions require manual approval</div></div></div><div class="toggle off"></div></div>
            <div class="prule"><div class="prule-l"><div class="prule-ico"><svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#D4855A" stroke-width="1.3" fill="none"/><path d="M4 7h6M7 4v6" stroke="#D4855A" stroke-width="1" stroke-linecap="round" opacity=".6"/></svg></div><div><div class="prule-n">Cross-Border Block</div><div class="prule-d">GDPR: EU data stays within EEA zones</div></div></div><div class="toggle"></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- CAPABILITY CARDS -->
<hr class="divider">
<section class="sec hov-section" id="features">
  <div class="sec-in">
    <div class="rv"><div class="tag">Platform Capabilities</div>
    <h2 class="h2">Everything you need<br>to govern enterprise AI.</h2>
    <p class="sub">One platform. No black boxes. No vendor lock-in. No surprises.</p></div>
    <div class="cap-grid">
      <div class="cap-card rv"><div class="cap-ico"><svg viewBox="0 0 20 20" fill="none"><path d="M3 10h14M10 3v14" stroke="#D4855A" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="10" r="7.5" stroke="#D4855A" stroke-width="1.3" fill="none" stroke-dasharray="4 2.5" opacity=".5"/><circle cx="10" cy="10" r="2" fill="#D4855A" opacity=".8"/></svg></div><div class="cap-ttl">Universal Connector Network</div><div class="cap-dsc">200+ native integrations across CRMs, ERPs, cloud platforms, and data warehouses. Connect and govern from one surface.</div></div>
      <div class="cap-card rv d1"><div class="cap-ico"><svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="5" r="2.5" stroke="#D4855A" stroke-width="1.4" fill="none"/><circle cx="4" cy="15" r="2.5" stroke="#D4855A" stroke-width="1.4" fill="none"/><circle cx="16" cy="15" r="2.5" stroke="#D4855A" stroke-width="1.4" fill="none"/><line x1="8.3" y1="6.8" x2="5.7" y2="12.8" stroke="#D4855A" stroke-width="1.2" stroke-linecap="round"/><line x1="11.7" y1="6.8" x2="14.3" y2="12.8" stroke="#D4855A" stroke-width="1.2" stroke-linecap="round"/><line x1="6.5" y1="15" x2="13.5" y2="15" stroke="#D4855A" stroke-width="1.2" stroke-linecap="round"/></svg></div><div class="cap-ttl">Multi-Agent Orchestration</div><div class="cap-dsc">Deploy, coordinate, and monitor multiple AI agents simultaneously. Each is scoped, authorized, and observable in real time.</div></div>
      <div class="cap-card rv d2"><div class="cap-ico"><svg viewBox="0 0 20 20" fill="none"><path d="M2 14L5 8l3 4 3-6 3 3 3-5" stroke="#D4855A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="5" r="1.5" fill="#D4855A"/></svg></div><div class="cap-ttl">Real-Time Telemetry</div><div class="cap-dsc">Live operational intelligence across all agents and workflows. See what is running, what failed, and where attention is needed.</div></div>
      <div class="cap-card rv d1"><div class="cap-ico"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2L16 5.5v9L10 18 4 14.5v-9L10 2Z" stroke="#D4855A" stroke-width="1.4" fill="none"/><path d="M10 8v3" stroke="#D4855A" stroke-width="1.4" stroke-linecap="round"/><circle cx="10" cy="14" r=".8" fill="#D4855A"/></svg></div><div class="cap-ttl">Policy Enforcement Engine</div><div class="cap-dsc">Governance rules apply before any action executes. No agent bypasses policy, no exceptions.</div></div>
      <div class="cap-card rv d2"><div class="cap-ico"><svg viewBox="0 0 20 20" fill="none"><rect x="2.5" y="7" width="5" height="4" rx="1.5" stroke="#D4855A" stroke-width="1.3" fill="none"/><rect x="12.5" y="3" width="5" height="4" rx="1.5" stroke="#D4855A" stroke-width="1.3" fill="none"/><rect x="12.5" y="13" width="5" height="4" rx="1.5" stroke="#D4855A" stroke-width="1.3" fill="none"/><path d="M7.5 9h2.5v-4h2.5M7.5 9h2.5v5h2.5" stroke="#D4855A" stroke-width="1.2" stroke-linecap="round"/></svg></div><div class="cap-ttl">Workflow Intelligence</div><div class="cap-dsc">Visual workflow builder with embedded governance. Design complex automations that remain fully auditable end-to-end.</div></div>
      <div class="cap-card rv d3"><div class="cap-ico"><svg viewBox="0 0 20 20" fill="none"><path d="M10 3v4M10 13v4M3 10h4M13 10h4" stroke="#D4855A" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="10" r="3" stroke="#D4855A" stroke-width="1.4" fill="none"/><circle cx="10" cy="10" r=".8" fill="#D4855A"/></svg></div><div class="cap-ttl">MAN Mode</div><div class="cap-dsc">Manual Autonomous Negotiation. Define the operational boundaries. AI executes within them with full traceability.</div></div>
    </div>
  </div>
</section>

<!-- MAESTRO -->
<div class="maestro-wrap hov-section" id="maestro">
  <div class="maestro-in">
    <div class="rv">
      <div class="tag">Core Philosophy</div>
      <h2 class="h2">The MAESTRO<br>Principle.</h2>
      <p class="sub" style="margin-bottom:20px">Intelligence is not just capability. It is coordination with consequence. MAESTRO is the operating philosophy baked into each layer of APEX OmniHub.</p>
      <p style="font-size:13.5px;color:var(--t2);line-height:1.72;letter-spacing:-.1px;text-align:justify;text-indent:2em">Enterprise AI must serve your organization's intent. As the system scales, MAESTRO ensures authority scales with it.</p>
    </div>
    <div class="maestro-rows rv d2">
      <div class="m-row"><div class="m-l">M</div><div><div class="m-word">Multi-Agent</div><div class="m-desc">coordination at enterprise scale, all synchronized</div></div></div>
      <div class="m-row"><div class="m-l">A</div><div><div class="m-word">Authorized</div><div class="m-desc">execution, each action gated by policy</div></div></div>
      <div class="m-row"><div class="m-l">E</div><div><div class="m-word">Explainable</div><div class="m-desc">decisions in plain operational language, always</div></div></div>
      <div class="m-row"><div class="m-l">S</div><div><div class="m-word">Synchronized</div><div class="m-desc">state across all connected systems, in real time</div></div></div>
      <div class="m-row"><div class="m-l">T</div><div><div class="m-word">Traceable</div><div class="m-desc">outcomes with cryptographic immutable audit chains</div></div></div>
      <div class="m-row"><div class="m-l">R</div><div><div class="m-word">Reversible</div><div class="m-desc">by design, rollback is a first-class platform primitive</div></div></div>
      <div class="m-row"><div class="m-l">O</div><div><div class="m-word">Operational authority</div><div class="m-desc">returned entirely to your organization</div></div></div>
    </div>
  </div>
</div>

<!-- ENTERPRISE -->
<hr class="divider">
<section class="sec hov-section" id="enterprise">
  <div class="sec-in">
    <div class="rv"><div class="tag">Enterprise Ready</div>
    <h2 class="h2">Built for regulated<br>environments.</h2>
    <p class="sub">Architected from day one for compliance and governance across finance, healthcare, legal, and government.</p></div>
    <div class="comp-grid">
      <div class="comp-card rv"><div class="comp-chk">&#10003;</div><div class="comp-n">SOC 2 Type II</div><div class="comp-d">Security and availability controls validated by independent audit</div></div>
      <div class="comp-card rv d1"><div class="comp-chk">&#10003;</div><div class="comp-n">EU AI Act Art. 14</div><div class="comp-d">Human oversight requirements for high-risk AI systems</div></div>
      <div class="comp-card rv d2"><div class="comp-chk">&#10003;</div><div class="comp-n">GDPR Article 30</div><div class="comp-d">Complete records of processing activities, always exportable</div></div>
      <div class="comp-card rv d3"><div class="comp-chk">&#10003;</div><div class="comp-n">ISO 27001</div><div class="comp-d">Information security management system compatible architecture</div></div>
      <div class="comp-card rv"><div class="comp-chk">&#10003;</div><div class="comp-n">HIPAA-Ready</div><div class="comp-d">Healthcare data handling architecture with BAA support</div></div>
      <div class="comp-card rv d1"><div class="comp-chk">&#10003;</div><div class="comp-n">Zero Trust Model</div><div class="comp-d">No implicit trust. Each agent and action verified.</div></div>
      <div class="comp-card rv d2"><div class="comp-chk">&#10003;</div><div class="comp-n">RBAC + ABAC</div><div class="comp-d">Granular role and attribute-based access control across all surfaces</div></div>
      <div class="comp-card rv d3"><div class="comp-chk">&#10003;</div><div class="comp-n">E2E Encryption</div><div class="comp-d">All data in transit and at rest encrypted with AES-256</div></div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta-sec hov-section" id="cta">
  <div class="cta-bg"></div>
  <div class="cta-grid"></div>
  <div class="cta-in">
    <div class="tag rv" style="justify-content:center">Take Control</div>
    <h2 class="cta-h2 rv">Take operational<br>authority back.</h2>
    <p class="cta-sub rv d1">Join enterprises that have moved beyond black-box AI. Request early access and experience what governed intelligence looks like in production.</p>
    <div class="cta-btns rv d2">
      <a href="#" class="pill pill-lg" data-modal="request-access">Request Early Access</a>
      <a href="/demo.html" class="pill pill-lg pill-ghost">Schedule a Demo</a>
    </div>
    <p class="cta-note rv d3">No vendor lock-in. No black boxes. No surprises.</p>
  </div>
</section>

<!-- REQUEST ACCESS MODAL -->
<div id="ra-modal" class="modal-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="modal-card">
    <button class="modal-close" id="modal-close" aria-label="Close">&times;</button>
    <div class="modal-form-body" id="modal-form-body">
      <div class="modal-title" id="modal-title">Request Early Access</div>
      <div class="modal-sub">Tell us about your use case and we will be in touch.</div>
      <div class="modal-gen-error" id="gen-error"></div>
      <form id="ra-form" novalidate>
        <input type="text" name="website" class="form-honey" tabindex="-1" autocomplete="off">
        <div class="form-group"><label class="form-label" for="ra_name">Full Name *</label><input class="form-input" type="text" id="ra_name" name="ra_name" required maxlength="100" autocomplete="name" placeholder="Jane Smith"></div>
        <div class="form-group"><label class="form-label" for="ra_email">Work Email *</label><input class="form-input" type="email" id="ra_email" name="ra_email" required maxlength="254" autocomplete="email" placeholder="jane@company.com"></div>
        <div class="form-group"><label class="form-label" for="ra_company">Company</label><input class="form-input" type="text" id="ra_company" name="ra_company" maxlength="100" autocomplete="organization" placeholder="ACME Corp"></div>
        <div class="form-group"><label class="form-label" for="ra_usecase">Use Case</label><textarea class="form-input" id="ra_usecase" name="ra_usecase" maxlength="500" rows="3" placeholder="Briefly describe how you plan to use APEX OmniHub"></textarea></div>
        <button type="submit" class="pill" id="form-submit" style="width:100%;justify-content:center;margin-top:8px"><span class="btn-text">Request Access</span><span class="spinner"></span></button>
      </form>
    </div>
    <div class="modal-success" id="modal-success">
      <div class="modal-success-ico">&#10003;</div>
      <div class="modal-success-ttl">Request Received</div>
      <div class="modal-success-txt">We will be in touch shortly.</div>
    </div>
  </div>
</div>`;

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const root = rootRef.current;

    // Scroll reveal
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.07, rootMargin: '0px 0px -40px 0px' }
    );
    root.querySelectorAll('.rv').forEach((el) => obs.observe(el));

    // Modal
    const modal = root.querySelector('#ra-modal') as HTMLElement | null;
    const closeBtn = root.querySelector('#modal-close') as HTMLElement | null;
    let formStart = 0;
    let lastSubmit = 0;

    function openModal() {
      if (!modal) return;
      modal.classList.add('open');
      modal.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
      formStart = Date.now();
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    root.querySelectorAll('[data-modal="request-access"]').forEach((b) =>
      b.addEventListener('click', (e) => { e.preventDefault(); openModal(); })
    );
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal?.classList.contains('open')) closeModal();
    };
    document.addEventListener('keydown', escHandler);

    // Form
    const form = root.querySelector('#ra-form') as HTMLFormElement | null;
    const formHandler = (e: Event) => {
      e.preventDefault();
      if (!form) return;
      const err = root.querySelector('#gen-error') as HTMLElement;
      err?.classList.remove('show');
      const honeypot = (form.elements.namedItem('website') as HTMLInputElement)?.value;
      if (honeypot) return;
      if (Date.now() - formStart < 2000) {
        if (err) { err.textContent = 'Please take a moment to fill out the form.'; err.classList.add('show'); }
        return;
      }
      if (lastSubmit && Date.now() - lastSubmit < 300000) {
        if (err) { err.textContent = 'You already submitted recently. Please wait a few minutes.'; err.classList.add('show'); }
        return;
      }
      const nameEl = form.elements.namedItem('ra_name') as HTMLInputElement;
      const emailEl = form.elements.namedItem('ra_email') as HTMLInputElement;
      const name = nameEl.value.trim().slice(0, 200);
      if (!name || name.length < 2) {
        if (err) { err.textContent = 'Please enter your name.'; err.classList.add('show'); }
        return;
      }
      if (!emailEl.validity.valid || !emailEl.value) {
        if (err) { err.textContent = 'Please enter a valid email address.'; err.classList.add('show'); }
        return;
      }
      lastSubmit = Date.now();
      const formBody = root.querySelector('#modal-form-body') as HTMLElement;
      const success = root.querySelector('#modal-success') as HTMLElement;
      formBody?.classList.add('hidden');
      success?.classList.add('show');
    };
    if (form) form.addEventListener('submit', formHandler);

    return () => {
      obs.disconnect();
      document.removeEventListener('keydown', escHandler);
      document.body.style.overflow = '';
    };
  }, []);

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
      <div className="landing-root" ref={rootRef} dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
    </Layout>
  );
}
