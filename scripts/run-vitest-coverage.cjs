#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const bin = path.join(
  __dirname,
  '..',
  'node_modules',
  'vitest',
  'vitest.mjs',
);

const result = spawnSync(process.execPath, [bin, 'run', '--coverage'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITEST_COVERAGE: 'true',
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
