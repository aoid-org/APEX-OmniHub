import React, { useEffect, useRef, useState } from "react";
import OmniHubPlatformMap from "@/components/OmniHubPlatformMap";
import { Layout } from "@/components/Layout";
import { SEOMeta } from "@/components/SEOMeta";
import { StructuredData } from "@/components/StructuredData";
import { HERO_BADGE_ASSET_PATH } from "@/lib/heroAssets";
import {
  isStringArray,
  isTranslatedCardArray,
  useAppTranslation,
} from "@/i18n/useAppTranslation";
import "@/styles/landing.css";
import homepageSchema from "../../public/schema/homepage.jsonld?raw";
import organizationSchema from "../../public/schema/organization.jsonld?raw";

function HeroSection({ onOpenModal }: Readonly<{ onOpenModal: () => void }>) {
  const { tx, t } = useAppTranslation();
  const tilesValue = t("hero.tiles", { returnObjects: true });
  const tiles = isStringArray(tilesValue) ? tilesValue : [];
  const trust = [
    tx("hero.trust.securityControls"),
    tx("hero.trust.humanOversight"),
    tx("hero.trust.privacyRecords"),
    tx("hero.trust.trusted"),
  ];
  return (
    <section className="hero hov-section">
      <div className="hero-glow-l"></div>
      <div className="hero-glow-r"></div>
      <div className="hero-inner">
        <div className="hero-left">
          <h1 className="hero-h1 rv">
            {tx("hero.headline.line1")}
            <br />
            {tx("hero.headline.line2")}
            <br />
            {tx("hero.headline.line3")}
          </h1>
          <p className="hero-sub rv d1">{tx("hero.subtitle")}</p>
          <div className="hero-tiles rv d1">
            {tiles.map((tile) => (
              <div className="htile" key={tile}>
                {tile}
              </div>
            ))}
          </div>
          <div className="hero-ctas rv d2">
            <button
              type="button"
              className="pill pill-lg"
              data-modal="request-access"
              onClick={onOpenModal}
            >
              {tx("hero.cta.primary")}
            </button>
            <a
              href="/demo.html"
              className="pill pill-lg pill-ghost"
              data-cta="watch-demo"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <polygon
                  points="5,3 13,8 5,13"
                  fill="currentColor"
                  opacity=".9"
                />
              </svg>
              {tx("hero.cta.secondary")}
            </a>
          </div>
          <p className="hero-trust rv d3">
            {trust.map((item, index) => (
              <React.Fragment key={item}>
                {index > 0 ? <span>&middot;</span> : null}
                {item}
              </React.Fragment>
            ))}
          </p>
        </div>
        <div className="hero-right rv d1">
          <div className="hero-art-wrap">
            <svg
              className="hero-art-svg"
              viewBox="0 0 520 540"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
            >
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
                  <rect
                    x="200"
                    y="205"
                    width="120"
                    height="120"
                    fill="url(#badgeFade)"
                  />
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
                <filter id="fg">
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="8"
                    result="b"
                  />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="fxl">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
                </filter>
                <filter id="fm">
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="5"
                    result="b"
                  />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="dofSoft"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" />
                </filter>
                {/* Electron bloom glow */}
                <filter
                  id="eGlow"
                  x="-150%"
                  y="-150%"
                  width="400%"
                  height="400%"
                >
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="2.8"
                    result="b"
                  />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <clipPath id="sclip">
                  <circle cx="260" cy="265" r="152" />
                </clipPath>
              </defs>

              {/* ══ LAYER 1: Deep ambient atmosphere ══ */}
              <circle cx="260" cy="265" r="245" fill="rgba(196,81,26,0.028)" />
              <circle cx="260" cy="265" r="196" fill="rgba(232,162,71,0.032)" />
              <circle
                cx="260"
                cy="265"
                r="180"
                fill="url(#atm-r)"
                filter="url(#fxl)"
              />

              {/* ══ LAYER 2: Orbital ring backs (full ellipses — drawn before sphere so sphere clips the inner arcs) ══ */}
              {/* Ring A — tilt -18° — WEB3 (blue) + ENTERPRISE (amber) */}
              <g transform="translate(260,265) rotate(-18)">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="225"
                  ry="54"
                  fill="none"
                  stroke="rgba(232,162,71,0.13)"
                  strokeWidth="0.85"
                />
              </g>
              {/* Ring B — tilt 62° — AI CLOUD (purple) + LEGACY (green) */}
              <g transform="translate(260,265) rotate(62)">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="215"
                  ry="52"
                  fill="none"
                  stroke="rgba(192,132,252,0.13)"
                  strokeWidth="0.85"
                />
              </g>
              {/* Ring C — tilt -55° — PHYSICAL AI (cyan) + BLOCKCHAIN (purple) — CCW orbit */}
              <g transform="translate(260,265) rotate(-55)">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="210"
                  ry="50"
                  fill="none"
                  stroke="rgba(56,189,248,0.13)"
                  strokeWidth="0.85"
                />
              </g>
              {/* Ring D — tilt 14° inner — AI AGENTS (gold) */}
              <g transform="translate(260,265) rotate(14)">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="178"
                  ry="43"
                  fill="none"
                  stroke="rgba(251,191,36,0.17)"
                  strokeWidth="1"
                />
              </g>

              {/* ══ LAYER 3: Nucleus ══ */}
              <circle cx="268" cy="272" r="152" fill="rgba(0,0,0,0.42)" />
              <circle cx="260" cy="265" r="152" fill="url(#sphere-core)" />
              {/* Surface latitude lines */}
              <g clipPath="url(#sclip)" opacity="0.13">
                <line
                  x1="108"
                  y1="195"
                  x2="412"
                  y2="195"
                  stroke="#fff"
                  strokeWidth=".5"
                />
                <line
                  x1="108"
                  y1="220"
                  x2="412"
                  y2="220"
                  stroke="#fff"
                  strokeWidth=".5"
                />
                <line
                  x1="108"
                  y1="245"
                  x2="412"
                  y2="245"
                  stroke="#fff"
                  strokeWidth=".5"
                />
                <line
                  x1="108"
                  y1="265"
                  x2="412"
                  y2="265"
                  stroke="#fff"
                  strokeWidth=".6"
                />
                <line
                  x1="108"
                  y1="285"
                  x2="412"
                  y2="285"
                  stroke="#fff"
                  strokeWidth=".5"
                />
                <line
                  x1="108"
                  y1="310"
                  x2="412"
                  y2="310"
                  stroke="#fff"
                  strokeWidth=".5"
                />
                <line
                  x1="108"
                  y1="335"
                  x2="412"
                  y2="335"
                  stroke="#fff"
                  strokeWidth=".5"
                />
              </g>
              {/* Surface meridian lines */}
              <g clipPath="url(#sclip)" opacity="0.08">
                <ellipse
                  cx="260"
                  cy="265"
                  rx="14"
                  ry="152"
                  fill="none"
                  stroke="#fff"
                  strokeWidth=".5"
                />
                <ellipse
                  cx="260"
                  cy="265"
                  rx="42"
                  ry="152"
                  fill="none"
                  stroke="#fff"
                  strokeWidth=".5"
                />
                <ellipse
                  cx="260"
                  cy="265"
                  rx="82"
                  ry="152"
                  fill="none"
                  stroke="#fff"
                  strokeWidth=".5"
                />
                <ellipse
                  cx="260"
                  cy="265"
                  rx="124"
                  ry="152"
                  fill="none"
                  stroke="#fff"
                  strokeWidth=".5"
                />
              </g>
              {/* Specular highlights */}
              <ellipse
                cx="214"
                cy="208"
                rx="55"
                ry="38"
                fill="rgba(255,255,255,0.15)"
                filter="url(#fg)"
              />
              <ellipse
                cx="206"
                cy="200"
                rx="28"
                ry="19"
                fill="rgba(255,255,255,0.26)"
              />
              {/* Equatorial plasma ring */}
              <ellipse
                cx="260"
                cy="265"
                rx="152"
                ry="28"
                fill="none"
                stroke="rgba(245,192,106,0.22)"
                strokeWidth="3"
                filter="url(#fg)"
              />
              {/* Pulsing energy core (cyan) */}
              <circle cx="260" cy="265" r="64" fill="rgba(56,189,248,0.1)">
                <animate
                  attributeName="r"
                  values="60;70;60"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="fill"
                  values="rgba(56,189,248,0.06);rgba(56,189,248,0.2);rgba(56,189,248,0.06)"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx="260"
                cy="265"
                r="64"
                fill="none"
                stroke="rgba(56,189,248,0.4)"
                strokeWidth="1.5"
              >
                <animate
                  attributeName="r"
                  values="60;74;60"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.4;0.82;0.4"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Badge core DOF group */}
              <g clipPath="url(#sclip)">
                <circle
                  cx="260"
                  cy="265"
                  r="80"
                  fill="url(#coreInner)"
                  filter="url(#fg)"
                >
                  <animate
                    attributeName="r"
                    values="76;84;76"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.7;0.9;0.7"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx="260"
                  cy="265"
                  r="58"
                  fill="rgba(245,192,106,0.18)"
                  filter="url(#fg)"
                >
                  <animate
                    attributeName="r"
                    values="54;62;54"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.35;0.7;0.35"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                </circle>
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
                  <animate
                    attributeName="opacity"
                    values="0.82;1;0.82"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="y"
                    values="211;208;211"
                    dur="4.2s"
                    repeatCount="indefinite"
                  />
                </image>
                <circle
                  cx="260"
                  cy="265"
                  r="152"
                  fill="url(#coreRecess)"
                  pointerEvents="none"
                />
              </g>
              {/* Outward pulse rings */}
              <circle
                cx="260"
                cy="265"
                r="90"
                fill="none"
                stroke="rgba(232,162,71,0.18)"
                strokeWidth="1.5"
              >
                <animate
                  attributeName="r"
                  from="90"
                  to="158"
                  dur="3s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.28"
                  to="0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx="260"
                cy="265"
                r="90"
                fill="none"
                stroke="rgba(232,162,71,0.1)"
                strokeWidth="1"
              >
                <animate
                  attributeName="r"
                  from="90"
                  to="158"
                  dur="3s"
                  repeatCount="indefinite"
                  begin="1.5s"
                />
                <animate
                  attributeName="opacity"
                  from="0.18"
                  to="0"
                  dur="3s"
                  repeatCount="indefinite"
                  begin="1.5s"
                />
              </circle>

              {/* ══ LAYER 4: Orbital front arcs — drawn AFTER sphere so they arc in front ══ */}
              {/* Ring A front arc (CW bottom half) */}
              <g transform="translate(260,265) rotate(-18)">
                <path
                  d="M-225,0 A225,54 0 1 1 225,0"
                  fill="none"
                  stroke="rgba(232,162,71,0.46)"
                  strokeWidth="1.4"
                />
              </g>
              {/* Ring B front arc */}
              <g transform="translate(260,265) rotate(62)">
                <path
                  d="M-215,0 A215,52 0 1 1 215,0"
                  fill="none"
                  stroke="rgba(192,132,252,0.4)"
                  strokeWidth="1.4"
                />
              </g>
              {/* Ring C front arc (CCW — front is the path from right back to left via bottom) */}
              <g transform="translate(260,265) rotate(-55)">
                <path
                  d="M210,0 A210,50 0 1 0 -210,0"
                  fill="none"
                  stroke="rgba(56,189,248,0.4)"
                  strokeWidth="1.4"
                />
              </g>
              {/* Ring D front arc */}
              <g transform="translate(260,265) rotate(14)">
                <path
                  d="M-178,0 A178,43 0 1 1 178,0"
                  fill="none"
                  stroke="rgba(251,191,36,0.5)"
                  strokeWidth="1.6"
                />
              </g>

              {/* ══ LAYER 5: Orbiting electrons — animateMotion in each ring's local coordinate space ══ */}
              {/* Opacity/size: front-half bright+large → back-half dim+small (depth illusion) */}
              {/* CW path: M-rx,0 → via bottom (front) → rx,0 → via top (back) → -rx,0 */}

              {/* Ring A CW (dur 15s) */}
              <g transform="translate(260,265) rotate(-18)">
                {/* WEB3 — starts leftmost, front arc first → bright at t=0 */}
                <g filter="url(#eGlow)">
                  <animateMotion
                    dur="15s"
                    repeatCount="indefinite"
                    path="M-225,0 A225,54 0 1 1 225,0 A225,54 0 1 1 -225,0"
                  />
                  <circle r="5" fill="#60a5fa">
                    <animate
                      attributeName="opacity"
                      values="0.9;0.2;0.9"
                      dur="15s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="r"
                      values="5;3;5"
                      dur="15s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
                {/* ENTERPRISE — 180° offset (begin=-7.5s) → starts rightmost, back arc first → dim at t=0 */}
                <g filter="url(#eGlow)">
                  <animateMotion
                    dur="15s"
                    begin="-7.5s"
                    repeatCount="indefinite"
                    path="M-225,0 A225,54 0 1 1 225,0 A225,54 0 1 1 -225,0"
                  />
                  <circle r="5" fill="#E8A247">
                    <animate
                      attributeName="opacity"
                      values="0.9;0.2;0.9"
                      dur="15s"
                      begin="-7.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="r"
                      values="5;3;5"
                      dur="15s"
                      begin="-7.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              </g>

              {/* Ring B CW (dur 19s) */}
              <g transform="translate(260,265) rotate(62)">
                {/* AI CLOUD — bright at t=0 */}
                <g filter="url(#eGlow)">
                  <animateMotion
                    dur="19s"
                    repeatCount="indefinite"
                    path="M-215,0 A215,52 0 1 1 215,0 A215,52 0 1 1 -215,0"
                  />
                  <circle r="5" fill="#c084fc">
                    <animate
                      attributeName="opacity"
                      values="0.9;0.2;0.9"
                      dur="19s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="r"
                      values="5;3;5"
                      dur="19s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
                {/* LEGACY — 180° offset */}
                <g filter="url(#eGlow)">
                  <animateMotion
                    dur="19s"
                    begin="-9.5s"
                    repeatCount="indefinite"
                    path="M-215,0 A215,52 0 1 1 215,0 A215,52 0 1 1 -215,0"
                  />
                  <circle r="5" fill="#4ade80">
                    <animate
                      attributeName="opacity"
                      values="0.9;0.2;0.9"
                      dur="19s"
                      begin="-9.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="r"
                      values="5;3;5"
                      dur="19s"
                      begin="-9.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              </g>

              {/* Ring C CCW (dur 17s) — sweep reversed so front/back timing flipped */}
              {/* CCW path: M-rx,0 → via top (back first) → rx,0 → via bottom (front) → -rx,0 */}
              <g transform="translate(260,265) rotate(-55)">
                {/* PHYSICAL AI — starts leftmost, back arc first → dim at t=0 */}
                <g filter="url(#eGlow)">
                  <animateMotion
                    dur="17s"
                    repeatCount="indefinite"
                    path="M-210,0 A210,50 0 1 0 210,0 A210,50 0 1 0 -210,0"
                  />
                  <circle r="5" fill="#38bdf8">
                    <animate
                      attributeName="opacity"
                      values="0.2;0.9;0.2"
                      dur="17s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="r"
                      values="3;5;3"
                      dur="17s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
                {/* BLOCKCHAIN — 180° offset → bright at t=0 */}
                <g filter="url(#eGlow)">
                  <animateMotion
                    dur="17s"
                    begin="-8.5s"
                    repeatCount="indefinite"
                    path="M-210,0 A210,50 0 1 0 210,0 A210,50 0 1 0 -210,0"
                  />
                  <circle r="5" fill="#c084fc">
                    <animate
                      attributeName="opacity"
                      values="0.2;0.9;0.2"
                      dur="17s"
                      begin="-8.5s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="r"
                      values="3;5;3"
                      dur="17s"
                      begin="-8.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              </g>

              {/* Ring D CW (dur 11s) — AI AGENTS solo inner orbit */}
              <g transform="translate(260,265) rotate(14)">
                <g filter="url(#eGlow)">
                  <animateMotion
                    dur="11s"
                    repeatCount="indefinite"
                    path="M-178,0 A178,43 0 1 1 178,0 A178,43 0 1 1 -178,0"
                  />
                  <circle r="5.5" fill="#fbbf24">
                    <animate
                      attributeName="opacity"
                      values="0.95;0.22;0.95"
                      dur="11s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="r"
                      values="5.5;3.5;5.5"
                      dur="11s"
                      repeatCount="indefinite"
                    />
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
                <animateMotion
                  dur="15s"
                  repeatCount="indefinite"
                  path="M 46,334.5 A 225,54 -18 1 1 474,195.5 A 225,54 -18 1 1 46,334.5"
                />
                <animate
                  attributeName="opacity"
                  values="0.9;0.22;0.9"
                  dur="15s"
                  repeatCount="indefinite"
                />
                <circle
                  r="6.5"
                  fill="rgba(96,165,250,0.12)"
                  stroke="rgba(96,165,250,0.62)"
                  strokeWidth="1"
                />
                <circle r="2.5" fill="#60a5fa" filter="url(#fm)" />
                <text
                  x="0"
                  y="-11"
                  textAnchor="middle"
                  fill="rgba(96,165,250,0.88)"
                  fontSize="7"
                  fontWeight="700"
                  fontFamily="Space Grotesk,sans-serif"
                  letterSpacing="1"
                >
                  WEB3
                </text>
              </g>

              {/* ENTERPRISE — Ring A CW, 15s, phase -7.5s (180° offset) */}
              <g>
                <animateMotion
                  dur="15s"
                  begin="-7.5s"
                  repeatCount="indefinite"
                  path="M 46,334.5 A 225,54 -18 1 1 474,195.5 A 225,54 -18 1 1 46,334.5"
                />
                <animate
                  attributeName="opacity"
                  values="0.9;0.22;0.9"
                  dur="15s"
                  begin="-7.5s"
                  repeatCount="indefinite"
                />
                <circle
                  r="6.5"
                  fill="rgba(232,162,71,0.12)"
                  stroke="rgba(232,162,71,0.62)"
                  strokeWidth="1"
                />
                <circle r="2.5" fill="#E8A247" filter="url(#fm)" />
                <text
                  x="0"
                  y="-11"
                  textAnchor="middle"
                  fill="rgba(232,162,71,0.88)"
                  fontSize="7"
                  fontWeight="700"
                  fontFamily="Space Grotesk,sans-serif"
                  letterSpacing="1"
                >
                  ENTERPRISE
                </text>
              </g>

              {/* AI CLOUD — Ring B CW, 19s, phase 0 */}
              <g>
                <animateMotion
                  dur="19s"
                  repeatCount="indefinite"
                  path="M 159,75 A 215,52 62 1 1 361,455 A 215,52 62 1 1 159,75"
                />
                <animate
                  attributeName="opacity"
                  values="0.9;0.22;0.9"
                  dur="19s"
                  repeatCount="indefinite"
                />
                <circle
                  r="6.5"
                  fill="rgba(192,132,252,0.12)"
                  stroke="rgba(192,132,252,0.62)"
                  strokeWidth="1"
                />
                <circle r="2.5" fill="#c084fc" filter="url(#fm)" />
                <text
                  x="0"
                  y="-11"
                  textAnchor="middle"
                  fill="rgba(192,132,252,0.88)"
                  fontSize="7"
                  fontWeight="700"
                  fontFamily="Space Grotesk,sans-serif"
                  letterSpacing="1"
                >
                  AI CLOUD
                </text>
              </g>

              {/* LEGACY — Ring B CW, 19s, phase -9.5s */}
              <g>
                <animateMotion
                  dur="19s"
                  begin="-9.5s"
                  repeatCount="indefinite"
                  path="M 159,75 A 215,52 62 1 1 361,455 A 215,52 62 1 1 159,75"
                />
                <animate
                  attributeName="opacity"
                  values="0.9;0.22;0.9"
                  dur="19s"
                  begin="-9.5s"
                  repeatCount="indefinite"
                />
                <circle
                  r="6.5"
                  fill="rgba(74,222,128,0.12)"
                  stroke="rgba(74,222,128,0.62)"
                  strokeWidth="1"
                />
                <circle r="2.5" fill="#4ade80" filter="url(#fm)" />
                <text
                  x="0"
                  y="-11"
                  textAnchor="middle"
                  fill="rgba(74,222,128,0.88)"
                  fontSize="7"
                  fontWeight="700"
                  fontFamily="Space Grotesk,sans-serif"
                  letterSpacing="1"
                >
                  LEGACY
                </text>
              </g>

              {/* PHYSICAL AI — Ring C CCW, 17s, phase 0 (back-arc first → dim start) */}
              <g>
                <animateMotion
                  dur="17s"
                  repeatCount="indefinite"
                  path="M 139.5,437 A 210,50 -55 1 0 380.5,93 A 210,50 -55 1 0 139.5,437"
                />
                <animate
                  attributeName="opacity"
                  values="0.22;0.9;0.22"
                  dur="17s"
                  repeatCount="indefinite"
                />
                <circle
                  r="6.5"
                  fill="rgba(56,189,248,0.12)"
                  stroke="rgba(56,189,248,0.62)"
                  strokeWidth="1"
                />
                <circle r="2.5" fill="#38bdf8" filter="url(#fm)" />
                <text
                  x="0"
                  y="-11"
                  textAnchor="middle"
                  fill="rgba(56,189,248,0.88)"
                  fontSize="7"
                  fontWeight="700"
                  fontFamily="Space Grotesk,sans-serif"
                  letterSpacing="1"
                >
                  PHYSICAL AI
                </text>
              </g>

              {/* BLOCKCHAIN — Ring C CCW, 17s, phase -8.5s */}
              <g>
                <animateMotion
                  dur="17s"
                  begin="-8.5s"
                  repeatCount="indefinite"
                  path="M 139.5,437 A 210,50 -55 1 0 380.5,93 A 210,50 -55 1 0 139.5,437"
                />
                <animate
                  attributeName="opacity"
                  values="0.22;0.9;0.22"
                  dur="17s"
                  begin="-8.5s"
                  repeatCount="indefinite"
                />
                <circle
                  r="6.5"
                  fill="rgba(192,132,252,0.12)"
                  stroke="rgba(192,132,252,0.62)"
                  strokeWidth="1"
                />
                <circle r="2.5" fill="#c084fc" filter="url(#fm)" />
                <text
                  x="0"
                  y="-11"
                  textAnchor="middle"
                  fill="rgba(192,132,252,0.88)"
                  fontSize="7"
                  fontWeight="700"
                  fontFamily="Space Grotesk,sans-serif"
                  letterSpacing="1"
                >
                  BLOCKCHAIN
                </text>
              </g>

              {/* AI AGENTS — Ring D CW, 11s, phase 0 */}
              <g>
                <animateMotion
                  dur="11s"
                  repeatCount="indefinite"
                  path="M 87,222 A 178,43 14 1 1 433,308 A 178,43 14 1 1 87,222"
                />
                <animate
                  attributeName="opacity"
                  values="0.95;0.22;0.95"
                  dur="11s"
                  repeatCount="indefinite"
                />
                <circle
                  r="6.5"
                  fill="rgba(251,191,36,0.12)"
                  stroke="rgba(251,191,36,0.62)"
                  strokeWidth="1"
                />
                <circle r="2.5" fill="#fbbf24" filter="url(#fm)" />
                <text
                  x="0"
                  y="-11"
                  textAnchor="middle"
                  fill="rgba(251,191,36,0.88)"
                  fontSize="7"
                  fontWeight="700"
                  fontFamily="Space Grotesk,sans-serif"
                  letterSpacing="1"
                >
                  AI AGENTS
                </text>
              </g>

              <text
                x="260"
                y="525"
                textAnchor="middle"
                fill="rgba(245,200,120,0.88)"
                fontSize="14"
                fontWeight="700"
                fontFamily="Space Grotesk,sans-serif"
                letterSpacing="4.5"
              >
                INTELLIGENCE, DESIGNED.
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

function TickerSection() {
  const { t } = useAppTranslation();
  const itemsValue = t("ticker.items", { returnObjects: true });
  const items = isStringArray(itemsValue) ? itemsValue : [];
  const doubledItems = [...items, ...items];

  return (
    <div className="ticker">
      <div className="ticker-track">
        {doubledItems.map((item, idx) => (
          <div
            key={`${item}-${idx < items.length ? "primary" : "mirror"}`}
            className="ticker-item"
          >
            {item}
            <span className="ticker-dot">&middot;</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GovernanceSection() {
  const { tx } = useAppTranslation();
  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section" id="platform">
        <div className="sec-in">
          <div className="split">
            <div className="rv">
              <div className="tag">{tx("governance.label")}</div>
              <h2 className="h2">
                {tx("governance.headline.line1")}
                <br />
                <span className="g">{tx("governance.headline.line2")}</span>
              </h2>
              <p className="sub">{tx("governance.description")}</p>
              <div className="feat-list">
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <path
                        d="M3 4h12M3 8h8M3 12h5"
                        stroke="#D4855A"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="14"
                        cy="10"
                        r="3.5"
                        stroke="#D4855A"
                        strokeWidth="1.4"
                        fill="none"
                      />
                      <path
                        d="M13 10l1 1 1.5-1.5"
                        stroke="#D4855A"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">
                      {tx("governance.features.naturalLanguage.title")}
                    </div>
                    <div className="feat-dsc">
                      {tx("governance.features.naturalLanguage.desc")}
                    </div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <circle
                        cx="9"
                        cy="9"
                        r="2.5"
                        fill="#D4855A"
                        opacity=".9"
                      />
                      <circle
                        cx="9"
                        cy="9"
                        r="6.5"
                        stroke="#D4855A"
                        strokeWidth="1.3"
                        fill="none"
                        strokeDasharray="3 2"
                      />
                      <path
                        d="M9 2.5V1M9 17v-1.5M2.5 9H1M17 9h-1.5"
                        stroke="#D4855A"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">
                      {tx("governance.features.capabilityRouting.title")}
                    </div>
                    <div className="feat-dsc">
                      {tx("governance.features.capabilityRouting.desc")}
                    </div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <rect
                        x="3"
                        y="3"
                        width="12"
                        height="12"
                        rx="2"
                        stroke="#D4855A"
                        strokeWidth="1.4"
                        fill="none"
                      />
                      <path
                        d="M9 6v4M7 8l2 2 2-2"
                        stroke="#D4855A"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="6"
                        y1="13"
                        x2="12"
                        y2="13"
                        stroke="#D4855A"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        opacity=".5"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">
                      {tx("governance.features.override.title")}
                    </div>
                    <div className="feat-dsc">
                      {tx("governance.features.override.desc")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="vpanel rv d2">
              <div className="vpanel-in">
                <span className="vp-tag">
                  {tx("governance.features.liveAudit")}
                </span>
                <div className="alog">
                  <div className="arow">
                    <span className="at">14:32:07</span>
                    <span className="adot ok"></span>
                    <span className="atxt">
                      SalesForce Sync: write contact #4821
                    </span>
                    <span className="apill p-auth">
                      {tx("governance.auditTrail.statuses.authorized")}
                    </span>
                  </div>
                  <div className="arow">
                    <span className="at">14:32:05</span>
                    <span className="adot info"></span>
                    <span className="atxt">
                      Compliance Reporter: export data batch
                    </span>
                    <span className="apill p-log">
                      {tx("governance.auditTrail.statuses.logged")}
                    </span>
                  </div>
                  <div className="arow">
                    <span className="at">14:31:58</span>
                    <span className="adot ok"></span>
                    <span className="atxt">
                      ERP Orchestrator: inventory sync complete
                    </span>
                    <span className="apill p-auth">
                      {tx("governance.auditTrail.statuses.authorized")}
                    </span>
                  </div>
                  <div className="arow">
                    <span className="at">14:31:44</span>
                    <span className="adot warn"></span>
                    <span className="atxt">
                      Anomaly: unauthorized scope attempt blocked
                    </span>
                    <span className="apill p-block">
                      {tx("governance.auditTrail.statuses.blocked")}
                    </span>
                  </div>
                  <div className="arow">
                    <span className="at">14:31:33</span>
                    <span className="adot info"></span>
                    <span className="atxt">
                      Policy update: RBAC rule #12 applied
                    </span>
                    <span className="apill p-log">
                      {tx("governance.auditTrail.statuses.logged")}
                    </span>
                  </div>
                  <div className="arow">
                    <span className="at">14:31:20</span>
                    <span className="adot ok"></span>
                    <span className="atxt">
                      Workflow: Invoice Reconcile, step 3 of 6
                    </span>
                    <span className="apill p-auth">
                      {tx("governance.auditTrail.statuses.authorized")}
                    </span>
                  </div>
                  <div className="arow">
                    <span className="at">14:31:08</span>
                    <span className="adot ok"></span>
                    <span className="atxt">
                      Agent deployed: Customer360 Aggregator
                    </span>
                    <span className="apill p-auth">
                      {tx("governance.auditTrail.statuses.authorized")}
                    </span>
                  </div>
                  <div className="arow">
                    <span className="at">14:30:55</span>
                    <span className="adot info"></span>
                    <span className="atxt">
                      MAN Mode activated: ERP agent paused
                    </span>
                    <span className="apill p-log">
                      {tx("governance.auditTrail.statuses.logged")}
                    </span>
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

function ReversibleSection() {
  const { tx, t } = useAppTranslation();
  const rulesValue = t("reversible.policyRules", { returnObjects: true });
  const rules = isTranslatedCardArray(rulesValue) ? rulesValue : [];
  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section">
        <div className="sec-in">
          <div className="split rev">
            <div className="rv">
              <div className="tag">{tx("reversible.label")}</div>
              <h2 className="h2">
                {tx("reversible.headline.line1")}
                <br />
                <span className="g">{tx("reversible.headline.line2")}</span>
              </h2>
              <p className="sub">{tx("reversible.description")}</p>
              <div className="feat-list">
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <path
                        d="M5 9a4 4 0 0 1 4-4h2"
                        stroke="#D4855A"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8 3l3 2-3 2"
                        stroke="#D4855A"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 13H7a4 4 0 0 1 0-8"
                        stroke="#D4855A"
                        strokeWidth="1.3"
                        fill="none"
                        opacity=".5"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">
                      {tx("reversible.features.rollback.title")}
                    </div>
                    <div className="feat-dsc">
                      {tx("reversible.features.rollback.desc")}
                    </div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <path
                        d="M9 2L15 5.5v7L9 16 3 12.5v-7L9 2Z"
                        stroke="#D4855A"
                        strokeWidth="1.4"
                        fill="none"
                      />
                      <path
                        d="M9 8v2.5"
                        stroke="#D4855A"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                      <circle cx="9" cy="13" r=".8" fill="#D4855A" />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">
                      {tx("reversible.features.blastRadius.title")}
                    </div>
                    <div className="feat-dsc">
                      {tx("reversible.features.blastRadius.desc")}
                    </div>
                  </div>
                </div>
                <div className="feat-item">
                  <div className="feat-ico">
                    <svg viewBox="0 0 18 18" fill="none">
                      <rect
                        x="2.5"
                        y="5"
                        width="6"
                        height="4"
                        rx="1.2"
                        stroke="#D4855A"
                        strokeWidth="1.3"
                        fill="none"
                      />
                      <rect
                        x="9.5"
                        y="9"
                        width="6"
                        height="4"
                        rx="1.2"
                        stroke="#D4855A"
                        strokeWidth="1.3"
                        fill="none"
                      />
                      <path
                        d="M8.5 7h1.5M8.5 11h1.5"
                        stroke="#D4855A"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M10 7c0 2-1 4-1.5 4"
                        stroke="#D4855A"
                        strokeWidth="1"
                        fill="none"
                        strokeDasharray="2 1.5"
                        opacity=".6"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="feat-ttl">
                      {tx("reversible.features.compensating.title")}
                    </div>
                    <div className="feat-dsc">
                      {tx("reversible.features.compensating.desc")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="vpanel rv d2">
              <div className="vpanel-in">
                <span className="vp-tag">
                  {tx("reversible.features.policyEngine")}
                </span>
                <div className="prules">
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <path
                            d="M7 1.5L11.5 4v6L7 12.5 2.5 10V4Z"
                            stroke="#D4855A"
                            strokeWidth="1.3"
                            fill="none"
                          />
                          <path
                            d="M7 5.5v2"
                            stroke="#D4855A"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                          <circle cx="7" cy="9" r=".5" fill="#D4855A" />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">
                          {rules[0]?.name ??
                            rules[0]?.title ??
                            "Scope Restriction"}
                        </div>
                        <div className="prule-d">
                          {rules[0]?.desc ??
                            "No agent accesses unauthorized data scopes"}
                        </div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <rect
                            x="2"
                            y="2"
                            width="10"
                            height="10"
                            rx="1.5"
                            stroke="#D4855A"
                            strokeWidth="1.3"
                            fill="none"
                          />
                          <path
                            d="M4 5h6M4 7h4M4 9h2"
                            stroke="#D4855A"
                            strokeWidth="1"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">
                          {rules[1]?.name ??
                            rules[1]?.title ??
                            "Audit on Write"}
                        </div>
                        <div className="prule-d">
                          {rules[1]?.desc ??
                            "Each write operation logged immutably"}
                        </div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <path
                            d="M4 7a3 3 0 0 1 3-3h2"
                            stroke="#D4855A"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6.5 2.5l2.5 1.5-2.5 1.5"
                            stroke="#D4855A"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">
                          {rules[2]?.name ??
                            rules[2]?.title ??
                            "Rollback Window"}
                        </div>
                        <div className="prule-d">
                          {rules[2]?.desc ??
                            "30-minute compensating transaction window"}
                        </div>
                      </div>
                    </div>
                    <div className="toggle"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <circle
                            cx="7"
                            cy="5"
                            r="2"
                            stroke="#D4855A"
                            strokeWidth="1.3"
                            fill="none"
                          />
                          <path
                            d="M3.5 12c0-1.933 1.567-3.5 3.5-3.5s3.5 1.567 3.5 3.5"
                            stroke="#D4855A"
                            strokeWidth="1.3"
                            fill="none"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">
                          {rules[3]?.name ?? rules[3]?.title ?? "MAN Mode"}
                        </div>
                        <div className="prule-d">
                          {rules[3]?.desc ??
                            "High-risk actions require Manual Approval Node approval"}
                        </div>
                      </div>
                    </div>
                    <div className="toggle off"></div>
                  </div>
                  <div className="prule">
                    <div className="prule-l">
                      <div className="prule-ico">
                        <svg viewBox="0 0 14 14" fill="none">
                          <circle
                            cx="7"
                            cy="7"
                            r="5.5"
                            stroke="#D4855A"
                            strokeWidth="1.3"
                            fill="none"
                          />
                          <path
                            d="M4 7h6M7 4v6"
                            stroke="#D4855A"
                            strokeWidth="1"
                            strokeLinecap="round"
                            opacity=".6"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="prule-n">
                          {rules[4]?.name ??
                            rules[4]?.title ??
                            "Cross-Border Block"}
                        </div>
                        <div className="prule-d">
                          {rules[4]?.desc ??
                            "EU data stays within EEA zones (data residency)"}
                        </div>
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
  const { tx, t } = useAppTranslation();
  const capabilityItems = t("capabilities.items", { returnObjects: true });
  const translatedCapabilities = isTranslatedCardArray(capabilityItems)
    ? capabilityItems
    : [];
  const capabilities = [
    {
      title: "Universal Connector Network",
      path: "/smart-integrations",
      desc: "Universal compatibility across legacy, Web2, Web3, AI, NFT, and blockchain applications. Connect and govern from one surface without an arbitrary integration ceiling.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="M3 10h14M10 3v14"
            stroke="#D4855A"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle
            cx="10"
            cy="10"
            r="7.5"
            stroke="#D4855A"
            strokeWidth="1.3"
            fill="none"
            strokeDasharray="4 2.5"
            opacity=".5"
          />
          <circle cx="10" cy="10" r="2" fill="#D4855A" opacity=".8" />
        </svg>
      ),
    },
    {
      title: "OmniDash",
      path: "/omnidash",
      desc: "Your governed intelligence command center. Monitor every agent, workflow, integration, and event from a single real-time surface with role-enforced visibility.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <rect
            x="2"
            y="2"
            width="7"
            height="8"
            rx="1.5"
            stroke="#D4855A"
            strokeWidth="1.3"
            fill="none"
          />
          <rect
            x="11"
            y="2"
            width="7"
            height="4"
            rx="1.5"
            stroke="#D4855A"
            strokeWidth="1.3"
            fill="none"
          />
          <rect
            x="11"
            y="8"
            width="7"
            height="10"
            rx="1.5"
            stroke="#D4855A"
            strokeWidth="1.3"
            fill="none"
          />
          <rect
            x="2"
            y="12"
            width="7"
            height="6"
            rx="1.5"
            stroke="#D4855A"
            strokeWidth="1.3"
            fill="none"
          />
          <path
            d="M4 6h3M4 15h3M13 10h3M13 12h2"
            stroke="#D4855A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      ),
    },
    {
      title: "Tri-Force Architecture",
      path: "/tri-force",
      desc: "A decentralized tripartite model for uncompromised security: Guardian, Planner, and Executor operate in perfect isolation.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2L2 16h16L10 2z"
            stroke="#D4855A"
            strokeWidth="1.5"
            fill="none"
            strokeLinejoin="round"
          />
          <path
            d="M10 8l-3.5 6h7L10 8z"
            stroke="#D4855A"
            strokeWidth="1.2"
            fill="none"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: "SkillForge/OmniSkills",
      path: "/ai-automation",
      desc: "Forge, install, and govern expert-level OmniSkills for any task or business use case, giving users task-ready agents with reusable skill memory and auditable execution paths.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <circle
            cx="10"
            cy="5"
            r="2.5"
            stroke="#D4855A"
            strokeWidth="1.4"
            fill="none"
          />
          <circle
            cx="4"
            cy="15"
            r="2.5"
            stroke="#D4855A"
            strokeWidth="1.4"
            fill="none"
          />
          <circle
            cx="16"
            cy="15"
            r="2.5"
            stroke="#D4855A"
            strokeWidth="1.4"
            fill="none"
          />
          <line
            x1="8.3"
            y1="6.8"
            x2="5.7"
            y2="12.8"
            stroke="#D4855A"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <line
            x1="11.7"
            y1="6.8"
            x2="14.3"
            y2="12.8"
            stroke="#D4855A"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <line
            x1="6.5"
            y1="15"
            x2="13.5"
            y2="15"
            stroke="#D4855A"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: "Real-Time Telemetry",
      path: "/advanced-analytics",
      desc: "Live operational intelligence across all agents and workflows. See what is running, what failed, and where attention is needed.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="M2 14L5 8l3 4 3-6 3 3 3-5"
            stroke="#D4855A"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="5" r="1.5" fill="#D4855A" />
        </svg>
      ),
    },
    {
      title: "Policy Enforcement Engine",
      path: "/fortress",
      desc: "Governance rules apply before any action executes. No agent bypasses policy, no exceptions.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2L16 5.5v9L10 18 4 14.5v-9L10 2Z"
            stroke="#D4855A"
            strokeWidth="1.4"
            fill="none"
          />
          <path
            d="M10 8v3"
            stroke="#D4855A"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="10" cy="14" r=".8" fill="#D4855A" />
        </svg>
      ),
    },
    {
      title: "PhysiOmni",
      path: "/physiomni",
      desc: "The physical AI operations layer. Deploy, govern, and orchestrate embodied AI systems and robotics through the same governed command surface as your digital agents.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <rect
            x="7"
            y="2"
            width="6"
            height="5"
            rx="1.5"
            stroke="#D4855A"
            strokeWidth="1.3"
            fill="none"
          />
          <circle cx="10" cy="4.5" r="1" fill="#D4855A" opacity="0.7" />
          <rect
            x="5"
            y="8"
            width="10"
            height="7"
            rx="1.5"
            stroke="#D4855A"
            strokeWidth="1.3"
            fill="none"
          />
          <path
            d="M7 11h2M11 11h2M8 13.5h4"
            stroke="#D4855A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.75"
          />
          <path
            d="M3 10v4M17 10v4"
            stroke="#D4855A"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M5 16l-1 2M15 16l1 2"
            stroke="#D4855A"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M10 7v1"
            stroke="#D4855A"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: "{rules[3]?.name ?? rules[3]?.title ?? 'MAN Mode'}",
      path: "/man-mode",
      desc: "Manual Approval Node. High-risk actions pause at an approval checkpoint while authorized operators approve, reject, or escalate with full traceability.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="M10 3v4M10 13v4M3 10h4M13 10h4"
            stroke="#D4855A"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle
            cx="10"
            cy="10"
            r="3"
            stroke="#D4855A"
            strokeWidth="1.4"
            fill="none"
          />
          <circle cx="10" cy="10" r=".8" fill="#D4855A" />
        </svg>
      ),
    },
    {
      title: "Connect AI / BYOM",
      path: "/byom",
      desc: "Bring your own model to the table. You can plug any LLM into your governed workflows and switch providers without rebuilding your system. Enjoy total freedom with zero vendor lock-in.",
      icon: (
        <svg viewBox="0 0 20 20" fill="none">
          <circle
            cx="10"
            cy="10"
            r="3.5"
            stroke="#D4855A"
            strokeWidth="1.4"
            fill="none"
          />
          <circle
            cx="3"
            cy="5"
            r="1.8"
            stroke="#D4855A"
            strokeWidth="1.2"
            fill="none"
          />
          <circle
            cx="17"
            cy="5"
            r="1.8"
            stroke="#D4855A"
            strokeWidth="1.2"
            fill="none"
          />
          <circle
            cx="3"
            cy="15"
            r="1.8"
            stroke="#D4855A"
            strokeWidth="1.2"
            fill="none"
          />
          <circle
            cx="17"
            cy="15"
            r="1.8"
            stroke="#D4855A"
            strokeWidth="1.2"
            fill="none"
          />
          <path
            d="M4.6 6.3L7.2 8M12.8 8l2.6-1.7M4.6 13.7L7.2 12M12.8 12l2.6 1.7"
            stroke="#D4855A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.75"
          />
          <circle cx="10" cy="10" r="1.2" fill="#D4855A" opacity="0.8" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section" id="features">
        <div className="sec-in">
          <div className="rv">
            <div className="tag">{tx("capabilities.label")}</div>
            <h2 className="h2">
              {tx("capabilities.headline.line1")}
              <br />
              {tx("capabilities.headline.line2")}
            </h2>
            <p className="sub">{tx("capabilities.description")}</p>
          </div>
          <div className="cap-grid">
            {capabilities.map((cap, idx) => {
              const translated = translatedCapabilities[idx];
              const title = translated?.title ?? cap.title;
              const desc = translated?.desc ?? cap.desc;
              return (
                <a
                  href={cap.path}
                  key={cap.title}
                  className={`cap-card rv d${idx % 4}`}
                  style={{ textDecoration: "none" }}
                >
                  <div className="cap-ico">{cap.icon}</div>
                  <div className="cap-ttl">
                    {title}{" "}
                    <span className="cap-arrow" style={{ opacity: 0.5 }}>
                      →
                    </span>
                  </div>
                  <div className="cap-dsc">{desc}</div>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

function MaestroSection() {
  const { tx } = useAppTranslation();
  const rows = [
    {
      l: "M",
      word: "Multi-Agent",
      desc: "coordination at enterprise scale, all synchronized",
    },
    {
      l: "A",
      word: "Authorized",
      desc: "execution, each action gated by policy",
    },
    {
      l: "E",
      word: "Explainable",
      desc: "decisions in plain operational language, always",
    },
    {
      l: "S",
      word: "Synchronized",
      desc: "state across all connected systems, in real time",
    },
    {
      l: "T",
      word: "Traceable",
      desc: "outcomes with cryptographic immutable audit chains",
    },
    {
      l: "R",
      word: "Reversible",
      desc: "by design, rollback is a first-class platform primitive",
    },
    {
      l: "O",
      word: "Operational authority",
      desc: "returned entirely to your organization",
    },
  ];

  return (
    <div className="maestro-wrap hov-section" id="maestro">
      <div className="maestro-in">
        <div className="rv">
          <div className="tag">{tx("maestro.label")}</div>
          <h2 className="h2">
            {tx("maestro.headline.line1")}
            <br />
            {tx("maestro.headline.line2")}
          </h2>
          <p className="sub" style={{ marginBottom: "20px" }}>
            {tx("maestro.description1")}
          </p>
          <p
            style={{
              fontSize: "13.5px",
              color: "var(--t2)",
              lineHeight: "1.72",
              letterSpacing: "-.1px",
              textAlign: "justify",
              textIndent: "2em",
              marginBottom: "32px",
            }}
          >
            {tx("maestro.description2")}
          </p>
          <a
            href="/maestro"
            className="btn btn--primary"
            style={{ display: "inline-block" }}
          >
            {tx("maestro.link")}
          </a>
        </div>
        <div className="maestro-rows rv d2">
          {rows.map((row) => (
            <div key={row.l} className="m-row">
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
  const { tx, t } = useAppTranslation();
  const translatedCardsValue = t("enterprise.cards", { returnObjects: true });
  const translatedCards = isTranslatedCardArray(translatedCardsValue)
    ? translatedCardsValue
    : [];
  const cards = [
    {
      n: "Security Controls Roadmap",
      d: "Security and availability controls mapped for external assessment",
    },
    {
      n: "Human oversight controls",
      d: "Manual Approval Node governance requirements for high-risk AI systems",
    },
    {
      n: "Records of Processing Activities",
      d: "Complete records of processing activities, always exportable",
    },
    {
      n: "ISMS-ready controls",
      d: "Information security management system compatible architecture",
    },
    {
      n: "Healthcare Architecture Ready",
      d: "Healthcare data handling architecture, BAA-compatible design",
    },
    {
      n: "Zero Trust Model",
      d: "No implicit trust. Each agent and action verified.",
    },
    {
      n: "RBAC + ABAC",
      d: "Granular role and attribute-based access control across all surfaces",
    },
    {
      n: "E2E Encryption",
      d: "All data in transit and at rest encrypted with AES-256",
    },
  ];

  return (
    <>
      <hr className="divider" />
      <section className="sec hov-section" id="enterprise">
        <div className="sec-in">
          <div className="rv">
            <div className="tag">{tx("enterprise.label")}</div>
            <h2 className="h2">
              {tx("enterprise.headline.line1")}
              <br />
              {tx("enterprise.headline.line2")}
            </h2>
            <p className="sub">{tx("enterprise.description")}</p>
          </div>
          <div className="comp-grid">
            {cards.map((card, idx) => {
              const translated = translatedCards[idx];
              const name = translated?.name ?? translated?.title ?? card.n;
              const desc = translated?.desc ?? card.d;
              return (
                <div key={card.n} className={`comp-card rv d${idx % 4}`}>
                  <div className="comp-chk">&#10003;</div>
                  <div className="comp-n">{name}</div>
                  <div className="comp-d">{desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

function CTASection({ onOpenModal }: Readonly<{ onOpenModal: () => void }>) {
  const { tx } = useAppTranslation();
  return (
    <section className="cta-sec hov-section" id="cta">
      <div className="cta-bg"></div>
      <div className="cta-grid"></div>
      <div className="cta-in">
        <div className="tag rv" style={{ justifyContent: "center" }}>
          {tx("cta.label")}
        </div>
        <h2 className="cta-h2 rv">
          {tx("cta.headline.line1")}
          <br />
          {tx("cta.headline.line2")}
        </h2>
        <p className="cta-sub rv d1">{tx("cta.description")}</p>
        <div className="cta-btns rv d2">
          <button type="button" className="pill pill-lg" onClick={onOpenModal}>
            {tx("cta.buttons.primary")}
          </button>
          <a href="/demo.html" className="pill pill-lg pill-ghost">
            {tx("cta.buttons.secondary")}
          </a>
        </div>
        <p className="cta-note rv d3">{tx("cta.tagline")}</p>
      </div>
    </section>
  );
}

function RequestAccessModal({
  isOpen,
  onClose,
  formStatus,
  formError,
  onSubmit,
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  formStatus: "idle" | "success";
  formError: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}>) {
  const { tx } = useAppTranslation();
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClick = (e: MouseEvent) => {
      if (e.target === dialog) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === dialog && (e.key === "Enter" || e.key === " "))
        onClose();
    };
    dialog.addEventListener("click", handleClick);
    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog.removeEventListener("click", handleClick);
      dialog.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      id="ra-modal"
      className={`modal-overlay ${isOpen ? "open" : ""}`}
      aria-hidden={!isOpen}
      aria-modal="true"
      aria-labelledby="modal-title"
      open={isOpen}
    >
      <div className="modal-card">
        <button
          className="modal-close"
          id="modal-close"
          aria-label={tx("modal.close")}
          onClick={onClose}
        >
          &times;
        </button>
        <div
          className={`modal-form-body ${
            formStatus === "success" ? "hidden" : ""
          }`}
          id="modal-form-body"
        >
          <div className="modal-title" id="modal-title">
            {tx("modal.title")}
          </div>
          <div className="modal-sub">{tx("modal.description")}</div>
          <div
            className={`modal-gen-error ${formError ? "show" : ""}`}
            id="gen-error"
          >
            {formError}
          </div>
          <form id="ra-form" noValidate onSubmit={onSubmit}>
            <input
              type="text"
              name="website"
              className="form-honey"
              tabIndex={-1}
              autoComplete="off"
            />
            <div className="form-group">
              <label className="form-label" htmlFor="ra_name">
                {tx("modal.fields.name")}
              </label>
              <input
                className="form-input"
                type="text"
                id="ra_name"
                name="ra_name"
                required
                maxLength={100}
                autoComplete="name"
                placeholder={tx("modal.placeholders.name")}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ra_email">
                {tx("modal.fields.email")}
              </label>
              <input
                className="form-input"
                type="email"
                id="ra_email"
                name="ra_email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder={tx("modal.placeholders.email")}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ra_company">
                {tx("modal.fields.company")}
              </label>
              <input
                className="form-input"
                type="text"
                id="ra_company"
                name="ra_company"
                maxLength={100}
                autoComplete="organization"
                placeholder={tx("modal.placeholders.company")}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ra_usecase">
                {tx("modal.fields.useCase")}
              </label>
              <textarea
                className="form-input"
                id="ra_usecase"
                name="ra_usecase"
                maxLength={500}
                rows={3}
                placeholder={tx("modal.placeholders.useCase")}
              ></textarea>
            </div>
            <button
              type="submit"
              className="pill"
              id="form-submit"
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: "8px",
              }}
            >
              <span className="btn-text">{tx("modal.submit")}</span>
              <span className="spinner"></span>
            </button>
          </form>
        </div>
        <div
          className={`modal-success ${formStatus === "success" ? "show" : ""}`}
          id="modal-success"
        >
          <div className="modal-success-ico">&#10003;</div>
          <div className="modal-success-ttl">{tx("modal.success.title")}</div>
          <div className="modal-success-txt">{tx("modal.success.message")}</div>
        </div>
      </div>
    </dialog>
  );
}

export function HomePage() {
  const { tx } = useAppTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<"idle" | "success">("idle");
  const [formError, setFormError] = useState("");
  const formStartRef = useRef(0);
  const lastSubmitRef = useRef(0);

  const openModal = () => {
    setIsModalOpen(true);
    document.body.style.overflow = "hidden";
    formStartRef.current = Date.now();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = "";
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    const form = e.currentTarget;
    const formData = new FormData(form);

    const honeypot = formData.get("website");
    if (honeypot) return;

    if (Date.now() - formStartRef.current < 2000) {
      setFormError(tx("modal.errors.tooFast"));
      return;
    }

    if (lastSubmitRef.current && Date.now() - lastSubmitRef.current < 300000) {
      setFormError(tx("modal.errors.rateLimit"));
      return;
    }

    const name = ((formData.get("ra_name") as string) || "")
      .trim()
      .slice(0, 200);
    if (!name || name.length < 2) {
      setFormError(tx("modal.errors.name"));
      return;
    }

    const emailEl = form.elements.namedItem("ra_email") as HTMLInputElement;
    if (!emailEl.validity.valid || !emailEl.value) {
      setFormError(tx("modal.errors.email"));
      return;
    }

    lastSubmitRef.current = Date.now();
    setFormStatus("success");
  };

  useEffect(() => {
    if (!rootRef.current) return;
    const root = rootRef.current;

    // Scroll reveal
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        }),
      { threshold: 0.07, rootMargin: "0px 0px -40px 0px" }
    );
    root.querySelectorAll(".rv").forEach((el) => obs.observe(el));

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) closeModal();
    };
    document.addEventListener("keydown", escHandler);

    return () => {
      obs.disconnect();
      document.removeEventListener("keydown", escHandler);
      document.body.style.overflow = "";
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
        <OmniHubPlatformMap ctaHref="/request-access" demoHref="/demo" />
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
