import fs from 'node:fs';
import { execSync } from 'node:child_process';

const IGNORE_FILES = new Set([
  'package-lock.json',
  'bun.lock',
  'bun.lockb',
  'check-release-certification-docs.mjs',
  'write-release-validation-summary.test.mjs',
  'patch_docs.py',
  'guard-agent-destructive-actions.mjs',
  // CHANGELOG records historical removals by artifact name — it is evidence, not reintroduction
  'CHANGELOG.md',
]);

const ALLOWED_PATHS = [
  // Archive: historical docs that pre-date the ban
  'memory/omni-recall/archive/',
  // Templates: boilerplate that must name what to fill in
  'docs/release/templates/',
  // Owner-approved certification docs: these ARE the current authority; they must be
  // able to name what stale artifacts were removed as part of the certified change.
  // Exempting this path is correct by design — these files are written by the owner,
  // not by an agent hallucinating stale authority claims.
  'docs/release/owner-approved/',
  // CI scripts that are the scanner or its test suite
  'scripts/ci/check-release-certification-docs.mjs',
  'scripts/ci/guard-agent-destructive-actions.mjs',
  'tests/ci/write-release-validation-summary.test.mjs',
];

const BANNED_PHRASES = [
  'PRODUCTION_CERTIFICATION_STATUS.md',
  'NOT_CERTIFIED_NO_RELEASE_CUT',
  'release-evidence.json',
  'final_verdict',
  'Clean-Room Final Certification',
  'canonical source for current certification state',
  'write-release-evidence'
];

let failed = false;

function scanAll() {
  try {
    const output = execSync('git ls-files', { encoding: 'utf8' });
    const files = output.split('\n').map(f => f.trim()).filter(Boolean);

    for (const fullPath of files) {
      if (IGNORE_FILES.has(fullPath) || fullPath.endsWith('.png') || fullPath.endsWith('.jpg') || fullPath.endsWith('.jpeg') || fullPath.startsWith('.understand-anything/')) {
        continue;
      }

      const relativePath = fullPath.replace(/\\/g, '/');

      if (ALLOWED_PATHS.some(allowed => relativePath.startsWith(allowed))) {
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const phrase of BANNED_PHRASES) {
            if (line.includes(phrase)) {
              console.error(`BANNED PHRASE DETECTED: "${phrase}"`);
              console.error(`  -> ${relativePath}:${i + 1}`);
              failed = true;
            }
          }
        }
      } catch (err) {
        // Not a text file or unable to read
      }
    }
  } catch (err) {
    console.error('Error running git ls-files:', err.message);
    process.exit(1);
  }
}

scanAll();

if (failed) {
  console.error('\nRelease certification regression check FAILED. Stale certification authority detected.');
  process.exit(1);
} else {
  console.log('\nRelease certification regression check PASSED.');
  process.exit(0);
}
