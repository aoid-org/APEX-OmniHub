export function MarketingOrbVisual() {
  return (
    <div className="refresh-orb" aria-hidden="true">
      <svg className="refresh-orb__svg" viewBox="0 0 520 540" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="sphere" cx="42%" cy="38%" r="58%">
            <stop offset="0%" stopColor="#F5C06A" />
            <stop offset="28%" stopColor="#E8A247" />
            <stop offset="58%" stopColor="#C4511A" />
            <stop offset="82%" stopColor="#8B2E0A" />
            <stop offset="100%" stopColor="#3A1005" />
          </radialGradient>
          <radialGradient id="core" cx="50%" cy="48%" r="58%">
            <stop offset="0%" stopColor="#ECFBFF" stopOpacity="0.95" />
            <stop offset="28%" stopColor="#B9EEFF" stopOpacity="0.72" />
            <stop offset="58%" stopColor="#5EC8FF" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#5EC8FF" stopOpacity="0" />
          </radialGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="8" /></filter>
          <filter id="big"><feGaussianBlur stdDeviation="18" /></filter>
          <filter id="badge" x="-140%" y="-140%" width="380%" height="380%">
            <feDropShadow dx="0" dy="0" stdDeviation="5.5" floodColor="#92E2FF" floodOpacity="0.9" />
            <feDropShadow dx="0" dy="0" stdDeviation="14" floodColor="#49B7FF" floodOpacity="0.34" />
          </filter>
          <clipPath id="clip"><circle cx="260" cy="265" r="152" /></clipPath>
        </defs>
        <circle cx="260" cy="265" r="240" fill="rgba(196,81,26,.03)" />
        <circle cx="260" cy="265" r="192" fill="rgba(232,162,71,.038)" />
        <circle cx="260" cy="265" r="178" fill="rgba(232,162,71,.12)" filter="url(#big)" />
        <ellipse cx="260" cy="265" rx="212" ry="52" fill="none" stroke="rgba(232,162,71,.10)" strokeWidth="1.5" transform="rotate(-18 260 265)" />
        <ellipse cx="260" cy="265" rx="183" ry="43" fill="none" stroke="rgba(196,81,26,.08)" strokeWidth="1" transform="rotate(28 260 265)" />
        <path d="M30 54C84 104 140 149 168 183C192 214 215 240 235 254" fill="none" stroke="rgba(96,165,250,.8)" strokeWidth="1.8" strokeLinecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="2.8s" repeatCount="indefinite" /></path>
        <path d="M490 42C442 94 392 148 350 190C322 216 300 240 286 254" fill="none" stroke="rgba(192,132,252,.7)" strokeWidth="1.8" strokeLinecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="3.4s" repeatCount="indefinite" begin=".6s" /></path>
        <path d="M18 492C68 442 122 396 170 356C202 326 228 304 246 285" fill="none" stroke="rgba(74,222,128,.72)" strokeWidth="1.8" strokeLinecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="3.1s" repeatCount="indefinite" begin="1.2s" /></path>
        <path d="M260 12 260 215" fill="none" stroke="rgba(251,191,36,.78)" strokeWidth="1.8" strokeLinecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="2.2s" repeatCount="indefinite" begin=".3s" /></path>
        <path d="M508 300C462 288 416 280 380 276C350 272 320 268 292 267" fill="none" stroke="rgba(232,162,71,.58)" strokeWidth="1.5" strokeLinecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="3.8s" repeatCount="indefinite" begin=".9s" /></path>
        <path d="M18 322C72 314 122 302 168 289C202 280 225 275 238 271" fill="none" stroke="rgba(59,130,246,.72)" strokeWidth="2" strokeLinecap="round"><animate attributeName="stroke-dasharray" from="0,480" to="480,0" dur="3.2s" repeatCount="indefinite" begin="1.1s" /></path>
        <g transform="translate(26 50)"><circle r="7" fill="rgba(96,165,250,.1)" stroke="rgba(96,165,250,.52)" /><circle r="3" fill="#60a5fa" filter="url(#soft)" /><text x="12" y="4" fill="rgba(96,165,250,.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk, sans-serif" letterSpacing="1">WEB3</text></g>
        <g transform="translate(490 40)"><circle r="7" fill="rgba(192,132,252,.1)" stroke="rgba(192,132,252,.52)" /><circle r="3" fill="#c084fc" filter="url(#soft)" /><text x="-52" y="4" fill="rgba(192,132,252,.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk, sans-serif" letterSpacing="1">AI CLOUD</text></g>
        <g transform="translate(12 494)"><circle r="7" fill="rgba(74,222,128,.1)" stroke="rgba(74,222,128,.52)" /><circle r="3" fill="#4ade80" filter="url(#soft)" /><text x="12" y="4" fill="rgba(74,222,128,.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk, sans-serif" letterSpacing="1">LEGACY</text></g>
        <g transform="translate(260 8)"><circle r="7" fill="rgba(251,191,36,.1)" stroke="rgba(251,191,36,.52)" /><circle r="3" fill="#fbbf24" filter="url(#soft)" /><text x="-22" y="-11" fill="rgba(251,191,36,.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk, sans-serif" letterSpacing="1">AI AGENTS</text></g>
        <g transform="translate(510 300)"><circle r="7" fill="rgba(232,162,71,.1)" stroke="rgba(232,162,71,.52)" /><circle r="3" fill="#E8A247" filter="url(#soft)" /><text x="-72" y="-11" fill="rgba(232,162,71,.72)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk, sans-serif" letterSpacing="1">ENTERPRISE</text></g>
        <g transform="translate(10 322)"><circle r="7" fill="rgba(59,130,246,.1)" stroke="rgba(59,130,246,.52)" /><circle r="3" fill="#3b82f6" filter="url(#soft)" /><text x="12" y="-10" fill="rgba(96,165,250,.84)" fontSize="7.5" fontWeight="700" fontFamily="Space Grotesk, sans-serif" letterSpacing="1">PHYSICAL AI</text></g>
        <circle cx="268" cy="272" r="152" fill="rgba(0,0,0,.42)" />
        <circle cx="260" cy="265" r="152" fill="url(#sphere)" />
        <ellipse cx="214" cy="208" rx="55" ry="38" fill="rgba(255,255,255,.15)" filter="url(#soft)" />
        <ellipse cx="206" cy="200" rx="28" ry="19" fill="rgba(255,255,255,.26)" />
        <ellipse cx="260" cy="265" rx="152" ry="30" fill="none" stroke="rgba(245,192,106,.27)" strokeWidth="3" filter="url(#soft)" />
        <g clipPath="url(#clip)">
          <circle cx="260" cy="266" r="72" fill="rgba(118,222,255,.08)" filter="url(#big)" />
          <circle cx="260" cy="266" r="54" fill="url(#core)" opacity=".9"><animate attributeName="opacity" values=".74;.98;.76" dur="2.8s" repeatCount="indefinite" /></circle>
          <ellipse cx="260" cy="289" rx="42" ry="14" fill="rgba(7,14,28,.34)" filter="url(#soft)" />
          <g opacity=".95">
            <circle cx="260" cy="266" r="42" fill="none" stroke="rgba(120,219,255,.28)" strokeWidth="1.1"><animate attributeName="r" values="36;44;37" dur="2.8s" repeatCount="indefinite" /><animate attributeName="opacity" values=".22;.4;.2" dur="2.8s" repeatCount="indefinite" /></circle>
            <circle cx="260" cy="266" r="30" fill="none" stroke="rgba(170,235,255,.34)" strokeWidth="1"><animate attributeName="r" values="26;32;27" dur="2.8s" repeatCount="indefinite" begin=".2s" /><animate attributeName="opacity" values=".2;.38;.16" dur="2.8s" repeatCount="indefinite" begin=".2s" /></circle>
          </g>
          <g>
            <animateTransform attributeName="transform" type="translate" values="0 0;0 3;0 0" dur="4.6s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" additive="sum" type="scale" values="1;1.03;.99;1" dur="2.8s" repeatCount="indefinite" />
            <circle cx="260" cy="266" r="45" fill="rgba(103,214,255,.08)" filter="url(#soft)" />
            <image href="/apex-badge.png" x="228" y="234" width="64" height="64" preserveAspectRatio="xMidYMid meet" filter="url(#badge)" />
          </g>
          <ellipse cx="260" cy="254" rx="52" ry="34" fill="rgba(255,255,255,.08)" />
          <ellipse cx="246" cy="248" rx="26" ry="12" fill="rgba(255,255,255,.12)" filter="url(#soft)" />
        </g>
        <circle cx="260" cy="265" r="90" fill="none" stroke="rgba(232,162,71,.18)" strokeWidth="1.5"><animate attributeName="r" from="90" to="155" dur="3s" repeatCount="indefinite" /><animate attributeName="opacity" from=".28" to="0" dur="3s" repeatCount="indefinite" /></circle>
        <circle cx="260" cy="265" r="90" fill="none" stroke="rgba(232,162,71,.12)" strokeWidth="1"><animate attributeName="r" from="90" to="155" dur="3s" repeatCount="indefinite" begin="1.5s" /><animate attributeName="opacity" from=".18" to="0" dur="3s" repeatCount="indefinite" begin="1.5s" /></circle>
      </svg>
    </div>
  );
}
