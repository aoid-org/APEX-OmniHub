import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SECRET_PATTERNS = [
  { name: 'OpenAI key', regex: /sk-[a-z0-9]{20,}/i },
  { name: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', regex: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/ },
  { name: 'Generic api key assignment', regex: /api[_-]?key\s*[:=]\s*['"][^'"]{12,}['"]/i },
  { name: 'Generic secret assignment', regex: /secret\s*[:=]\s*['"][^'"]{12,}['"]/i },
];

// S4721: Use spawnSync with explicit args instead of shell interpreter
const result = spawnSync('git', ['ls-files'], { encoding: 'utf-8' });
if (result.status !== 0) {
  console.error('[secret-scan] Failed to list git files');
  process.exit(1);
}
const files = result.stdout
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.startsWith('node_modules/'));

let violations = 0;

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf-8');
  } catch {
    continue; // skip binary or inaccessible files
  }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(content)) {
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
