#!/usr/bin/env node
/**
 * React Singleton Detector
 *
 * Validates that only ONE version of React and ReactDOM exists in the
 * dependency tree. Supports bun, npm, yarn, and pnpm package managers.
 *
 * Bun detection: npm_execpath resolves to a binary ELF when run via bun.
 * In that case, versions are read directly from node_modules JSON manifests,
 * which is simpler and faster than spawning a sub-process.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

// ── Bun detection ─────────────────────────────────────────────────────────────

/**
 * Return true when the script is running under bun (npm_execpath is the bun
 * ELF binary, not a JavaScript file).
 */
function isBunRunner() {
  const execPath = process.env.npm_execpath ?? '';
  if (!execPath) return false;
  try {
    // ELF magic bytes: 0x7f 0x45 0x4c 0x46 at offset 0
    const buf = Buffer.alloc(4);
    const fd = readFileSync(execPath);
    buf.set(fd.subarray(0, 4));
    return buf.readUInt32BE(0) === 0x7f454c46;
  } catch {
    return false;
  }
}

// ── Direct node_modules version resolver (bun-safe) ──────────────────────────

/**
 * Resolve versions of a package by walking up node_modules layers.
 * Reads package.json directly — no subprocess required.
 */
function resolveVersionsFromNodeModules(packageName) {
  const req = createRequire(import.meta.url);
  const versions = new Set();

  // Primary: resolve from CWD
  try {
    const pkgPath = req.resolve(`${packageName}/package.json`);
    const manifest = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (manifest.version) versions.add(manifest.version);
  } catch {
    // Not found at primary location
  }

  // Secondary: scan common workspace locations
  const candidates = [
    resolve(process.cwd(), 'node_modules', packageName, 'package.json'),
    resolve(process.cwd(), 'apps/omnihub-site/node_modules', packageName, 'package.json'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      const manifest = JSON.parse(readFileSync(candidate, 'utf-8'));
      if (manifest.version) versions.add(manifest.version);
    } catch {
      // Skip unreadable manifests
    }
  }

  return Array.from(versions);
}

// ── npm/yarn/pnpm tree resolver ───────────────────────────────────────────────

const SAFE_PATH = [
  `${process.execPath.replace(/\/[^/]+$/, '')}`,
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
].join(':');

function buildSafeEnv() {
  return { PATH: SAFE_PATH, LC_ALL: 'C' };
}

function resolveNpmRunner() {
  const candidates = ['/usr/bin/npm', '/bin/npm', '/usr/local/bin/npm'];
  const found = candidates.find((c) => existsSync(c));
  return found ? { command: found, args: [] } : null;
}

function extractVersionsFromTree(treeOutput, packageName) {
  const escaped = packageName.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const pattern = new RegExp(
    String.raw`(?:^|\n)[|│\s]*(?:[├└]──|[+` + '`' + String.raw`]--)\s+${escaped}@([0-9]+\.[0-9]+\.[0-9]+(?:[-+][^\s]+)?)`,
    'g',
  );
  const versions = new Set();
  for (const match of treeOutput.matchAll(pattern)) {
    versions.add(match[1]);
  }
  return Array.from(versions);
}

function resolveVersionsViaNpm(packageName) {
  const runner = resolveNpmRunner();
  if (!runner) return [];

  try {
    const output = execFileSync(
      runner.command,
      [...runner.args, 'ls', packageName, '--all'],
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, env: buildSafeEnv() },
    );
    return extractVersionsFromTree(output, packageName);
  } catch (err) {
    const fallback = String(err?.stdout ?? '');
    if (fallback.trim()) return extractVersionsFromTree(fallback, packageName);
    return [];
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n\uD83D\uDD0D React Singleton Check');
  console.log('\u2500'.repeat(50));

  const useBun = isBunRunner();

  let reactVersions;
  let reactDomVersions;

  if (useBun) {
    console.log('  (bun detected \u2014 reading node_modules directly)');
    reactVersions = resolveVersionsFromNodeModules('react');
    reactDomVersions = resolveVersionsFromNodeModules('react-dom');
  } else {
    reactVersions = resolveVersionsViaNpm('react');
    reactDomVersions = resolveVersionsViaNpm('react-dom');
  }

  // Deduplicate
  reactVersions = [...new Set(reactVersions)];
  reactDomVersions = [...new Set(reactDomVersions)];

  console.log(`\n\uD83D\uDCE6 react versions found: ${reactVersions.length}`);
  reactVersions.forEach((v) => console.log(`   - ${v}`));

  console.log(`\n\uD83D\uDCE6 react-dom versions found: ${reactDomVersions.length}`);
  reactDomVersions.forEach((v) => console.log(`   - ${v}`));

  let hasError = false;

  if (reactVersions.length === 0 || reactDomVersions.length === 0) {
    console.log(`\n${colors.red}\u2717 UNABLE TO RESOLVE REACT DEPENDENCY TREE${colors.reset}`);
    console.log('  Ensure dependencies are installed.');
    hasError = true;
  }

  if (reactVersions.length > 1) {
    console.log(`\n${colors.red}\u2717 DUPLICATE REACT DETECTED${colors.reset}`);
    console.log(`  ${colors.yellow}Detected versions:${colors.reset} ${reactVersions.join(', ')}`);
    hasError = true;
  }

  if (reactDomVersions.length > 1) {
    console.log(`\n${colors.red}\u2717 DUPLICATE REACT-DOM DETECTED${colors.reset}`);
    console.log(`  ${colors.yellow}Detected versions:${colors.reset} ${reactDomVersions.join(', ')}`);
    hasError = true;
  }

  if (reactVersions.length === 1 && reactDomVersions.length === 1) {
    const reactMajor = reactVersions[0].split('.')[0];
    const reactDomMajor = reactDomVersions[0].split('.')[0];
    if (reactMajor !== reactDomMajor) {
      console.log(`\n${colors.red}\u2717 REACT/REACT-DOM VERSION MISMATCH${colors.reset}`);
      console.log(`  react: ${reactVersions[0]}`);
      console.log(`  react-dom: ${reactDomVersions[0]}`);
      hasError = true;
    }
  }

  console.log('\u2500'.repeat(50));

  if (hasError) {
    console.log(`\n${colors.red}FAILED:${colors.reset} React singleton check failed`);
    console.log('Fix: Run `npm dedupe` or check for conflicting peer dependencies.\n');
    process.exit(1);
  }

  console.log(`\n${colors.green}\u2713 React singleton check passed${colors.reset}`);
  console.log(`  react: ${reactVersions[0] ?? 'not-found'}`);
  console.log(`  react-dom: ${reactDomVersions[0] ?? 'not-found'}\n`);
}

await main();
