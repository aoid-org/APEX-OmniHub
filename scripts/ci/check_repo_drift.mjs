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

function isCanonicalReactRange(declared) {
  return declared === CANONICAL_REACT || declared === `^${CANONICAL_REACT}` || declared === `~${CANONICAL_REACT}`;
}

function assertPackageJsonReactRuntime(failures) {
  const packageFiles = gitLsFiles(['*package.json']).filter(file => !file.includes('/node_modules/'));
  for (const packageFile of packageFiles) {
    const pkg = readJson(packageFile);
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const depName of ['react', 'react-dom']) {
        const declared = pkg[section]?.[depName];
        if (!declared) continue;
        assertCondition(
          isCanonicalReactRange(declared),
          `${packageFile} declares ${depName}@${declared}; canonical runtime is ${CANONICAL_REACT}.`,
          failures,
        );
      }
    }
  }
}

function assertPackageLockReactRuntime(failures) {
  const lock = readJson('package-lock.json');
  for (const depName of ['react', 'react-dom']) {
    const versions = new Set();
    for (const [packagePath, entry] of Object.entries(lock.packages ?? {})) {
      if (new RegExp(`(^|/)node_modules/${depName}$`).test(packagePath) && entry?.version) {
        versions.add(entry.version);
      }
    }
    assertCondition(versions.size > 0, `package-lock.json is missing node_modules/${depName}.`, failures);
    for (const version of versions) {
      assertCondition(version === CANONICAL_REACT, `package-lock.json resolves ${depName}@${version}; canonical runtime is ${CANONICAL_REACT}.`, failures);
    }
  }
}

function assertBunLockReactRuntime(failures) {
  const lockText = readText('bun.lock');
  for (const depName of ['react', 'react-dom']) {
    const packageEntry = lockText.match(new RegExp(`\\n    "${depName}": \\["${depName}@([^"\\s]+)`));
    assertCondition(!!packageEntry, `bun.lock is missing canonical package entry for ${depName}.`, failures);
    if (packageEntry) {
      assertCondition(packageEntry[1] === CANONICAL_REACT, `bun.lock resolves ${depName}@${packageEntry[1]}; canonical runtime is ${CANONICAL_REACT}.`, failures);
    }
    // Broad text scan catches accidental alias/lockfile reintroduction of React 19 packages.
    assertCondition(!lockText.includes(`${depName}@19`), `bun.lock contains ${depName}@19 drift.`, failures);
  }
}

function assertReactRuntime(failures) {
  assertPackageJsonReactRuntime(failures);
  assertPackageLockReactRuntime(failures);
  assertBunLockReactRuntime(failures);
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

function maskComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, match => ' '.repeat(match.length))
    .replace(/(^|[^:])\/\/.*$/gm, match => ' '.repeat(match.length));
}

export function firstExecutableCallIndex(source, callExpression) {
  const searchableSource = maskComments(source);
  const escaped = callExpression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`\\b(?:await\\s+)?${escaped}\\s*\\(`).exec(searchableSource);
  return match?.index ?? -1;
}

function assertReplayVerificationOrdering(failures) {
  const replayCall = 'replayStore.isDuplicate';
  const files = [
    { file: 'functions/api/omnibridge/ingest.ts', verifier: 'validateHMAC' },
    { file: 'functions/api/omnibridge/sync.ts', verifier: 'verifySyncPacket' },
  ];

  for (const { file, verifier } of files) {
    const source = readText(file);
    const duplicateIndex = firstExecutableCallIndex(source, replayCall);
    const verificationIndex = firstExecutableCallIndex(source, verifier);
    assertCondition(verificationIndex >= 0, `${file} must execute ${verifier} before replay checks.`, failures);
    assertCondition(duplicateIndex >= 0, `${file} must execute ${replayCall} after signature verification.`, failures);
    assertCondition(duplicateIndex > verificationIndex, `${file} calls ${replayCall} before executing ${verifier}.`, failures);
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
