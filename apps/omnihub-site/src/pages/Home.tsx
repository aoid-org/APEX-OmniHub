import React, { useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/Layout';
import { SEOMeta } from '@/components/SEOMeta';
import { StructuredData } from '@/components/StructuredData';
import { HERO_BADGE_ASSET_PATH } from '@/lib/heroAssets';
import { TickerSection } from '@/pages/home/TickerSection';
import { GovernanceSection } from '@/pages/home/GovernanceSection';
import { ReversibleSection } from '@/pages/home/ReversibleSection';
import { CapabilitiesSection } from '@/pages/home/CapabilitiesSection';
import { MaestroSection } from '@/pages/home/MaestroSection';
import { EnterpriseSection } from '@/pages/home/EnterpriseSection';
import { CTASection } from '@/pages/home/CTASection';
import { RequestAccessModal } from '@/pages/home/RequestAccessModal';
import '@/styles/landing.css';
import homepageSchema from '../../public/schema/homepage.jsonld?raw';
import organizationSchema from '../../public/schema/organization.jsonld?raw';

function HeroSection({ onOpenModal }: Readonly<{ onOpenModal: () => void }>) {
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
            <button
              type="button"
              className="pill pill-lg"
              data-modal="request-access"
              onClick={onOpenModal}
            >
              Request Early Access
            </button>
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
                {/* ── Nucleus gradients ── */}
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
                {/* ── Badge depth effects ── */}
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
                {/* ── Filters ── */}
                <filter id="fg"><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="fxl"><feGaussianBlur in="SourceGraphic" stdDeviation="18" /></filter>
                <filter id="fm"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="dofSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="0.9" /></filter>
                {/* Electron bloom glow */}
                <filter id="eGlow" x="-150%" y="-150%" width="400%" height="400%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <clipPath id="sclip"><circle cx="260" cy="265" r="152" /></clipPath>
              </defs>

              {/* ══ LAYER 1: Deep ambient atmosphere ══ */}
              <circle cx="260" cy="265" r="245" fill="rgba(196,81,26,0.028)" />
              <circle cx="260" cy="265" r="196" fill="rgba(232,162,71,0.032)" />
              <circle cx="260" cy="265" r="180" fill="url(#atm-r)" filter="url(#fxl)" />

              {/* ══ LAYER 2: Orbital ring backs (full ellipses — drawn before sphere so sphere clips the inner arcs) ══ */}
              {/* Ring A — tilt -18° — WEB3 (blue) + ENTERPRISE (amber) */}
              <g transform="translate(260,265) rotate(-18)">
                <ellipse cx="0" cy="0" rx="225" ry="54" fill="none" stroke="rgba(232,162,71,0.13)" strokeWidth="0.85" />
              </g>
              {/* Ring B — tilt 62° — AI CLOUD (purple) + LEGACY (green) */}
              <g transform="translate(260,265) rotate(62)">
                <ellipse cx="0" cy="0" rx="215" ry="52" fill="none" stroke="rgba(192,132,252,0.13)" strokeWidth="0.85" />
              </g>
              {/* Ring C — tilt -55° — PHYSICAL AI (cyan) + BLOCKCHAIN (purple) — CCW orbit */}
              <g transform="translate(260,265) rotate(-55)">
                <ellipse cx="0" cy="0" rx="210" ry="50" fill="none" stroke="rgba(56,189,248,0.13)" strokeWidth="0.85" />
              </g>
              {/* Ring D — tilt 14° inner — AI AGENTS (gold) */}
              <g transform="translate(260,265) rotate(14)">
                <ellipse cx="0" cy="0" rx="178" ry="43" fill="none" stroke="rgba(251,191,36,0.17)" strokeWidth="1" />
              </g>

              {/* ══ LAYER 3: Nucleus ══ */}
              <circle cx="268" cy="272" r="152" fill="rgba(0,0,0,0.42)" />
              <circle cx="260" cy="265" r="152" fill="url(#sphere-core)" />
              {/* Surface latitude lines */}
              <g clipPath="url(#sclip)" opacity="0.13">
                <line x1="108" y1="195" x2="412" y2="195" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="220" x2="412" y2="220" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="245" x2="412" y2="245" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="265" x2="412" y2="265" stroke="#fff" strokeWidth=".6" />
                <line x1="108" y1="285" x2="412" y2="285" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="310" x2="412" y2="310" stroke="#fff" strokeWidth=".5" />
                <line x1="108" y1="335" x2="412" y2="335" stroke="#fff" strokeWidth=".5" />
              </g>
              {/* Surface meridian lines */}
              <g clipPath="url(#sclip)" opacity="0.08">
                <ellipse cx="260" cy="265" rx="14" ry="152" fill="none" stroke="#fff" strokeWidth=".5" />
                <ellipse cx="260" cy="265" rx="42" ry="152" fill="none" stroke="#fff" strokeWidth=".5" />
                <ellipse cx="260" cy="265" rx="82" ry="152" fill="none" stroke="#fff" strokeWidth=".5" />
                <ellipse cx="260" cy="265" rx="124" ry="152" fill="none" stroke="#fff" strokeWidth=".5" />
              </g>
              {/* Specular highlights */}
              <ellipse cx="214" cy="208" rx="55" ry="38" fill="rgba(255,255,255,0.15)" filter="url(#fg)" />
              <ellipse cx="206" cy="200" rx="28" ry="19" fill="rgba(255,255,255,0.26)" />
              {/* Equatorial plasma ring */}
              <ellipse cx="260" cy="265" rx="152" ry="28" fill="none" stroke="rgba(245,192,106,0.22)" strokeWidth="3" filter="url(#fg)" />
              {/* Pulsing energy core (cyan) */}
              <circle cx="260" cy="265" r="64" fill="rgba(56,189,248,0.1)">
                <animate attributeName="r" values="60;70;60" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="fill" values="rgba(56,189,248,0.06);rgba(56,189,248,0.2);rgba(56,189,248,0.06)" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="260" cy="265" r="64" fill="none" stroke="rgba(56,189,248,0.4)" strokeWidth="1.5">
                <animate attributeName="r" values="60;74;60" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.82;0.4" dur="2.6s" repeatCount="indefinite" />
              </circle>
              {/* Badge core DOF group */}
              <g clipPath="url(#sclip)">
                <circle cx="260" cy="265" r="80" fill="url(#coreInner)" filter="url(#fg)">
                  <animate attributeName="r" values="76;84;76" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.9;0.7" dur="2.6s" repeatCount="indefinite" />
                </circle>
                <circle cx="260" cy="265" r="58" fill="rgba(245,192,106,0.18)" filter="url(#fg)">
                  <animate attributeName="r" values="54;62;54" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0.7;0.35" dur="2.6s" repeatCount="indefinite" />
                </circle>
                <image
                  href={HERO_BADGE_ASSET_PATH}
                  xlinkHref={HERO_BADGE_ASSET_PATH}
                  x="206" y="211" width="108" height="108"
                  preserveAspectRatio="xMidYMid meet"
                  mask="url(#badgeFadeMask)"
                  filter="url(#dofSoft)"
                  aria-label="APEX OmniHub core badge"
                >
                  <animate attributeName="opacity" values="0.82;1;0.82" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="y" values="211;208;211" dur="4.2s" repeatCount="indefinite" />
                </image>
                <circle cx="260" cy="265" r="152" fill="url(#coreRecess)" pointerEvents="none" />
              </g>
              {/* Outward pulse rings */}
              <circle cx="260" cy="265" r="90" fill="none" stroke="rgba(232,162,71,0.18)" strokeWidth="1.5">
                <animate attributeName="r" from="90" to="158" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.28" to="0" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="260" cy="265" r="90" fill="none" stroke="rgba(232,162,71,0.1)" strokeWidth="1">
                <animate attributeName="r" from="90" to="158" dur="3s" repeatCount="indefinite" begin="1.5s" />
                <animate attributeName="opacity" from="0.18" to="0" dur="3s" repeatCount="indefinite" begin="1.5s" />
              </circle>

              {/* ══ LAYER 4: Orbital front arcs — drawn AFTER sphere so they arc in front ══ */}
              {/* Ring A front arc (CW bottom half) */}
              <g transform="translate(260,265) rotate(-18)">
                <path d="M-225,0 A225,54 0 1 1 225,0" fill="none" stroke="rgba(232,162,71,0.46)" strokeWidth="1.4" />
              </g>
              {/* Ring B front arc */}
              <g transform="translate(260,265) rotate(62)">
                <path d="M-215,0 A215,52 0 1 1 215,0" fill="none" stroke="rgba(192,132,252,0.4)" strokeWidth="1.4" />
              </g>
              {/* Ring C front arc (CCW — front is the path from right back to left via bottom) */}
              <g transform="translate(260,265) rotate(-55)">
                <path d="M210,0 A210,50 0 1 0 -210,0" fill="none" stroke="rgba(56,189,248,0.4)" strokeWidth="1.4" />
              </g>
              {/* Ring D front arc */}
              <g transform="translate(260,265) rotate(14)">
                <path d="M-178,0 A178,43 0 1 1 178,0" fill="none" stroke="rgba(251,191,36,0.5)" strokeWidth="1.6" />
              </g>

              {/* ══ LAYER 5: Orbiting electrons — animateMotion in each ring's local coordinate space ══ */}
              {/* Opacity/size: front-half bright+large → back-half dim+small (depth illusion) */}
              {/* CW path: M-rx,0 → via bottom (front) → rx,0 → via top (back) → -rx,0 */}

              {/* Ring A CW (dur 15s) */}
              <g transform="translate(260,265) rotate(-18)">
                {/* WEB3 — starts leftmost, front arc first → bright at t=0 */}
                <g filter="url(#eGlow)">
                  <animateMotion dur="15s" repeatCount="indefinite" path="M-225,0 A225,54 0 1 1 225,0 A225,54 0 1 1 -225,0" />
                  <circle r="5" fill="#60a5fa">
                    <animate attributeName="opacity" values="0.9;0.2;0.9" dur="15s" repeatCount="indefinite" />
                    <animate attributeName="r" values="5;3;5" dur="15s" repeatCount="indefinite" />
                  </circle>
                </g>
                {/* ENTERPRISE — 180° offset (begin=-7.5s) → starts rightmost, back arc first → dim at t=0 */}
                <g filter="url(#eGlow)">
                  <animateMotion dur="15s" begin="-7.5s" repeatCount="indefinite" path="M-225,0 A225,54 0 1 1 225,0 A225,54 0 1 1 -225,0" />
                  <circle r="5" fill="#E8A247">
                    <animate attributeName="opacity" values="0.9;0.2;0.9" dur="15s" begin="-7.5s" repeatCount="indefinite" />
                    <animate attributeName="r" values="5;3;5" dur="15s" begin="-7.5s" repeatCount="indefinite" />
                  </circle>
                </g>
              </g>

              {/* Ring B CW (dur 19s) */}
              <g transform="translate(260,265) rotate(62)">
                {/* AI CLOUD — bright at t=0 */}
                <g filter="url(#eGlow)">
                  <animateMotion dur="19s" repeatCount="indefinite" path="M-215,0 A215,52 0 1 1 215,0 A215,52 0 1 1 -215,0" />
                  <circle r="5" fill="#c084fc">
                    <animate attributeName="opacity" values="0.9;0.2;0.9" dur="19s" repeatCount="indefinite" />
                    <animate attributeName="r" values="5;3;5" dur="19s" repeatCount="indefinite" />
                  </circle>
                </g>
                {/* LEGACY — 180° offset */}
                <g filter="url(#eGlow)">
                  <animateMotion dur="19s" begin="-9.5s" repeatCount="indefinite" path="M-215,0 A215,52 0 1 1 215,0 A215,52 0 1 1 -215,0" />
                  <circle r="5" fill="#4ade80">
                    <animate attributeName="opacity" values="0.9;0.2;0.9" dur="19s" begin="-9.5s" repeatCount="indefinite" />
                    <animate attributeName="r" values="5;3;5" dur="19s" begin="-9.5s" repeatCount="indefinite" />
                  </circle>
                </g>
              </g>

              {/* Ring C CCW (dur 17s) — sweep reversed so front/back timing flipped */}
              {/* CCW path: M-rx,0 → via top (back first) → rx,0 → via bottom (front) → -rx,0 */}
              <g transform="translate(260,265) rotate(-55)">
                {/* PHYSICAL AI — starts leftmost, back arc first → dim at t=0 */}
                <g filter="url(#eGlow)">
                  <animateMotion dur="17s" repeatCount="indefinite" path="M-210,0 A210,50 0 1 0 210,0 A210,50 0 1 0 -210,0" />
                  <circle r="5" fill="#38bdf8">
                    <animate attributeName="opacity" values="0.2;0.9;0.2" dur="17s" repeatCount="indefinite" />
                    <animate attributeName="r" values="3;5;3" dur="17s" repeatCount="indefinite" />
                  </circle>
                </g>
                {/* BLOCKCHAIN — 180° offset → bright at t=0 */}
                <g filter="url(#eGlow)">
                  <animateMotion dur="17s" begin="-8.5s" repeatCount="indefinite" path="M-210,0 A210,50 0 1 0 210,0 A210,50 0 1 0 -210,0" />
                  <circle r="5" fill="#c084fc">
                    <animate attributeName="opacity" values="0.2;0.9;0.2" dur="17s" begin="-8.5s" repeatCount="indefinite" />
                    <animate attributeName="r" values="3;5;3" dur="17s" begin="-8.5s" repeatCount="indefinite" />
                  </circle>
                </g>
              </g>

              {/* Ring D CW (dur 11s) — AI AGENTS solo inner orbit */}
              <g transform="translate(260,265) rotate(14)">
                <g filter="url(#eGlow)">
                  <animateMotion dur="11s" repeatCount="indefinite" path="M-178,0 A178,43 0 1 1 178,0 A178,43 0 1 1 -178,0" />
                  <circle r="5.5" fill="#fbbf24">
                    <animate attributeName="opacity" values="0.95;0.22;0.95" dur="11s" repeatCount="indefinite" />
                    <animate attributeName="r" values="5.5;3.5;5.5" dur="11s" repeatCount="indefinite" />
                  </circle>
                </g>
              </g>

              {/* ══ LAYER 6: Orbiting label nodes — global-space paths derived from each ring's projected ellipse ══ */}
              {/* Ring A (tilt -18°, rx=225, ry=54): start=(-225,0)local → global(46,334.5); end=(225,0)local → global(474,195.5) */}
              {/* Ring B (tilt  62°, rx=215, ry=52): start → global(159,75);  end → global(361,455) */}
              {/* Ring C (tilt -55°, rx=210, ry=50 CCW): start → global(139.5,437); end → global(380.5,93) */}
              {/* Ring D (tilt  14°, rx=178, ry=43): start → global(87,222);  end → global(433,308) */}

              {/* WEB3 — Ring A CW, 15s, phase 0 */}
              <g>
                <animateMotion dur="15s" repeatCount="indefinite" path="M 46,334.5 A 225,54 -18 1 1 474,195.5 A 225,54 -18 1 1 46,334.5" />
                <animate attributeName="opacity" values="0.9;0.22;0.9" dur="15s" repeatCount="indefinite" />
                <circle r="6.5" fill="rgba(96,165,250,0.12)" stroke="rgba(96,165,250,0.62)" strokeWidth="1" />
                <circle r="2.5" fill="#60a5fa" filter="url(#fm)" />
                <text x="0" y="-11" textAnchor="middle" fill="rgba(96,165,250,0.88)" fontSize="7" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">WEB3</text>
              </g>

              {/* ENTERPRISE — Ring A CW, 15s, phase -7.5s (180° offset) */}
              <g>
                <animateMotion dur="15s" begin="-7.5s" repeatCount="indefinite" path="M 46,334.5 A 225,54 -18 1 1 474,195.5 A 225,54 -18 1 1 46,334.5" />
                <animate attributeName="opacity" values="0.9;0.22;0.9" dur="15s" begin="-7.5s" repeatCount="indefinite" />
                <circle r="6.5" fill="rgba(232,162,71,0.12)" stroke="rgba(232,162,71,0.62)" strokeWidth="1" />
                <circle r="2.5" fill="#E8A247" filter="url(#fm)" />
                <text x="0" y="-11" textAnchor="middle" fill="rgba(232,162,71,0.88)" fontSize="7" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">ENTERPRISE</text>
              </g>

              {/* AI CLOUD — Ring B CW, 19s, phase 0 */}
              <g>
                <animateMotion dur="19s" repeatCount="indefinite" path="M 159,75 A 215,52 62 1 1 361,455 A 215,52 62 1 1 159,75" />
                <animate attributeName="opacity" values="0.9;0.22;0.9" dur="19s" repeatCount="indefinite" />
                <circle r="6.5" fill="rgba(192,132,252,0.12)" stroke="rgba(192,132,252,0.62)" strokeWidth="1" />
                <circle r="2.5" fill="#c084fc" filter="url(#fm)" />
                <text x="0" y="-11" textAnchor="middle" fill="rgba(192,132,252,0.88)" fontSize="7" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">AI CLOUD</text>
              </g>

              {/* LEGACY — Ring B CW, 19s, phase -9.5s */}
              <g>
                <animateMotion dur="19s" begin="-9.5s" repeatCount="indefinite" path="M 159,75 A 215,52 62 1 1 361,455 A 215,52 62 1 1 159,75" />
                <animate attributeName="opacity" values="0.9;0.22;0.9" dur="19s" begin="-9.5s" repeatCount="indefinite" />
                <circle r="6.5" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.62)" strokeWidth="1" />
                <circle r="2.5" fill="#4ade80" filter="url(#fm)" />
                <text x="0" y="-11" textAnchor="middle" fill="rgba(74,222,128,0.88)" fontSize="7" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">LEGACY</text>
              </g>

              {/* PHYSICAL AI — Ring C CCW, 17s, phase 0 (back-arc first → dim start) */}
              <g>
                <animateMotion dur="17s" repeatCount="indefinite" path="M 139.5,437 A 210,50 -55 1 0 380.5,93 A 210,50 -55 1 0 139.5,437" />
                <animate attributeName="opacity" values="0.22;0.9;0.22" dur="17s" repeatCount="indefinite" />
                <circle r="6.5" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.62)" strokeWidth="1" />
                <circle r="2.5" fill="#38bdf8" filter="url(#fm)" />
                <text x="0" y="-11" textAnchor="middle" fill="rgba(56,189,248,0.88)" fontSize="7" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">PHYSICAL AI</text>
              </g>

              {/* BLOCKCHAIN — Ring C CCW, 17s, phase -8.5s */}
              <g>
                <animateMotion dur="17s" begin="-8.5s" repeatCount="indefinite" path="M 139.5,437 A 210,50 -55 1 0 380.5,93 A 210,50 -55 1 0 139.5,437" />
                <animate attributeName="opacity" values="0.22;0.9;0.22" dur="17s" begin="-8.5s" repeatCount="indefinite" />
                <circle r="6.5" fill="rgba(192,132,252,0.12)" stroke="rgba(192,132,252,0.62)" strokeWidth="1" />
                <circle r="2.5" fill="#c084fc" filter="url(#fm)" />
                <text x="0" y="-11" textAnchor="middle" fill="rgba(192,132,252,0.88)" fontSize="7" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">BLOCKCHAIN</text>
              </g>

              {/* AI AGENTS — Ring D CW, 11s, phase 0 */}
              <g>
                <animateMotion dur="11s" repeatCount="indefinite" path="M 87,222 A 178,43 14 1 1 433,308 A 178,43 14 1 1 87,222" />
                <animate attributeName="opacity" values="0.95;0.22;0.95" dur="11s" repeatCount="indefinite" />
                <circle r="6.5" fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.62)" strokeWidth="1" />
                <circle r="2.5" fill="#fbbf24" filter="url(#fm)" />
                <text x="0" y="-11" textAnchor="middle" fill="rgba(251,191,36,0.88)" fontSize="7" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="1">AI AGENTS</text>
              </g>

              <text x="260" y="525" textAnchor="middle" fill="rgba(245,200,120,0.88)" fontSize="14" fontWeight="700" fontFamily="Space Grotesk,sans-serif" letterSpacing="4.5">INTELLIGENCE, DESIGNED.</text>
            </svg>
          </div>
        </div>
      </div>
    </section>
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
