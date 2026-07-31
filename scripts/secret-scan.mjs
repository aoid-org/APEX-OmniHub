import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const SECRET_PATTERNS = [
  { name: 'OpenAI key', regex: /sk-[a-z0-9]{20,}/i },
  { name: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', regex: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/ },
  { name: 'Generic api key assignment', regex: /api[_-]?key\s*[:=]\s*['"][^'"]{12,}['"]/ig },
  { name: 'Generic secret assignment', regex: /secret\s*[:=]\s*['"][^'"]{12,}['"]/ig },
  { name: 'Supabase serviceRoleKey assignment', regex: /\bserviceRoleKey\s*[:=]\s*['"][^'"]{12,}['"]/ig },
  { name: 'Supabase service role env assignment', regex: /\bSUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"]{12,}['"]/ig },
  { name: 'Plaintext password assignment', regex: /\bpassword\s*[:=]\s*['"][^'"\n]{1,}['"]/ig },
];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svgz', '.pdf', '.zip', '.gz', '.tar', '.7z', '.mp4', '.webm', '.mp3', '.wav', '.woff', '.woff2', '.ttf', '.eot', '.wasm', '.bin',
]);

const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.turbo', '.cache', 'fixtures', '__fixtures__', 'mocks', '__mocks__']);
const GENERATED_SEGMENTS = new Set(['generated', 'build-artifacts']);
const SCAN_EXCLUDED_PREFIXES = [];
const SYNTHETIC_FIXTURE_FILES = new Set([
  '.agents/skills/apex-dev/apex-dev/testing-patterns.md',
  'integration-harness/lib/deterministic-validator.mjs',
  'memory/omni-recall/docs/api/API_EXTENSION_GUIDE.md',
  'memory/omni-recall/docs/archive/legacy-runbooks/PRODUCTION_DEPLOYMENT_GUIDE_legacy.md',
  'memory/omni-recall/docs/knowledge/references/testing.md',
  'orchestrator/tests/test_omnitrace.py',
  'orchestrator/tests/test_request_signing.py',
  'sandbox/README.md',
  'sim/guard-rails.ts',
  'supabase/config.toml',
  'terraform/environments/staging/terraform.auto.tfvars',
  'terraform/environments/staging/terraform.tfvars.example',
  'tests/api/omnibridge-ingest.test.ts',
  'tests/api/omnibridge-roundtrip.test.ts',
  'tests/api/omnibridge-sync.test.ts',
  'tests/api/omnibridge-token.test.ts',
  'tests/api/tools/manifest.spec.ts',
  'tests/ci/secret-scan-fixtures.test.mjs',
  'tests/core/gateway/ApexRealtimeGateway.spec.ts',
  'tests/core/security/SpectreHandshake.spec.ts',
  'tests/e2e/security.spec.ts',
  'tests/edge-functions/auth.spec.ts',
  'tests/integration/byom-cockpit.test.ts',
  'tests/lib/database/factory.spec.ts',
  'tests/lib/omnibridge/eventStore.test.ts',
  'tests/lib/omnibridge/outboundCaller.test.ts',
  'tests/lib/omnibridge/syncPacketVerifier.test.ts',
  'tests/lib/sanitization.spec.ts',
  'tests/lib/storage/factory.spec.ts',
  'tests/omniconnect/fixtures/test-data.ts',
  'tests/omniconnect/meta-business-connector.test.ts',
  'tests/omniconnect/omniport.spec.ts',
  'tests/omniconnect/validation-utils.spec.ts',
  'tests/omniconnect/validation.test.ts',
  'tests/omnidash/_test-helpers.ts',
  'tests/omniport-engine.spec.ts',
  'tests/security/debug-logger.test.ts',
  'tests/telemetry/observability.test.ts',
]);

