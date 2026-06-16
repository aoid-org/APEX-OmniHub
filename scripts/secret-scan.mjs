import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SECRET_PATTERNS = [
  { name: 'OpenAI key', regex: /sk-[a-z0-9]{20,}/i },
  { name: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', regex: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/ },
  { name: 'Generic api key assignment', regex: /api[_-]?key\s*[:=]\s*['"][^'"]{12,}['"]/ig },
  { name: 'Generic secret assignment', regex: /secret\s*[:=]\s*['"][^'"]{12,}['"]/ig },
  { name: 'serviceRoleKey assignment', regex: /serviceRoleKey\s*[:=]\s*['"][^'"]{10,}['"]/g },
  { name: 'SUPABASE_SERVICE_ROLE_KEY literal', regex: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"][^'"]{10,}['"]/g },
  { name: 'Password literal', regex: /password\s*[:=]\s*['"][^'"]{4,}['"]/ig },
  { name: 'Supabase publishable key', regex: /sb_publishable_[A-Za-z0-9_-]{20,}/ },
];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svgz', '.pdf', '.zip', '.gz', '.tar', '.7z', '.mp4', '.webm', '.mp3', '.wav', '.woff', '.woff2', '.ttf', '.eot', '.wasm', '.bin',
]);

const SCAN_EXCLUDED_PREFIXES = [
  'docs/',
  'memory/omni-recall/docs/',
  'orchestrator/tests/',
];

const PLACEHOLDER_MARKERS = [
  'mock',
  'test',
  'fake',
  'example',
  'your-',
  'replace-with-real',
  'env(',
  '<your-',
  'not_real',
  'demo',
];

/**
 * Decode a base64url string to a UTF-8 string.
 */
function base64urlDecode(str) {
  // Pad to a multiple of 4, convert base64url to base64
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const b64 = pad ? padded + '='.repeat(4 - pad) : padded;
  return Buffer.from(b64, 'base64').toString('utf-8');
}

/**
 * Returns true if `content` contains a JWT whose payload decodes to
 * a JSON object with role === "service_role".
 */
export function containsServiceRoleJwt(content) {
  // Match any JWT-shaped token: three base64url segments joined by dots
  const jwtRegex = /[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
  for (const match of content.matchAll(jwtRegex)) {
    const token = match[0];
    const parts = token.split('.');
    if (parts.length !== 3) continue;
    const payloadSegment = parts[1];
    try {
      const decoded = base64urlDecode(payloadSegment);
      const payload = JSON.parse(decoded);
      if (payload && payload.role === 'service_role') {
        return true;
      }
    } catch {
      // Not valid JSON — not a Supabase JWT, skip
    }
  }
  return false;
}

/**
 * Recursively walk a directory, returning relative file paths.
 * Skips excluded directories and binary extensions.
 */
function walkDir(dir, base, results = []) {
  const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.turbo', 'artifacts']);
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walkDir(fullPath, base, results);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) continue;
      results.push(relPath);
    }
  }
  return results;
}

// Only run the scanner when executed directly — not when imported as a module
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  // Build the list of files to scan — prefer git ls-files, fall back to directory walk
  let files;
  try {
    files = execSync('git ls-files', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean)
      .filter((file) => !file.startsWith('node_modules/'))
      .filter((file) => !SCAN_EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix)));
  } catch {
    const repoRoot = process.cwd();
    files = walkDir(repoRoot, repoRoot)
      .filter((file) => !SCAN_EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix)));
  }

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

  let violations = 0;

  for (const file of files) {
    if (!fs.existsSync(file)) {
      continue;
    }

    // Skip symlinks that resolve to directories (e.g. .claude/skills/* symlinks)
    const stat = fs.statSync(file, { throwIfNoEntry: false });
    if (!stat || stat.isDirectory()) continue;

    const buffer = fs.readFileSync(file);
    if (isLikelyBinary(file, buffer)) continue;

    const content = buffer.toString('utf-8');

    // Pattern-based checks
    for (const pattern of SECRET_PATTERNS) {
      const scanRegex = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : `${pattern.regex.flags}g`);
      for (const match of content.matchAll(scanRegex)) {
        const matchedText = match[0];
        const value = extractAssignedValue(matchedText);
        if (value && isPlaceholderValue(value)) {
          continue;
        }

        violations += 1;
        console.error(`[secret-scan] Potential ${pattern.name} in ${file}`);
      }
    }

    // Post-loop: detect Supabase service-role JWTs by decoding the payload
    if (containsServiceRoleJwt(content)) {
      violations += 1;
      console.error(`[secret-scan] Potential Supabase service-role JWT in ${file}`);
    }
  }

  if (violations > 0) {
    console.error(`[secret-scan] ${violations} potential secret issue(s) detected.`);
    process.exit(1);
  }

  console.log('[secret-scan] No obvious secrets found.');
}
