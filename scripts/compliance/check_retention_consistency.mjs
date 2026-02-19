import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const evidencePath = resolve('build-artifacts/retention-evidence.json');

if (!existsSync(evidencePath)) {
  console.error('[MISSING] build-artifacts/retention-evidence.json');
  process.exit(1);
}

const gdpr = readFileSync(resolve('docs/compliance/GDPR_COMPLIANCE.md'), 'utf8');
const ops = readFileSync(resolve('docs/ops/OPERATIONAL_EXCELLENCE.md'), 'utf8');

const docs = [
  ['docs/compliance/GDPR_COMPLIANCE.md', gdpr],
  ['docs/ops/OPERATIONAL_EXCELLENCE.md', ops],
];

let failed = false;

for (const [file, content] of docs) {
  if (!content.includes('docs/compliance/DATA_RETENTION_POLICY.md')) {
    console.error(`[MISSING] ${file} must reference DATA_RETENTION_POLICY.md`);
    failed = true;
  }

  const retentionLines = content
    .split('\n')
    .filter((line) => /retention|logs|backups/i.test(line));

  for (const line of retentionLines) {
    if (/\b(30|90|180|365)\s*-?\s*day(s)?\b/i.test(line)) {
      console.error(`[CONFLICT] Numeric retention value found in ${file}: ${line.trim()}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('✓ retention-consistency: PASS');
