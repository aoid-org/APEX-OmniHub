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

const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.turbo', '.cache']);
const GENERATED_SEGMENTS = new Set(['generated', 'build-artifacts']);
const SCAN_EXCLUDED_PREFIXES = [
  'docs/',
  'memory/omni-recall/docs/',
  'tests/',
  'sim/fixtures/',
  'orchestrator/tests/',
  '.agents/',
  '.claude/skills/',
];
const SYNTHETIC_TEST_FIXTURE_PREFIXES = ['tests/', 'sim/fixtures/'];

const PLACEHOLDER_MARKERS = [
  'mock', 'test', 'fake', 'example', 'your-', 'replace-with-real', 'env(', '<your-', 'not_real', 'demo', '[redacted]', 'sandbox-key-not-real',
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

const isPlaceholderValue = (value) => {
  const normalized = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
};

const extractAssignedValue = (assignmentMatch) => {
  const parts = assignmentMatch.split(/[:=]/);
  const raw = parts.slice(1).join('=').trim();
  return raw.replaceAll(/(?:^['"]|['"]$)/g, '').trim();
};

const isSyntheticFixture = (file) => SYNTHETIC_TEST_FIXTURE_PREFIXES.some((prefix) => file.startsWith(prefix));

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
      if (value && (isPlaceholderValue(value) || (pattern.name === 'Plaintext password assignment' && isSyntheticFixture(file)))) continue;
      violations += 1;
      console.error(`[secret-scan] Potential ${pattern.name} in ${file}`);
    }
  }

  const serviceRoleJwtLiterals = findServiceRoleJwtLiterals(content);
  for (const _jwt of serviceRoleJwtLiterals) {
    violations += 1;
    console.error(`[secret-scan] Potential Supabase service_role JWT literal in ${file}`);
  }
}

if (violations > 0) {
  console.error(`[secret-scan] ${violations} potential secret issue(s) detected.`);
  process.exit(1);
}

console.log('[secret-scan] No obvious secrets found.');
