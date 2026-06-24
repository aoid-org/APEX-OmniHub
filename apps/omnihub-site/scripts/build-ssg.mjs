import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const cliPath = resolve(process.cwd(), 'node_modules', 'vite-react-ssg', 'dist', 'node', 'cli.mjs');
const viteReactSsgRoot = resolve(dirname(cliPath), '..', '..');
const sharedDir = join(viteReactSsgRoot, 'dist', 'shared');

const from = "'react-router-dom/server.js'";
const to = "'react-router'";

for (const candidate of [
  join(sharedDir, 'vite-react-ssg.DUkzxBEb.mjs'),
]) {
  if (!existsSync(candidate)) continue;

  const current = readFileSync(candidate, 'utf8');
  if (current.includes(from)) {
    writeFileSync(candidate, current.replaceAll(from, to));
  }
}

const result = spawnSync(process.execPath, [cliPath, 'build'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
