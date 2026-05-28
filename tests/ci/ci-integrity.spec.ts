/**
 * CI Integrity Scanner — fixture tests
 *
 * Each test builds an isolated temp directory with minimal .github/workflows/
 * and docs/release/ structure, then runs the scanner as a subprocess.
 * The scanner uses process.cwd() as workspace root, so we set cwd on execFileSync.
 *
 * Tests cover P09 requirements:
 *  - fake gate names (always-pass, skip-rsi, dummy-gate, etc.)
 *  - placeholder success text
 *  - || true bypass in required workflows
 *  - continue-on-error bypass in required workflows
 *  - duplicate workflow names
 *  - duplicate job display names across workflows
 *  - branch-protection references a non-existent job
 *  - missing branch-protection doc
 *  - clean workflow baseline (must pass)
 *  - governance-gate job verified to exist
 */

import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Absolute path to the scanner so it can be called from any cwd.
const SCANNER = resolve(process.cwd(), 'scripts/ci/verify-ci-integrity.mjs');

// ============================================================================
// Helpers
// ============================================================================

function makeFixtureDir(id: string): string {
  const dir = join(tmpdir(), `ci-test-${id}-${Date.now()}`);
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
  mkdirSync(join(dir, 'docs', 'release'), { recursive: true });
  return dir;
}

function writeWf(dir: string, filename: string, content: string): void {
  writeFileSync(join(dir, '.github', 'workflows', filename), content);
}

function writeBP(dir: string, jobIds: string[]): void {
  const lines = jobIds.map((id) => `**Job ID / Name**: \`${id}\``).join('\n');
  writeFileSync(join(dir, 'docs', 'release', 'branch-protection.md'), lines);
}

function runScanner(dir: string): { exit: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [SCANNER], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exit: 0, out };
  } catch (e: unknown) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { exit: err.status ?? 1, out: (err.stdout ?? '') + (err.stderr ?? '') };
  }
}

// Clean up temp dirs after each test.
const createdDirs: string[] = [];
function makeDir(id: string): string {
  const d = makeFixtureDir(id);
  createdDirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of createdDirs.splice(0)) {
    if (existsSync(d)) rmSync(d, { recursive: true, force: true });
  }
});

// ============================================================================
// Fixture Templates
// ============================================================================

const CLEAN_WORKFLOW = `name: clean-ci
on: [pull_request]
jobs:
  required-job:
    name: Required Job Display Name
    runs-on: ubuntu-latest
    steps:
      - run: echo done
`;

// ============================================================================
// Tests
// ============================================================================

