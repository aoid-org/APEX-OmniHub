// APEX-OmniHub Claim Hygiene Gate — fixture tests
// Proves: (1) real unapproved public claims FAIL; (2) internal code comments PASS;
// (3) notes: field metadata PASS; (4) WebAuthn API params PASS.
// Follows the same pattern as secret-scan-fixtures.test.mjs.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const scanner = path.join(repoRoot, 'scripts', 'ci', 'verify-claim-hygiene.mjs');
const ciUtils = path.join(repoRoot, 'scripts', 'ci', 'ci-utils.mjs');

// Create an isolated temp tree that mimics the apps/omnihub-site layout
const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'apex-claim-hygiene-'));
const scriptsDir = path.join(fixtureRoot, 'scripts', 'ci');
const contentDir = path.join(fixtureRoot, 'apps', 'omnihub-site', 'src', 'content');
const libDir     = path.join(fixtureRoot, 'apps', 'omnihub-site', 'src', 'lib');
const docsDir    = path.join(fixtureRoot, 'docs', 'release');

mkdirSync(scriptsDir,  { recursive: true });
mkdirSync(contentDir,  { recursive: true });
mkdirSync(libDir,      { recursive: true });
mkdirSync(docsDir,     { recursive: true });

// Copy scanner and shared utils into the isolated tree
copyFileSync(scanner, path.join(scriptsDir, 'verify-claim-hygiene.mjs'));
copyFileSync(ciUtils, path.join(scriptsDir, 'ci-utils.mjs'));

// Empty approved-claims.json
writeFileSync(path.join(docsDir, 'approved-claims.json'), JSON.stringify({ approved: [] }));

function run(cwd) {
  return spawnSync(process.execPath, [path.join('scripts', 'ci', 'verify-claim-hygiene.mjs')], {
    cwd,
    encoding: 'utf8',
  });
}

// ── TEST 1: Real unapproved public claims MUST FAIL ──────────────────────────
writeFileSync(
  path.join(contentDir, 'publicClaims.ts'),
  `export const heroCopy = "APEX is SOC 2 certified and GDPR compliant.";\n` +
  `export const sla = "99.99% uptime guaranteed.";\n` +
  `export const audit = "Independently attested by third parties.";\n`,
);
{
  const result = run(fixtureRoot);
  assert.notEqual(result.status, 0, 'Public unapproved claims must FAIL the scanner');
  assert.match(result.stderr, /soc2|compliance-posture|uptime-sla|attestation/i, 'Scanner must name the failing patterns');
}

// ── TEST 2: Internal code comments MUST PASS ─────────────────────────────────
writeFileSync(
  path.join(contentDir, 'publicClaims.ts'),
  `// Internal note: not certified yet — do not render publicly.\n` +
  `/** @see docs/release/approved-claims.json for certified claims only */\n` +
  `export const implementationNote = "internal-only";\n`,
);
{
  const result = run(fixtureRoot);
  assert.equal(result.status, 0, `Comments must PASS. stderr: ${result.stderr}`);
}

// ── TEST 3: notes: field internal metadata MUST PASS ─────────────────────────
// Inline single-line notes
writeFileSync(
  path.join(contentDir, 'publicClaims.ts'),
  `export const claim = {\n` +
  `  id: 'test.feature',\n` +
  `  notes: 'Not certified yet. Attestation path not live.',\n` +
  `};\n`,
);
{
  const result = run(fixtureRoot);
  assert.equal(result.status, 0, `notes: inline must PASS. stderr: ${result.stderr}`);
}

// Split-line notes (key on one line, value on next — matches featureTruth format)
writeFileSync(
  path.join(contentDir, 'publicClaims.ts'),
  `export const claim = {\n` +
  `  id: 'test.feature',\n` +
  `  notes:\n` +
  `    'Complete software path: server-side challenge, attestation parse, assertion verification.',\n` +
  `};\n`,
);
{
  const result = run(fixtureRoot);
  assert.equal(result.status, 0, `notes: split-line must PASS. stderr: ${result.stderr}`);
}

// ── TEST 4: WebAuthn API parameter MUST PASS ──────────────────────────────────
writeFileSync(
  path.join(libDir, 'webauthnClient.ts'),
  `const opts = {\n` +
  `  attestation: 'none',\n` +
  `  // PUBLIC attestation object metadata only — never a private key.\n` +
  `};\n`,
);
{
  const result = run(fixtureRoot);
  assert.equal(result.status, 0, `WebAuthn attestation param must PASS. stderr: ${result.stderr}`);
}

// ── TEST 5: Clean tree MUST PASS ─────────────────────────────────────────────
writeFileSync(path.join(contentDir, 'publicClaims.ts'), `export const name = "APEX OmniHub";\n`);
writeFileSync(path.join(libDir,     'webauthnClient.ts'), `export const version = "1.0";\n`);
{
  const result = run(fixtureRoot);
  assert.equal(result.status, 0, `Clean tree must PASS. stderr: ${result.stderr}`);
}

console.log('claim-hygiene fixture tests PASSED — 5/5 assertions verified');
