#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('artifacts/release', { recursive: true });

const result = spawnSync('bun', ['run', 'verify:types'], { encoding: 'utf8' });
const stdout = result.stdout ?? '';
const stderr = result.stderr ?? '';
const combined = `${stdout}${stderr}`;

writeFileSync('artifacts/release/prompt01-typecheck.log', combined, 'utf8');

if (result.status === 0) {
  writeFileSync(
    'artifacts/release/prompt01-typecheck-summary.txt',
    'PASS: verify:types completed without TypeScript errors.\n',
    'utf8'
  );
  console.log('prompt01-typecheck-evidence: PASS');
  process.exit(0);
}

const firstLines = combined
  .split('\n')
  .filter((line) => line.trim().length > 0)
  .slice(0, 20)
  .join('\n');

writeFileSync(
  'artifacts/release/prompt01-typecheck-summary.txt',
  `FAIL: verify:types failed.\n${firstLines}\n`,
  'utf8'
);

console.error('prompt01-typecheck-evidence: FAIL (see artifacts/release/prompt01-typecheck.log)');
process.exit(result.status ?? 1);
