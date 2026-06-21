/*!
 * OmniHub Platform Map — embeddable feature section
 * v1.0.0 · APEX Business Systems Ltd.
 *
 * Self-contained: injects styles, renders a landing-page SECTION (entry point),
 * and launches a fullscreen interactive 3D capability map on demand.
 * Colors, fonts, capability names, descriptions, and chips are verified
 * against the production site apexomnihub.icu (June 2026).
 *
 * Usage:
 *   <section id="platform-map" data-omnihub-starmap></section>
 *   <script defer src="/starmap/omnihub-starmap.js"></script>
 * or:
 *   window.OmniHubStarmap.mount('#platform-map', { threeSrc: '/vendor/three.min.js' })
 */
(function () {
  'use strict';
  if (window.OmniHubStarmap) return; // idempotent

  /* ============================================================
   * 1. CONFIG — brand tokens verified from production CSS
   * ============================================================ */
  var TOKENS = {
    bg: '#060a13',            // --bg-primary
    surface: '#0f1729',       // --color-surface (navy)
    elevated: '#1e293b',      // --color-surface-elevated
    border: '#334155',        // --color-border
    borderSubtle: '#1e293b',  // --color-border-subtle
    orange: '#c4571c',        // --color-orange (primary accent)
    orangeLight: '#ea7c44',   // --color-orange-light (hover)
    text: '#f8fafc',          // --color-text-primary
    textSecondary: '#cbd5e1', // --color-text-secondary
    textMuted: '#94a3b8',     // --color-text-muted
    success: '#16a34a',       // --color-success
    error: '#dc2626',         // --color-error
    focusRing: 'rgba(196,87,28,.4)'
  };

  var DEFAULTS = {
    threeSrc: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    ctaHref: 'https://apexomnihub.icu',          // adjust to '#early-access' anchor when wired in-site
    demoHref: 'https://apexomnihub.icu/demo',    // verified route
    loadFonts: true
  };

  /* ============================================================
   * 2. CAPABILITY DATA — names/descriptions/chips verified
   *    verbatim from apexomnihub.icu (Platform Capabilities)
   * ============================================================ */
  var CAPS = [
    {
      name: 'OmniPort', tag: 'UNIVERSAL CONNECTOR NETWORK',
      lead: 'Connect your legacy, Web2, Web3, AI, and blockchain applications with total ease. A single secure doorway links OmniHub to the tools you already rely on. We don\'t replace your systems; we unify them without leaving anything behind.',
      chips: ['Universal Connector Network', 'Single controlled port', 'Legacy \u00b7 Web2 \u00b7 Web3', 'AI \u00b7 NFT \u00b7 Blockchain'],
      demo: 'omniport', pos: [0, 2, 0], size: 1.15
    },
    {
      name: 'Tri-Force Architecture', tag: 'GUARDIAN \u2192 PLANNER \u2192 EXECUTOR',
      lead: 'A decentralized, three-part model designed for uncompromised security: Guardian, Planner, and Executor. These three specialists independently verify each other\'s work to ensure that your intent always respects your policies, even at high speeds.',
      chips: ['Guardian', 'Planner', 'Executor', 'Intent never bypasses policy'],
      demo: 'triforce', pos: [-46, 8, -52], size: 1.35
    },
    {
      name: 'OmniDash', tag: 'YOUR COMMAND CENTER',
      lead: 'Your central hub for governed intelligence. Monitor every agent, workflow, integration, and event in real time from one unified dashboard, and easily issue commands using everyday language.',
      chips: ['Natural language directives', 'Capability-matched routing', 'Override any agent, instantly', 'Live Audit Trail'],
      demo: 'omnidash', pos: [50, -6, -104], size: 1.25
    },
    {
      name: 'Policy Enforcement Engine', tag: 'RULES BEFORE ACTIONS',
      lead: 'We apply your governance rules before any action is taken, preventing issues before they occur. Agents never access unauthorized data, and every single write is securely and immutably logged.',
      chips: ['Scope Restriction', 'Audit on Write', 'Rollback Window', 'Cross-Border Block'],
      demo: 'policy', pos: [-56, -14, -158], size: 1.15
    },
    {
      name: 'One-Click Rollback', tag: 'AN ARCHITECTURAL PRIMITIVE',
      lead: 'Reverse any agent action or workflow state with just one command without needing manual cleanup. A single bad decision will not cause a ripple effect. You can simply undo it completely.',
      chips: ['One-click rollback', 'Blast radius containment', 'Compensating transactions'],
      demo: 'rollback', pos: [44, 16, -212], size: 1.3
    },
    {
      name: 'OmniTrace', tag: 'IMMUTABLE AUDIT \u00b7 FORENSIC REPLAY',
      lead: 'Access forensic replay and immutable audit trails to easily meet regulatory compliance. You can fully reconstruct any agent chain and prove every decision your AI has ever made on demand.',
      chips: ['Immutable Audit Log', 'Forensic decision replay', 'Full Audit Trail', 'Full chain reconstruction'],
      demo: 'omnitrace', pos: [-40, 22, -266], size: 1.2
    },
    {
      name: 'MAN Mode', tag: 'MANUAL APPROVAL NODE',
      lead: 'High-risk actions automatically pause at an approval checkpoint. Authorized operators can then approve, reject, or escalate the request with full traceability. Your AI works quickly while keeping the biggest decisions in human hands.',
      chips: ['Approval checkpoint', 'Approve \u00b7 Reject \u00b7 Escalate', 'Full traceability', 'Human Oversight'],
      demo: 'manmode', pos: [38, -20, -318], size: 1.2
    },
    {
      name: 'Connect AI / BYOM', tag: 'YOUR MODELS, YOUR RULES',
      lead: 'Bring your own model to the table. You can plug any LLM into your governed workflows and switch providers without rebuilding your system. Enjoy total freedom with zero vendor lock-in.',
      chips: ['Bring Your Own Model', 'Any LLM', 'Zero Vendor Lock-In'],
      demo: 'byom', pos: [-48, -8, -370], size: 1.15
    },
    {
      name: 'SkillForge / OmniSkills', tag: 'EXPERT SKILLS, GOVERNED',
      lead: 'Create, install, and manage expert-level OmniSkills. These are packaged sets of expertise that your agents can easily learn and apply, all while following the same consistent rules across the platform.',
      chips: ['Forge', 'Install', 'Govern', 'OmniSkills'],
      demo: 'skillforge', pos: [46, 18, -422], size: 1.1
    },
    {
      name: 'Real-Time Telemetry', tag: 'LIVE OPERATIONAL INTELLIGENCE',
      lead: 'Access live operational intelligence across all your agents and workflows. You will always know exactly what is running, where it is running, and how well it is performing in real time.',
      chips: ['All agents', 'All workflows', 'Real-time visibility'],
      demo: 'telemetry', pos: [-36, -18, -472], size: 1.1
    },
    {
      name: 'PhysiOmni', tag: 'AI BEYOND THE SCREEN',
      lead: 'Meet the physical AI operations layer. You can deploy, govern, and orchestrate embodied AI systems and robotics using the exact same secure command surface that manages your digital agents.',
      chips: ['Embodied AI', 'Robotics', 'Same governed surface'],
      demo: 'physiomni', pos: [40, 24, -526], size: 1.25
    },
    {
      name: 'Early Access', tag: 'PUT IT TO WORK',
      lead: 'Explore the full platform. You get eleven powerful capabilities in one governed layer where every action is authorized, logged, and completely reversible. Join the leading enterprises that have finally moved beyond black-box AI.',
      chips: [],
      demo: null, pos: [0, 4, -590], size: 1.5
    }
  ];

  /* ============================================================
   * 3. STYLES — scoped under .ohsm- prefix, brand tokens only
   * ============================================================ */
  var CSS = '' +
  ':root{--ohsm-bg:' + TOKENS.bg + ';--ohsm-surface:' + TOKENS.surface + ';--ohsm-elev:' + TOKENS.elevated + ';' +
  '--ohsm-border:' + TOKENS.border + ';--ohsm-accent:' + TOKENS.orange + ';--ohsm-accent-hi:' + TOKENS.orangeLight + ';' +
  '--ohsm-text:' + TOKENS.text + ';--ohsm-text-2:' + TOKENS.textSecondary + ';--ohsm-muted:' + TOKENS.textMuted + ';' +
  '--ohsm-ok:' + TOKENS.success + ';--ohsm-err:' + TOKENS.error + ';--ohsm-ring:' + TOKENS.focusRing + '}' +

  /* ---- landing-page section (entry point) ---- */
  '.ohsm-section{position:relative;background:var(--ohsm-bg);color:var(--ohsm-text);overflow:hidden;' +
    'min-height:clamp(520px,72vh,820px);contain:layout paint;' +
    'font-family:"Space Grotesk",system-ui,sans-serif;padding:clamp(64px,9vw,120px) clamp(20px,6vw,80px);' +
    'border-top:1px solid ' + TOKENS.borderSubtle + ';border-bottom:1px solid ' + TOKENS.borderSubtle + '}' +
  '.ohsm-section canvas.ohsm-teaser-stars{position:absolute;inset:0;width:100%;height:100%;opacity:.8;pointer-events:none}' +
  '.ohsm-hero-3d{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity 1.4s ease}' +
  '.ohsm-hero-3d.ohsm-ready{opacity:1}' +
  '.ohsm-section .ohsm-inner{position:relative;z-index:1;max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(24px,4vw,56px);align-items:center}' +
  '.ohsm-copy{display:grid;gap:18px;min-width:0}' +
  '.ohsm-stage-3d{position:relative;min-height:clamp(320px,44vh,500px);width:100%}' +
  '.ohsm-eyebrow{font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.28em;color:var(--ohsm-accent-hi)}' +
  '.ohsm-section h2{font-weight:700;letter-spacing:-.02em;line-height:1.04;font-size:clamp(30px,4.4vw,52px);max-width:16ch}' +
  '.ohsm-section .ohsm-sub{color:var(--ohsm-text-2);font-size:clamp(15px,1.4vw,17px);line-height:1.65;max-width:54ch}' +
  '.ohsm-section .ohsm-row{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:8px}' +
  '.ohsm-meta{font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.16em;color:var(--ohsm-muted)}' +

  /* ---- buttons ---- */
  '.ohsm-btn{font-family:"Space Mono",monospace;font-size:11px;letter-spacing:.12em;text-decoration:none;' +
    'border-radius:10px;padding:13px 20px;cursor:pointer;border:1px solid transparent;display:inline-block;' +
    'transition:transform .25s ease,box-shadow .25s ease,background .25s ease,color .25s ease,border-color .25s ease}' +
  '.ohsm-btn:focus-visible{outline:3px solid var(--ohsm-ring);outline-offset:2px}' +
  '.ohsm-btn-primary{background:var(--ohsm-accent);color:#fff;font-weight:700;box-shadow:0 6px 24px rgba(196,87,28,.30)}' +
  '.ohsm-btn-primary:hover{background:var(--ohsm-accent-hi);transform:translateY(-2px);box-shadow:0 10px 32px rgba(196,87,28,.42)}' +
  '.ohsm-btn-primary:active{transform:translateY(0)}' +
  '.ohsm-btn-ghost{background:transparent;color:var(--ohsm-text-2);border-color:var(--ohsm-border)}' +
  '.ohsm-btn-ghost:hover{color:var(--ohsm-text);border-color:var(--ohsm-muted)}' +

  /* ---- fullscreen overlay ---- */
  '.ohsm-overlay{position:fixed;inset:0;z-index:9999;background:var(--ohsm-bg);color:var(--ohsm-text);' +
    'font-family:"Space Grotesk",system-ui,sans-serif;opacity:0;transition:opacity .5s ease}' +
  '.ohsm-overlay.ohsm-on{opacity:1}' +
  '.ohsm-overlay *{box-sizing:border-box}' +
  '.ohsm-stage{position:absolute;inset:0;display:block;cursor:grab}' +
  '.ohsm-stage.ohsm-drag{cursor:grabbing}' +
  '.ohsm-vig{position:absolute;inset:0;pointer-events:none;' +
    'background:radial-gradient(ellipse at center,transparent 52%,rgba(3,6,12,.6) 100%)}' +
  '.ohsm-flash{position:absolute;inset:0;pointer-events:none;opacity:0;' +
    'background:radial-gradient(ellipse at center,rgba(248,250,252,.14) 0%,rgba(196,87,28,.10) 30%,transparent 62%)}' +
  '.ohsm-streaks{position:absolute;inset:-12%;pointer-events:none;opacity:0;filter:blur(.6px);' +
    'background:repeating-conic-gradient(from 0deg at 50% 50%,transparent 0deg 5.4deg,rgba(234,124,68,.05) 5.4deg 5.7deg,transparent 5.7deg 6deg)}' +

  /* overlay chrome */
  '.ohsm-top{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:flex-start;' +
    'padding:clamp(14px,2.2vw,26px) clamp(16px,2.8vw,34px);z-index:6;pointer-events:none}' +
  '.ohsm-top img{height:clamp(20px,2.4vw,28px);display:block;filter:drop-shadow(0 2px 10px rgba(0,0,0,.6))}' +
  '.ohsm-top .ohsm-brandsub{margin-top:6px;font-family:"Space Mono",monospace;font-size:9.5px;letter-spacing:.22em;color:var(--ohsm-muted)}' +
  '.ohsm-exit{pointer-events:auto;font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.14em;' +
    'color:var(--ohsm-text-2);background:rgba(15,23,41,.6);border:1px solid var(--ohsm-border);border-radius:99px;' +
    'padding:9px 16px;cursor:pointer;backdrop-filter:blur(8px);transition:color .2s,border-color .2s}' +
  '.ohsm-exit:hover{color:var(--ohsm-text);border-color:var(--ohsm-muted)}' +
  '.ohsm-exit:focus-visible{outline:3px solid var(--ohsm-ring);outline-offset:2px}' +

  /* progress dock */
  '.ohsm-dock{position:absolute;left:50%;bottom:clamp(12px,2.4vh,24px);transform:translateX(-50%);z-index:6;' +
    'display:flex;align-items:center;gap:10px;padding:9px 13px;border:1px solid var(--ohsm-border);' +
    'border-radius:99px;background:rgba(6,10,19,.78);backdrop-filter:blur(14px);max-width:calc(100vw - 20px)}' +
  '.ohsm-dots{display:flex;gap:7px;align-items:center}' +
  '.ohsm-dot{width:8px;height:8px;border-radius:50%;border:1px solid rgba(234,124,68,.45);background:transparent;' +
    'cursor:pointer;padding:0;transition:all .3s ease;flex:0 0 auto}' +
  '.ohsm-dot:hover,.ohsm-dot:focus-visible{transform:scale(1.5);outline:none;border-color:var(--ohsm-accent-hi)}' +
  '.ohsm-dot.ohsm-seen{background:rgba(234,124,68,.5);border-color:transparent}' +
  '.ohsm-dot.ohsm-here{background:var(--ohsm-accent-hi);border-color:transparent;box-shadow:0 0 10px rgba(234,124,68,.8);transform:scale(1.4)}' +
  '.ohsm-step{font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.12em;color:var(--ohsm-text);' +
    'background:none;border:none;cursor:pointer;padding:5px 6px;white-space:nowrap;transition:color .2s}' +
  '.ohsm-step:hover,.ohsm-step:focus-visible{color:var(--ohsm-accent-hi);outline:none}' +
  '.ohsm-step[disabled]{opacity:.25;cursor:default}' +

  /* capability panel */
  '.ohsm-panel{position:absolute;z-index:5;right:clamp(14px,2.8vw,38px);top:50%;width:min(430px,calc(100vw - 28px));' +
    'transform:translateY(-50%) translateX(26px);opacity:0;pointer-events:none;' +
    'transition:transform .65s cubic-bezier(.16,1,.3,1),opacity .5s ease;' +
    'border:1px solid var(--ohsm-border);border-radius:16px;background:rgba(10,14,23,.86);' +
    'backdrop-filter:blur(18px);padding:clamp(18px,2.2vw,26px);box-shadow:0 30px 80px rgba(0,0,0,.55);' +
    'max-height:calc(100vh - 110px);overflow:auto}' +
  '.ohsm-panel.ohsm-show{transform:translateY(-50%) translateX(0);opacity:1;pointer-events:auto}' +
  '.ohsm-pe{font-family:"Space Mono",monospace;font-size:9.5px;letter-spacing:.2em;color:var(--ohsm-accent-hi);' +
    'display:flex;justify-content:space-between;gap:10px}' +
  '.ohsm-pe .ohsm-petag{color:var(--ohsm-muted);text-align:right}' +
  '.ohsm-panel h3{font-weight:700;font-size:clamp(23px,2.4vw,29px);line-height:1.06;letter-spacing:-.02em;margin:12px 0 9px}' +
  '.ohsm-lead{font-size:14px;line-height:1.65;color:var(--ohsm-text-2)}' +
  '.ohsm-chips{margin-top:14px;border-top:1px dashed rgba(51,65,85,.8);padding-top:12px}' +
  '.ohsm-chips .ohsm-cl{font-family:"Space Mono",monospace;font-size:9px;letter-spacing:.18em;color:var(--ohsm-accent-hi);' +
    'display:flex;align-items:center;gap:7px;margin-bottom:8px}' +
  '.ohsm-chips .ohsm-cl .ohsm-okdot{width:5px;height:5px;border-radius:50%;background:var(--ohsm-ok);box-shadow:0 0 6px var(--ohsm-ok)}' +
  '.ohsm-chips ul{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0}' +
  '.ohsm-chips li{font-family:"Space Mono",monospace;font-size:10px;color:var(--ohsm-text-2);' +
    'border:1px solid var(--ohsm-border);border-radius:6px;padding:4px 9px;background:rgba(248,250,252,.03)}' +
  '.ohsm-actions{margin-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}' +

  /* interactive demo area */
  '.ohsm-demo{margin-top:16px;display:none;border:1px solid var(--ohsm-border);border-radius:12px;' +
    'background:var(--ohsm-surface);padding:14px;overflow:hidden}' +
  '.ohsm-demo.ohsm-open{display:block;animation:ohsmIn .4s ease}' +
  '@keyframes ohsmIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +
  '.ohsm-demo .ohsm-dl{font-family:"Space Mono",monospace;font-size:9px;letter-spacing:.18em;color:var(--ohsm-muted);' +
    'display:flex;justify-content:space-between;margin-bottom:11px}' +
  '.ohsm-demo .ohsm-dl b{color:var(--ohsm-accent-hi);font-weight:400}' +
  '.ohsm-dgrid{display:flex;flex-wrap:wrap;gap:7px}' +
  '.ohsm-dbtn{font-family:"Space Mono",monospace;font-size:10px;color:var(--ohsm-text-2);background:var(--ohsm-elev);' +
    'border:1px solid var(--ohsm-border);border-radius:8px;padding:8px 11px;cursor:pointer;transition:all .2s}' +
  '.ohsm-dbtn:hover,.ohsm-dbtn:focus-visible{color:var(--ohsm-text);border-color:var(--ohsm-accent);outline:none}' +
  '.ohsm-dbtn.ohsm-sel{background:var(--ohsm-accent);border-color:var(--ohsm-accent);color:#fff}' +
  '.ohsm-dbtn[disabled]{opacity:.4;cursor:default}' +
  '.ohsm-pipe{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:12px 0}' +
  '.ohsm-node{font-family:"Space Mono",monospace;font-size:10px;border:1px solid var(--ohsm-border);' +
    'border-radius:8px;padding:7px 10px;color:var(--ohsm-muted);background:var(--ohsm-elev);transition:all .35s}' +
  '.ohsm-node.ohsm-go{color:#fff;background:var(--ohsm-accent);border-color:var(--ohsm-accent)}' +
  '.ohsm-node.ohsm-pass{color:var(--ohsm-ok);border-color:var(--ohsm-ok)}' +
  '.ohsm-node.ohsm-block{color:var(--ohsm-err);border-color:var(--ohsm-err)}' +
  '.ohsm-arrow{color:var(--ohsm-muted);font-size:11px}' +
  '.ohsm-log{font-family:"Space Mono",monospace;font-size:10px;line-height:1.8;color:var(--ohsm-text-2);' +
    'background:rgba(0,0,0,.28);border:1px solid var(--ohsm-borderSubtle, #1e293b);border-radius:8px;padding:9px 11px;' +
    'min-height:38px;max-height:120px;overflow:auto;margin-top:10px;white-space:pre-wrap}' +
  '.ohsm-log .ohsm-ok{color:var(--ohsm-ok)}.ohsm-log .ohsm-bad{color:var(--ohsm-err)}.ohsm-log .ohsm-hi{color:var(--ohsm-accent-hi)}' +
  '.ohsm-toggle{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;' +
    'border-bottom:1px solid rgba(51,65,85,.45);font-size:12.5px;color:var(--ohsm-text-2)}' +
  '.ohsm-toggle:last-of-type{border-bottom:none}' +
  '.ohsm-sw{position:relative;width:34px;height:19px;border-radius:99px;background:var(--ohsm-elev);' +
    'border:1px solid var(--ohsm-border);cursor:pointer;transition:background .25s;flex:0 0 auto;padding:0}' +
  '.ohsm-sw::after{content:"";position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;' +
    'background:var(--ohsm-muted);transition:all .25s}' +
  '.ohsm-sw.ohsm-onsw{background:var(--ohsm-accent)}' +
  '.ohsm-sw.ohsm-onsw::after{left:17px;background:#fff}' +
  '.ohsm-sw:focus-visible{outline:3px solid var(--ohsm-ring);outline-offset:2px}' +
  '.ohsm-range{width:100%;accent-color:' + TOKENS.orange + ';margin:10px 0 4px;cursor:pointer;touch-action:manipulation}' +
  '.ohsm-ctrl-row{display:flex;gap:6px;align-items:center;margin:4px 0 6px}' +
  '.ohsm-ctrl-btn{font-family:"Space Mono",monospace;font-size:12px;background:rgba(255,255,255,0.05);' +
    'border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:var(--ohsm-text-2);cursor:pointer;' +
    'min-width:32px;min-height:32px;padding:0 8px;display:flex;align-items:center;justify-content:center;' +
    'transition:background .15s,border-color .15s;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
  '.ohsm-ctrl-btn:disabled{opacity:.3;cursor:not-allowed}' +
  '.ohsm-ctrl-btn:not(:disabled):hover{background:rgba(196,87,28,.15);border-color:rgba(196,87,28,.4);color:var(--ohsm-accent-hi)}' +
  '.ohsm-ctrl-play{background:rgba(196,87,28,.1);border-color:rgba(196,87,28,.35);color:var(--ohsm-accent-hi);min-width:36px}' +
  '.ohsm-ctrl-play:not(:disabled):hover{background:rgba(196,87,28,.22)}' +
  '.ohsm-metric{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;' +
    'border-bottom:1px solid rgba(51,65,85,.45)}' +
  '.ohsm-metric:last-of-type{border-bottom:none}' +
  '.ohsm-metric .ohsm-mk{font-size:12px;color:var(--ohsm-muted)}' +
  '.ohsm-metric .ohsm-mv{font-family:"Space Mono",monospace;font-size:14px;color:var(--ohsm-text)}' +
  '.ohsm-spark{width:100%;height:36px;display:block;margin-top:8px}' +

  /* feature labels in 3D space */
  '.ohsm-label{position:absolute;z-index:4;transform:translate(-50%,-130%);pointer-events:none;' +
    'font-family:"Space Mono",monospace;font-size:10px;letter-spacing:.16em;color:var(--ohsm-text-2);' +
    'text-transform:uppercase;white-space:nowrap;opacity:0;transition:opacity .5s ease;text-shadow:0 2px 10px rgba(0,0,0,.9)}' +
  '.ohsm-label.ohsm-vis{opacity:.9}' +
  '.ohsm-label .ohsm-ln{color:var(--ohsm-accent-hi)}' +
  '.ohsm-hintline{position:absolute;left:clamp(14px,2.8vw,34px);bottom:clamp(12px,2.4vh,24px);z-index:4;' +
    'font-family:"Space Mono",monospace;font-size:9.5px;letter-spacing:.14em;color:var(--ohsm-muted);pointer-events:none}' +

  /* finale card */
  '.ohsm-finale{position:absolute;inset:0;z-index:7;display:grid;place-items:center;pointer-events:none;opacity:0;' +
    'transition:opacity .9s ease;background:radial-gradient(ellipse at center,rgba(6,10,19,.2),rgba(6,10,19,.8) 78%)}' +
  '.ohsm-finale.ohsm-show{opacity:1;pointer-events:auto}' +
  '.ohsm-fcard{text-align:center;max-width:760px;padding:24px}' +
  '.ohsm-fcard .ohsm-eyebrow{justify-content:center;display:flex}' +
  '.ohsm-fcard h3{font-weight:700;letter-spacing:-.025em;line-height:1.04;font-size:clamp(30px,5.2vw,58px);margin-top:14px}' +
  '.ohsm-fcard h3 em{font-style:normal;color:var(--ohsm-accent-hi)}' +
  '.ohsm-fcard p{margin:16px auto 0;max-width:540px;font-size:15px;line-height:1.7;color:var(--ohsm-text-2)}' +
  '.ohsm-fcard .ohsm-ctas{margin-top:26px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}' +
  '.ohsm-fcard .ohsm-proof{margin-top:20px;font-family:"Space Mono",monospace;font-size:9.5px;letter-spacing:.14em;' +
    'color:var(--ohsm-muted);line-height:2}' +

  /* no-WebGL fallback list */
  '.ohsm-fallback{position:absolute;inset:0;overflow:auto;padding:90px clamp(16px,4vw,48px) 60px;z-index:3}' +
  '.ohsm-fallback .ohsm-fwrap{max-width:760px;margin:0 auto;display:grid;gap:14px}' +

  '@media (max-width:899px){.ohsm-hero-3d.ohsm-ready{opacity:.85}.ohsm-section .ohsm-inner{grid-template-columns:1fr}.ohsm-stage-3d{min-height:clamp(280px,40vh,360px)}}' +
  '@media (max-width:599px){.ohsm-hero-3d.ohsm-ready{opacity:.38}.ohsm-section h2{text-shadow:0 2px 28px rgba(6,10,19,.95),0 0 56px rgba(6,10,19,.85)}.ohsm-section .ohsm-sub{text-shadow:0 1px 14px rgba(6,10,19,.92)}}' +
  '@media (max-width:760px){' +
    '.ohsm-panel{right:0;left:0;top:auto;bottom:0;width:100%;border-radius:16px 16px 0 0;' +
      'transform:translateY(24px);max-height:65vh;overflow-y:auto}' +
    '.ohsm-panel.ohsm-show{transform:translateY(0)}' +
    '.ohsm-dock{bottom:auto;top:clamp(58px,8.5vh,80px)}' +
    '.ohsm-hintline{display:none}' +
    '.ohsm-ctrl-btn{min-width:40px;min-height:40px;font-size:14px}' +
    '.ohsm-range{margin:12px 0 6px}' +
  '}' +
  '@media (min-width:761px) and (max-width:1024px){' +
    '.ohsm-panel{width:min(380px,calc(100vw - 20px));right:clamp(10px,1.8vw,18px);' +
      'max-height:calc(100vh - 90px)}' +
    '.ohsm-ctrl-btn{min-width:36px;min-height:36px}' +
  '}' +
  '@media (prefers-reduced-motion:reduce){' +
    '.ohsm-dot,.ohsm-btn,.ohsm-panel,.ohsm-node,.ohsm-ctrl-btn{transition-duration:.01ms !important}' +
  '}';

  /* ============================================================
   * 4. UTILITIES
   * ============================================================ */
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function pad(n) { return String(n).length < 2 ? '0' + n : String(n); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function safeHref(url) {
    if (typeof url !== 'string') return '#';
    var u = url.trim();
    return /^(https?:\/\/|\/|#)/.test(u) ? u : '#';
  }
  var threePromise = null;
  function loadThree(src) {
    if (window.THREE) return Promise.resolve(window.THREE);
    var safeSrc = (typeof src === 'string' && (/^https:\/\//.test(src) || /^\//.test(src))) ? src : '';
    if (!safeSrc) {
      return Promise.reject(new Error('three.js src must be an https:// or same-origin / URL'));
    }
    if (threePromise) return threePromise;
    threePromise = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = safeSrc; s.async = true;
      s.onload = function () { window.THREE ? res(window.THREE) : rej(new Error('THREE missing after load')); };
      s.onerror = function () { rej(new Error('Failed to load three.js')); };
      document.head.appendChild(s);
    });
    return threePromise;
  }
  function ensureFonts() {
    if (document.querySelector('link[href*="Space+Grotesk"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap';
    document.head.appendChild(l);
  }

  /* ============================================================
   * 5. INTERACTIVE DEMOS — one per capability, feature-relevant.
   *    Each returns a cleanup function. All clearly simulated.
   * ============================================================ */
  function logLine(log, html) {
    var d = el('div', '', html);
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }
  function pipeline(names) {
    var wrap = el('div', 'ohsm-pipe');
    var nodes = names.map(function (n, i) {
      var nd = el('span', 'ohsm-node', n);
      wrap.appendChild(nd);
      if (i < names.length - 1) wrap.appendChild(el('span', 'ohsm-arrow', '\u2192'));
      return nd;
    });
    return { wrap: wrap, nodes: nodes };
  }

  var DEMOS = {

    /* OmniPort — route any system through the single controlled port */
    omniport: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>TRY IT</b><span>SIMULATED PREVIEW</span>'));
      root.appendChild(el('div', '', '<div style="font-size:12.5px;color:' + TOKENS.textSecondary + ';margin-bottom:10px">Pick any system and watch it connect through a single controlled port. No custom integration is needed.</div>'));
      var grid = el('div', 'ohsm-dgrid');
      var p = pipeline(['SYSTEM', 'OMNIPORT', 'OMNIHUB']);
      var log = el('div', 'ohsm-log');
      ['Legacy ERP', 'CRM', 'Web3 Wallet', 'LLM API', 'NFT Registry'].forEach(function (name) {
        var b = el('button', 'ohsm-dbtn', name);
        b.addEventListener('click', function () {
          p.nodes[0].textContent = name.toUpperCase();
          p.nodes.forEach(function (n) { n.classList.remove('ohsm-go', 'ohsm-pass'); });
          var t1 = setTimeout(function () { p.nodes[0].classList.add('ohsm-go'); }, 60);
          var t2 = setTimeout(function () { p.nodes[1].classList.add('ohsm-go'); }, 420);
          var t3 = setTimeout(function () {
            p.nodes[2].classList.add('ohsm-pass');
            logLine(log, '<span class="ohsm-ok">\u2713</span> ' + esc(name) + ' \u2192 protocol translated \u2192 <span class="ohsm-hi">connected &amp; governed</span>');
          }, 800);
          timers.push(t1, t2, t3);
        });
        grid.appendChild(b);
      });
      var timers = [];
      root.appendChild(grid); root.appendChild(p.wrap); root.appendChild(log);
      logLine(log, 'One port in. Every system speaks OmniHub.');
      return function () { timers.forEach(clearTimeout); };
    },

    /* Tri-Force — Guardian / Planner / Executor checking each other */
    triforce: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>TRY IT</b><span>SIMULATED PREVIEW</span>'));
      root.appendChild(el('div', '', '<div style="font-size:12.5px;color:' + TOKENS.textSecondary + ';margin-bottom:10px">Issue a directive. Three independent roles must agree before anything runs.</div>'));
      var grid = el('div', 'ohsm-dgrid');
      var p = pipeline(['GUARDIAN', 'PLANNER', 'EXECUTOR']);
      var log = el('div', 'ohsm-log');
      var timers = [];
      function run(label, blocked) {
        p.nodes.forEach(function (n) { n.classList.remove('ohsm-go', 'ohsm-pass', 'ohsm-block'); });
        log.innerHTML = '';
        logLine(log, 'Directive: \u201c' + esc(label) + '\u201d');
        timers.push(setTimeout(function () {
          if (blocked) {
            p.nodes[0].classList.add('ohsm-block');
            logLine(log, '<span class="ohsm-bad">\u2715 Guardian blocked it.</span> Intent never bypasses policy.');
          } else {
            p.nodes[0].classList.add('ohsm-pass');
            logLine(log, '<span class="ohsm-ok">\u2713</span> Guardian: within policy');
            timers.push(setTimeout(function () {
              p.nodes[1].classList.add('ohsm-pass');
              logLine(log, '<span class="ohsm-ok">\u2713</span> Planner: structured task plan ready');
            }, 420));
            timers.push(setTimeout(function () {
              p.nodes[2].classList.add('ohsm-pass');
              logLine(log, '<span class="ohsm-ok">\u2713</span> Executor: done. Everything is fully logged and fully reversible.');
            }, 880));
          }
        }, 240));
      }
      [['Reconcile this month\u2019s invoices', false],
       ['Summarize support tickets', false],
       ['Export all customer data externally', true]].forEach(function (d) {
        var b = el('button', 'ohsm-dbtn', d[0]);
        b.addEventListener('click', function () { run(d[0], d[1]); });
        grid.appendChild(b);
      });
      root.appendChild(grid); root.appendChild(p.wrap); root.appendChild(log);
      return function () { timers.forEach(clearTimeout); };
    },

    /* OmniDash — plain language becomes a structured, routed task plan */
    omnidash: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>TRY IT</b><span>SIMULATED PREVIEW</span>'));
      root.appendChild(el('div', '', '<div style="font-size:12.5px;color:' + TOKENS.textSecondary + ';margin-bottom:10px">Say it in plain language. OmniHub turns it into a routed task plan.</div>'));
      var grid = el('div', 'ohsm-dgrid');
      var log = el('div', 'ohsm-log');
      var timers = [];
      var plans = {
        'Close the books for May': [
          ['1. Pull ledger entries', 'finance-agent'],
          ['2. Reconcile discrepancies', 'audit-agent'],
          ['3. Draft close report', 'reporting-agent']],
        'Onboard the new client': [
          ['1. Provision workspace', 'ops-agent'],
          ['2. Send welcome sequence', 'comms-agent'],
          ['3. Schedule kickoff', 'calendar-agent']],
        'Find why churn rose in Q2': [
          ['1. Segment churned accounts', 'data-agent'],
          ['2. Correlate support history', 'insight-agent'],
          ['3. Summarize drivers + actions', 'analyst-agent']]
      };
      Object.keys(plans).forEach(function (k) {
        var b = el('button', 'ohsm-dbtn', '\u201c' + k + '\u201d');
        b.addEventListener('click', function () {
          log.innerHTML = '';
          logLine(log, '<span class="ohsm-hi">Directive received.</span> Routing each step to the most qualified agent\u2026');
          plans[k].forEach(function (step, i) {
            timers.push(setTimeout(function () {
              logLine(log, '<span class="ohsm-ok">\u2713</span> ' + esc(step[0]) + ' \u2192 <span class="ohsm-hi">' + step[1] + '</span>');
            }, 300 + i * 320));
          });
          timers.push(setTimeout(function () {
            logLine(log, 'Every routing decision: audited. Override any agent, instantly.');
          }, 300 + plans[k].length * 320 + 200));
        });
        grid.appendChild(b);
      });
      root.appendChild(grid); root.appendChild(log);
      return function () { timers.forEach(clearTimeout); };
    },

    /* Policy Engine — toggle real rules, test an action against them */
    policy: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>TRY IT</b><span>SIMULATED PREVIEW</span>'));
      root.appendChild(el('div', '', '<div style="font-size:12.5px;color:' + TOKENS.textSecondary + ';margin-bottom:8px">These rules run <b>before</b> any action executes. Toggle them, then test.</div>'));
      var rules = [
        ['Scope Restriction', 'No agent accesses unauthorized data scopes', true],
        ['Audit on Write', 'Each write operation logged immutably', true],
        ['Rollback Window', 'High-risk actions require approval', true],
        ['Cross-Border Block', 'EU data stays within EEA zones', true]
      ];
      var states = rules.map(function (r) { return r[2]; });
      var list = el('div');
      rules.forEach(function (r, i) {
        var row = el('div', 'ohsm-toggle');
        row.appendChild(el('span', '', '<b style="color:' + TOKENS.text + ';font-weight:600">' + r[0] + '</b><br><span style="font-size:11px;color:' + TOKENS.textMuted + '">' + r[1] + '</span>'));
        var sw = el('button', 'ohsm-sw ohsm-onsw');
        sw.setAttribute('aria-label', 'Toggle ' + r[0]);
        sw.addEventListener('click', function () {
          states[i] = !states[i];
          sw.classList.toggle('ohsm-onsw', states[i]);
        });
        row.appendChild(sw);
        list.appendChild(row);
      });
      var test = el('button', 'ohsm-dbtn', 'Test action: \u201cagent writes EU customer records\u201d');
      test.style.marginTop = '10px';
      var log = el('div', 'ohsm-log');
      test.addEventListener('click', function () {
        log.innerHTML = '';
        var blocked = false;
        rules.forEach(function (r, i) {
          if (states[i]) {
            logLine(log, '<span class="ohsm-ok">\u2713 ' + r[0] + '</span> is enforced before execution');
          } else {
            blocked = true;
            logLine(log, '<span class="ohsm-bad">\u26a0 ' + r[0] + ' is OFF</span>. OmniHub flags the gap and pauses the action');
          }
        });
        logLine(log, blocked
          ? '<span class="ohsm-hi">Action held.</span> Governance gaps never fail silently.'
          : '<span class="ohsm-ok">Action authorized</span>. It is securely logged inside the rollback window.');
      });
      root.appendChild(list); root.appendChild(test); root.appendChild(log);
      return function () {};
    },

    /* One-Click Rollback — run a chain, then reverse it completely */
    rollback: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>TRY IT</b><span>SIMULATED PREVIEW</span>'));
      root.appendChild(el('div', '', '<div style="font-size:12.5px;color:' + TOKENS.textSecondary + ';margin-bottom:10px">Run a workflow and then undo it completely with a single click. No cleanup is needed.</div>'));
      var steps = ['Update 1,240 records', 'Notify 3 systems', 'Post journal entries', 'Trigger downstream sync'];
      var p = pipeline(['1', '2', '3', '4']);
      p.nodes.forEach(function (n, i) { n.textContent = steps[i]; });
      var run = el('button', 'ohsm-dbtn', 'Run workflow');
      var rb = el('button', 'ohsm-dbtn', '\u21ba Roll back with one click');
      rb.disabled = true; rb.style.borderColor = TOKENS.orange; rb.style.color = TOKENS.orangeLight;
      var row = el('div', 'ohsm-dgrid'); row.appendChild(run); row.appendChild(rb);
      var log = el('div', 'ohsm-log');
      var timers = [];
      run.addEventListener('click', function () {
        run.disabled = true; log.innerHTML = '';
        p.nodes.forEach(function (n, i) {
          timers.push(setTimeout(function () {
            n.classList.add('ohsm-pass');
            logLine(log, '<span class="ohsm-ok">\u2713</span> ' + esc(steps[i]) + ' <span style="color:' + TOKENS.textMuted + '">(compensating op recorded)</span>');
            if (i === steps.length - 1) { rb.disabled = false; logLine(log, 'Workflow complete. Every action carries its own undo.'); }
          }, 250 + i * 340));
        });
      });
      rb.addEventListener('click', function () {
        rb.disabled = true;
        for (var i = steps.length - 1, j = 0; i >= 0; i--, j++) {
          (function (i) {
            timers.push(setTimeout(function () {
              p.nodes[i].classList.remove('ohsm-pass'); p.nodes[i].classList.add('ohsm-go');
              logLine(log, '<span class="ohsm-hi">\u21ba</span> Reversed: ' + esc(steps[i]));
              if (i === 0) {
                timers.push(setTimeout(function () {
                  p.nodes.forEach(function (n) { n.classList.remove('ohsm-go'); });
                  logLine(log, '<span class="ohsm-ok">State fully restored.</span> Distributed state stays coherent under rollback.');
                  run.disabled = false;
                }, 380));
              }
            }, 200 + j * 320));
          })(i);
        }
      });
      root.appendChild(row); root.appendChild(p.wrap); root.appendChild(log);
      return function () { timers.forEach(clearTimeout); };
    },

    /* OmniTrace — interactive timeline: scrub, step, play/pause, speed */
    omnitrace: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>TRY IT</b><span>SIMULATED PREVIEW</span>'));
      root.appendChild(el('div', '', '<div style="font-size:12.5px;color:' + TOKENS.textSecondary + ';margin-bottom:6px">Drag the timeline or use controls to replay any agent decision.</div>'));
      var events = [
        ['09:14:02', 'Directive received', 'operator \u00b7 j.r'],
        ['09:14:03', 'Guardian: policy check passed', 'guardian'],
        ['09:14:05', 'Planner: 3-step plan compiled', 'planner'],
        ['09:14:09', 'Executor: step 1, records updated', 'executor'],
        ['09:14:14', 'Executor: step 2, systems notified', 'executor'],
        ['09:14:18', 'Write logged immutably', 'audit'],
        ['09:14:19', 'Chain sealed and fully reconstructable', 'omnitrace']
      ];
      var speeds = [1, 2, 5];
      var speed = 1;
      var playing = false;
      var playTimer = null;
      var playBtn = null;
      var stepBackBtn = null;
      var stepFwdBtn = null;

      var range = el('input', 'ohsm-range');
      range.type = 'range'; range.min = '0'; range.max = String(events.length - 1); range.value = '0';
      range.setAttribute('aria-label', 'Replay timeline');

      var log = el('div', 'ohsm-log');

      function updateBtns() {
        var cur = parseInt(range.value, 10);
        if (stepBackBtn) stepBackBtn.disabled = cur === 0;
        if (stepFwdBtn)  stepFwdBtn.disabled  = cur >= events.length - 1;
      }

      function render() {
        var k = parseInt(range.value, 10);
        log.innerHTML = '';
        for (var i = 0; i <= k; i++) {
          var e = events[i];
          var hi = (i === k) ? ' style="background:rgba(196,87,28,.09);border-radius:4px;padding:1px 3px"' : '';
          logLine(log, '<span' + hi + '><span style="color:' + TOKENS.textMuted + '">' + e[0] + '</span>  ' + esc(e[1]) + '  <span class="ohsm-hi">[' + e[2] + ']</span></span>');
        }
        logLine(log, '<span style="color:' + TOKENS.textMuted + '">entry ' + (k + 1) + '/' + events.length + ' \u00b7 immutable \u00b7 replayable</span>');
        updateBtns();
      }

      function stopPlay() {
        playing = false;
        if (playTimer) { clearInterval(playTimer); playTimer = null; }
        if (playBtn) playBtn.textContent = '\u25b6';
      }

      function startPlay() {
        stopPlay();
        playing = true;
        if (playBtn) playBtn.textContent = '\u23f8';
        playTimer = setInterval(function () {
          var cur = parseInt(range.value, 10);
          if (cur >= events.length - 1) { stopPlay(); return; }
          range.value = String(cur + 1);
          render();
        }, Math.round(700 / speed));
      }

      /* Controls row */
      var ctrlRow = el('div', 'ohsm-ctrl-row');

      stepBackBtn = el('button', 'ohsm-ctrl-btn', '\u2039');
      stepBackBtn.setAttribute('aria-label', 'Step back');
      stepBackBtn.addEventListener('click', function () {
        stopPlay();
        var cur = parseInt(range.value, 10);
        if (cur > 0) { range.value = String(cur - 1); render(); }
      });

      playBtn = el('button', 'ohsm-ctrl-btn ohsm-ctrl-play', '\u25b6');
      playBtn.setAttribute('aria-label', 'Play or pause replay');
      playBtn.addEventListener('click', function () {
        if (playing) { stopPlay(); }
        else {
          if (parseInt(range.value, 10) >= events.length - 1) { range.value = '0'; render(); }
          startPlay();
        }
      });

      stepFwdBtn = el('button', 'ohsm-ctrl-btn', '\u203a');
      stepFwdBtn.setAttribute('aria-label', 'Step forward');
      stepFwdBtn.addEventListener('click', function () {
        stopPlay();
        var cur = parseInt(range.value, 10);
        if (cur < events.length - 1) { range.value = String(cur + 1); render(); }
      });

      var speedBtn = el('button', 'ohsm-ctrl-btn', '1\u00d7');
      speedBtn.setAttribute('aria-label', 'Cycle playback speed');
      speedBtn.style.marginLeft = 'auto';
      speedBtn.addEventListener('click', function () {
        var idx = speeds.indexOf(speed);
        speed = speeds[(idx + 1) % speeds.length];
        speedBtn.textContent = speed + '\u00d7';
        if (playing) startPlay();
      });

      ctrlRow.appendChild(stepBackBtn);
      ctrlRow.appendChild(playBtn);
      ctrlRow.appendChild(stepFwdBtn);
      ctrlRow.appendChild(speedBtn);

      range.addEventListener('input', function () { stopPlay(); render(); });
      root.appendChild(range);
      root.appendChild(ctrlRow);
      root.appendChild(log);
      render();
      return function () { stopPlay(); };
    },

    /* MAN Mode — a real approval checkpoint: approve / reject / escalate */
    manmode: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>TRY IT</b><span>SIMULATED PREVIEW</span>'));
      var card = el('div', '', '<div style="border:1px solid ' + TOKENS.orange + ';border-radius:10px;padding:11px 13px;margin-bottom:10px">' +
        '<div style="font-family:\'Space Mono\',monospace;font-size:9px;letter-spacing:.18em;color:' + TOKENS.orangeLight + '">HIGH-RISK ACTION \u00b7 PAUSED AT CHECKPOINT</div>' +
        '<div style="font-size:13.5px;margin-top:6px;color:' + TOKENS.text + '">Agent requests a wire transfer of $48,000. This is above the automatic approval threshold.</div></div>');
      var grid = el('div', 'ohsm-dgrid');
      var log = el('div', 'ohsm-log');
      function decide(label, line, cls) {
        grid.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
        logLine(log, cls === 'ok'
          ? '<span class="ohsm-ok">\u2713 ' + label + ':</span> ' + line
          : cls === 'bad'
            ? '<span class="ohsm-bad">\u2715 ' + label + ':</span> ' + line
            : '<span class="ohsm-hi">\u2191 ' + label + ':</span> ' + line);
        logLine(log, 'Recorded with full traceability: who, what, when, why.');
        var again = el('button', 'ohsm-dbtn', 'New request');
        again.addEventListener('click', function () {
          log.innerHTML = ''; again.remove();
          grid.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
        });
        log.appendChild(again);
      }
      [['Approve', 'transfer released, action resumes', 'ok'],
       ['Reject', 'action cancelled, agent notified', 'bad'],
       ['Escalate', 'routed to a senior approver', 'hi']].forEach(function (d) {
        var b = el('button', 'ohsm-dbtn', d[0]);
        b.addEventListener('click', function () { decide(d[0], d[1], d[2]); });
        grid.appendChild(b);
      });
      root.appendChild(card); root.appendChild(grid); root.appendChild(log);
      logLine(log, 'The AI waits. You decide.');
      return function () {};
    },

    /* BYOM — swap the model, keep the workflow */
    byom: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>TRY IT</b><span>SIMULATED PREVIEW</span>'));
      root.appendChild(el('div', '', '<div style="font-size:12.5px;color:' + TOKENS.textSecondary + ';margin-bottom:10px">Switch AI providers. Watch the workflow stay identical.</div>'));
      var providers = ['Claude', 'GPT', 'Gemini', 'Llama'];
      var grid = el('div', 'ohsm-dgrid');
      var p = pipeline(['INTAKE', 'POLICY', 'MODEL: CLAUDE', 'AUDIT']);
      p.nodes.forEach(function (n) { n.classList.add('ohsm-pass'); });
      var log = el('div', 'ohsm-log');
      var swaps = 0;
      providers.forEach(function (name, i) {
        var b = el('button', 'ohsm-dbtn' + (i === 0 ? ' ohsm-sel' : ''), name);
        b.addEventListener('click', function () {
          grid.querySelectorAll('button').forEach(function (x) { x.classList.remove('ohsm-sel'); });
          b.classList.add('ohsm-sel');
          p.nodes[2].textContent = 'MODEL: ' + name.toUpperCase();
          swaps++;
          log.innerHTML = '';
          logLine(log, '<span class="ohsm-ok">\u2713</span> Provider switched to <span class="ohsm-hi">' + name + '</span>');
          logLine(log, 'Workflow rebuilt: <span class="ohsm-ok">0 lines</span> \u00b7 governance unchanged \u00b7 lock-in: <span class="ohsm-ok">none</span>' + (swaps > 2 ? ' \u00b7 (switch as often as you like)' : ''));
        });
        grid.appendChild(b);
      });
      root.appendChild(grid); root.appendChild(p.wrap); root.appendChild(log);
      logLine(log, 'Your governance layer outlives any single AI vendor.');
      return function () {};
    },

    /* SkillForge — install governed skills into the registry */
    skillforge: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>TRY IT</b><span>SIMULATED PREVIEW</span>'));
      root.appendChild(el('div', '', '<div style="font-size:12.5px;color:' + TOKENS.textSecondary + ';margin-bottom:10px">Install expert OmniSkills. Each one arrives already governed.</div>'));
      var skills = [['quarter-close', 'Financial close automation'], ['contract-review', 'Legal clause analysis'], ['churn-radar', 'Customer risk detection']];
      var count = el('div', '', '<span style="font-family:\'Space Mono\',monospace;font-size:10px;letter-spacing:.14em;color:' + TOKENS.textMuted + '">GOVERNED REGISTRY \u00b7 <span id="ohsm-sk-n" style="color:' + TOKENS.orangeLight + '">0</span> INSTALLED</span>');
      var list = el('div');
      var installed = 0;
      skills.forEach(function (s) {
        var row = el('div', 'ohsm-toggle');
        row.appendChild(el('span', '', '<b style="color:' + TOKENS.text + ';font-weight:600;font-family:\'Space Mono\',monospace;font-size:11px">' + s[0] + '</b><br><span style="font-size:11px;color:' + TOKENS.textMuted + '">' + s[1] + '</span>'));
        var b = el('button', 'ohsm-dbtn', 'Install');
        b.addEventListener('click', function () {
          b.disabled = true; b.textContent = '\u2713 Installed \u00b7 governed';
          b.style.color = TOKENS.success; b.style.borderColor = TOKENS.success;
          installed++;
          var n = count.querySelector('#ohsm-sk-n'); if (n) n.textContent = String(installed);
        });
        row.appendChild(b);
        list.appendChild(row);
      });
      root.appendChild(count); root.appendChild(list);
      root.appendChild(el('div', 'ohsm-log', 'Forge your own, install from the library, and govern them all. You get the same rules, same audit trail, and same rollback capabilities.'));
      return function () {};
    },

    /* Telemetry — live ticking operational metrics + sparkline */
    telemetry: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>LIVE VIEW</b><span>SIMULATED PREVIEW</span>'));
      var wrap = el('div');
      function metric(k) {
        var m = el('div', 'ohsm-metric', '<span class="ohsm-mk">' + k + '</span><span class="ohsm-mv">\u2014</span>');
        wrap.appendChild(m);
        return m.querySelector('.ohsm-mv');
      }
      var vAgents = metric('Agents active');
      var vTasks = metric('Tasks / min');
      var vLat = metric('p95 latency');
      var vPol = metric('Policy checks (24h)');
      var spark = el('canvas', 'ohsm-spark');
      spark.width = 360; spark.height = 36;
      var hist = []; for (var i = 0; i < 48; i++) hist.push(40 + Math.random() * 30);
      var pol = 18432;
      function tick() {
        var agents = 22 + Math.round(Math.random() * 4);
        var tasks = 38 + Math.round(Math.random() * 26);
        hist.push(tasks); hist.shift();
        pol += Math.round(Math.random() * 9);
        vAgents.textContent = String(agents);
        vTasks.textContent = String(tasks);
        vLat.textContent = (180 + Math.round(Math.random() * 90)) + ' ms';
        vPol.textContent = pol.toLocaleString();
        var g = spark.getContext('2d');
        g.clearRect(0, 0, spark.width, spark.height);
        g.strokeStyle = TOKENS.orangeLight; g.lineWidth = 1.6; g.beginPath();
        hist.forEach(function (v, i2) {
          var x = (i2 / (hist.length - 1)) * spark.width;
          var y = spark.height - ((v - 30) / 50) * spark.height;
          i2 ? g.lineTo(x, y) : g.moveTo(x, y);
        });
        g.stroke();
      }
      tick();
      var iv = setInterval(tick, 1100);
      root.appendChild(wrap); root.appendChild(spark);
      root.appendChild(el('div', 'ohsm-log', 'Every agent and workflow on one real-time surface, complete with role-enforced visibility.'));
      return function () { clearInterval(iv); };
    },

    /* PhysiOmni — send a governed command to a physical system */
    physiomni: function (root) {
      root.appendChild(el('div', 'ohsm-dl', '<b>TRY IT</b><span>SIMULATED PREVIEW</span>'));
      root.appendChild(el('div', '', '<div style="font-size:12.5px;color:' + TOKENS.textSecondary + ';margin-bottom:10px">Command a robot through the same governed pipeline as your software agents.</div>'));
      var p = pipeline(['INGRESS', 'GOVERN', 'ACTION']);
      var grid = el('div', 'ohsm-dgrid');
      var log = el('div', 'ohsm-log');
      var timers = [];
      [['Pick &amp; place unit 7', false], ['Run warehouse sweep', false], ['Override safety stop', true]].forEach(function (d) {
        var b = el('button', 'ohsm-dbtn'); b.innerHTML = d[0];
        b.addEventListener('click', function () {
          p.nodes.forEach(function (n) { n.classList.remove('ohsm-go', 'ohsm-pass', 'ohsm-block'); });
          log.innerHTML = '';
          logLine(log, 'Command \u2192 physical system\u2026');
          timers.push(setTimeout(function () {
            p.nodes[0].classList.add('ohsm-pass');
            logLine(log, '<span class="ohsm-ok">\u2713</span> Ingress: telemetry verified, device authenticated');
          }, 220));
          timers.push(setTimeout(function () {
            if (d[1]) {
              p.nodes[1].classList.add('ohsm-block');
              logLine(log, '<span class="ohsm-bad">\u2715 Governed: blocked.</span> Safety overrides require Manual Approval Node sign-off.');
            } else {
              p.nodes[1].classList.add('ohsm-pass');
              logLine(log, '<span class="ohsm-ok">\u2713</span> Governed: within policy, action authorized');
              timers.push(setTimeout(function () {
                p.nodes[2].classList.add('ohsm-pass');
                logLine(log, '<span class="ohsm-ok">\u2713</span> Action executed. It is fully logged, traceable, and reversible using the same rules beyond the screen.');
              }, 460));
            }
          }, 640));
        });
        grid.appendChild(b);
      });
      root.appendChild(grid); root.appendChild(p.wrap); root.appendChild(log);
      return function () { timers.forEach(clearTimeout); };
    }
  };

  /* ============================================================
   * 5.5 STATION ARTIFACTS — unique Three.js geometry per station.
   *     makeArtifact(idx, THREE, cap, worldPos) → THREE.Group
   *     animateArtifact(artifact, idx, isActive, t, dt) → void
   *     Wireframe edges + faint solid fill = space-tech aesthetic.
   *     All geometry is additive-blended so it never occludes stars.
   * ============================================================ */
  function makeArtifact(idx, THREE, cap, pos) {
    var g = new THREE.Group();
    g.position.copy(pos);
    var sz = cap.size;

    function edgeMat(hex, op) {
      return new THREE.LineBasicMaterial({
        color: hex, transparent: true, opacity: op !== undefined ? op : 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
    }
    function wireMesh(geo, hex, op) {
      return new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat(hex, op));
    }
    function fillMesh(geo, hex, op) {
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: hex, transparent: true, opacity: op !== undefined ? op : 0.05,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      }));
    }

    var OG  = 0xea7c44; // brand orange
    var OGD = 0xc4571c; // brand orange dim
    var WH  = 0xf8fafc; // near-white
    var CY  = 0x7dd3fc; // cool cyan accent
    var GN  = 0x4ade80; // success green
    var PU  = 0xc4b5fd; // soft violet

    switch (cap.demo) {

      // ── 1. OmniPort ─────────────────────────────────────────
      // Icosahedron hub + 6 spokes radiating to octahedron nodes
      case 'omniport': {
        var hub = wireMesh(new THREE.IcosahedronGeometry(2.2 * sz, 1), OG, 0.80);
        var hubFill = fillMesh(new THREE.IcosahedronGeometry(2.2 * sz, 1), OG, 0.05);
        g.add(hub); g.add(hubFill);
        var spokeVecs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
        var spokeNodes = [];
        spokeVecs.forEach(function (d, si2) {
          var a = new THREE.Vector3(d[0] * 2.2 * sz, d[1] * 2.2 * sz, d[2] * 2.2 * sz);
          var b = new THREE.Vector3(d[0] * 6 * sz,   d[1] * 6 * sz,   d[2] * 6 * sz);
          var spokeGeo = new THREE.BufferGeometry().setFromPoints([a, b]);
          g.add(new THREE.Line(spokeGeo, edgeMat(OGD, 0.55)));
          var node = wireMesh(new THREE.OctahedronGeometry(0.65 * sz, 0), OG, 0.90);
          node.position.copy(b); node.userData.phase = si2 * 1.05; g.add(node);
          spokeNodes.push(node);
        });
        g.userData = { type: 'omniport', hub: hub, spokeNodes: spokeNodes };
        break;
      }

      // ── 2. Tri-Force ────────────────────────────────────────
      // Three tetrahedra at 120° offsets, each spinning on its own axis
      case 'triforce': {
        var tetGeo = new THREE.TetrahedronGeometry(2.0 * sz, 0);
        var tColors = [OG, CY, GN];
        var offsets = [[0, 3.2*sz, 0], [-2.8*sz, -1.6*sz, 0], [2.8*sz, -1.6*sz, 0]];
        var tets = offsets.map(function (op, i) {
          var tw = wireMesh(tetGeo, tColors[i], 0.88);
          var tf = fillMesh(tetGeo, tColors[i], 0.06);
          tw.position.set(op[0], op[1], op[2]);
          tf.position.set(op[0], op[1], op[2]);
          g.add(tw); g.add(tf);
          return tw;
        });
        var triPts = offsets.map(function (op) { return new THREE.Vector3(op[0], op[1], op[2]); });
        triPts.push(triPts[0]);
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(triPts), edgeMat(OGD, 0.38)));
        g.userData = { type: 'triforce', tets: tets };
        break;
      }

      // ── 3. OmniDash ─────────────────────────────────────────
      // Floating holographic command center mirroring the live UI:
      // left nav rail · central APEX-Agent session ring · OmniSlate
      // input bar (sweeping scan) · right analytics tiles (pulsing) ·
      // bottom integration slots (AWAITING).
      case 'omnidash': {
        var W = 12 * sz, H = 7.5 * sz;
        // rounded-rectangle outline (closed loop) in the XY plane
        function rrect(w, h, r) {
          var pts = [], sn = 4, hw = w / 2 - r, hh = h / 2 - r;
          var cs = [[hw, hh, 0], [-hw, hh, Math.PI / 2], [-hw, -hh, Math.PI], [hw, -hh, 1.5 * Math.PI]];
          cs.forEach(function (c2) {
            for (var i = 0; i <= sn; i++) {
              var a = c2[2] + (Math.PI / 2) * (i / sn);
              pts.push(new THREE.Vector3(c2[0] + Math.cos(a) * r, c2[1] + Math.sin(a) * r, 0));
            }
          });
          pts.push(pts[0].clone());
          return new THREE.BufferGeometry().setFromPoints(pts);
        }
        function panel(w, h, r, hex, op, cx, cy, cz) {
          var ln = new THREE.Line(rrect(w, h, r), edgeMat(hex, op));
          ln.position.set(cx, cy, cz || 0);
          g.add(ln);
          return ln;
        }
        // main shell + faint screen fill
        panel(W, H, 0.5 * sz, OG, 0.85, 0, 0, 0);
        g.add(fillMesh(new THREE.PlaneGeometry(W - 0.3 * sz, H - 0.3 * sz), OG, 0.025));

        // left nav rail + 9 items (top item = active = OmniBoard)
        var navW = 1.6 * sz, navX = -W / 2 + navW / 2 + 0.5 * sz, navItems = [];
        panel(navW, H - 1.4 * sz, 0.25 * sz, OGD, 0.55, navX, 0, 0.04 * sz);
        for (var ni = 0; ni < 9; ni++) {
          var ny = (H - 2.6 * sz) / 2 - ni * ((H - 2.8 * sz) / 8);
          var navOn = ni === 0;
          var navSeg = fillMesh(new THREE.PlaneGeometry(navW - 0.5 * sz, 0.40 * sz),
            navOn ? OG : WH, navOn ? 0.5 : 0.12);
          navSeg.position.set(navX, ny, 0.06 * sz);
          g.add(navSeg);
          if (navOn) navItems.push(navSeg);
        }

        // central APEX-Agent module + session ring + play triangle
        var modX = -0.4 * sz, modY = 1.35 * sz;
        panel(6.2 * sz, 3.8 * sz, 0.3 * sz, OG, 0.6, modX, modY, 0.05 * sz);
        var sessRing = wireMesh(new THREE.TorusGeometry(1.0 * sz, 0.11, 4, 28), OG, 0.92);
        sessRing.position.set(modX - 1.7 * sz, modY, 0.12 * sz);
        g.add(sessRing);
        var sessArc = wireMesh(new THREE.TorusGeometry(1.0 * sz, 0.17, 4, 16, Math.PI * 1.3), WH, 0.85);
        sessArc.position.copy(sessRing.position);
        g.add(sessArc);
        var playTri = wireMesh(new THREE.ConeGeometry(0.30 * sz, 0.52 * sz, 3), WH, 0.9);
        playTri.position.copy(sessRing.position);
        playTri.rotation.z = -Math.PI / 2;
        g.add(playTri);
        for (var dl = 0; dl < 3; dl++) {  // agent output rows
          var row = fillMesh(new THREE.PlaneGeometry((2.6 - dl * 0.5) * sz, 0.15 * sz), WH, 0.16);
          row.position.set(modX + 0.8 * sz, modY + 0.65 * sz - dl * 0.52 * sz, 0.08 * sz);
          g.add(row);
        }

        // OmniSlate input bar with sweeping scan
        var slateY = -1.45 * sz;
        panel(8.0 * sz, 1.0 * sz, 0.2 * sz, OGD, 0.6, modX, slateY, 0.05 * sz);
        var scanBar = fillMesh(new THREE.PlaneGeometry(0.5 * sz, 0.85 * sz), OG, 0.5);
        scanBar.userData.minX = modX - 3.5 * sz;
        scanBar.userData.maxX = modX + 3.5 * sz;
        scanBar.position.set(scanBar.userData.minX, slateY, 0.09 * sz);
        g.add(scanBar);

        // bottom integration slots (AWAITING — dim, empty)
        for (var bi2 = 0; bi2 < 3; bi2++) {
          var slot = panel(2.4 * sz, 1.3 * sz, 0.18 * sz, OGD, 0.32,
            modX - 2.2 * sz + bi2 * 2.7 * sz, -H / 2 + 1.0 * sz, 0.04 * sz);
          var sdot = fillMesh(new THREE.PlaneGeometry(0.28 * sz, 0.28 * sz), OGD, 0.4);
          sdot.position.set(slot.position.x - 0.7 * sz, slot.position.y, 0.07 * sz);
          g.add(sdot);
        }

        // right analytics column (3 stacked metric tiles, mid = green health)
        var tileX = W / 2 - 1.9 * sz, metricTiles = [];
        [2.0, 0, -2.0].forEach(function (ty, i) {
          panel(3.0 * sz, 1.7 * sz, 0.2 * sz, OGD, 0.5, tileX, ty * sz, 0.05 * sz);
          var fillT = fillMesh(new THREE.PlaneGeometry(2.7 * sz, 1.4 * sz), i === 1 ? GN : OG, 0.06);
          fillT.position.set(tileX, ty * sz, 0.06 * sz);
          fillT.userData.tphase = i * 1.2;
          g.add(fillT);
          metricTiles.push(fillT);
        });

        g.rotation.y = -0.22;
        g.userData = { type: 'omnidash', sessArc: sessArc, scanBar: scanBar,
          metricTiles: metricTiles, navItems: navItems };
        break;
      }

      // ── 4. Policy Engine ────────────────────────────────────
      // Three nested octahedra (shield layers) + three rotating gate rings
      case 'policy': {
        [1.0, 1.55, 2.1].forEach(function (sc, i) {
          var oct = wireMesh(new THREE.OctahedronGeometry(2.4 * sz * sc, 0), OG, 0.72 - i * 0.18);
          oct.rotation.y = i * 0.45; g.add(oct);
        });
        var gateRings = [[1,0,0,OG,0.60],[0,1,0,OGD,0.52],[0.6,0.6,0,CY,0.42]].map(function (d) {
          var r = wireMesh(new THREE.TorusGeometry(5.4 * sz, 0.13, 4, 28), d[3], d[4]);
          r.rotation.x = d[0] * Math.PI / 2;
          r.rotation.y = d[1] * Math.PI / 2;
          r.rotation.z = d[2] * Math.PI / 3;
          r.userData.dir = (d[0] + d[1] + d[2]) % 2 === 0 ? 1 : -1;
          g.add(r);
          return r;
        });
        g.userData = { type: 'policy', gateRings: gateRings };
        break;
      }

      // ── 5. One-Click Rollback ────────────────────────────────
      // TorusKnot (tangled timeline) + orbiting rewind-arrow
      case 'rollback': {
        var knot = wireMesh(new THREE.TorusKnotGeometry(2.8 * sz, 0.32, 96, 8, 2, 3), OG, 0.78);
        var knotFill = fillMesh(new THREE.TorusKnotGeometry(2.8 * sz, 0.32, 96, 8, 2, 3), OG, 0.04);
        g.add(knot); g.add(knotFill);
        var orbit = wireMesh(new THREE.TorusGeometry(5.2 * sz, 0.14, 4, 20), WH, 0.48);
        orbit.rotation.x = Math.PI / 5;
        g.add(orbit);
        var arrow = wireMesh(new THREE.ConeGeometry(0.45 * sz, 1.1 * sz, 4), OG, 0.92);
        g.add(arrow);
        g.userData = { type: 'rollback', knot: knot, orbit: orbit, arrow: arrow };
        break;
      }

      // ── 6. OmniTrace ────────────────────────────────────────
      // DNA double helix with connecting rungs
      case 'omnitrace': {
        var turns = 3, segsPerTurn = 14, totalSegs = turns * segsPerTurn;
        var hH = 11 * sz, hR = 2.6 * sz;
        var hp1 = [], hp2 = [];
        for (var hi = 0; hi <= totalSegs; hi++) {
          var ht = hi / totalSegs;
          var ha = ht * turns * Math.PI * 2;
          var hy = (ht - 0.5) * hH;
          hp1.push(new THREE.Vector3( Math.cos(ha) * hR, hy,  Math.sin(ha) * hR));
          hp2.push(new THREE.Vector3(-Math.cos(ha) * hR, hy, -Math.sin(ha) * hR));
        }
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(hp1), edgeMat(OG, 0.82)));
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(hp2), edgeMat(CY, 0.62)));
        for (var ri = 0; ri < totalSegs; ri += 2) {
          g.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([hp1[ri], hp2[ri]]),
            edgeMat(WH, 0.22)));
        }
        g.userData = { type: 'omnitrace' };
        break;
      }

      // ── 7. MAN Mode ─────────────────────────────────────────
      // Hexagonal prism gate + pulsing suspended octahedron
      case 'manmode': {
        var hexWall = wireMesh(new THREE.CylinderGeometry(3.8 * sz, 3.8 * sz, 0.9 * sz, 6, 1, true), OG, 0.80);
        g.add(hexWall);
        var hexCapGeo = new THREE.CircleGeometry(3.8 * sz, 6);
        var hexT = wireMesh(hexCapGeo, OG, 0.55);
        var hexB = wireMesh(hexCapGeo, OG, 0.45);
        hexT.position.y =  0.45 * sz; hexB.position.y = -0.45 * sz;
        g.add(hexT); g.add(hexB);
        var gateRingM = wireMesh(new THREE.TorusGeometry(4.8 * sz, 0.15, 4, 24), OGD, 0.50);
        gateRingM.rotation.x = Math.PI / 2; g.add(gateRingM);
        var manCore = wireMesh(new THREE.OctahedronGeometry(1.4 * sz, 0), WH, 0.92);
        var manCoreFill = fillMesh(new THREE.OctahedronGeometry(1.4 * sz, 0), WH, 0.09);
        g.add(manCore); g.add(manCoreFill);
        var pb1 = fillMesh(new THREE.BoxGeometry(0.38 * sz, 2.0 * sz, 0.38 * sz), OG, 0.55);
        var pb2 = fillMesh(new THREE.BoxGeometry(0.38 * sz, 2.0 * sz, 0.38 * sz), OG, 0.55);
        pb1.position.set(-0.48 * sz, 0, 0); pb2.position.set(0.48 * sz, 0, 0);
        g.add(pb1); g.add(pb2);
        g.userData = { type: 'manmode', manCore: manCore, manCoreFill: manCoreFill };
        break;
      }

      // ── 8. Connect AI / BYOM ────────────────────────────────
      // Central icosahedron + 4 orbital model nodes with dynamic tether lines
      case 'byom': {
        var center = wireMesh(new THREE.IcosahedronGeometry(1.9 * sz, 1), OG, 0.88);
        var centerFill = fillMesh(new THREE.IcosahedronGeometry(1.9 * sz, 1), OG, 0.06);
        g.add(center); g.add(centerFill);
        var modelColors = [OG, CY, PU, GN];
        var orbs = modelColors.map(function (col, i) {
          var orb = wireMesh(new THREE.OctahedronGeometry(0.85 * sz, 0), col, 0.88);
          orb.userData.orbAngle = (i / modelColors.length) * Math.PI * 2;
          orb.userData.orbR     = 4.8 * sz;
          orb.userData.orbTilt  = i * (Math.PI / 4.5);
          orb.userData.orbSpeed = 0.22 + i * 0.065;
          var cPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
          var cLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cPts), edgeMat(col, 0.28));
          g.add(cLine); g.add(orb);
          orb.userData.tether = cLine;
          return orb;
        });
        g.userData = { type: 'byom', center: center, orbs: orbs };
        break;
      }

      // ── 9. SkillForge ───────────────────────────────────────
      // Tall elongated crystal + 3 orbiting skill shards
      case 'skillforge': {
        var scaleMat = new THREE.Matrix4().makeScale(1, 2.3, 1);
        var cGeo1 = new THREE.OctahedronGeometry(2.0 * sz, 0);
        cGeo1.applyMatrix4(scaleMat);
        var cGeo2 = new THREE.OctahedronGeometry(1.25 * sz, 0);
        cGeo2.applyMatrix4(scaleMat);
        var crystal1 = wireMesh(cGeo1, OG, 0.85);
        var crystal1f = fillMesh(cGeo1, OG, 0.05);
        var crystal2 = wireMesh(cGeo2, WH, 0.52);
        crystal2.rotation.y = Math.PI / 5;
        g.add(crystal1); g.add(crystal1f); g.add(crystal2);
        var forgeSparks = [0, 1, 2].map(function (i) {
          var shard = wireMesh(new THREE.TetrahedronGeometry(0.70 * sz, 0), CY, 0.82);
          shard.userData.shardAngle = (i / 3) * Math.PI * 2;
          shard.userData.shardR = 4.6 * sz;
          g.add(shard);
          return shard;
        });
        g.userData = { type: 'skillforge', crystal1: crystal1, forgeSparks: forgeSparks };
        break;
      }

      // ── 10. Real-Time Telemetry ─────────────────────────────
      // Radar hemisphere dish + rotating sweep arm + blinking data pips
      case 'telemetry': {
        var dishGeo = new THREE.SphereGeometry(4 * sz, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        var dish = wireMesh(dishGeo, OGD, 0.55);
        dish.rotation.x = Math.PI;
        g.add(dish);
        var rim = wireMesh(new THREE.TorusGeometry(4 * sz, 0.15, 4, 32), OG, 0.75);
        g.add(rim);
        var sweepPivot = new THREE.Group();
        var sweepArm = fillMesh(new THREE.PlaneGeometry(4 * sz, 0.12), OG, 0.55);
        sweepArm.rotation.x = -Math.PI / 2;
        sweepArm.position.x = 2 * sz;
        sweepPivot.add(sweepArm);
        g.add(sweepPivot);
        var pips = [];
        for (var pi = 0; pi < 7; pi++) {
          var pa = (pi / 7) * Math.PI * 2;
          var pr = (1.0 + (pi % 3) * 1.1) * sz;
          var pip = fillMesh(new THREE.OctahedronGeometry(0.22 * sz, 0), GN, 0.90);
          pip.position.set(Math.cos(pa) * pr, 0.3, Math.sin(pa) * pr);
          pip.userData.blinkPhase = pi * 0.88;
          g.add(pip); pips.push(pip);
        }
        g.userData = { type: 'telemetry', sweepPivot: sweepPivot, pips: pips };
        break;
      }

      // ── 11. PhysiOmni ───────────────────────────────────────
      // Articulated robot arm: base + two segments + gripper fingers
      case 'physiomni': {
        var baseGeo = new THREE.CylinderGeometry(2.0 * sz, 2.5 * sz, 0.9 * sz, 6);
        g.add(wireMesh(baseGeo, OG, 0.80));
        g.add(fillMesh(baseGeo, OG, 0.06));
        var arm1 = new THREE.Group();
        arm1.position.y = 0.45 * sz;
        var seg1 = wireMesh(new THREE.CylinderGeometry(0.38 * sz, 0.50 * sz, 4.2 * sz, 6), OG, 0.74);
        seg1.position.y = 2.1 * sz; arm1.add(seg1);
        var j1 = wireMesh(new THREE.OctahedronGeometry(0.68 * sz, 0), WH, 0.82);
        j1.position.y = 4.2 * sz; arm1.add(j1);
        var arm2 = new THREE.Group();
        arm2.position.y = 4.2 * sz;
        arm2.rotation.z = -0.45;
        var seg2 = wireMesh(new THREE.CylinderGeometry(0.28 * sz, 0.38 * sz, 3.4 * sz, 6), OGD, 0.70);
        seg2.position.y = 1.7 * sz; arm2.add(seg2);
        var j2 = wireMesh(new THREE.OctahedronGeometry(0.52 * sz, 0), WH, 0.80);
        j2.position.y = 3.4 * sz; arm2.add(j2);
        var gripper = new THREE.Group();
        gripper.position.y = 3.4 * sz;
        [-0.38, 0.38].forEach(function (ox) {
          var finger = wireMesh(new THREE.ConeGeometry(0.22 * sz, 1.2 * sz, 4), CY, 0.80);
          finger.rotation.z = ox > 0 ? -0.32 : 0.32;
          finger.position.set(ox * sz, 0.6 * sz, 0);
          gripper.add(finger);
        });
        arm2.add(gripper); arm1.add(arm2); g.add(arm1);
        g.userData = { type: 'physiomni', arm1: arm1, arm2: arm2, gripper: gripper };
        break;
      }

      // ── 12. Early Access / finale ────────────────────────────
      // Portal: main torus ring + two counter-rotating inner rings + orbiting particles
      default: {
        var portal = wireMesh(new THREE.TorusGeometry(6.0 * sz, 0.45, 10, 52), OG, 0.88);
        g.add(portal);
        var portalFill = fillMesh(new THREE.CircleGeometry(5.5 * sz, 52), OG, 0.04);
        g.add(portalFill);
        var iRingA = wireMesh(new THREE.TorusGeometry(3.6 * sz, 0.20, 4, 36), WH, 0.48);
        var iRingB = wireMesh(new THREE.TorusGeometry(5.0 * sz, 0.16, 4, 36), OGD, 0.38);
        iRingB.rotation.x = Math.PI / 3;
        g.add(iRingA); g.add(iRingB);
        var portParticles = [];
        for (var pri = 0; pri < 28; pri++) {
          var pp = fillMesh(new THREE.OctahedronGeometry(0.18 * sz, 0), OG, 0.82);
          pp.userData.pAngle = (pri / 28) * Math.PI * 2;
          pp.userData.pR = 6.0 * sz;
          g.add(pp); portParticles.push(pp);
        }
        g.userData = { type: 'portal', portal: portal, iRingA: iRingA, iRingB: iRingB, portParticles: portParticles };
        break;
      }
    }

    g.userData.baseScale = sz;
    return g;
  }

  function animateArtifact(artifact, idx, isActive, t, dt) {
    var d = artifact.userData;
    if (!d || !d.type) return;
    var sz  = d.baseScale || 1;
    var aB  = isActive ? 1.30 : 1.0;
    var oM  = isActive ? 1.0  : 0.52;

    switch (d.type) {

      case 'omniport':
        d.hub.rotation.y += dt * 0.38;
        d.hub.rotation.x += dt * 0.18;
        d.spokeNodes.forEach(function (n, i) {
          n.rotation.y += dt * (0.45 + i * 0.09);
          n.material.opacity = (0.55 + 0.35 * Math.sin(t * 2.1 + n.userData.phase)) * oM;
        });
        artifact.scale.setScalar(aB);
        break;

      case 'triforce':
        d.tets.forEach(function (tet, i) {
          tet.rotation.x += dt * (0.28 + i * 0.14);
          tet.rotation.z += dt * (0.18 + i * 0.09);
        });
        artifact.rotation.y += dt * 0.16;
        artifact.scale.setScalar(aB);
        break;

      case 'omnidash':
        d.sessArc.rotation.z -= dt * 0.9;                 // session progress sweep
        d.scanBar.position.x += dt * 5.0 * sz;            // OmniSlate scan
        if (d.scanBar.position.x > d.scanBar.userData.maxX) d.scanBar.position.x = d.scanBar.userData.minX;
        d.metricTiles.forEach(function (tile) {
          tile.material.opacity = (0.05 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.8 + tile.userData.tphase))) * oM;
        });
        if (d.navItems[0]) d.navItems[0].material.opacity = (0.35 + 0.20 * Math.sin(t * 2.2)) * oM;
        artifact.rotation.y = -0.22 + Math.sin(t * 0.25) * 0.14;  // gentle parallax sway
        artifact.scale.setScalar(aB);
        break;

      case 'policy':
        d.gateRings.forEach(function (r, i) {
          r.rotation.y += dt * (0.26 + i * 0.10) * r.userData.dir;
          r.rotation.x += dt * 0.08 * r.userData.dir;
        });
        artifact.rotation.y += dt * 0.07;
        artifact.scale.setScalar(aB);
        break;

      case 'rollback':
        d.knot.rotation.y += dt * 0.20;
        d.knot.rotation.x += dt * 0.07;
        d.orbit.rotation.y -= dt * 0.42;
        var rA = t * 0.55;
        d.arrow.position.set(Math.cos(rA) * 5.2 * sz, Math.sin(rA * 0.72) * 1.4 * sz, Math.sin(rA) * 5.2 * sz);
        d.arrow.rotation.y = -rA + Math.PI;
        artifact.scale.setScalar(aB);
        break;

      case 'omnitrace':
        artifact.rotation.y += dt * 0.14;
        artifact.scale.setScalar(aB);
        break;

      case 'manmode':
        var mPulse = 1 + 0.22 * Math.sin(t * 3.8);
        d.manCore.scale.setScalar(mPulse);
        d.manCoreFill.scale.setScalar(mPulse * 1.4);
        d.manCoreFill.material.opacity = (0.06 + 0.05 * Math.abs(Math.sin(t * 3.8))) * oM;
        artifact.rotation.y += dt * 0.055;
        artifact.scale.setScalar(aB);
        break;

      case 'byom':
        d.orbs.forEach(function (orb) {
          orb.userData.orbAngle += dt * orb.userData.orbSpeed;
          var oa  = orb.userData.orbAngle;
          var or2 = orb.userData.orbR;
          var ot  = orb.userData.orbTilt;
          var nx  = Math.cos(oa) * or2;
          var ny  = Math.sin(oa) * Math.sin(ot) * or2 * 0.45;
          var nz  = Math.sin(oa) * or2;
          orb.position.set(nx, ny, nz);
          orb.rotation.y += dt * 0.45;
          var arr = orb.userData.tether.geometry.attributes.position.array;
          arr[0] = 0;  arr[1] = 0;  arr[2] = 0;
          arr[3] = nx; arr[4] = ny; arr[5] = nz;
          orb.userData.tether.geometry.attributes.position.needsUpdate = true;
        });
        d.center.rotation.y += dt * 0.28;
        artifact.scale.setScalar(aB);
        break;

      case 'skillforge':
        d.crystal1.rotation.y += dt * 0.24;
        d.forgeSparks.forEach(function (shard, i) {
          shard.userData.shardAngle += dt * (0.38 + i * 0.09);
          var sa = shard.userData.shardAngle;
          var sr = shard.userData.shardR;
          shard.position.set(Math.cos(sa) * sr, Math.sin(t * 0.65 + i * 1.1) * 0.9 * sz, Math.sin(sa) * sr);
          shard.rotation.y += dt * 0.55;
        });
        artifact.scale.setScalar(aB);
        break;

      case 'telemetry':
        d.sweepPivot.rotation.y += dt * 1.25;
        d.pips.forEach(function (pip) {
          pip.material.opacity = (0.45 + 0.50 * Math.abs(Math.sin(t * 2.6 + pip.userData.blinkPhase))) * oM;
        });
        artifact.scale.setScalar(aB);
        break;

      case 'physiomni':
        d.arm1.rotation.y  += dt * 0.32;
        d.arm2.rotation.z   = -0.45 + Math.sin(t * 0.75) * 0.42;
        d.gripper.rotation.y = Math.sin(t * 1.35) * 0.48;
        artifact.scale.setScalar(aB);
        break;

      case 'portal':
        d.portal.rotation.y  += dt * 0.17;
        d.iRingA.rotation.y  += dt * 0.50;
        d.iRingA.rotation.x  += dt * 0.18;
        d.iRingB.rotation.y  -= dt * 0.33;
        d.iRingB.rotation.z  += dt * 0.13;
        d.portParticles.forEach(function (pp) {
          pp.userData.pAngle += dt * 0.52;
          var pa = pp.userData.pAngle;
          var pr = pp.userData.pR;
          pp.position.set(Math.cos(pa) * pr, Math.sin(t * 0.28 + pa) * 1.4 * sz, Math.sin(pa) * pr);
        });
        artifact.scale.setScalar(aB * (1 + 0.055 * Math.sin(t * 0.65)));
        break;
    }
  }

  /* ============================================================
   * 6. OVERLAY (the map experience)
   * ============================================================ */
  function scheduleStarmapWork(work) {
    requestAnimationFrame(function () { work(); });
  }

  function Overlay(opts) {
    var self = this;
    this.opts = opts;
    this.current = -1;
    this.visited = {};
    this.demoCleanup = null;
    this.raf = 0;
    this.destroyed = false;
    this.three = null;

    var o = el('div', 'ohsm-overlay');
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-label', 'OmniHub platform capability map');
    this.rootEl = o;

    var stage = el('canvas', 'ohsm-stage');
    stage.setAttribute('aria-label', 'Interactive map of OmniHub platform capabilities');
    o.appendChild(stage);
    this.stage = stage;
    o.appendChild(el('div', 'ohsm-vig'));
    this.streaks = el('div', 'ohsm-streaks'); o.appendChild(this.streaks);
    this.flash = el('div', 'ohsm-flash'); o.appendChild(this.flash);

    // top chrome — brand wordmark + exit
    var top = el('div', 'ohsm-top');
    var brand = el('div', '');
    brand.innerHTML = '<img src="https://apexomnihub.icu/apex-omnihub-wordmark.svg" alt="APEX OmniHub" ' +
      'onerror="this.outerHTML=\'<div style=&quot;font-weight:700;font-size:15px;letter-spacing:.08em&quot;>APEX OMNIHUB</div>\'">' +
      '<div class="ohsm-brandsub">PLATFORM CAPABILITIES \u00b7 INTERACTIVE</div>';
    top.appendChild(brand);
    var exit = el('button', 'ohsm-exit', '\u2715 &nbsp;CLOSE');
    exit.addEventListener('click', function () { self.close(); });
    top.appendChild(exit);
    o.appendChild(top);

    // labels host + hint
    this.labelsHost = el('div'); o.appendChild(this.labelsHost);
    o.appendChild(el('div', 'ohsm-hintline', 'DRAG TO LOOK \u00b7 CLICK A POINT TO JUMP \u00b7 ARROW KEYS WORK TOO'));

    // dock
    var dock = el('nav', 'ohsm-dock');
    dock.setAttribute('aria-label', 'Capabilities');
    this.prevBtn = el('button', 'ohsm-step', '\u25c2'); dock.appendChild(this.prevBtn);
    this.dots = el('div', 'ohsm-dots'); dock.appendChild(this.dots);
    this.nextBtn = el('button', 'ohsm-step', '\u25b8'); dock.appendChild(this.nextBtn);
    CAPS.forEach(function (c, i) {
      var d = el('button', 'ohsm-dot'); d.title = c.name;
      d.setAttribute('aria-label', (i + 1) + '. ' + c.name);
      d.addEventListener('click', function () { self.travelTo(i); });
      self.dots.appendChild(d);
    });
    this.prevBtn.addEventListener('click', function () { if (self.current > 0) self.travelTo(self.current - 1); });
    this.nextBtn.addEventListener('click', function () { if (self.current < CAPS.length - 1) self.travelTo(self.current + 1); });
    o.appendChild(dock);

    // panel
    var panel = el('aside', 'ohsm-panel');
    panel.setAttribute('aria-live', 'polite');
    this.panel = panel;
    this.pe = el('div', 'ohsm-pe', '<span></span><span class="ohsm-petag"></span>'); panel.appendChild(this.pe);
    this.pTitle = el('h3'); panel.appendChild(this.pTitle);
    this.pLead = el('p', 'ohsm-lead'); panel.appendChild(this.pLead);
    this.chipsWrap = el('div', 'ohsm-chips',
      '<div class="ohsm-cl"><span class="ohsm-okdot"></span><span>VERIFIED \u00b7 APEXOMNIHUB.ICU</span></div><ul></ul>');
    panel.appendChild(this.chipsWrap);
    this.demoHost = el('div', 'ohsm-demo'); panel.appendChild(this.demoHost);
    var actions = el('div', 'ohsm-actions');
    this.goBtn = el('button', 'ohsm-btn ohsm-btn-primary', 'NEXT \u25b8');
    this.tryBtn = el('button', 'ohsm-btn ohsm-btn-ghost', 'TRY IT');
    actions.appendChild(this.goBtn); actions.appendChild(this.tryBtn);
    panel.appendChild(actions);
    o.appendChild(panel);

    this.goBtn.addEventListener('click', function () {
      if (self.current >= CAPS.length - 1) { self.finale.classList.add('ohsm-show'); self.hidePanel(); }
      else self.travelTo(self.current + 1);
    });
    this.tryBtn.addEventListener('click', function () { self.toggleDemo(); });

    // finale
    var fin = el('div', 'ohsm-finale');
    fin.innerHTML =
      '<div class="ohsm-fcard">' +
      '<div class="ohsm-eyebrow">EARLY ACCESS</div>' +
      '<h3>Move beyond<br><em>black-box AI.</em></h3>' +
      '<p>Join enterprises that have moved beyond black-box AI. Request early access and experience what governed intelligence looks like in production. Every action is authorized, logged, and reversible.</p>' +
      '<div class="ohsm-ctas">' +
      '<a class="ohsm-btn ohsm-btn-primary" target="_blank" rel="noopener">REQUEST EARLY ACCESS \u25b8</a>' +
      '<a class="ohsm-btn ohsm-btn-ghost" target="_blank" rel="noopener">WATCH THE MAESTRO DEMO</a>' +
      '<button class="ohsm-btn ohsm-btn-ghost" data-ohsm-replay>START OVER</button>' +
      '</div>' +
      '<div class="ohsm-proof">AUDIT-FIRST \u00b7 HUMAN-IN-THE-LOOP \u00b7 GOVERNANCE-NATIVE<br>ENTERPRISE READY</div>' +
      '</div>';
    fin.querySelector('.ohsm-btn-primary').setAttribute('href', safeHref(opts.ctaHref));
    fin.querySelector('.ohsm-btn-ghost').setAttribute('href', safeHref(opts.demoHref));
    this.finale = fin;
    fin.querySelector('[data-ohsm-replay]').addEventListener('click', function () {
      fin.classList.remove('ohsm-show'); self.visited = {}; self.travelTo(0, true);
    });
    o.appendChild(fin);

    // keyboard
    this.keyHandler = function (e) {
      if (e.key === 'Escape') self.close();
      if (e.key === 'ArrowRight' && self.current < CAPS.length - 1) self.travelTo(self.current + 1);
      if (e.key === 'ArrowLeft' && self.current > 0) self.travelTo(self.current - 1);
    };
    document.addEventListener('keydown', this.keyHandler);

    document.body.appendChild(o);
    this.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { o.classList.add('ohsm-on'); });

    // boot 3D (with graceful fallback)
    loadThree(opts.threeSrc).then(function (THREE) {
      if (self.destroyed) return;
      try { self.init3D(THREE); } catch (err) { self.initFallback(); }
    }).catch(function () { if (!self.destroyed) self.initFallback(); });
  }

  Overlay.prototype.initFallback = function () {
    // No WebGL / script blocked: same content, list navigation, demos intact.
    this.stage.style.display = 'none';
    var fb = el('div', 'ohsm-fallback');
    var wrap = el('div', 'ohsm-fwrap');
    wrap.appendChild(el('div', 'ohsm-eyebrow', 'PLATFORM CAPABILITIES'));
    fb.appendChild(wrap);
    this.rootEl.insertBefore(fb, this.rootEl.firstChild.nextSibling);
    this.fallback = true;
    this.travelTo(0, true);
  };

  Overlay.prototype.init3D = function (THREE) {
    var self = this;
    var renderer = new THREE.WebGLRenderer({ canvas: this.stage, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(TOKENS.bg);
    scene.fog = new THREE.FogExp2(0x060a13, 0.0014);
    var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 5000);

    function radialTexture(stops, size) {
      size = size || 256;
      var c = document.createElement('canvas'); c.width = c.height = size;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(function (s) { grad.addColorStop(s[0], s[1]); });
      g.fillStyle = grad; g.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(c);
    }
    // brand-true glow palette: burnt orange core, navy-cool dust
    var coreTex = radialTexture([[0, 'rgba(248,250,252,1)'], [0.18, 'rgba(255,228,205,.95)'], [0.42, 'rgba(234,124,68,.45)'], [1, 'rgba(196,87,28,0)']]);
    var haloTex = radialTexture([[0, 'rgba(234,124,68,.5)'], [0.4, 'rgba(196,87,28,.15)'], [1, 'rgba(196,87,28,0)']], 512);
    var moteTex = radialTexture([[0, 'rgba(248,250,252,1)'], [0.35, 'rgba(234,170,120,.8)'], [1, 'rgba(196,87,28,0)']], 64);
    var dustTex = radialTexture([[0, 'rgba(248,250,252,.9)'], [1, 'rgba(148,163,184,0)']], 32);

    function starLayer(count, spread, size, opacity, tint) {
      var geo = new THREE.BufferGeometry();
      var pos = new Float32Array(count * 3);
      for (var i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6;
        pos[i * 3 + 2] = (Math.random() - 0.5) * spread - 280;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
        size: size, map: dustTex, color: tint, transparent: true, opacity: opacity,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      })));
    }
    starLayer(2800, 1900, 1.6, .8, 0xe2e8f0);   // slate-white
    starLayer(1900, 1400, 2.6, .5, 0xeab18a);   // warm brand dust
    starLayer(1000, 1000, 4.0, .28, 0x94a3b8);  // muted slate

    var nebTex = radialTexture([[0, 'rgba(196,87,28,.09)'], [0.5, 'rgba(30,41,59,.10)'], [1, 'rgba(0,0,0,0)']], 512);
    for (var n = 0; n < 9; n++) {
      var nm = new THREE.SpriteMaterial({ map: nebTex, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending });
      var ns = new THREE.Sprite(nm);
      var s = 240 + Math.random() * 360;
      ns.scale.set(s, s, 1);
      ns.position.set((Math.random() - .5) * 740, (Math.random() - .5) * 280, -100 - Math.random() * 560);
      scene.add(ns);
    }

    var starObjects = [];
    var group = new THREE.Group(); scene.add(group);
    CAPS.forEach(function (c, idx) {
      var p = new THREE.Vector3(c.pos[0], c.pos[1], c.pos[2]);
      var core = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreTex, color: 0xea7c44, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      core.scale.setScalar(7 * c.size); core.position.copy(p); core.userData.idx = idx; group.add(core);
      var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xc4571c, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(22 * c.size); halo.position.copy(p); group.add(halo);
      var motes = [];
      c.chips.forEach(function (_, bi) {
        var m = new THREE.Sprite(new THREE.SpriteMaterial({ map: moteTex, color: 0xf8e8da, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.scale.setScalar(1.6);
        m.userData = { angle: (bi / Math.max(1, c.chips.length)) * Math.PI * 2, radius: 6.5 * c.size + (bi % 3) * 1.8, speed: 0.18 + (bi % 4) * 0.045, tilt: (bi % 2 ? 1 : -1) * (0.3 + 0.12 * (bi % 3)) };
        group.add(m); motes.push(m);
      });
      var artifact = makeArtifact(idx, THREE, c, p);
      group.add(artifact);
      starObjects.push({ core: core, halo: halo, motes: motes, artifact: artifact, cap: c, basePos: p });
    });

    (function () {
      var pts = CAPS.map(function (c) { return new THREE.Vector3(c.pos[0], c.pos[1], c.pos[2]); });
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xc4571c, transparent: true, opacity: .15 })));
    })();

    // transition tunnel
    var WARP_COUNT = 420;
    var warpGeo = new THREE.BufferGeometry();
    var warpPos = new Float32Array(WARP_COUNT * 2 * 3);
    var seed = [];
    for (var w = 0; w < WARP_COUNT; w++) {
      var ang = Math.random() * Math.PI * 2, rad = 4 + Math.random() * 36;
      seed.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, z: -Math.random() * 160 - 10, len: 6 + Math.random() * 22 });
    }
    warpGeo.setAttribute('position', new THREE.BufferAttribute(warpPos, 3));
    var warpMat = new THREE.LineBasicMaterial({ color: 0xf3c9a8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    var warpLines = new THREE.LineSegments(warpGeo, warpMat);
    warpLines.frustumCulled = false;
    camera.add(warpLines); scene.add(camera);

    // labels
    var labelEls = CAPS.map(function (c, i) {
      var le = el('div', 'ohsm-label', '<span class="ohsm-ln">' + pad(i + 1) + '</span> ' + c.name);
      self.labelsHost.appendChild(le);
      return le;
    });

    var rig = { target: new THREE.Vector3(0, 2, 0), yaw: 0.35, pitch: 0.12, dist: 26, yawV: 0, pitchV: 0 };
    var trans = { active: false, t: 0, dur: 2.2, from: null, to: null, fromT: null, toT: null, onDone: null };
    function offsetFor(c) { return 16 + c.size * 9; }
    function applyRig() {
      camera.position.set(
        rig.target.x + rig.dist * Math.sin(rig.yaw) * Math.cos(rig.pitch),
        rig.target.y + rig.dist * Math.sin(rig.pitch),
        rig.target.z + rig.dist * Math.cos(rig.yaw) * Math.cos(rig.pitch));
      camera.lookAt(rig.target);
    }
    function ease(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

    this.three = {
      jump: function (idx) {
        var c = CAPS[idx];
        rig.target.set(c.pos[0], c.pos[1], c.pos[2]);
        rig.dist = offsetFor(c); rig.yaw = 0.35; rig.pitch = 0.12;
        applyRig();
      },
      fly: function (idx, done) {
        var c = CAPS[idx];
        var toT = new THREE.Vector3(c.pos[0], c.pos[1], c.pos[2]);
        trans.active = true; trans.t = 0;
        trans.fromT = rig.target.clone(); trans.toT = toT;
        trans.from = camera.position.clone();
        var aD = offsetFor(c);
        trans.to = new THREE.Vector3(
          toT.x + aD * Math.sin(0.35) * Math.cos(0.12),
          toT.y + aD * Math.sin(0.12),
          toT.z + aD * Math.cos(0.35) * Math.cos(0.12));
        trans.dur = 1.8 + Math.min(1.3, trans.from.distanceTo(trans.to) * 0.004);
        trans.onDone = function () {
          rig.yaw = 0.35; rig.pitch = 0.12; rig.dist = aD; rig.target.copy(toT);
          done();
        };
      },
      busy: function () { return trans.active; }
    };

    // pointer controls
    var dragging = false, lastX = 0, lastY = 0, moved = 0;
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    function pdown(x, y) { dragging = true; moved = 0; lastX = x; lastY = y; self.stage.classList.add('ohsm-drag'); }
    function pmove(x, y) {
      if (!dragging) return;
      var dx = x - lastX, dy = y - lastY; lastX = x; lastY = y;
      moved += Math.abs(dx) + Math.abs(dy);
      rig.yawV -= dx * 0.0035; rig.pitchV += dy * 0.0028;
    }
    function pup(x, y) {
      self.stage.classList.remove('ohsm-drag');
      if (dragging && moved < 6 && self.current >= 0 && !trans.active) {
        pointer.x = (x / window.innerWidth) * 2 - 1;
        pointer.y = -(y / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        var hits = raycaster.intersectObjects(starObjects.map(function (s) { return s.core; }));
        if (hits.length) self.travelTo(hits[0].object.userData.idx);
      }
      dragging = false;
    }
    var L = this.listeners = [];
    function on(t, ev, fn, op) { t.addEventListener(ev, fn, op); L.push([t, ev, fn]); }
    on(this.stage, 'mousedown', function (e) { pdown(e.clientX, e.clientY); });
    on(window, 'mousemove', function (e) { pmove(e.clientX, e.clientY); });
    on(window, 'mouseup', function (e) { pup(e.clientX, e.clientY); });
    on(this.stage, 'touchstart', function (e) { var t = e.touches[0]; pdown(t.clientX, t.clientY); }, { passive: true });
    on(this.stage, 'touchmove', function (e) { var t = e.touches[0]; pmove(t.clientX, t.clientY); }, { passive: true });
    on(this.stage, 'touchend', function (e) { var t = e.changedTouches[0]; pup(t.clientX, t.clientY); }, { passive: true });
    on(this.stage, 'wheel', function (e) {
      if (self.current < 0 || trans.active) return;
      rig.dist = Math.min(72, Math.max(10, rig.dist + e.deltaY * 0.02));
    }, { passive: true });
    on(window, 'resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    var clock = new THREE.Clock();
    var tmp = new THREE.Vector3();
    function frame() {
      if (self.destroyed) return;
      self.raf = requestAnimationFrame(frame);
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;

      starObjects.forEach(function (s, si) {
        var pulse = 1 + Math.sin(t * 1.4 + si * 1.7) * 0.06;
        s.core.scale.setScalar(7 * s.cap.size * pulse);
        s.halo.scale.setScalar(22 * s.cap.size * (1 + Math.sin(t * 0.9 + si) * 0.05));
        s.halo.material.opacity = (si === self.current ? 0.95 : 0.5) + Math.sin(t * 1.1 + si) * 0.08;
        s.motes.forEach(function (m) {
          var u = m.userData; u.angle += u.speed * dt;
          m.position.set(
            s.basePos.x + Math.cos(u.angle) * u.radius,
            s.basePos.y + Math.sin(u.angle) * u.radius * u.tilt,
            s.basePos.z + Math.sin(u.angle) * u.radius * 0.55);
        });
        if (s.artifact) animateArtifact(s.artifact, si, si === self.current, t, dt);
      });

      var strength = 0;
      if (trans.active) {
        trans.t += dt / trans.dur;
        var k = Math.min(trans.t, 1), e2 = ease(k);
        camera.position.lerpVectors(trans.from, trans.to, e2);
        tmp.lerpVectors(trans.fromT, trans.toT, Math.min(1, e2 * 1.15));
        camera.lookAt(tmp);
        strength = Math.sin(k * Math.PI);
        camera.fov = 62 + strength * 32;
        camera.updateProjectionMatrix();
        if (k >= 1) {
          trans.active = false; strength = 0;
          camera.fov = 62; camera.updateProjectionMatrix();
          if (trans.onDone) trans.onDone();
        }
      } else if (self.current >= 0) {
        rig.yaw += rig.yawV; rig.pitch += rig.pitchV;
        rig.yawV *= 0.90; rig.pitchV *= 0.90;
        rig.pitch = Math.max(-1.1, Math.min(1.1, rig.pitch));
        if (!dragging) rig.yaw += dt * 0.03;
        applyRig();
      }

      warpMat.opacity = strength * 0.8;
      if (strength > 0.01) {
        for (var i = 0; i < WARP_COUNT; i++) {
          var s2 = seed[i];
          s2.z += dt * (140 + strength * 620);
          if (s2.z > 6) s2.z -= 180;
          var len = s2.len * strength;
          warpPos[i * 6] = s2.x; warpPos[i * 6 + 1] = s2.y; warpPos[i * 6 + 2] = s2.z;
          warpPos[i * 6 + 3] = s2.x; warpPos[i * 6 + 4] = s2.y; warpPos[i * 6 + 5] = s2.z - len;
        }
        warpGeo.attributes.position.needsUpdate = true;
      }
      self.flash.style.opacity = strength * 0.85;
      self.streaks.style.opacity = strength * 0.75;

      starObjects.forEach(function (s, si) {
        var le = labelEls[si];
        tmp.copy(s.basePos).project(camera);
        var behind = tmp.z > 1;
        var x = (tmp.x * 0.5 + 0.5) * window.innerWidth;
        var y = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
        var dd = camera.position.distanceTo(s.basePos);
        var vis = !behind && !trans.active && self.current >= 0 && dd < 180 && si !== self.current;
        le.classList.toggle('ohsm-vis', vis);
        if (vis) { le.style.left = x + 'px'; le.style.top = y + 'px'; }
      });

      renderer.render(scene, camera);
    }
    frame();
    this.renderer = renderer;
    this.travelTo(0, true);
  };

  Overlay.prototype.refreshDock = function () {
    var kids = this.dots.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].classList.toggle('ohsm-here', i === this.current);
      kids[i].classList.toggle('ohsm-seen', !!this.visited[i] && i !== this.current);
    }
    this.prevBtn.disabled = this.current <= 0;
    this.nextBtn.disabled = this.current >= CAPS.length - 1;
  };

  Overlay.prototype.showPanel = function (idx) {
    var c = CAPS[idx];
    this.pe.children[0].textContent = 'CAPABILITY ' + pad(idx + 1) + ' / ' + pad(CAPS.length);
    this.pe.children[1].textContent = c.tag;
    this.pTitle.textContent = c.name;
    this.pLead.textContent = c.lead;
    var ul = this.chipsWrap.querySelector('ul');
    ul.innerHTML = '';
    if (c.chips.length) {
      this.chipsWrap.style.display = '';
      c.chips.forEach(function (chip) { ul.appendChild(el('li', '', esc(chip))); });
    } else this.chipsWrap.style.display = 'none';
    this.closeDemo();
    if (c.demo && DEMOS[c.demo]) {
      this.tryBtn.style.display = '';
    } else this.tryBtn.style.display = 'none';
    if (idx >= CAPS.length - 1) {
      this.goBtn.textContent = 'REQUEST EARLY ACCESS \u25b8';
    } else {
      this.goBtn.textContent = 'NEXT: ' + CAPS[idx + 1].name.toUpperCase() + ' \u25b8';
    }
    this.panel.classList.add('ohsm-show');
  };
  Overlay.prototype.hidePanel = function () { this.panel.classList.remove('ohsm-show'); };

  Overlay.prototype.toggleDemo = function () {
    if (this.demoHost.classList.contains('ohsm-open')) { this.closeDemo(); return; }
    var c = CAPS[this.current];
    if (!c || !c.demo || !DEMOS[c.demo]) return;
    this.demoHost.innerHTML = '';
    this.demoCleanup = DEMOS[c.demo](this.demoHost) || null;
    this.demoHost.classList.add('ohsm-open');
    this.tryBtn.textContent = 'CLOSE DEMO';
  };
  Overlay.prototype.closeDemo = function () {
    if (this.demoCleanup) { try { this.demoCleanup(); } catch (e) {} this.demoCleanup = null; }
    this.demoHost.classList.remove('ohsm-open');
    this.demoHost.innerHTML = '';
    this.tryBtn.textContent = 'TRY IT';
  };

  Overlay.prototype.travelTo = function (idx, instant) {
    var self = this;
    if (this.three && this.three.busy()) return;
    if (idx === this.current && !instant) { this.showPanel(idx); return; }
    this.hidePanel();
    this.finale.classList.remove('ohsm-show');
    var arrive = function () {
      self.current = idx; self.visited[idx] = true;
      self.refreshDock();
      setTimeout(function () { self.showPanel(idx); }, self.fallback ? 0 : 220);
    };
    if (this.fallback || REDUCED || instant || this.current === -1 || !this.three) {
      if (this.three) this.three.jump(idx);
      arrive();
    } else {
      this.refreshDock();
      this.three.fly(idx, arrive);
    }
  };

  Overlay.prototype.close = function () {
    var self = this;
    if (this.destroyed) return;
    this.destroyed = true;
    this.closeDemo();
    cancelAnimationFrame(this.raf);
    document.removeEventListener('keydown', this.keyHandler);
    (this.listeners || []).forEach(function (l) { l[0].removeEventListener(l[1], l[2]); });
    if (this.renderer) { try { this.renderer.dispose(); } catch (e) {} }
    document.body.style.overflow = this.prevOverflow || '';
    this.rootEl.classList.remove('ohsm-on');
    setTimeout(function () { if (self.rootEl.parentNode) self.rootEl.parentNode.removeChild(self.rootEl); }, 480);
  };

  /* ============================================================
   * 6.5 HERO 3D MINI-MAP — previews the full starmap in the teaser
   *     section hero. Loads Three.js (same promise as Overlay), builds
   *     a compact perspective view of the 12 capability stations along
   *     their world-space spine, with a scout travelling the path.
   *     Gracefully falls back to 2D starfield if WebGL/Three.js fails.
   * ============================================================ */
  function renderHero3D(canvas, opts) {
    requestAnimationFrame(function () {   // defer 1 frame so canvas is laid out
      loadThree(opts.threeSrc).then(function (THREE) {
        var W = canvas.parentElement ? canvas.parentElement.clientWidth : 900;
        var H = canvas.parentElement ? canvas.parentElement.clientHeight : 460;
        if (W < 1) W = 900;
        if (H < 1) H = 460;

        var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);

        var scene = new THREE.Scene();
        var cam   = new THREE.PerspectiveCamera(55, W / H, 0.1, 1200);
        /* Camera near-on so the station cluster centers within the right-side stage */
        cam.position.set(10, 18, 72);
        cam.lookAt(18, 0, -38);

        /* material factories — same additive-blend aesthetic as the full overlay */
        var OG = 0xea7c44, OGD = 0xc4571c, WH = 0xf8fafc;
        function edgeM(hex, op) {
          return new THREE.LineBasicMaterial({
            color: hex, opacity: op, transparent: true,
            blending: THREE.AdditiveBlending, depthWrite: false
          });
        }
        function fillM(hex, op) {
          return new THREE.MeshBasicMaterial({
            color: hex, opacity: op, transparent: true,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
          });
        }

        /* scale CAPS world-space positions to hero viewport */
        var SX = 0.165, SY = 0.22, SZ = 0.135, XBIAS = 18;
        var stMeshes = [], capV3 = [];
        CAPS.forEach(function (c, i) {
          var px = c.pos[0] * SX + XBIAS, py = c.pos[1] * SY, pz = c.pos[2] * SZ;
          capV3.push(new THREE.Vector3(px, py, pz));
          var sz = c.size * 1.6;
          var accent = (i % 3 === 0) || i === 1 || i === 2;
          var g = new THREE.Group();
          g.position.set(px, py, pz);
          var geo = new THREE.IcosahedronGeometry(sz, 1);
          g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeM(accent ? OG : WH, accent ? 0.9 : 0.45)));
          g.add(new THREE.Mesh(geo, fillM(accent ? OGD : WH, accent ? 0.06 : 0.02)));
          if (accent) {
            var hGeo = new THREE.TorusGeometry(sz * 2.0, 0.1, 4, 20);
            var halo = new THREE.LineSegments(new THREE.EdgesGeometry(hGeo), edgeM(OG, 0.22));
            halo.rotation.x = Math.PI / 2.5;
            g.add(halo);
          }
          stMeshes.push({ g: g, ph: i * 0.54, accent: accent });
          scene.add(g);
        });

        /* smooth spine through all station positions */
        var spine = new THREE.CatmullRomCurve3(capV3);
        scene.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(spine.getPoints(100)),
          edgeM(OGD, 0.2)
        ));

        /* travelling scout dot */
        var scoutM = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), fillM(OG, 1.0));
        var trailM = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), fillM(OGD, 0.45));
        scene.add(scoutM);
        scene.add(trailM);

        /* ambient particle field */
        var PC = 180, pPos = new Float32Array(PC * 3);
        for (var j = 0; j < PC; j++) {
          pPos[j * 3]     = (Math.random() - 0.5) * 160;
          pPos[j * 3 + 1] = (Math.random() - 0.5) * 80;
          pPos[j * 3 + 2] = (Math.random() - 0.5) * 140 - 40;
        }
        var pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
          color: WH, size: 0.45, opacity: 0.32, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false
        })));

        /* animation loop */
        var rafH, disposed = false, t0 = performance.now();
        function frame(ts) {
          if (disposed) return;
          rafH = requestAnimationFrame(frame);
          try {
            var t = (ts - t0) * 0.001;
            /* gentle camera drift */
            cam.position.x = 10 + Math.sin(t * 0.17) * 4;
            cam.position.y = 18  + Math.cos(t * 0.11) * 3;
            cam.lookAt(18 + Math.sin(t * 0.09) * 2, Math.cos(t * 0.07), -38);
            /* station pulse + slow rotation */
            stMeshes.forEach(function (sm) {
              sm.g.scale.setScalar(0.88 + 0.12 * Math.sin(t * 1.5 + sm.ph));
              sm.g.rotation.y = t * 0.28 + sm.ph;
              sm.g.rotation.z = Math.sin(t * 0.19 + sm.ph) * 0.15;
            });
            /* scout travels the spine */
            var prog = (t * 0.065) % 1;
            var sp  = spine.getPoint(prog);
            var sp2 = spine.getPoint(Math.max(0, prog - 0.018));
            if (sp)  scoutM.position.copy(sp);
            if (sp2) trailM.position.copy(sp2);
            renderer.render(scene, cam);
          } catch (e) {
            /* renderer threw (e.g. WebGL context lost in headless env) — stop loop, keep 2D starfield */
            disposed = true;
            cancelAnimationFrame(rafH);
            try { renderer.dispose(); } catch (_) {}
          }
        }
        rafH = requestAnimationFrame(frame);
        canvas.classList.add('ohsm-ready'); /* triggers CSS fade-in */

        /* responsive resize */
        function onResize() {
          if (disposed) return;
          var nW = canvas.parentElement ? canvas.parentElement.clientWidth : canvas.clientWidth;
          var nH = canvas.parentElement ? canvas.parentElement.clientHeight : canvas.clientHeight;
          if (nW < 1 || nH < 1) return;
          cam.aspect = nW / nH;
          cam.updateProjectionMatrix();
          renderer.setSize(nW, nH);
        }
        window.addEventListener('resize', onResize);

        /* cleanup when section is removed (SPA navigation) */
        var mo = new MutationObserver(function () {
          if (!canvas.isConnected) {
            disposed = true;
            cancelAnimationFrame(rafH);
            renderer.dispose();
            window.removeEventListener('resize', onResize);
            mo.disconnect();
          }
        });
        mo.observe(document.body, { childList: true, subtree: true });

      }).catch(function () { /* graceful: 2D starfield remains visible */ });
    });
  }

  /* ============================================================
   * 7. LANDING-PAGE SECTION (the entry point)
   * ============================================================ */
  function renderSection(host, opts) {
    host.classList.add('ohsm-section');
    host.innerHTML = '';

    // ambient teaser starfield (2D canvas — zero deps, paused offscreen)
    var teaser = el('canvas', 'ohsm-teaser-stars');
    host.appendChild(teaser);
    var stars = [];
    function sizeTeaser() {
      teaser.width = host.clientWidth; teaser.height = host.clientHeight;
      stars = [];
      var count = Math.min(160, Math.floor(host.clientWidth / 7));
      for (var i = 0; i < count; i++) {
        stars.push({ x: Math.random() * teaser.width, y: Math.random() * teaser.height,
          r: Math.random() * 1.4 + .3, p: Math.random() * Math.PI * 2,
          warm: Math.random() < 0.3 });
      }
    }
    sizeTeaser();
    var running = true, tRaf = 0;
    function drawTeaser(ts) {
      if (!running) return;
      tRaf = requestAnimationFrame(drawTeaser);
      var g = teaser.getContext('2d');
      g.clearRect(0, 0, teaser.width, teaser.height);
      stars.forEach(function (s) {
        var a = REDUCED ? .5 : .3 + .45 * (0.5 + 0.5 * Math.sin(ts / 900 + s.p));
        g.fillStyle = s.warm ? 'rgba(234,124,68,' + a + ')' : 'rgba(226,232,240,' + (a * .8) + ')';
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
      });
    }
    tRaf = requestAnimationFrame(drawTeaser);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var vis = entries[0].isIntersecting;
        if (vis && !running) { running = true; tRaf = requestAnimationFrame(drawTeaser); }
        if (!vis && running) { running = false; cancelAnimationFrame(tRaf); }
      }).observe(host);
    }
    window.addEventListener('resize', sizeTeaser);

    // section content — feature-section copy, no hero repetition
    var inner = el('div', 'ohsm-inner');
    var copy = el('div', 'ohsm-copy');
    copy.appendChild(el('div', 'ohsm-eyebrow', 'PLATFORM MAP \u00b7 INTERACTIVE'));
    copy.appendChild(el('h2', '', 'Every capability.<br>One map you can fly.'));
    copy.appendChild(el('p', 'ohsm-sub',
      'Eleven platform capabilities, laid out as an interactive 3D map. Jump between them, look around each one, and try a hands-on preview of how it works about two minutes, end to end.'));
    var row = el('div', 'ohsm-row');
    var launch = el('button', 'ohsm-btn ohsm-btn-primary', 'EXPLORE THE MAP \u25b8');
    launch.addEventListener('click', function () {
      launch.setAttribute('aria-busy', 'true');
      launch.classList.add('ohsm-loading');
      scheduleStarmapWork(function () {
        launch.removeAttribute('aria-busy');
        launch.classList.remove('ohsm-loading');
        new Overlay(opts);
      });
    });
    row.appendChild(launch);
    row.appendChild(el('span', 'ohsm-meta', '3D \u00b7 INTERACTIVE \u00b7 ~2 MIN \u00b7 KEYBOARD &amp; TOUCH FRIENDLY'));
    copy.appendChild(row);
    inner.appendChild(copy);
    var stage = el('div', 'ohsm-stage-3d');
    var hero3d = el('canvas', 'ohsm-hero-3d');
    stage.appendChild(hero3d);
    inner.appendChild(stage);   /* split hero: copy left, 3D map centered right */
    host.appendChild(inner);
    renderHero3D(hero3d, opts);
  }

  /* ============================================================
   * 8. PUBLIC API + AUTO-MOUNT
   * ============================================================ */
  var styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    var st = document.createElement('style');
    st.setAttribute('data-ohsm', '1');
    st.textContent = CSS;
    document.head.appendChild(st);
    styleInjected = true;
  }

  window.OmniHubStarmap = {
    version: '1.0.0',
    mount: function (target, options) {
      var host = typeof target === 'string' ? document.querySelector(target) : target;
      if (!host) return null;
      var opts = Object.assign({}, DEFAULTS, options || {});
      injectStyle();
      if (opts.loadFonts) ensureFonts();
      renderSection(host, opts);
      return host;
    },
    open: function (options) {
      var opts = Object.assign({}, DEFAULTS, options || {});
      injectStyle();
      if (opts.loadFonts) ensureFonts();
      return new Overlay(opts);
    }
  };

  function auto() {
    var nodes = document.querySelectorAll('[data-omnihub-starmap]');
    for (var i = 0; i < nodes.length; i++) {
      var optAttr = nodes[i].getAttribute('data-omnihub-starmap');
      var opts = {};
      if (optAttr) { try { opts = JSON.parse(optAttr); } catch (e) {} }
      window.OmniHubStarmap.mount(nodes[i], opts);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})();
