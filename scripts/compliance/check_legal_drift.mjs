import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const forbidden = ['Last updated: January 2025', 'privacy@apex.example'];
const files = [
  'apps/omnihub-site/src/pages/Privacy.tsx',
  'apps/omnihub-site/src/pages/Terms.tsx',
];

let failed = false;

for (const file of files) {
  const source = readFileSync(resolve(file), 'utf8');

  for (const token of forbidden) {
    if (source.includes(token)) {
      console.error(`[DRIFT] "${token}" found in ${file}`);
      failed = true;
    }
  }

  if (!source.includes('docs/compliance/')) {
    console.error(`[MISSING] ${file} must reference docs/compliance/`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('✓ legal-drift: PASS');
