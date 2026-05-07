#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const CANONICAL_REACT = '18.3.1';
const FORBIDDEN_ARTIFACT_PATTERNS = [
  /(^|\/)output\.txt$/,
  /(^|\/)logs\.txt$/,
  /(^|\/)raw_test_output\.txt$/,
  /(^|\/)tsc_output\.txt$/,
  /(^|\/)test_output_pr\d+\.txt$/,
  /(^|\/)__pycache__\//,
  /\.pyc$/,
  /\.pyo$/,
];

const ACTIVE_DOC_CLAIM_ALLOWLIST = new Set([
  'docs/project-status/PRODUCTION_STATUS.md',
]);

function repoPath(...segments) {
  return path.join(ROOT, ...segments);
}

function readText(filePath) {
  return readFileSync(repoPath(filePath), 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function gitLsFiles(patterns = []) {
  const args = ['ls-files', '-z', ...patterns];
  const output = execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return output.split('\0').filter(Boolean);
}

function assertCondition(condition, message, failures) {
  if (!condition) failures.push(message);
}

function assertReactRuntime(failures) {
  const packageFiles = gitLsFiles(['package.json']).filter(file => !file.includes('/node_modules/'));
  for (const packageFile of packageFiles) {
    const pkg = readJson(packageFile);
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const depName of ['react', 'react-dom']) {
        const declared = pkg[section]?.[depName];
        if (!declared) continue;
        assertCondition(
          declared === CANONICAL_REACT || declared === `^${CANONICAL_REACT}` || declared === `~${CANONICAL_REACT}`,
          `${packageFile} declares ${depName}@${declared}; canonical runtime is ${CANONICAL_REACT}.`,
          failures,
        );
      }
    }
  }

  const lockText = readText('package-lock.json');
  assertCondition(!lockText.includes('react@19') && !lockText.includes('react-dom@19'), 'package-lock.json contains React 19 drift.', failures);
  assertCondition(!readText('bun.lock').includes('react@19'), 'bun.lock contains React 19 drift.', failures);
}

function assertLockfileAuthority(failures) {
  assertCondition(existsSync(repoPath('bun.lock')), 'Root bun.lock is missing.', failures);
  assertCondition(existsSync(repoPath('package-lock.json')), 'Root package-lock.json is missing; npm audit requires it.', failures);
  for (const nestedLock of ['apps/omnihub-site/bun.lock', 'apps/omnihub-site/package-lock.json']) {
    assertCondition(!existsSync(repoPath(nestedLock)), `${nestedLock} must not exist; root lockfiles are authoritative for app-site.`, failures);
  }
}

function assertOmniDashCompatibilityShims(failures) {
  const legacyFiles = gitLsFiles(['apps/omnihub-site/src/components/omnidash']).filter(file => /\.(ts|tsx)$/.test(file));
  for (const file of legacyFiles) {
    const source = readText(file);
    assertCondition(
      source.includes('Compatibility re-export') && /export\s+(?:\*|\{[\s\S]*\})\s+from\s+['"][.\/]+dashboard\/components\//.test(source),
      `${file} must stay a compatibility re-export to apps/omnihub-site/dashboard/components, not a second implementation.`,
      failures,
    );
  }
}

function assertSecurityHeaders(failures) {
  const headers = readText('public/_headers');
  const cspLine = headers.split('\n').find(line => line.trim().startsWith('Content-Security-Policy:')) ?? '';
  assertCondition(headers.includes('Cross-Origin-Opener-Policy: same-origin'), 'public/_headers must set Cross-Origin-Opener-Policy: same-origin.', failures);
  assertCondition(!headers.includes('Cross-Origin-Opener-Policy: unsafe-none'), 'public/_headers must not allow COOP unsafe-none.', failures);
  assertCondition(/script-src\s+'self'(?:;|\s)/.test(cspLine), "public/_headers CSP must keep script-src 'self'.", failures);
  assertCondition(!/script-src[^;]*'unsafe-inline'/.test(cspLine), "public/_headers CSP script-src must not contain 'unsafe-inline'.", failures);
}

function assertReplayVerificationOrdering(failures) {
  for (const file of ['functions/api/omnibridge/ingest.ts', 'functions/api/omnibridge/sync.ts']) {
    const source = readText(file);
    const duplicateIndex = source.indexOf('replayStore.isDuplicate');
    const verificationIndexes = [source.indexOf('validateHMAC'), source.indexOf('verifySyncPacket')].filter(index => index >= 0);
    const firstVerificationIndex = Math.min(...verificationIndexes);
    assertCondition(firstVerificationIndex >= 0, `${file} must contain signature verification before replay checks.`, failures);
    assertCondition(duplicateIndex > firstVerificationIndex, `${file} calls replayStore.isDuplicate before signature verification.`, failures);
  }
}

function assertEventStoreDispatchContract(failures) {
  const source = readText('src/lib/omnibridge/eventStore.ts');
  for (const required of ['OMNIBRIDGE_DISPATCH_URL', 'dispatchPersistedEvent', 'updateDispatchState', 'omnibridge_events_dlq']) {
    assertCondition(source.includes(required), `eventStore dispatch contract is missing ${required}.`, failures);
  }
}

function assertRepoHygiene(failures) {
  const trackedFiles = gitLsFiles();
  for (const file of trackedFiles) {
    assertCondition(!FORBIDDEN_ARTIFACT_PATTERNS.some(pattern => pattern.test(file)), `${file} is a tracked generated artifact. Remove it from git.`, failures);
  }
}

function assertActiveDocsEvidenceLanguage(failures) {
  const docs = gitLsFiles(['docs', 'README.md', 'CLAUDE.md']).filter(file => /\.(md|mdx|yml|yaml)$/i.test(file));
  const forbiddenClaim = /\b(PRODUCTION CERTIFIED|CLEARED for global rollout|production-certified)\b/i;
  for (const file of docs) {
    if (file.startsWith('docs/archive/') || file.startsWith('docs/audits/') || ACTIVE_DOC_CLAIM_ALLOWLIST.has(file)) continue;
    assertCondition(!forbiddenClaim.test(readText(file)), `${file} contains unqualified production certification language. Use evidence-led status language.`, failures);
  }
}

export function runRepoDriftChecks() {
  const failures = [];
  assertReactRuntime(failures);
  assertLockfileAuthority(failures);
  assertOmniDashCompatibilityShims(failures);
  assertSecurityHeaders(failures);
  assertReplayVerificationOrdering(failures);
  assertEventStoreDispatchContract(failures);
  assertRepoHygiene(failures);
  assertActiveDocsEvidenceLanguage(failures);
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = runRepoDriftChecks();
  if (failures.length > 0) {
    console.error('Repo drift guard failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }
  console.log('Repo drift guard passed — canonical runtime, security, hygiene, and evidence-language invariants hold.');
}