describe('CI Integrity Scanner — fixture tests', () => {

  it('PASS: clean workflow with matching branch-protection doc', () => {
    const dir = makeDir('clean');
    writeWf(dir, 'ci.yml', CLEAN_WORKFLOW);
    writeBP(dir, ['required-job']);
    const { exit } = runScanner(dir);
    expect(exit, 'Scanner must pass on a clean fixture').toBe(0);
  });

  it('FAIL: branch-protection.md references a non-existent job', () => {
    const dir = makeDir('missing-job');
    writeWf(dir, 'ci.yml', CLEAN_WORKFLOW);
    writeBP(dir, ['non-existent-job-id']);
    const { exit, out } = runScanner(dir);
    expect(exit).toBe(1);
    expect(out).toContain('non-existent-job-id');
  });

  it('FAIL: missing branch-protection.md', () => {
    const dir = makeDir('no-bp');
    writeWf(dir, 'ci.yml', CLEAN_WORKFLOW);
    // Intentionally omit branch-protection.md
    const { exit } = runScanner(dir);
    expect(exit).toBe(1);
  });

  it('FAIL: required workflow (release.yml) contains || true bypass', () => {
    const dir = makeDir('or-true');
    const bad = `name: release
on: [push]
jobs:
  release:
    name: Release Job
    runs-on: ubuntu-latest
    steps:
      - run: npm run build || true
`;
    writeWf(dir, 'release.yml', bad);
    writeBP(dir, ['release']);
    const { exit, out } = runScanner(dir);
    expect(exit).toBe(1);
    expect(out).toContain('|| true');
  });

  it('FAIL: required workflow (rsi-governance.yml) has continue-on-error: true on gate step', () => {
    const dir = makeDir('coe');
    const bad = `name: RSI Governance Gate
on: [pull_request]
jobs:
  rsi-governance:
    name: RSI Governance Gate
    runs-on: ubuntu-latest
    steps:
      - name: Run RSI policy
        continue-on-error: true
        run: python3 tools/rsi/policy_engine.py
`;
    writeWf(dir, 'rsi-governance.yml', bad);
    writeBP(dir, ['rsi-governance']);
    const { exit, out } = runScanner(dir);
    expect(exit).toBe(1);
    expect(out.toLowerCase()).toContain('continue-on-error');
  });

  it('FAIL: workflow contains fake-pass placeholder text', () => {
    const dir = makeDir('fake-pass');
    const bad = `name: bad-workflow
on: [push]
jobs:
  bad-job:
    name: Bad Job
    runs-on: ubuntu-latest
    steps:
      - run: echo "component not yet active, passing."
`;
    writeWf(dir, 'bad.yml', bad);
    writeBP(dir, ['bad-job']);
    const { exit, out } = runScanner(dir);
    expect(exit).toBe(1);
    expect(out).toMatch(/component not yet active, passing\./i);
  });

  it('FAIL: two workflows share the same name (duplicate workflow name)', () => {
    const dir = makeDir('dup-wf-name');
    const wf1 = `name: shared-workflow-name
on: [push]
jobs:
  job-alpha:
    name: Job Alpha
    runs-on: ubuntu-latest
    steps: [{run: echo a}]
`;
    const wf2 = `name: shared-workflow-name
on: [pull_request]
jobs:
  job-beta:
    name: Job Beta
    runs-on: ubuntu-latest
    steps: [{run: echo b}]
`;
    writeWf(dir, 'wf1.yml', wf1);
    writeWf(dir, 'wf2.yml', wf2);
    writeBP(dir, ['job-alpha']);
    const { exit, out } = runScanner(dir);
    expect(exit).toBe(1);
    expect(out).toContain('shared-workflow-name');
  });

  it('FAIL: job ID matches a fake-gate name pattern (always-pass)', () => {
    const dir = makeDir('fake-gate-id');
    const bad = `name: bad-gates
on: [push]
jobs:
  always-pass:
    name: Always Pass Gate
    runs-on: ubuntu-latest
    steps: [{run: echo done}]
`;
    writeWf(dir, 'bad-gates.yml', bad);
    writeBP(dir, ['always-pass']);
    const { exit, out } = runScanner(dir);
    expect(exit).toBe(1);
    expect(out.toLowerCase()).toContain('fake gate');
  });

  it('FAIL: job ID matches fake-gate pattern (skip-rsi)', () => {
    const dir = makeDir('skip-rsi-gate');
    const bad = `name: bypass-ci
on: [push]
jobs:
  skip-rsi:
    name: Skip RSI Gate
    runs-on: ubuntu-latest
    steps: [{run: echo done}]
`;
    writeWf(dir, 'bypass.yml', bad);
    writeBP(dir, ['skip-rsi']);
    const { exit, out } = runScanner(dir);
    expect(exit).toBe(1);
    expect(out.toLowerCase()).toContain('fake gate');
  });

  it('FAIL: two different workflows define jobs with the same display name (branch-protection collision)', () => {
    const dir = makeDir('dup-display-name');
    const wf1 = `name: workflow-one
on: [push]
jobs:
  job-one:
    name: Shared Display Name
    runs-on: ubuntu-latest
    steps: [{run: echo a}]
`;
    const wf2 = `name: workflow-two
on: [pull_request]
jobs:
  job-two:
    name: Shared Display Name
    runs-on: ubuntu-latest
    steps: [{run: echo b}]
`;
    writeWf(dir, 'wf-one.yml', wf1);
    writeWf(dir, 'wf-two.yml', wf2);
    writeBP(dir, ['job-one']);
    const { exit, out } = runScanner(dir);
    expect(exit).toBe(1);
    expect(out).toContain('Shared Display Name');
  });

  it('PASS: governance-gate job exists in apex-governance.yml (replica of real repo)', () => {
    const dir = makeDir('governance-gate-exists');
    const govWf = `name: apex-governance
on: [pull_request]
jobs:
  apex-policy:
    name: APEX policy gates
    runs-on: ubuntu-latest
    steps:
      - run: python governance/ci/scripts/apex_policy_check.py
  governance-gate:
    name: Governance gate (required for branch protection)
    runs-on: ubuntu-latest
    needs: [apex-policy]
    if: always()
    steps:
      - run: echo governance-gate
`;
    writeWf(dir, 'apex-governance.yml', govWf);
    writeBP(dir, ['governance-gate']);
    const { exit } = runScanner(dir);
    expect(exit, 'Scanner must pass when governance-gate exists and is documented').toBe(0);
  });

});
