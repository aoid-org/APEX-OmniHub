#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const LCOV_PATH = resolve(ROOT, 'coverage/lcov.info');
const THRESHOLD = 90;
const REQUIRED_TARGETS = new Set([
  'apps/omnihub-proof/src/App.tsx',
  'apps/omnihub-proof/src/main.tsx',
  'src/swInit.ts',
]);

function fail(message) {
  console.error(`❌ check:new-code-coverage FAILED — ${message}`);
  process.exit(1);
}

function git(args, options = {}) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', ...options });
}

function ensureRef(ref) {
  return git(['rev-parse', '--verify', `${ref}^{commit}`]);
}

function resolveBaseRef() {
  const requested = process.env.APEX_NEW_CODE_COVERAGE_BASE || 'origin/main';
  const resolved = ensureRef(requested);
  if (resolved.status === 0) return requested;
  if (process.env.CI) {
    fail(`base ref ${requested} is unavailable in CI; fetch it or set APEX_NEW_CODE_COVERAGE_BASE`);
  }
  const head = ensureRef('HEAD');
  if (head.status !== 0) fail('HEAD is unavailable; cannot determine changed lines');
  console.warn(`⚠️  base ref ${requested} unavailable locally; falling back to HEAD for a zero-diff guard run`);
  return 'HEAD';
}

function parseChangedLines(baseRef) {
  const diff = git(['diff', '--unified=0', `${baseRef}...HEAD`, '--']);
  if (diff.status !== 0) {
    const fallback = git(['diff', '--unified=0', baseRef, 'HEAD', '--']);
    if (fallback.status !== 0) fail(`git diff failed for ${baseRef}: ${fallback.stderr || diff.stderr}`);
    return parseDiff(fallback.stdout);
  }
  return parseDiff(diff.stdout);
}

function parseDiff(diffText) {
  const changed = new Map();
  let file = null;
  for (const line of diffText.split(/\r?\n/)) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      file = fileMatch[1];
      if (!changed.has(file)) changed.set(file, new Set());
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!hunk || !file) continue;
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    for (let i = 0; i < count; i += 1) changed.get(file).add(start + i);
  }
  return changed;
}

function parseLcov(text) {
  const files = new Map();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('SF:')) {
      const sf = line.slice(3).replaceAll('\\', '/');
      const rel = sf.startsWith(ROOT.replaceAll('\\', '/') + '/') ? sf.slice(ROOT.length + 1) : sf;
      current = { lines: new Map(), branches: new Map() };
      files.set(rel, current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith('DA:')) {
      const [lineNo, hits] = line.slice(3).split(',').map(Number);
      current.lines.set(lineNo, hits);
    } else if (line.startsWith('BRDA:')) {
      const [lineNoText, block, branch, takenText] = line.slice(5).split(',');
      const lineNo = Number(lineNoText);
      const taken = takenText === '-' ? 0 : Number(takenText);
      const entries = current.branches.get(lineNo) || [];
      entries.push({ block, branch, covered: taken > 0 });
      current.branches.set(lineNo, entries);
    }
  }
  return files;
}

if (!existsSync(LCOV_PATH)) fail('coverage/lcov.info is missing; run bun run test:coverage first');

const lcov = parseLcov(readFileSync(LCOV_PATH, 'utf8'));
const baseRef = resolveBaseRef();
const changed = parseChangedLines(baseRef);
let checkedFiles = 0;
let failures = 0;

console.log(`=== check:new-code-coverage — base ${baseRef}, threshold ${THRESHOLD}% ===`);

for (const [file, changedLines] of changed) {
  const record = lcov.get(file);
  if (!record) {
    if (REQUIRED_TARGETS.has(file)) {
      console.error(`  ✗ ${file}: missing from LCOV`);
      failures += 1;
    }
    continue;
  }

  const executable = [...changedLines].filter((line) => record.lines.has(line));
  if (executable.length === 0) continue;
  checkedFiles += 1;
  const covered = executable.filter((line) => (record.lines.get(line) || 0) > 0).length;
  const linePct = (covered / executable.length) * 100;

  const branchEntries = executable.flatMap((line) => record.branches.get(line) || []);
  const branchPct = branchEntries.length === 0 ? null : (branchEntries.filter((b) => b.covered).length / branchEntries.length) * 100;

  const branchSummary = branchPct === null ? 'branches n/a' : `branches ${branchPct.toFixed(2)}% (${branchEntries.filter((b) => b.covered).length}/${branchEntries.length})`;
  console.log(`  ${linePct >= THRESHOLD && (branchPct === null || branchPct >= THRESHOLD) ? '✓' : '✗'} ${file}: lines ${linePct.toFixed(2)}% (${covered}/${executable.length}), ${branchSummary}`);

  if (linePct < THRESHOLD || (branchPct !== null && branchPct < THRESHOLD)) failures += 1;
}

for (const target of REQUIRED_TARGETS) {
  if (changed.has(target) && !lcov.has(target)) {
    console.error(`  ✗ ${target}: changed target file missing from LCOV`);
    failures += 1;
  }
}

if (failures > 0) fail(`${failures} changed-file coverage check(s) failed`);
console.log(`check:new-code-coverage PASSED (${checkedFiles} changed source file(s) with executable LCOV lines checked)`);
