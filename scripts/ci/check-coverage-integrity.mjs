#!/usr/bin/env node
/**
 * APEX Coverage Integrity Guard
 *
 * Fails CI if the vitest lcov report is missing, empty, or lacks entries for
 * files that are REQUIRED to be instrumented.
 *
 * WHY THIS EXISTS (2026-06-09 incident):
 * Vitest 4's v8 coverage provider silently produces a COMPLETELY EMPTY report
 * when any negation pattern ('!path') appears in coverage.exclude. Thresholds
 * then pass vacuously (0/0 = "Unknown%") and SonarCloud reads 0.0% coverage on
 * all new code. This guard makes that failure mode loud and immediate.
 *
 * Run AFTER `npm run test:coverage`: node scripts/ci/check-coverage-integrity.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// Files that MUST appear as SF: entries in lcov.info. Each has a dedicated
// unit-test suite; absence means coverage instrumentation silently broke.
const REQUIRED_LCOV_ENTRIES = [
  'src/swInit.ts',
  'apps/omnihub-site/src/hooks/usePWAInstall.ts',
  'apps/omnihub-site/src/components/PWAInstallBanner.tsx',
  'apps/omnihub-proof/src/App.tsx',
  'apps/omnihub-proof/src/main.tsx',
];

let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

console.log('\n[APEX Coverage Integrity Guard]\n');

const lcovPath = resolve(ROOT, 'coverage/lcov.info');
check('coverage/lcov.info exists', existsSync(lcovPath), 'run `npm run test:coverage` first');

let lcov = '';
if (existsSync(lcovPath)) {
  lcov = readFileSync(lcovPath, 'utf8');
  const sfCount = (lcov.match(/^SF:/gm) || []).length;
  check(
    `lcov.info is non-empty (${sfCount} files)`,
    sfCount > 0,
    'EMPTY REPORT: check vitest.config.ts coverage.exclude for negation patterns (vitest 4 breaks on them)'
  );

  for (const file of REQUIRED_LCOV_ENTRIES) {
    check(
      `lcov contains ${file}`,
      lcov.includes(`SF:${file}`),
      'file is tested but not instrumented — check coverage.exclude (unanchored patterns match app twins)'
    );
  }
}

// The negation footgun itself: scan the config so the breakage is caught even
// before a coverage run.
const vitestConfig = readFileSync(resolve(ROOT, 'vitest.config.ts'), 'utf8');
const coverageBlock = vitestConfig.slice(vitestConfig.indexOf('coverage:'));
check(
  'vitest.config.ts coverage.exclude has no negation patterns',
  !/^\s*['"]!/m.test(coverageBlock.slice(0, coverageBlock.indexOf('thresholds'))),
  "remove '!...' entries — vitest 4 v8 provider produces an empty report when present"
);

console.log(`\n  ${failed === 0 ? 'All checks passed' : `${failed} check(s) failed`}\n`);

if (failed > 0) {
  console.error(
    '[APEX COVERAGE] INTEGRITY FAILURE: coverage data is missing or silently broken.\n' +
    '  SonarCloud will report 0.0% on new code until this is fixed.\n'
  );
  process.exit(1);
}

console.log('[APEX COVERAGE] lcov report is present and instruments all guarded files.\n');
