import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = process.argv[2] || '.';
const scan = JSON.parse(readFileSync(join(ROOT, '.understand-anything/tmp/ua-scan-results.json'), 'utf-8'));

const outDir = join(ROOT, '.understand-anything');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// ── Layer definitions ────────────────────────────────────────────────
const LAYERS = [
  { id: 'L0', name: 'Client Apps', color: '#6366f1', description: 'React/Vite SPA + Capacitor mobile shell' },
  { id: 'L1', name: 'Edge & Gateway', color: '#f59e0b', description: 'Supabase Edge Functions + Deno runtime' },
  { id: 'L2', name: 'Orchestration', color: '#10b981', description: 'Temporal Python workflows + activities' },
  { id: 'L3', name: 'Data & Auth', color: '#3b82f6', description: 'Supabase Postgres + Auth + Realtime' },
  { id: 'L4', name: 'Web3 / Chain', color: '#8b5cf6', description: 'Hardhat + Solidity + Ethers / Wagmi' },
  { id: 'L5', name: 'Infra / CI', color: '#ef4444', description: 'Docker + Terraform + GitHub Actions' },
  { id: 'L6', name: 'Agent System', color: '#ec4899', description: 'AI skills, protocols, prompts' },
];

// ── Path → layer classifier ──────────────────────────────────────────
function classifyLayer(file) {
  const p = file.path;
  if (p.startsWith('contracts/') || p.startsWith('src/contracts') || p.endsWith('.sol') || p.includes('hardhat') || p.includes('web3') || p.includes('wallet') || p.includes('nft') || p.includes('alchemy')) return 'L4';
  if (p.startsWith('orchestrator/') || p.includes('temporal') || p.includes('workflow') || p.includes('activities/')) return 'L2';
  if (p.startsWith('supabase/') || p.startsWith('services/') || p.includes('migration') || p.includes('database') || p.includes('auth/')) return 'L3';
  if (p.startsWith('terraform/') || p.startsWith('.github/') || p.includes('docker') || p.includes('Dockerfile') || p.includes('docker-compose') || p.endsWith('.tf') || p.endsWith('.sh') && p.includes('deploy')) return 'L5';
  if (p.startsWith('.agents/') || p.startsWith('.claude/') || p.startsWith('.cursor/') || p.endsWith('SKILL.md') || p.includes('protocol') || p.includes('local-agents')) return 'L6';
  if (p.startsWith('src/') || p.startsWith('apps/') || p.startsWith('android/') || p.startsWith('ios/') || p.startsWith('sim/') || p.includes('capacitor')) return 'L0';
  if (p.startsWith('edge/') || p.includes('edge-function') || p.startsWith('api/') || p.startsWith('functions/') || p.startsWith('packages/')) return 'L1';
  if (file.fileCategory === 'infra' || file.fileCategory === 'script') return 'L5';
  if (file.fileCategory === 'docs') return 'L6';
  return 'L0';
}

// ── Domain classifier ────────────────────────────────────────────────
function classifyDomain(file) {
  const p = file.path.toLowerCase();
  if (p.includes('auth') || p.includes('zero-trust') || p.includes('security') || p.includes('guardian') || p.includes('protect')) return 'auth-security';
  if (p.includes('web3') || p.includes('wallet') || p.includes('nft') || p.includes('contract') || p.includes('.sol') || p.includes('hardhat') || p.includes('alchemy') || p.includes('siwe') || p.includes('wagmi')) return 'web3';
  if (p.includes('orchestrat') || p.includes('workflow') || p.includes('temporal') || p.includes('activit')) return 'orchestration';
  if (p.includes('omnidash') || p.includes('dashboard') || p.includes('omnihub-site')) return 'dashboard';
  if (p.includes('omniconnect') || p.includes('omnilink') || p.includes('omnibridge') || p.includes('omniport')) return 'omni-protocol';
  if (p.includes('payment') || p.includes('stripe') || p.includes('checkout') || p.includes('subscri') || p.includes('billing')) return 'payments';
  if (p.includes('voice') || p.includes('audio') || p.includes('realtime-audio')) return 'voice-ai';
  if (p.includes('i18n') || p.includes('translation') || p.includes('worldwide') || p.includes('locale')) return 'i18n';
  if (p.includes('armageddon') || p.includes('chaos') || p.includes('sim/') || p.includes('guard-rail') || p.includes('resilience')) return 'chaos-testing';
  if (p.includes('test') || p.includes('spec') || p.includes('e2e') || p.includes('vitest') || p.includes('playwright')) return 'testing';
  if (p.includes('terraform') || p.includes('docker') || p.includes('.github') || p.includes('ci') || p.includes('cd')) return 'infra-ci';
  if (p.includes('supabase') || p.includes('database') || p.includes('migration') || p.includes('postgres')) return 'database';
  if (p.includes('agent') || p.includes('skill') || p.includes('protocol') || p.includes('.claude') || p.includes('.cursor')) return 'agent-system';
  if (p.includes('store') || p.includes('context') || p.includes('hook') || p.includes('provider')) return 'state-management';
  if (p.includes('component') || p.includes('layout') || p.includes('page') || p.includes('ui') || p.includes('icon')) return 'ui-components';
  return 'core';
}

// ── Build nodes ──────────────────────────────────────────────────────
const CODE_LANGS = new Set(['typescript', 'javascript', 'python', 'solidity', 'shell', 'sql']);
const codeFiles = scan.files.filter(f => CODE_LANGS.has(f.language) && f.sizeLines > 5);

