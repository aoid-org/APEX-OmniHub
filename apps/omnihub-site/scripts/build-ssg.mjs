import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const cliPath = resolve(process.cwd(), 'node_modules', 'vite-react-ssg', 'dist', 'node', 'cli.mjs');
const viteReactSsgRoot = resolve(dirname(cliPath), '..', '..');
const sharedDir = join(viteReactSsgRoot, 'dist', 'shared');

for (const candidate of [
  join(sharedDir, 'vite-react-ssg.DUkzxBEb.mjs'),
]) {
  if (!existsSync(candidate)) continue;

  let current = readFileSync(candidate, 'utf8');
  const targetPattern = /const\s*\{\s*StaticRouterProvider,\s*createStaticHandler,\s*createStaticRouter\s*\}\s*=\s*await\s*import\([^)]+\);/;
  const universalPattern = "const _rr = await import('react-router-dom'); const _rrServer = _rr.createStaticHandler ? _rr : await import('react-router-dom/server.js').catch(() => _rr); const { StaticRouterProvider, createStaticHandler, createStaticRouter } = _rrServer;";

  if (targetPattern.test(current)) {
    current = current.replace(targetPattern, universalPattern);
    writeFileSync(candidate, current, 'utf8');
  }
}

const result = spawnSync(process.execPath, [cliPath, 'build'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
