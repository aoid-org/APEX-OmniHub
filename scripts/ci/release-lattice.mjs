#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const npmRun = (script, ...args) => ['npm', ['run', script, ...args]];
const npmTest = (...args) => ['npm', ['run', 'test', '--', ...args]];

const stages = [
  ['unit tests', npmRun('test')],
  ['integration tests', npmRun('test:integration')],
  ['idempotency / replay / duplicate-delivery / stale-event tests', npmTest('tests/lib/apex-control-plane.spec.ts')],
  ['policy diff tests', npmRun('zero-trust:baseline')],
  ['prompt-defense checks', npmRun('prompt-defense:analyze')],
  ['deterministic eval', npmRun('eval:ci')],
  ['chaos/sim validate', npmRun('sim:validate')],
  ['chaos/sim quick', npmRun('sim:quick')],
  ['DR tests', npmRun('dr:test')],
  ['asset/runtime smoke tests', npmRun('test:assets')],
  ['Playwright browser tests', npmRun('test:e2e')],
  ['Python lint/test gates', npmRun('ci:py')],
  ['security audit', npmRun('security:audit')],
];

const selected = process.argv.includes('--all') ? stages : stages.filter(([name]) => !name.includes('Playwright'));
for (const [name, [command, args]] of selected) {
  console.log(`\n[release-lattice] ${name}: ${[command, ...args].join(' ')}`);
  // Commands are fixed in-repo allowlist entries; no user-provided shell string is evaluated.
  const result = spawnSync(command, args, { shell: false, stdio: 'inherit', env: process.env });
  if (result.error) {
    console.error(`[release-lattice] failed to start ${name}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[release-lattice] failed: ${name}`);
    process.exit(result.status ?? 1);
  }
}
console.log('\n[release-lattice] all selected gates passed');
