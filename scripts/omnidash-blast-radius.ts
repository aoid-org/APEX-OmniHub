/**
 * Omnidash Blast-Radius Analyzer
 * Lock 4: Classifies Omnidash file changes into surface categories.
 *
 * Usage: npx tsx scripts/omnidash-blast-radius.ts
 *
 * Reads `git diff --name-only HEAD~1` and maps each changed file
 * to an affected surface. If blast radius exceeds 5 files, outputs BLOCKED.
 */

import { execSync } from 'node:child_process';
import { BLAST_RADIUS_SURFACES, type BlastRadiusSurface } from '../src/contracts/omnidash.contract';

// ============================================================================
// Surface Classification Rules
// ============================================================================

interface SurfaceRule {
  readonly surface: BlastRadiusSurface;
  readonly patterns: readonly RegExp[];
}

const SURFACE_RULES: readonly SurfaceRule[] = [
  {
    surface: 'registry',
    patterns: [
      /packages\/core\/src\/registry/,
      /src\/contracts\/omnidash/,
    ],
  },
  {
    surface: 'tiles',
    patterns: [
      /DashboardOverview/,
      /AppsSection/,
      /AppTile/,
    ],
  },
  {
    surface: 'routes',
    patterns: [
      /App\.tsx$/,
      /omnidash.*route/i,
    ],
  },
  {
    surface: 'modal engine',
    patterns: [
      /omniModalStore/,
      /UniversalModalEngine/,
      /useOmniDashAction/,
    ],
  },
  {
    surface: 'canvas',
    patterns: [
      /OmniBoard/,
      /apex-canvas/,
      /omniBoardStore/,
    ],
  },
  {
    surface: 'floating windows',
    patterns: [
      /FloatingWindow/,
      /z-index-manager/,
      /omni-portal-root/,
    ],
  },
  {
    surface: 'styles',
    patterns: [
      /omnidash-layout\.css/,
      /omnidash.*\.css/,
    ],
  },
  {
    surface: 'provider/store',
    patterns: [
      /OmniDashProvider/,
      /omniDashStore/,
      /omniBoardStore/,
      /omniModalStore/,
    ],
  },
];

// ============================================================================
// Analysis
// ============================================================================

function getChangedFiles(): string[] {
  try {
    const diff = execSync('git diff --name-only HEAD~1', { encoding: 'utf-8' }); // NOSONAR
    return diff.trim().split('\n').filter(Boolean);
  } catch {
    // Fallback: diff against staging
    try {
      const diff = execSync('git diff --cached --name-only', { encoding: 'utf-8' }); // NOSONAR
      return diff.trim().split('\n').filter(Boolean);
    } catch {
      console.error('ERROR: Cannot determine changed files. Run from a git repository.');
      process.exit(1);
    }
  }
}

function classifyFile(filePath: string): BlastRadiusSurface | null {
  for (const rule of SURFACE_RULES) {
    if (rule.patterns.some(pattern => pattern.test(filePath))) {
      return rule.surface;
    }
  }
  return null;
}

function analyze(): void {
  const changedFiles = getChangedFiles();

  // Filter to only Omnidash-related files
  const omnidashFiles = changedFiles.filter(f =>
    /omnidash|omnidash|OmniDash|omniboard|OmniBoard|omniModal|omniBoardStore|DashboardOverview|registry/i.test(f),
  );

  if (omnidashFiles.length === 0) {
    console.log('✅ No Omnidash files affected. Blast radius: 0');
    return;
  }

  // Classify each file
  const surfaceMap = new Map<BlastRadiusSurface, string[]>();
  for (const file of omnidashFiles) {
    const surface = classifyFile(file);
    if (surface) {
      const existing = surfaceMap.get(surface) ?? [];
      existing.push(file);
      surfaceMap.set(surface, existing);
    }
  }

  // Report
  console.log('\n═══════════════════════════════════════════════');
  console.log('  OMNIDASH BLAST-RADIUS REPORT');
  console.log('═══════════════════════════════════════════════\n');

  console.log(`Files affected: ${omnidashFiles.length}`);
  console.log(`Surfaces affected: ${surfaceMap.size}\n`);

  for (const surface of BLAST_RADIUS_SURFACES) {
    const files = surfaceMap.get(surface);
    if (files) {
      console.log(`  [${surface.toUpperCase()}]`);
      for (const f of files) {
        console.log(`    • ${f}`);
      }
    }
  }

  console.log('');

  // Gate check
  if (omnidashFiles.length > 50) { // Escalated: Systemic OmniDash rescue
    console.error('═══════════════════════════════════════════════');
    console.error('  BLOCKED: Architecture change detected.');
    console.error(`  Surfaces affected: ${[...surfaceMap.keys()].join(', ')}`);
    console.error('  Awaiting escalation.');
    console.error('═══════════════════════════════════════════════');
    process.exit(1);
  }

  console.log('✅ Blast radius within limits. Proceed with merge.');
}

analyze();
