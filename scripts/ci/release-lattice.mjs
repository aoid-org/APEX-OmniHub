#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const stages = [
  ['unit tests', 'npm run test'],
  ['integration tests', 'npm run test:integration'],
  ['replay consistency tests', 'npm run test -- tests/lib/apex-control-plane.spec.ts'],
  ['duplicate delivery tests', 'npm run test -- tests/lib/apex-control-plane.spec.ts'],
  ['stale-event tests', 'npm run test -- tests/lib/apex-control-plane.spec.ts'],
  ['policy diff tests', 'npm run zero-trust:baseline'],
  ['prompt-defense checks', 'npm run prompt-defense:analyze'],
  ['deterministic eval', 'npm run eval:ci'],
  ['chaos/sim validate', 'npm run sim:validate'],
  ['chaos/sim quick', 'npm run sim:quick'],
  ['DR tests', 'npm run dr:test'],
  ['asset/runtime smoke tests', 'npm run test:assets'],
  ['Playwright browser tests', 'npm run test:e2e'],
  ['Python lint/test gates', 'npm run ci:py'],
  ['security audit', 'npm run security:audit'],
];

const selected = process.argv.includes('--all') ? stages : stages.filter(([name]) => !name.includes('Playwright'));
for (const [name, command] of selected) {
  console.log(`\n[release-lattice] ${name}: ${command}`);
  const result = spawnSync(command, { shell: true, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    console.error(`[release-lattice] failed: ${name}`);
    process.exit(result.status ?? 1);
  }
}
console.log('\n[release-lattice] all selected gates passed');
