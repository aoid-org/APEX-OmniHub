/* APEX Knowledge Graph — Enhanced Features Module
   Adds: watch-mode, drill-down, dep-flow, heatmap, tour
   Loaded by knowledge-graph.html via <script type="module"> */

export const WATCH_INTERVAL = 3000;

// ── Live polling ─────────────────────────────────────────────────────
export function startWatcher(onUpdate) {
  let lastTs = 0;
  const poll = async () => {
    try {
      const r = await fetch('/api/meta?_=' + Date.now());
      if (!r.ok) return;
      const m = await r.json();
      if (m.ts > lastTs) {
        lastTs = m.ts;
        if (m.status === 'ready') {
          const g = await fetch('knowledge-graph.json?_=' + m.ts).then(x => x.json());
          onUpdate(g, m);
        } else if (m.status === 'building') {
          showBuildBadge(m.message);
        }
      }
    } catch { /* server not running */ }
  };
  poll();
  return setInterval(poll, WATCH_INTERVAL);
}

function showBuildBadge(msg) {
  let b = document.getElementById('build-badge');
  if (!b) {
    b = document.createElement('div');
    b.id = 'build-badge';
    b.style.cssText = 'position:fixed;bottom:16px;left:16px;background:#f59e0b;color:#000;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;z-index:999';
    document.body.appendChild(b);
  }
  b.textContent = '⟳ ' + (msg || 'Rebuilding…');
  setTimeout(() => b?.remove(), 4000);
}

export function hideBuildBadge() {
  document.getElementById('build-badge')?.remove();
  let b = document.createElement('div');
  b.style.cssText = 'position:fixed;bottom:16px;left:16px;background:#10b981;color:#000;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;z-index:999;transition:opacity .5s';
  b.textContent = '✓ Graph updated';
  document.body.appendChild(b);
  setTimeout(() => { b.style.opacity = '0'; setTimeout(() => b.remove(), 500); }, 1500);
}

// ── Dependency flow: full upstream chain ─────────────────────────────
export function computeChain(nodeId, edges, direction = 'both') {
  const visited = new Set();
  const queue = [nodeId];
  const edgesInChain = new Set();
  while (queue.length) {
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const e of edges) {
      const s = typeof e.source === 'object' ? e.source.id : e.source;
      const t = typeof e.target === 'object' ? e.target.id : e.target;
      if ((direction === 'up' || direction === 'both') && t === cur && !visited.has(s)) {
        queue.push(s); edgesInChain.add(e);
      }
      if ((direction === 'down' || direction === 'both') && s === cur && !visited.has(t)) {
        queue.push(t); edgesInChain.add(e);
      }
    }
  }
  return { nodes: visited, edges: edgesInChain };
}

// ── Complexity heatmap ───────────────────────────────────────────────
export function heatmapColor(lineCount) {
  const stops = [
    [0,     '#1e3a5f'],
    [200,   '#1d4ed8'],
    [500,   '#7c3aed'],
    [1000,  '#db2777'],
    [3000,  '#dc2626'],
    [10000, '#ff6b00'],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (lineCount <= stops[i][0]) {
      const t = (lineCount - stops[i-1][0]) / (stops[i][0] - stops[i-1][0]);
      return lerpColor(stops[i-1][1], stops[i][1], t);
    }
  }
  return stops[stops.length-1][1];
}

function lerpColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa>>16)&255) + t*(((pb>>16)&255)-((pa>>16)&255)));
  const g = Math.round(((pa>>8)&255) + t*(((pb>>8)&255)-((pa>>8)&255)));
  const bl = Math.round((pa&255) + t*((pb&255)-(pa&255)));
  return '#'+[r,g,bl].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export function heatmapLegend() {
  return [
    { color:'#1e3a5f', label:'< 200 lines' },
    { color:'#1d4ed8', label:'200–500' },
    { color:'#7c3aed', label:'500–1k' },
    { color:'#db2777', label:'1k–3k' },
    { color:'#dc2626', label:'3k–10k' },
    { color:'#ff6b00', label:'> 10k lines' },
  ];
}

// ── Tour steps ───────────────────────────────────────────────────────
export const TOUR_STEPS = [
  {
    title: '⬡ Welcome to APEX-OmniHub',
    body: 'This graph maps 2,339 source files across 3 architecture layers (graph node count is dynamic — see header). Use arrow keys or click Next to explore.',
    highlight: null,
    layer: null,
  },
  {
    title: '① React / Vite SPA — Layer 0',
    body: 'The frontend shell: OmniDash, OmniConnect, Web3 wallet integration, Voice AI interface, and Zero-Trust auth gate. Built with React 18, Vite 7, TailwindCSS, Zustand, TanStack Query, and Wagmi.',
    highlight: 'L0',
    layer: 'L0',
  },
  {
    title: '② Edge Functions — Layer 1',
    body: '32 Deno-hosted Supabase Edge Functions (33 directories including _shared). Key ones: apex-agent (APEX Agent AI orchestration), stripe-webhook (billing), verify-nft (NFT gating), mcp-proxy (MCP bridge), omni-runs (workflow trigger).',
    highlight: 'L1',
    layer: 'L1',
  },
  {
    title: '③ Temporal Orchestrator — Layer 2',
    body: 'Python Temporal workflows: agent_saga.py (1.2k lines — core saga, safely decomposed), universal_saga.py (cross-domain sync), intent_registry.py (AI intent routing). Exposes REST via FastAPI server.py.',
    highlight: 'L2',
    layer: 'L2',
  },
  {
    title: '④ Supabase Data Layer — Layer 3',
    body: 'PostgreSQL + Auth + Realtime + Storage. Migrations manage schema evolution. Services/ contains domain-specific data access. Zero-Trust policies enforce row-level security.',
    highlight: 'L3',
    layer: 'L3',
  },
  {
    title: '⑤ Web3 / Chain — Layer 4',
    body: 'Hardhat + Solidity smart contracts. NFT gating (verify-nft edge fn). SIWE (Sign-In With Ethereum) auth. Wagmi + Ethers.js on the frontend. Alchemy webhooks for on-chain events.',
    highlight: 'L4',
    layer: 'L4',
  },
  {
    title: '⑥ Infra / CI — Layer 5',
    body: 'GitHub Actions (20 workflows): ci-runtime-gates, chaos-simulation-ci, cd-staging, compliance, security-regression-guard, orchestrator-ci. Terraform for cloud infra. Docker Compose for local orchestrator stack.',
    highlight: 'L5',
    layer: 'L5',
  },
  {
    title: '⑦ Agent System — Layer 6',
    body: 'APEX AI agent protocols: omnidev-v2, APEX-POWER-20X, omnitest skill, apex-data-architect. Cursor superpowers, Claude skills. The self-improving meta-layer that drives development velocity.',
    highlight: 'L6',
    layer: 'L6',
  },
  {
    title: '✓ Graph Ready',
    body: 'Switch between Layer / Domain / Heatmap views. Click any node for details. Hold Shift + click for dependency chain. Use the search box to isolate modules. Press Escape to exit tour.',
    highlight: null,
    layer: null,
  },
];
