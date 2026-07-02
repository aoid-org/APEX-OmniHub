/**
 * Orchestrator Blast-Radius Analyzer
 * EXECUTION_CONTRACT_2026-07 §B5: extends the Omnidash blast-radius pattern
 * to orchestrator/. Classifies orchestrator file changes into subsystem
 * surfaces. If blast radius exceeds 5 files, outputs BLOCKED-SCOPE.
 *
 * Usage: npx tsx scripts/orchestrator-blast-radius.ts [--base <ref>]
 *
 * Reads `git diff --name-only <base>...HEAD` (default base: origin/main,
 * falling back to main, then HEAD~1, then staged changes) and maps each
 * changed orchestrator/ file to an affected surface. Dependency-free.
 */

import { execSync } from 'node:child_process';

// ============================================================================
// Surface Classification Rules
// ============================================================================

const ORCHESTRATOR_SURFACES = [
  'workflows',
  'activities',
  'intent registry',
  'security',
  'cache/infrastructure',
  'omniboard',
  'omnilink',
  'policies',
  'database providers',
  'models/contracts',
  'observability',
  'server/worker entry',
  'config/metrics',
  'tests',
  'docs',
] as const;

type OrchestratorSurface = (typeof ORCHESTRATOR_SURFACES)[number];

interface SurfaceRule {
  readonly surface: OrchestratorSurface;
  readonly patterns: readonly RegExp[];
}

const SURFACE_RULES: readonly SurfaceRule[] = [
  { surface: 'tests', patterns: [/^orchestrator\/tests\//, /^orchestrator\/sandbox_test\.py$/] },
  { surface: 'docs', patterns: [/^orchestrator\/[^/]+\.md$/, /^orchestrator\/providers\/database\/README\.md$/] },
  { surface: 'workflows', patterns: [/^orchestrator\/workflows\//] },
  { surface: 'intent registry', patterns: [/^orchestrator\/core\//, /^orchestrator\/activities\/(universal_intents|resolve_intent)\.py$/] },
  { surface: 'activities', patterns: [/^orchestrator\/activities\//] },
  { surface: 'security', patterns: [/^orchestrator\/security\//] },
  { surface: 'cache/infrastructure', patterns: [/^orchestrator\/infrastructure\//] },
  { surface: 'omniboard', patterns: [/^orchestrator\/omniboard\//] },
  { surface: 'omnilink', patterns: [/^orchestrator\/omnilink\//] },
  { surface: 'policies', patterns: [/^orchestrator\/policies\//] },
  { surface: 'database providers', patterns: [/^orchestrator\/providers\/database\//] },
  { surface: 'models/contracts', patterns: [/^orchestrator\/models\//] },
  { surface: 'observability', patterns: [/^orchestrator\/observability\//] },
  { surface: 'server/worker entry', patterns: [/^orchestrator\/(server|main)\.py$/] },
  { surface: 'config/metrics', patterns: [/^orchestrator\/(config|metrics|sitecustomize)\.py$/, /^orchestrator\/pyproject\.toml$/] },
];

// ============================================================================
// Analysis
// ============================================================================

const BLAST_RADIUS_LIMIT = 5;

function tryDiff(cmd: string): string[] | null {
  try {
    const diff = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }); // NOSONAR
    return diff.trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

function getChangedFiles(baseRef: string | undefined): string[] {
  if (!baseRef) {
    // Best-effort: refresh origin/main so a stale local ref doesn't inflate
    // the diff with other merged work. Offline/failed fetch is fine — we
    // fall through the candidate list below.
    try {
      execSync('git fetch -q --no-tags origin main', { stdio: 'ignore' }); // NOSONAR
    } catch {
      /* offline or no remote — use existing refs */
    }
  }
  const candidates = baseRef
    ? [`git diff --name-only ${baseRef}...HEAD`]
    : [
        'git diff --name-only origin/main...HEAD',
        'git diff --name-only main...HEAD',
        'git diff --name-only HEAD~1',
        'git diff --cached --name-only',
      ];

  for (const cmd of candidates) {
    const files = tryDiff(cmd);
    if (files !== null) return files;
  }

  console.error('ERROR: Cannot determine changed files. Run from a git repository.');
  process.exit(1);
}

function classifyFile(filePath: string): OrchestratorSurface | null {
  for (const rule of SURFACE_RULES) {
    if (rule.patterns.some(pattern => pattern.test(filePath))) {
      return rule.surface;
    }
  }
  return null;
}

function analyze(): void {
  const baseFlagIndex = process.argv.indexOf('--base');
  const baseRef = baseFlagIndex !== -1 ? process.argv[baseFlagIndex + 1] : undefined;

  const changedFiles = getChangedFiles(baseRef);

  // Filter to only orchestrator files
  const orchestratorFiles = changedFiles.filter(f => f.startsWith('orchestrator/'));

  if (orchestratorFiles.length === 0) {
    console.log('✅ No orchestrator files affected. Blast radius: 0');
    return;
  }

  // Classify each file
  const surfaceMap = new Map<OrchestratorSurface, string[]>();
  for (const file of orchestratorFiles) {
    const surface = classifyFile(file) ?? 'config/metrics';
    const existing = surfaceMap.get(surface) ?? [];
    existing.push(file);
    surfaceMap.set(surface, existing);
  }

  // Report
  console.log('\n═══════════════════════════════════════════════');
  console.log('  ORCHESTRATOR BLAST-RADIUS REPORT');
  console.log('═══════════════════════════════════════════════\n');

  console.log(`Files affected: ${orchestratorFiles.length}`);
  console.log(`Surfaces affected: ${surfaceMap.size}\n`);

  for (const surface of ORCHESTRATOR_SURFACES) {
    const files = surfaceMap.get(surface);
    if (files) {
      console.log(`  [${surface.toUpperCase()}]`);
      for (const f of files) {
        console.log(`    • ${f}`);
      }
    }
  }

  console.log('');

  // Gate check (§B3/§B5: one task touches ≤5 files)
  if (orchestratorFiles.length > BLAST_RADIUS_LIMIT) {
    console.error('═══════════════════════════════════════════════');
    console.error('  BLOCKED-SCOPE: Architecture change detected.');
    console.error(`  Surfaces affected: ${[...surfaceMap.keys()].join(', ')}`);
    console.error('  Awaiting escalation (EXECUTION_CONTRACT_2026-07 §B6).');
    console.error('═══════════════════════════════════════════════');
    process.exit(1);
  }

  console.log('✅ Blast radius within limits. Proceed with merge.');
}

analyze();