const PLACEHOLDER_VALUE_PATTERNS = [
  /^\[redacted\]$/i,
  /^<[^>]+>$/i,
  /^\$\{[A-Z0-9_]+\}$/i,
  /^process\.env\.[A-Z0-9_]+$/i,
  /^Deno\.env\.get\([^)]+\)$/i,
  /^https:\/\/example\.supabase\.co$/i,
  /^test@example\.invalid$/i,
  /^placeholder[-_a-z0-9]*$/i,
  /^fake[-_a-z0-9]*-scanner-fixture$/i,
  /^literal-password-fixture$/i,
];

const isExcludedPath = (file) => {
  const normalized = file.replaceAll('\\', '/');
  if (SCAN_EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  return normalized.split('/').some((segment) => EXCLUDED_DIRS.has(segment) || GENERATED_SEGMENTS.has(segment));
};

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name) || GENERATED_SEGMENTS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(process.cwd(), full).replaceAll('\\', '/');
    if (isExcludedPath(rel)) continue;
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile()) acc.push(rel);
  }
  return acc;
}

function listFiles() {
  try {
    return execSync('git ls-files', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
      .split('\n')
      .filter(Boolean)
      .filter((file) => !isExcludedPath(file));
  } catch (error) {
    console.error(`[secret-scan] git metadata unavailable; falling back to filesystem scan: ${error instanceof Error ? error.message : String(error)}`);
    return walk(process.cwd());
  }
}

const files = listFiles();

const isLikelyBinary = (file, buffer) => {
  const extension = path.extname(file).toLowerCase();
  if (BINARY_EXTENSIONS.has(extension)) return true;
  return buffer.includes(0);
};

const isPlaceholderValue = (value) => PLACEHOLDER_VALUE_PATTERNS.some((pattern) => pattern.test(value.trim()));

const extractAssignedValue = (assignmentMatch) => {
  const parts = assignmentMatch.split(/[:=]/);
  const raw = parts.slice(1).join('=').trim();
  return raw.replaceAll(/(?:^['"]|['"]$)/g, '').trim();
};

const isSyntheticFixture = (file) => SYNTHETIC_FIXTURE_FILES.has(file.replaceAll('\\', '/'));

const decodeBase64UrlJson = (segment) => {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (segment.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
};

const findServiceRoleJwtLiterals = (content) => {
  const jwtRegex = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  const matches = [];
  for (const match of content.matchAll(jwtRegex)) {
    try {
      const payload = decodeBase64UrlJson(match[0].split('.')[1]);
      if (payload?.role === 'service_role') matches.push(match[0]);
    } catch {
      // Ignore non-JWT/base64 text with similar shape.
    }
  }
  return matches;
};

let violations = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (!stat || stat.isDirectory()) continue;

  const buffer = fs.readFileSync(file);
  if (isLikelyBinary(file, buffer)) continue;

  const content = buffer.toString('utf-8');
  for (const pattern of SECRET_PATTERNS) {
    const scanRegex = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : `${pattern.regex.flags}g`);
    for (const match of content.matchAll(scanRegex)) {
      const matchedText = match[0];
      const value = extractAssignedValue(matchedText);
      if (isSyntheticFixture(file) || (value && isPlaceholderValue(value))) continue;
      const line = content.slice(0, match.index ?? 0).split(/\r?\n/).length;
      violations += 1;
      console.error(`[secret-scan] Potential ${pattern.name} in ${file}:${line}`);
    }
  }

  const serviceRoleJwtLiterals = findServiceRoleJwtLiterals(content);
  for (const _jwt of serviceRoleJwtLiterals) {
    if (isSyntheticFixture(file)) continue;
    const line = content.indexOf(_jwt) >= 0 ? content.slice(0, content.indexOf(_jwt)).split(/\r?\n/).length : 1;
    violations += 1;
    console.error(`[secret-scan] Potential Supabase service_role JWT literal in ${file}:${line}`);
  }
}

if (violations > 0) {
  console.error(`[secret-scan] ${violations} potential secret issue(s) detected.`);
  process.exit(1);
}

console.log('[secret-scan] No obvious secrets found.');