// Group by directory modules (top-level segments)
const moduleMap = {};
for (const file of codeFiles) {
  const parts = file.path.split('/');
  const topDir = parts.length === 1 ? 'root' : parts[0];
  const subDir = parts.length >= 2 ? parts.slice(0, 2).join('/') : topDir;
  const key = subDir;
  if (!moduleMap[key]) {
    moduleMap[key] = { files: [], layerId: classifyLayer(file), domain: classifyDomain(file) };
  }
  moduleMap[key].files.push(file);
  // Re-classify using majority
}

// Deduplicate modules: collapse tiny ones into parent
const nodes = [];
const nodeIndex = {};

let nid = 0;
for (const [mod, data] of Object.entries(moduleMap)) {
  const totalLines = data.files.reduce((s, f) => s + f.sizeLines, 0);
  const id = `n${nid++}`;
  const label = mod.replace(/\//g, ' / ');
  const layer = LAYERS.find(l => l.id === data.layerId) || LAYERS[0];
  const node = {
    id,
    label,
    path: mod,
    layerId: data.layerId,
    layerName: layer.name,
    domain: data.domain,
    color: layer.color,
    fileCount: data.files.length,
    lineCount: totalLines,
    languages: [...new Set(data.files.map(f => f.language))],
    size: Math.max(8, Math.min(40, Math.sqrt(totalLines / 10))),
    files: data.files.slice(0, 5).map(f => f.path),
  };
  nodes.push(node);
  nodeIndex[mod] = id;
}

// ── Build edges from importMap ───────────────────────────────────────
const edgeSet = new Set();
const edges = [];

function getNodeForPath(filePath) {
  const parts = filePath.split('/');
  // Try 2-segment key first, then 1-segment
  const key2 = parts.length >= 2 ? parts.slice(0, 2).join('/') : parts[0];
  const key1 = parts[0];
  return nodeIndex[key2] || nodeIndex[key1] || null;
}

for (const [src, targets] of Object.entries(scan.importMap)) {
  const srcNode = getNodeForPath(src);
  if (!srcNode) continue;
  for (const tgt of targets) {
    const tgtNode = getNodeForPath(tgt);
    if (!tgtNode || tgtNode === srcNode) continue;
    const key = `${srcNode}->${tgtNode}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ source: srcNode, target: tgtNode });
    }
  }
}

// ── Architecture clusters ────────────────────────────────────────────
const TRINITY = {
  pillars: [
    {
      name: 'React/Vite SPA',
      description: 'TypeScript frontend — OmniDash, OmniConnect, Web3 wallet, Voice AI, Zero-Trust auth',
      entryPoints: ['src/main.tsx', 'src/App.tsx', 'index.html'],
      keyModules: ['src/omnidash', 'src/omniconnect', 'src/components', 'src/features', 'src/stores', 'src/zero-trust'],
      frameworks: ['React', 'Vite', 'TailwindCSS', 'TanStack Query', 'Zustand', 'Framer Motion', 'Wagmi'],
      layer: 'L0',
    },
    {
      name: 'Temporal Orchestrator (Python)',
      description: 'Agent saga workflows, universal sync, intent registry, policy engine, observability',
      entryPoints: ['orchestrator/main.py', 'orchestrator/server.py'],
      keyModules: ['orchestrator/workflows', 'orchestrator/activities', 'orchestrator/core', 'orchestrator/policies', 'orchestrator/observability'],
      frameworks: ['Temporal', 'FastAPI', 'OpenTelemetry', 'Ruff', 'Pytest'],
      layer: 'L2',
    },
    {
      name: 'Supabase Infrastructure',
      description: '28 Edge Functions (Deno/TS), Postgres migrations, Auth, Realtime, Storage',
      entryPoints: ['supabase/config.toml', 'supabase/functions'],
      keyModules: ['supabase/functions', 'supabase/migrations', 'services/', 'api/'],
      frameworks: ['Supabase', 'PostgreSQL', 'Deno', 'Stripe', 'Hardhat'],
      layer: 'L1',
    },
  ],
};

// ── Final graph ──────────────────────────────────────────────────────
const graph = {
  meta: {
    name: scan.name,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    totalFiles: scan.totalFiles,
    analyzedNodes: nodes.length,
    edges: edges.length,
    languages: scan.languages,
    frameworks: scan.frameworks,
    estimatedComplexity: scan.estimatedComplexity,
  },
  layers: LAYERS,
  trinity: TRINITY,
  domains: [
    { id: 'auth-security', name: 'Auth & Security', color: '#ef4444' },
    { id: 'web3', name: 'Web3 / NFT', color: '#8b5cf6' },
    { id: 'orchestration', name: 'Orchestration', color: '#10b981' },
    { id: 'dashboard', name: 'Dashboard', color: '#6366f1' },
    { id: 'omni-protocol', name: 'Omni Protocol', color: '#f59e0b' },
    { id: 'payments', name: 'Payments', color: '#22c55e' },
    { id: 'voice-ai', name: 'Voice AI', color: '#06b6d4' },
    { id: 'i18n', name: 'i18n / L10n', color: '#f97316' },
    { id: 'chaos-testing', name: 'Chaos Testing', color: '#dc2626' },
    { id: 'testing', name: 'Testing', color: '#84cc16' },
    { id: 'infra-ci', name: 'Infra / CI', color: '#64748b' },
    { id: 'database', name: 'Database', color: '#3b82f6' },
    { id: 'agent-system', name: 'Agent System', color: '#ec4899' },
    { id: 'state-management', name: 'State Mgmt', color: '#a855f7' },
    { id: 'ui-components', name: 'UI Components', color: '#14b8a6' },
    { id: 'core', name: 'Core', color: '#94a3b8' },
  ],
  nodes,
  edges,
};

writeFileSync(join(outDir, 'knowledge-graph.json'), JSON.stringify(graph, null, 2));
console.log(`[build-graph] ✓ ${nodes.length} nodes, ${edges.length} edges → .understand-anything/knowledge-graph.json`);
