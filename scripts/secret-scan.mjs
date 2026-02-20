import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const SECRET_PATTERNS = [
  { name: 'OpenAI key', regex: /sk-[a-z0-9]{20,}/i },
  { name: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', regex: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/ },
  { name: 'Generic api key assignment', regex: /api[_-]?key\s*[:=]\s*['"][^'"]{12,}['"]/ig },
  { name: 'Generic secret assignment', regex: /secret\s*[:=]\s*['"][^'"]{12,}['"]/ig },
];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svgz', '.pdf', '.zip', '.gz', '.tar', '.7z', '.mp4', '.webm', '.mp3', '.wav', '.woff', '.woff2', '.ttf', '.eot', '.wasm', '.bin',
]);

const SCAN_EXCLUDED_PREFIXES = [
  'docs/',
  'tests/',
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

const files = execSync('git ls-files', { encoding: 'utf-8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.startsWith('node_modules/'))
  .filter((file) => !SCAN_EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix)));

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
  return raw.replace(/^['"]|['"]$/g, '').trim();
};

let violations = 0;

for (const file of files) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const buffer = fs.readFileSync(file);
  if (isLikelyBinary(file, buffer)) continue;

  const content = buffer.toString('utf-8');
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
}

if (violations > 0) {
  console.error(`[secret-scan] ${violations} potential secret issue(s) detected.`);
  process.exit(1);
}

console.log('[secret-scan] No obvious secrets found.');
