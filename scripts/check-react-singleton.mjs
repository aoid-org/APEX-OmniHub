#!/usr/bin/env node
/**
 * React Singleton Detector
 *
 * Validates that only ONE version of React and ReactDOM exists in the dependency tree.
 */

import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import { existsSync } from 'node:fs';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

const SAFE_PATH = '/usr/bin:/bin';

function buildSafeEnv() {
  return {
    PATH: SAFE_PATH,
    // Keep locale deterministic for stable command output parsing in CI.
    LC_ALL: 'C',
  };
}

function resolveBunBinary() {
  if (basename(process.execPath).toLowerCase() === 'bun') {
    return process.execPath;
  }

  const bunCandidates = [
    '/usr/local/bin/bun',
    '/usr/bin/bun',
    '/bin/bun',
    '/root/.local/share/mise/installs/bun/latest/bin/bun',
    '/root/.local/share/mise/shims/bun',
  ];
  const foundPath = bunCandidates.find((candidate) => existsSync(candidate));

  if (!foundPath) {
    throw new Error('Unable to locate Bun binary in fixed system paths.');
  }

  return foundPath;
}

function resolveNpmRunner() {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && existsSync(npmExecPath)) {
    return {
      command: process.execPath,
      args: [npmExecPath],
    };
  }

  const npmCandidates = ['/usr/bin/npm', '/bin/npm', '/usr/local/bin/npm'];
  const foundPath = npmCandidates.find((candidate) => existsSync(candidate));

  if (!foundPath) {
    return null;
  }

  return {
    command: foundPath,
    args: [],
  };
}

function extractVersionsFromTree(treeOutput, packageName) {
  const pattern = new RegExp(
    String.raw`(?:^|\n)\s*[├└]──\s+${packageName}@([0-9]+\.[0-9]+\.[0-9]+(?:[-+][^\s]+)?)`,
    'g',
  );
  const versions = new Set();

  for (const match of treeOutput.matchAll(pattern)) {
    versions.add(match[1]);
  }

  return Array.from(versions);
}

async function main() {
  console.log('\n🔍 React Singleton Check');
  console.log('─'.repeat(50));

  let depTreeText = '';
  let command;
  let args;

  try {
    const bunBinary = resolveBunBinary();
    command = bunBinary;
    args = ['pm', 'ls', '--all'];
  } catch {
    const npmRunner = resolveNpmRunner();
    if (!npmRunner) {
      console.error(`${colors.red}✗${colors.reset} Unable to locate Bun or npm binary in fixed system paths.`);
      process.exit(1);
    }
    command = npmRunner.command;
    args = [...npmRunner.args, 'ls', 'react', 'react-dom', '--all'];
  }

  try {
    depTreeText = execFileSync(command, args, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      env: buildSafeEnv(),
    });
  } catch (error) {
    const fallbackText = String(error?.stdout ?? '');
    if (fallbackText.trim()) {
      depTreeText = fallbackText;
    } else {
      console.error(`${colors.red}✗${colors.reset} Failed dependency tree command:`, error.message);
      process.exit(1);
    }
  }

  const reactVersions = extractVersionsFromTree(depTreeText, 'react');
  const reactDomVersions = extractVersionsFromTree(depTreeText, 'react-dom');

  console.log(`\n📦 react versions found: ${reactVersions.length}`);
  reactVersions.forEach((v) => console.log(`   - ${v}`));

  console.log(`\n📦 react-dom versions found: ${reactDomVersions.length}`);
  reactDomVersions.forEach((v) => console.log(`   - ${v}`));

  let hasError = false;

  if (reactVersions.length > 1) {
    console.log(`\n${colors.red}✗ DUPLICATE REACT DETECTED${colors.reset}`);
    console.log(`  ${colors.yellow}Detected versions:${colors.reset} ${reactVersions.join(', ')}`);
    hasError = true;
  }

  if (reactDomVersions.length > 1) {
    console.log(`\n${colors.red}✗ DUPLICATE REACT-DOM DETECTED${colors.reset}`);
    console.log(`  ${colors.yellow}Detected versions:${colors.reset} ${reactDomVersions.join(', ')}`);
    hasError = true;
  }

  if (reactVersions.length === 1 && reactDomVersions.length === 1) {
    const reactMajor = reactVersions[0].split('.')[0];
    const reactDomMajor = reactDomVersions[0].split('.')[0];

    if (reactMajor !== reactDomMajor) {
      console.log(`\n${colors.red}✗ REACT/REACT-DOM VERSION MISMATCH${colors.reset}`);
      console.log(`  react: ${reactVersions[0]}`);
      console.log(`  react-dom: ${reactDomVersions[0]}`);
      hasError = true;
    }
  }

  console.log('─'.repeat(50));

  if (hasError) {
    console.log(`\n${colors.red}FAILED:${colors.reset} React singleton check failed`);
    console.log('Fix: Run `bun pm dedupe` or check for conflicting peer dependencies.\n');
    process.exit(1);
  }

  console.log(`\n${colors.green}✓ React singleton check passed${colors.reset}`);
  console.log(`  react: ${reactVersions[0] ?? 'not-found'}`);
  console.log(`  react-dom: ${reactDomVersions[0] ?? 'not-found'}\n`);
}

await main();
