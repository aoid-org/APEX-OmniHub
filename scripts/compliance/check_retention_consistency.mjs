import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const evidencePath = resolve('build-artifacts/retention-evidence.json');

if (!existsSync(evidencePath)) {
  console.error('[MISSING] build-artifacts/retention-evidence.json');
  process.exit(1);
}

const gdpr = readFileSync(resolve('memory/omni-recall/docs/compliance/GDPR_COMPLIANCE.md'), 'utf8');
const ops = readFileSync(resolve('memory/omni-recall/docs/ops/OPERATIONAL_EXCELLENCE.md'), 'utf8');

const REQUIRED_LINKS = [
  ['memory/omni-recall/docs/compliance/GDPR_COMPLIANCE.md', gdpr],
  ['memory/omni-recall/docs/ops/OPERATIONAL_EXCELLENCE.md', ops],
];

let failed = false;

for (const [file, content] of REQUIRED_LINKS) {
  if (!content.includes('memory/omni-recall/docs/compliance/DATA_RETENTION_POLICY.md')) {
    console.error(`[MISSING] ${file} must reference DATA_RETENTION_POLICY.md`);
    failed = true;
  }

  const retentionLines = content
    .split('\n')
    .filter((line) => {
      const lower = line.toLowerCase();
      return lower.includes('retention') || lower.includes('logs') || lower.includes('backups');
    });

  const forbiddenPhrases = ['30 day', '30 days', '90 day', '90 days', '180 day', '180 days', '365 day', '365 days'];

  for (const line of retentionLines) {
    const normalized = line.toLowerCase().replaceAll('-', ' ');
    const hasForbiddenNumber = forbiddenPhrases.some((phrase) => normalized.includes(phrase));

    if (hasForbiddenNumber) {
      console.error(`[CONFLICT] Numeric retention value found in ${file}: ${line.trim()}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('✓ retention-consistency: PASS');
